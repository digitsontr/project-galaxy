'use strict';
// Platformdan bağımsız CLI çağrısı. Windows'ta npm ile kurulan araçlar (claude, tsc, eslint,
// prettier, npx…) .cmd sarmalayıcısıdır: shell'siz çalışmaz (Node ≥20.12 EINVAL), shell:true ise
// Node argümanları tırnaklamaz ve çok satırlı prompt'u keser. npm sarmalayıcısının gösterdiği JS'i
// gömülü Node (ELECTRON_RUN_AS_NODE) ile koşarız; çözülemeyen .cmd tırnaklanmış shell'e düşer.
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const WIN = process.platform === 'win32';

// Yalnız npm cmd-shim biçimi: `"%_prog%" "%dp0%\node_modules\…\cli.js" %*` veya `node "%~dp0\…js"`.
// (VS Code'un code.cmd'si Code.exe'yi çağırır — o JS'i Node ile koşmak yanlış olur.)
const SHIM_RE = /(?:%_prog%|node(?:\.exe)?)"?\s+"%~?dp0%?\\?([^"%]+)"/i;

function cmdShimTarget(file) {
  try {
    const m = SHIM_RE.exec(fs.readFileSync(file, 'utf8'));
    if (m) { const js = path.join(path.dirname(file), ...m[1].split(/[\\/]/)); if (fs.existsSync(js)) return js; }
  } catch (e) {}
  return '';
}

const EXT_RE = /\.(cmd|bat|exe|com)$/i;
// Windows: ad → mutlak yol (PATH × PATHEXT). Uzantısız npm betiği ("claude") yerine .cmd'yi seçer.
function resolveWin(file, env) {
  const exts = ['.exe', '.cmd', '.bat', '.com'];
  const tryFile = f => {
    if (EXT_RE.test(f)) return fs.existsSync(f) ? f : '';
    for (const x of exts) if (fs.existsSync(f + x)) return f + x;
    return '';
  };
  if (path.isAbsolute(file) || /[\\/]/.test(file)) return tryFile(file) || file;
  const dirs = String((env && (env.PATH || env.Path)) || process.env.PATH || process.env.Path || '').split(path.delimiter);
  for (const d of dirs) { if (!d) continue; const hit = tryFile(path.join(d, file)); if (hit) return hit; }
  return file;
}

function cliCommand(bin, args, env) {
  bin = String(bin || ''); args = (args || []).map(String);
  if (!WIN) return { cmd: bin, args, env: {}, shell: false };
  const file = resolveWin(bin, env);
  if (/\.(cmd|bat)$/i.test(file)) {
    const js = cmdShimTarget(file);
    if (js) return { cmd: process.execPath, args: [js, ...args], env: { ELECTRON_RUN_AS_NODE: '1' }, shell: false };
    const q = s => '"' + s.replace(/"/g, '""') + '"';
    return { cmd: q(file), args: args.map(q), env: {}, shell: true };
  }
  return { cmd: file, args, env: {}, shell: false };
}

function cliOpts(c, opts) {
  opts = opts || {};
  return { ...opts, env: { ...(opts.env || process.env), ...c.env }, shell: c.shell, windowsHide: true };
}
function cliSpawn(bin, args, opts) {
  const c = cliCommand(bin, args, opts && opts.env);
  return spawn(c.cmd, c.args, cliOpts(c, opts));
}
function cliExecFile(bin, args, opts, cb) {
  const c = cliCommand(bin, args, opts && opts.env);
  return execFile(c.cmd, c.args, cliOpts(c, opts), cb);
}

module.exports = { cliCommand, cliSpawn, cliExecFile, cmdShimTarget };
