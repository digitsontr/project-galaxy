'use strict';
// Kod inceleme IPC — dirty git diff → kolektör + isteğe bağlı Claude yargıcı → DATA_DIR/reviews.
module.exports = function register(g) {
  const { ipcMain, fs, path } = g;
  const R = require('../lib/review');
  const sendTo = (wc, msg) => { try { if (wc && !wc.isDestroyed()) wc.send('review:out', msg); } catch (e) {} };
  const cancelled = new Set();
  const running = new Set();

  const CODE_RE = /\.(js|jsx|ts|tsx|mjs|cjs|py|go|rs|java|kt|swift|c|cc|cpp|h|cs|rb|php|vue|svelte|sql)$/i;
  const SKIP_RE = /(^|\/)(node_modules|dist|build|coverage|\.git)\//i;
  const BIN_RE = /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|woff2?|eot|ttf|lock|min\.js)$/i;

  function isCodeFile(rel) {
    return CODE_RE.test(rel) && !SKIP_RE.test(rel) && !BIN_RE.test(rel);
  }

  function emit(wc, kind, extra) {
    sendTo(wc, Object.assign({ kind }, extra || {}));
  }

  async function collectDirtyDiff(cwd) {
    const execGit = g.execGit;
    const safeJoin = g.safeJoin;
    const parts = [];
    const head = await execGit(cwd, ['rev-parse', '--verify', 'HEAD'], 8000);
    if (head.ok) {
      const d = await execGit(cwd, ['diff', 'HEAD', '--no-color'], 30000);
      if (d.ok && d.out) parts.push(d.out);
    } else {
      const a = await execGit(cwd, ['diff', '--no-color'], 30000);
      const b = await execGit(cwd, ['diff', '--cached', '--no-color'], 30000);
      if (a.ok && a.out) parts.push(a.out);
      if (b.ok && b.out) parts.push(b.out);
    }
    const ut = await execGit(cwd, ['ls-files', '--others', '--exclude-standard'], 15000);
    const files = String((ut.ok && ut.out) || '').split('\n').map(s => s.trim()).filter(Boolean);
    for (const rel of files.slice(0, 24)) {
      if (!isCodeFile(rel)) continue;
      const full = safeJoin ? safeJoin(cwd, rel) : path.join(cwd, rel);
      if (!full) continue;
      let body = '';
      try {
        const st = fs.statSync(full);
        if (!st.isFile() || st.size > 80 * 1024) continue;
        body = fs.readFileSync(full, 'utf8');
      } catch (e) { continue; }
      if (!body || /\u0000/.test(body.slice(0, 400))) continue;
      parts.push(R.fakeAddDiff(rel, body.split('\n').slice(0, 400)));
    }
    return parts.join('\n');
  }

  async function runReview({ projectId, scope }, wc) {
    const gp = g.gitProj(projectId);
    if (gp.error) return { ok: false, error: gp.error };
    const proj = gp.proj;
    const runId = R.newId();
    running.add(runId);
    emit(wc, 'status', { runId, text: 'Değişiklikler toplanıyor…' });
    let diff = '';
    try { diff = await collectDirtyDiff(proj.path); } catch (e) { diff = ''; }
    if (cancelled.has(runId)) {
      cancelled.delete(runId); running.delete(runId);
      return { ok: false, error: 'durduruldu', runId };
    }
    const collectors = R.collectFromDiff(diff);
    const files = R.filesFromDiff(diff);
    let model = { findings: [], summary: '' };
    let engine = 'collectors';
    let err = '';
    const hasDiff = !!String(diff).trim();
    if (hasDiff && typeof g.runClaudeText === 'function' && !g.IS_MAS) {
      emit(wc, 'status', { runId, text: 'Yargıç bakıyor…' });
      const clip = String(diff).slice(0, 42000);
      const prompt = R.REVIEW_PROMPT + '\n\nPROJE: ' + (proj.name || '') + '\nDOSYALAR: ' + files.join(', ') + '\n\nDIFF:\n' + clip;
      try {
        const res = await g.runClaudeText(prompt, proj.path);
        if (cancelled.has(runId)) {
          cancelled.delete(runId); running.delete(runId);
          return { ok: false, error: 'durduruldu', runId };
        }
        if (res && res.text) {
          model = R.parseModelFindings(res.text);
          engine = 'collectors+claude';
        } else if (res && res.error) {
          err = String(res.error);
        }
      } catch (e) { err = (e && e.message) || 'yargıç hata'; }
    } else if (g.IS_MAS) {
      err = '';
    }
    const findings = R.mergeFindings(collectors, model.findings);
    const run = R.buildRun({
      id: runId,
      projectId: proj.id,
      projectName: proj.name,
      scope: scope || 'dirty',
      engine,
      files,
      diff,
      diffBytes: String(diff).length,
      findings,
      summary: model.summary,
      error: err,
      status: 'done'
    });
    try { R.saveRun(g.DATA_DIR, run); } catch (e) {}
    running.delete(runId);
    emit(wc, 'done', { run });
    return { ok: true, run };
  }

  ipcMain.handle('galaxy:reviewRun', async (e, opts = {}) => {
    const projectId = opts.projectId;
    if (!projectId) return { ok: false, error: 'Proje yok' };
    try {
      return await runReview({ projectId, scope: opts.scope || 'dirty' }, e.sender);
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'inceleme yapılamadı' };
    }
  });

  ipcMain.handle('galaxy:reviewLatest', async (e, { projectId } = {}) => {
    if (!projectId) return { ok: false, error: 'Proje yok' };
    const run = R.latestRun(g.DATA_DIR, projectId);
    return { ok: true, run: run || null };
  });

  ipcMain.handle('galaxy:reviewList', async (e, { projectId } = {}) => {
    if (!projectId) return { ok: false, error: 'Proje yok' };
    return { ok: true, runs: R.listRuns(g.DATA_DIR, projectId) };
  });

  ipcMain.handle('galaxy:reviewGet', async (e, { projectId, runId } = {}) => {
    if (!projectId || !runId) return { ok: false, error: 'Eksik' };
    const run = R.getRun(g.DATA_DIR, projectId, runId);
    if (!run) return { ok: false, error: 'Kayıt yok' };
    return { ok: true, run };
  });

  ipcMain.handle('galaxy:reviewStop', async (e, { runId } = {}) => {
    if (runId) cancelled.add(runId);
    return { ok: true };
  });

  g.reviewRun = runReview;
};
