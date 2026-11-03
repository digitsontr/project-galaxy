// Veri katmanı: galaxy-data.json oku/yaz, günlük yedek + sessiz otomatik git commit,
// varsayılan ajanlar/ayarlar, Claude CLI keşfi, uyarı/özet üretimi.
// with(g) bilinçli: çıplak isimler main.js'in paylaşılan g nesnesine çözülür; g.X = ... atamaları
// bu modülün sonraki modüllere verdiği çıktıdır (sıra main.js'te). Bu yüzden 'use strict' yok ve
// `require('./lib/…')` gibi göreli yollar main.js'e (proje köküne) göre çözülür.
module.exports = function register(g) {
  with (g) {
// Yerleşik ekip: kullanıcının gün içinde en çok ihtiyaç duyduğu 5 ajan. `tools` → claude --allowedTools
// (izin sorulamayan -p modunda hangi komutları sormadan koşabileceği). Yıkıcı işlemler için ajan önce onay ister.
const AGENTS_VERSION = 2;
const LEGACY_AGENT_IDS = ['cto', 'pm', 'doc', 'forge', 'mentor', 'guardian', 'atlas', 'nav', 'navigator', 'documentor'];
function defaultAgents(lang) {
  const en = lang === 'en';
  const common = en
    ? 'Answer in English. Use Markdown: short headings, bullet lists, tables when comparing, fenced code blocks for commands/code. Start with a 1-2 sentence summary. Never invent facts about the code; read it first.'
    : 'Türkçe yaz. Markdown kullan: kısa başlıklar, maddeler, karşılaştırmada tablo, komut/kod için ``` bloğu. İlk satırda 1-2 cümlelik özet ver. Kod hakkında asla uydurma; önce oku.';
  return [
    {
      id: 'git', kind: 'git', builtin: true, name: en ? 'Git Manager' : 'Git Yöneticisi', role: en ? 'Branches · commits · MRs · stash' : 'Dallar · commit · MR · stash',
      color: '#f78166', write: true,
      tools: ['Bash(git:*)', 'Bash(gh:*)', 'Bash(glab:*)'],
      abilities: en
        ? ['Local and remote branches, commits, stashes', 'Open PR/MR list (GitHub, GitLab)', 'Step-by-step graph of what will happen', 'Asks before anything destructive']
        : ['Yerel ve uzak dallar, commitler, stash’ler', 'Açık PR / MR listesi (GitHub, GitLab)', 'Ne olacağını adım adım grafikle gösterir', 'Geri alınamaz işlemden önce onay ister'],
      presets: en
        ? [{ label: 'Draw the branch graph', ask: 'Draw the branch graph of this repo (local + remote) and explain it simply.' }, { label: 'What is waiting to push/pull?', ask: 'Compare local and remote: what is waiting to be pushed or pulled, per branch?' }, { label: 'Open PRs / MRs', ask: 'List open PRs/MRs for this repo with status, author and CI.' }, { label: 'Explain my stashes', ask: 'List my stashes and explain what each contains.' }]
        : [{ label: 'Dal grafiğini çiz', ask: 'Bu deponun dal grafiğini (yerel + uzak) çiz ve sade bir dille açıkla.' }, { label: 'Ne push/pull bekliyor?', ask: 'Yerel ile uzağı karşılaştır: her dalda push ya da pull bekleyen ne var?' }, { label: 'Açık PR / MR’lar', ask: 'Bu deponun açık PR/MR’larını durum, yazar ve CI bilgisiyle listele.' }, { label: 'Stash’lerimi açıkla', ask: 'Stash’lerimi listele, her birinde ne olduğunu açıkla.' }],
      prompt: (en
        ? 'You are the Git Manager. You fully manage the user\'s version control: local and remote branches, commits, merges/rebases, stashes, tags, PRs (gh) and MRs (glab). Always start by running `git status -sb`, `git branch -vv`, `git log --graph --oneline --decorate --all -n 30`. Show the branch graph in a ``` block. Explain every operation as numbered steps (what, why, the exact command). Read-only commands: just run them. Anything that rewrites history or loses work (push --force, reset --hard, branch -D, rebase of shared branches, stash drop/clear, clean -fd) — DO NOT run it; describe it and ask for approval first. '
        : 'Sen Git Yöneticisisin. Kullanıcının tüm versiyon kontrolünü yönetirsin: yerel ve uzak dallar, commitler, merge/rebase, stash, tag, PR (gh) ve MR (glab). Her işe `git status -sb`, `git branch -vv`, `git log --graph --oneline --decorate --all -n 30` ile başla. Dal grafiğini ``` bloğunda göster. Her işlemi numaralı adımlarla anlat (ne, neden, tam komut). Salt okuyan komutları doğrudan çalıştır. Geçmişi yeniden yazan ya da iş kaybettiren her şeyi (push --force, reset --hard, branch -D, paylaşılan dalı rebase, stash drop/clear, clean -fd) ÇALIŞTIRMA; önce ne olacağını anlat ve onay iste. ') + common
    },
    {
      id: 'quality', kind: 'quality', builtin: true, name: en ? 'Code Quality' : 'Kod Kalitesi', role: en ? 'Code review · SonarQube mindset' : 'Kod inceleme · SonarQube bakışı',
      color: '#7ee787', write: false, tools: [],
      abilities: en
        ? ['Detects language, framework and project structure', 'Code review rules + SonarQube categories', 'Every finding with file:line, why and how to fix', 'Quality gate verdict and score']
        : ['Dili, framework’ü ve proje yapısını tanır', 'Code review kuralları + SonarQube kategorileri', 'Her bulgu dosya:satır, neden ve nasıl düzelir', 'Kalite kapısı kararı ve puan'],
      presets: en
        ? [{ label: 'Review my uncommitted changes', ask: 'Review my uncommitted changes (git diff) against code review rules.' }, { label: 'Full quality scan', ask: 'Run a full quality scan of this project and give a quality gate verdict.' }, { label: 'Security hotspots', ask: 'Find security vulnerabilities and hotspots in this project.' }]
        : [{ label: 'Commit’lenmemiş değişikliklerimi incele', ask: 'Commit’lenmemiş değişikliklerimi (git diff) code review kurallarına göre incele.' }, { label: 'Tam kalite taraması', ask: 'Bu projede tam kalite taraması yap ve kalite kapısı kararı ver.' }, { label: 'Güvenlik açıkları', ask: 'Bu projedeki güvenlik açıklarını ve riskli noktaları bul.' }],
      prompt: (en
        ? 'You are the Code Quality agent — a senior reviewer with a SonarQube mindset. First detect the language(s), framework(s) and structure (package.json, *.csproj, pom.xml, go.mod, pyproject, etc.) and judge the code by THAT ecosystem\'s conventions. Classify each finding as Bug, Vulnerability, Security Hotspot, Code Smell, Duplication or Complexity, with severity Blocker/Critical/Major/Minor/Info. For each: `file:line`, what is wrong, why it matters, and a concrete fix (short code). End with a table of counts per severity, a quality gate verdict (PASSED / FAILED) and a 0-100 score. You only read; you never modify files. '
        : 'Sen Kod Kalitesi ajanısın — SonarQube bakışına sahip kıdemli bir kod inceleyici. Önce dili, framework’ü ve yapıyı tespit et (package.json, *.csproj, pom.xml, go.mod, pyproject vb.) ve kodu O ekosistemin kurallarına göre değerlendir. Her bulguyu Bug, Güvenlik açığı, Güvenlik riski, Kod kokusu, Tekrar ya da Karmaşıklık olarak sınıfla; önem: Engelleyici/Kritik/Büyük/Küçük/Bilgi. Her biri için: `dosya:satır`, sorun, neden önemli, somut düzeltme (kısa kod). Sonda önem başına sayılar tablosu, kalite kapısı kararı (GEÇTİ / KALDI) ve 0-100 puan ver. Sadece okursun; dosya değiştirmezsin. ') + common
    },
    {
      id: 'docs', kind: 'docs', builtin: true, name: en ? 'Documentor' : 'Dokümantasyon', role: en ? 'md · pdf · excel · images' : 'md · pdf · excel · görsel',
      color: '#79c0ff', write: true,
      tools: ['Bash(pandoc:*)', 'Bash(python3:*)', 'Bash(node:*)', 'Bash(ls:*)', 'Bash(mkdir:*)'],
      abilities: en
        ? ['Finds and shows the project\'s md, pdf, xlsx, csv, image files', 'Writes README, guides, API docs, changelogs', 'Produces PDF, Excel/CSV, SVG diagrams', 'Improves existing documents — asks before overwriting']
        : ['Projedeki md, pdf, xlsx, csv, görsel dosyaları bulur ve gösterir', 'README, kılavuz, API dokümanı, sürüm notu yazar', 'PDF, Excel/CSV, SVG diyagram üretir', 'Var olanı iyileştirir — üzerine yazmadan önce sorar'],
      presets: en
        ? [{ label: 'List all documents', ask: 'List every document in this project (md, pdf, xlsx, csv, images) grouped by type, and note which are outdated.' }, { label: 'Write / improve README', ask: 'Read the code and write or improve README.md (setup, usage, architecture).' }, { label: 'Architecture diagram (SVG)', ask: 'Create docs/architecture.svg showing the main modules and how they connect.' }]
        : [{ label: 'Tüm dokümanları listele', ask: 'Bu projedeki tüm dokümanları (md, pdf, xlsx, csv, görsel) türüne göre listele, hangilerinin eskidiğini belirt.' }, { label: 'README yaz / iyileştir', ask: 'Kodu oku ve README.md’yi yaz ya da iyileştir (kurulum, kullanım, mimari).' }, { label: 'Mimari diyagram (SVG)', ask: 'Ana modülleri ve bağlantılarını gösteren docs/mimari.svg dosyasını üret.' }],
      prompt: (en
        ? 'You are the Documentor. You find, show, create and improve every kind of project document: Markdown, PDF, Excel/CSV, images and diagrams. To list docs, search the repo (ignore node_modules, build, dist). To produce PDF use `pandoc` if available, else generate HTML. For Excel use python3 (openpyxl) or write CSV. For diagrams write SVG (or Mermaid inside Markdown). Base every statement on the actual code. Before overwriting an existing file, show a summary of the change and ask. After writing, list the created/changed files with their paths. '
        : 'Sen Dokümantasyon ajanısın. Projenin her tür dokümanını bulur, gösterir, üretir ve iyileştirirsin: Markdown, PDF, Excel/CSV, görsel ve diyagram. Dokümanları listelemek için depoyu tara (node_modules, build, dist hariç). PDF için varsa `pandoc`, yoksa HTML üret. Excel için python3 (openpyxl) ya da CSV yaz. Diyagram için SVG (ya da Markdown içinde Mermaid) yaz. Her cümleni gerçek koda dayandır. Var olan dosyanın üzerine yazmadan önce değişikliğin özetini göster ve sor. Yazdıktan sonra oluşan/değişen dosyaları yollarıyla listele. ') + common
    },
    {
      id: 'flow', kind: 'flow', builtin: true, name: en ? 'Flow Analyst' : 'Akış Analisti', role: en ? 'Flows · stages · problems' : 'Akışlar · aşamalar · sorunlar',
      color: '#d2a8ff', write: false, tools: ['Bash(git log:*)', 'Bash(git show:*)'],
      abilities: en
        ? ['Maps every flow: entry → stages → output', 'Problems in each stage (from code and history)', 'How each problem was solved (git history)', 'How open problems can be solved']
        : ['Her akışı çıkarır: giriş → aşamalar → çıktı', 'Her aşamadaki sorunları bulur (koddan ve geçmişten)', 'Sorunların nasıl çözüldüğünü gösterir (git geçmişi)', 'Açık sorunların nasıl çözülebileceğini önerir'],
      presets: en
        ? [{ label: 'Map all flows', ask: 'Map every flow in this project as stages, with the files involved.' }, { label: 'Where does it break?', ask: 'For each flow, list the stages that are fragile or broken and why.' }, { label: 'How were bugs fixed?', ask: 'From git history, show which problems were fixed in which flow and how.' }]
        : [{ label: 'Tüm akışları çıkar', ask: 'Bu projedeki tüm akışları aşama aşama, ilgili dosyalarla çıkar.' }, { label: 'Nerede kırılıyor?', ask: 'Her akışta kırılgan ya da bozuk aşamaları ve nedenlerini listele.' }, { label: 'Hatalar nasıl çözüldü?', ask: 'Git geçmişinden hangi akışta hangi sorunun nasıl çözüldüğünü göster.' }],
      prompt: (en
        ? 'You are the Flow Analyst. You explain how the project works as flows. Find entry points (main, routes, controllers, jobs, CLI, event handlers, UI screens) and trace each flow through its stages to its output. For each flow give: a ``` diagram (A → B → C), then a table of stages: stage | what happens | files | problems | status (solved / open). Use `git log --oneline --grep=fix -i` and related commits to show how problems were solved; for open ones propose a concrete solution. You only read. '
        : 'Sen Akış Analistisin. Projenin nasıl çalıştığını akışlar halinde anlatırsın. Giriş noktalarını bul (main, route, controller, job, CLI, olay dinleyici, ekran) ve her akışı aşamalarıyla çıktısına kadar izle. Her akış için: ``` bloğunda diyagram (A → B → C), sonra aşama tablosu: aşama | ne olur | dosyalar | sorunlar | durum (çözüldü / açık). Sorunların nasıl çözüldüğünü göstermek için `git log --oneline --grep=fix -i` ve ilgili commitleri kullan; açık olanlara somut çözüm öner. Sadece okursun. ') + common
    },
    {
      id: 'planner', kind: 'planner', builtin: true, name: en ? 'Planner' : 'Planlayıcı', role: en ? 'Idea → plan → prompts' : 'Fikir → plan → prompt',
      color: '#ffa657', write: false, tools: [],
      abilities: en
        ? ['Questions your idea and strengthens it', 'Finds risks, MVP scope and first steps', '3-4 alternative plans with phases', 'A long, ready-to-use project prompt for each plan']
        : ['Fikrini sorgular ve güçlendirir', 'Riskleri, MVP kapsamını ve ilk adımları çıkarır', 'Aşamalarıyla 3-4 alternatif plan', 'Her plan için uzun, hazır kullanılabilir proje promptu'],
      presets: en
        ? [{ label: 'I have an idea', ask: 'I have a new project idea. Ask me the questions you need first.' }, { label: '3 alternative plans', ask: 'Give me 3 alternative plans for the idea we discussed, each with a full project prompt.' }]
        : [{ label: 'Bir fikrim var', ask: 'Yeni bir proje fikrim var. Önce ihtiyacın olan soruları sor.' }, { label: '3 alternatif plan', ask: 'Konuştuğumuz fikir için 3 alternatif plan çıkar; her biri için tam proje promptu yaz.' }],
      prompt: (en
        ? 'You are the Planner. The user brings an idea for a project that does not exist yet. Take it seriously and make it better. If the idea is vague, first ask 4-7 sharp questions (users, problem, constraints, budget/time, platform) and stop. Otherwise: (1) restate the idea in one paragraph, (2) challenge it — risks, assumptions, competitors, (3) contribute — what would make it stronger, (4) MVP scope and first 5 steps, (5) 3-4 ALTERNATIVE plans (e.g. fastest MVP, scalable, low-cost, AI-first), each with stack, phases with milestones, risks, and a LONG ready-to-paste project prompt in a ``` block (at least 25 lines: goal, users, features, architecture, data model, screens, acceptance criteria). '
        : 'Sen Planlayıcısın. Kullanıcı henüz var olmayan bir proje fikri getirir. Fikri ciddiye al ve daha iyi hale getir. Fikir belirsizse önce 4-7 keskin soru sor (kullanıcılar, sorun, kısıtlar, bütçe/süre, platform) ve dur. Değilse: (1) fikri tek paragrafta yeniden ifade et, (2) sorgula — riskler, varsayımlar, rakipler, (3) katkı ver — fikri ne güçlendirir, (4) MVP kapsamı ve ilk 5 adım, (5) 3-4 ALTERNATİF plan (örn. en hızlı MVP, ölçeklenebilir, düşük maliyetli, yapay zekâ öncelikli); her biri için teknoloji, kilometre taşlı aşamalar, riskler ve ``` bloğunda UZUN, doğrudan yapıştırılabilir proje promptu (en az 25 satır: amaç, kullanıcılar, özellikler, mimari, veri modeli, ekranlar, kabul kriterleri). ') + common
    }
  ];
}

// Eski ATLAS/NAVIGATOR/... ekibini bir defalığına yedekleyip yeni yerleşik ekibe geçirir; kullanıcı ajanları kalır.
function migrateAgents(d) {
  if ((d.agentsVersion | 0) >= AGENTS_VERSION) return false;
  const old = Array.isArray(d.agents) ? d.agents : [];
  try {
    if (old.length) {
      const bdir = path.join(DATA_DIR, 'backups');
      fs.mkdirSync(bdir, { recursive: true });
      const bfile = path.join(bdir, 'agents-v1.json');
      if (!fs.existsSync(bfile)) fs.writeFileSync(bfile, JSON.stringify(old, null, 2), 'utf8');
    }
  } catch (e) {}
  const custom = old.filter(a => a && a.id && !a.builtin && !LEGACY_AGENT_IDS.includes(String(a.id).toLowerCase()));
  const builtins = defaultAgents((d.profile && d.profile.lang) || 'tr');
  d.agents = builtins.concat(custom.filter(a => !builtins.some(b => b.id === a.id)));
  d.agentsVersion = AGENTS_VERSION;
  return true;
}

function loadData() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!d.universes) d.universes = [];
    d.projects = d.projects || {};
    if (!d.agents || !d.agents.length) {
      d.agents = defaultAgents((d.profile && d.profile.lang) || 'tr');
      d.agentsVersion = AGENTS_VERSION;
    } else if (migrateAgents(d)) {
      try { saveData(d); } catch (e) {}
    }
    return d;
  } catch (e) {
    return { universes: [], projects: {}, agents: defaultAgents('tr'), agentsVersion: AGENTS_VERSION };
  }
}

function saveData(data) {
  // Günlük yedek: o günün ilk kaydından önce mevcut dosyanın anlık görüntüsü alınır (14 gün saklanır)
  try {
    const bdir = path.join(DATA_DIR, 'backups');
    fs.mkdirSync(bdir, { recursive: true });
    const today = new Date().toISOString().slice(0, 10);
    const bfile = path.join(bdir, `galaxy-data-${today}.json`);
    if (!fs.existsSync(bfile) && fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, bfile);
      const files = fs.readdirSync(bdir).filter(f => f.startsWith('galaxy-data-')).sort();
      while (files.length > 14) fs.unlinkSync(path.join(bdir, files.shift()));
    }
  } catch (e) {}

  const json = JSON.stringify(data, null, 2);
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  fs.writeFileSync(DATA_FILE, json, 'utf8');
  // Arayüzün açılış tohumu (window.GALAXY_DATA) — geliştirmede uygulama
  // klasörüne de yazılır; paketli app'te o konum salt-okunur olduğundan sessizce atlanır
  try { fs.writeFileSync(path.join(DATA_DIR, 'galaxy-data.js'), 'window.GALAXY_DATA = ' + json + ';', 'utf8'); } catch (e) {}
  try { if (path.resolve(APP_DIR) !== path.resolve(DATA_DIR)) fs.writeFileSync(path.join(APP_DIR, 'galaxy-data.js'), 'window.GALAXY_DATA = ' + json + ';', 'utf8'); } catch (e) {}
  scheduleAutoCommit();
}

// ---------- otomatik git versiyonlama ----------
let commitTimer = null;
function scheduleAutoCommit() {
  clearTimeout(commitTimer);
  commitTimer = setTimeout(autoCommit, 30000); // son kayıttan 30 sn sonra sessiz commit
}
function autoCommit() {
  const gitDir = path.join(DATA_DIR, '.git');
  if (!fs.existsSync(gitDir)) return;
  // bayat kilitleri temizle (yarım kalmış işlemlerden)
  for (const lock of ['HEAD.lock', 'index.lock', path.join('objects', 'maintenance.lock')]) {
    const lp = path.join(gitDir, lock);
    try {
      if (fs.existsSync(lp) && Date.now() - fs.statSync(lp).mtimeMs > 60000) fs.unlinkSync(lp);
    } catch (e) {}
  }
  const { exec } = require('child_process');
  const msg = 'oto: veri güncellemesi ' + new Date().toISOString().slice(0, 16).replace('T', ' ');
  exec(`git add -A && git -c user.name="Project Galaxy" -c user.email="galaxy@local" commit -qm "${msg}"`,
    { cwd: DATA_DIR, env: ENV }, () => { /* değişiklik yoksa sessizce geçer */ });
}

const IGNORE = new Set(['node_modules', '.git', '.DS_Store', 'build', 'dist', '.venv', 'venv', 'myenv', '__pycache__', '.gradle', 'DerivedData', 'Pods']);
// ---------- kullanıcı ayarları (uyarı eşikleri vb.) ----------
const DEFAULT_SETTINGS = { staleDays: 2, planPending: 5, claudePath: '', terminalApp: 'Terminal', sshTimeout: 8, focusMin: 25, assistantBio: '', mcpServers: [], mailBriefTool: '', mailSendTool: '', mailTo: '', mailListTool: '', mailReadTool: '', uiTheme: 'apex' };
function normalizeMcpServers(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, 8).map((s, i) => {
    const args = Array.isArray(s && s.args) ? s.args.map(a => String(a)) : String((s && s.args) || '').split(/\s+/).filter(Boolean);
    const env = (s && typeof s.env === 'object' && !Array.isArray(s.env) && s.env) ? s.env : {};
    return {
      id: String((s && s.id) || ('mcp-' + (i + 1))).slice(0, 40),
      command: String((s && s.command) || '').trim(),
      args,
      env
    };
  }).filter(s => s.command);
}
function getSettings(data) {
  const s = (data && data.settings) || {};
  return {
    staleDays: DEFAULT_SETTINGS.staleDays,
    planPending: DEFAULT_SETTINGS.planPending,
    claudePath: String(s.claudePath || '').trim(),
    terminalApp: (s.terminalApp === 'iTerm') ? 'iTerm' : 'Terminal',
    sshTimeout: Math.min(60, Math.max(3, +s.sshTimeout || DEFAULT_SETTINGS.sshTimeout)),
    focusMin: DEFAULT_SETTINGS.focusMin,
    assistantBio: String(s.assistantBio || '').slice(0, 2000),
    mcpServers: normalizeMcpServers(s.mcpServers),
    mailBriefTool: String(s.mailBriefTool || '').trim(),
    mailSendTool: String(s.mailSendTool || '').trim(),
    mailTo: String(s.mailTo || '').trim(),
    mailListTool: String(s.mailListTool || '').trim(),
    mailReadTool: String(s.mailReadTool || '').trim(),
    uiTheme: 'apex'
  };
}
// Yapılandırılabilir tüketiciler için kısa yardımcılar (her çağrıda güncel ayarı okur)
let _claudeResolved = '';
function claudeLooksBin(p) {
  if (!p) return false;
  try {
    if (!fs.existsSync(p)) return false;
    if (process.platform === 'win32') return true;
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch (e) { return false; }
}
function claudeExpand(p) {
  p = String(p || '').trim();
  if (!p) return '';
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}
function claudeCandidatePaths() {
  const home = os.homedir();
  const win = process.platform === 'win32';
  const names = win ? ['claude.exe', 'claude.cmd', 'claude'] : ['claude'];
  const dirs = [];
  const add = d => { if (d && !dirs.includes(d)) dirs.push(d); };
  if (win) {
    add(path.join(process.env.APPDATA || '', 'npm'));
    add(path.join(process.env.LOCALAPPDATA || '', 'npm'));
    add('C:\\Program Files\\nodejs');
    add(path.join(home, '.local', 'bin'));
  } else {
    add('/opt/homebrew/bin');
    add('/usr/local/bin');
    add(path.join(home, '.local', 'bin'));
  }
  add(path.join(home, '.volta', 'bin'));
  add(path.join(home, '.asdf', 'shims'));
  add(path.join(home, '.fnm', 'aliases', 'default', 'bin'));
  try {
    const nvm = path.join(home, '.nvm', 'versions', 'node');
    if (fs.existsSync(nvm)) for (const v of fs.readdirSync(nvm)) add(path.join(nvm, v, 'bin'));
  } catch (e) {}
  try {
    const fnm = path.join(home, '.local', 'share', 'fnm', 'node-versions');
    if (fs.existsSync(fnm)) for (const v of fs.readdirSync(fnm)) add(path.join(fnm, v, 'installation', 'bin'));
  } catch (e) {}
  if (process.env.npm_config_prefix) add(win ? process.env.npm_config_prefix : path.join(process.env.npm_config_prefix, 'bin'));
  for (const d of String((ENV && ENV.PATH) || '').split(path.delimiter)) add(d);
  const out = [];
  for (const d of dirs) for (const n of names) out.push(path.join(d, n));
  return out;
}
function discoverClaudeSync() {
  for (const p of claudeCandidatePaths()) if (claudeLooksBin(p)) return p;
  try {
    const { execFileSync } = require('child_process');
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const found = String(execFileSync(cmd, ['claude'], { timeout: 3000, env: ENV, encoding: 'utf8' })).trim().split(/\r?\n/)[0] || '';
    if (claudeLooksBin(found)) return found;
  } catch (e) {}
  return '';
}
const { cliSpawn, cliExecFile } = require(path.join(APP_DIR, 'lib', 'cli'));
function npmGlobalClaude() {
  return new Promise(res => {
    execFile('npm', ['prefix', '-g'], { timeout: 2500, env: ENV, shell: process.platform === 'win32', windowsHide: true }, (err, out) => {
      if (err) return res('');
      const prefix = String(out || '').trim();
      if (!prefix) return res('');
      const cand = process.platform === 'win32' ? path.join(prefix, 'claude.cmd') : path.join(prefix, 'bin', 'claude');
      res(claudeLooksBin(cand) ? cand : '');
    });
  });
}
function claudeBin() {
  try {
    const configured = claudeExpand(getSettings(loadData()).claudePath);
    if (configured && path.isAbsolute(configured) && claudeLooksBin(configured)) {
      _claudeResolved = configured; return configured;
    }
    if (_claudeResolved && claudeLooksBin(_claudeResolved)) return _claudeResolved;
    const found = discoverClaudeSync();
    if (found) { _claudeResolved = found; return found; }
    return configured || 'claude';
  } catch (e) { return 'claude'; }
}
function whichClaudeLogin() {
  return new Promise(res => {
    if (process.platform === 'win32') {
      execFile('where', ['claude'], { timeout: 4000, env: ENV, windowsHide: true }, (err, out) => {
        const found = String(out || '').trim().split(/\r?\n/)[0] || '';
        res((!err && claudeLooksBin(found)) ? found : '');
      });
      return;
    }
    const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
    execFile(shell, ['-lc', 'which claude'], { timeout: 5000, env: ENV }, (err, out) => {
      const found = String(out || '').trim().split(/\n/)[0] || '';
      res((!err && claudeLooksBin(found)) ? found : '');
    });
  });
}
function probeClaude(bin) {
  bin = claudeExpand(bin);
  return new Promise(res => {
    if (!bin) return res('');
    if (path.isAbsolute(bin)) return res(claudeLooksBin(bin) ? bin : '');
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFile(cmd, [bin], { timeout: 3000, env: ENV }, (err, out) => {
      const found = String(out || '').trim().split(/\r?\n/)[0] || '';
      res((!err && found) ? found : '');
    });
  });
}
ipcMain.handle('galaxy:claudeCheck', async (e, opts) => {
  const miss = { ok: false, error: 'Claude bulunamadı. Terminalde: npm install -g @anthropic-ai/claude-code — sonra Dene.' };
  try {
    const typed = claudeExpand((opts && opts.path != null) ? opts.path : ((getSettings(loadData()).claudePath) || ''));
    let found = typed ? await probeClaude(typed) : '';
    let discovered = false;
    if (!found) {
      found = discoverClaudeSync() || await npmGlobalClaude() || await whichClaudeLogin();
      if (found) discovered = true;
    }
    if (!found) return miss;
    _claudeResolved = found;
    return { ok: true, path: found, discovered };
  } catch (e) { return miss; }
});

// GitHub CLI oturumu — Takım Akışı'ndaki PR adımları için sağlık sinyali (yalnız okur, değişiklik yapmaz).
ipcMain.handle('galaxy:githubCheck', async () => {
  return await new Promise(res => {
    execFile('gh', ['auth', 'status'], { timeout: 4000 }, (err) => {
      if (!err) return res({ ok: true });
      const msg = String((err && err.message) || '');
      if (/ENOENT/.test(msg)) return res({ ok: false, error: 'gh CLI kurulu değil' });
      res({ ok: false, error: 'gh oturumu yok — gh auth login çalıştır' });
    });
  });
});

// Proaktif uyarılar — deterministik, anında (Claude gerekmez)
function buildAlerts(projects, st) {
  st = st || DEFAULT_SETTINGS;
  const alerts = [];
  for (const p of projects) {
    if (p.status !== 'active') continue;
    const pending = p.plan.filter(i => !i.done).length;
    if (p.staleDays >= st.staleDays) alerts.push({ projectId: p.id, msg: `${p.name}: ${p.staleDays} gündür hareket yok` });
    if (pending >= st.planPending) alerts.push({ projectId: p.id, msg: `${p.name}: ${pending} bekleyen plan maddesi` });
  }
  return alerts.slice(0, 12);
}

// Ajanlar için tüm projelerin kompakt durumu
function buildDigest() {
  const { universes, projects } = scanProjects();
  const lines = [];
  for (const u of universes) {
    lines.push(`## ${u.name}`);
    for (const p of projects.filter(x => x.universe === u.id)) {
      const done = p.plan.filter(i => i.done).length;
      lines.push(`- ${p.name} [${p.status}] %${p.progress} | aşama: ${p.stage || '-'} | plan: ${done}/${p.plan.length} | son değişiklik: ${(p.mtime || '').slice(0, 10)}${p.notes ? ` | not: ${p.notes.slice(0, 140)}` : ''}`);
      for (const it of p.plan.filter(i => !i.done).slice(0, 4)) lines.push(`    bekleyen: ${it.text}`);
    }
  }
  return lines.join('\n');
}

g.defaultAgents = defaultAgents;
g.migrateAgents = migrateAgents;
g.loadData = loadData;
g.saveData = saveData;
g.scheduleAutoCommit = scheduleAutoCommit;
g.autoCommit = autoCommit;
g.normalizeMcpServers = normalizeMcpServers;
g.getSettings = getSettings;
g.claudeBin = claudeBin;
g.discoverClaudeSync = discoverClaudeSync;
g.cliSpawn = cliSpawn;
g.cliExecFile = cliExecFile;
g.buildAlerts = buildAlerts;
g.buildDigest = buildDigest;
g.commitTimer = commitTimer;
g.IGNORE = IGNORE;
g.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  }
};
