'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function readJsonString(s, i) {
  if (s[i] !== '"') throw new Error('expected quote at ' + i + ' in slice ' + JSON.stringify(s.slice(i, i + 40)));
  const m = s.slice(i).match(/^"(?:\\.|[^"\\])*"/);
  if (!m) throw new Error('json string parse fail');
  return { value: JSON.parse(m[0]), rawLen: m[0].length };
}

function patchWrapped(file, fn) {
  const abs = path.join(ROOT, file);
  const src = fs.readFileSync(abs, 'utf8');
  const marker = "Function('g', 'with (g) {\\n' + ";
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('no wrapper in ' + file);
  const start = i + marker.length;
  const first = readJsonString(src, start);
  const body = fn(first.value);
  if (typeof body !== 'string') throw new Error('patch did not return string');
  fs.writeFileSync(abs, src.slice(0, start) + JSON.stringify(body) + src.slice(start + first.rawLen));
}

const CLEAN_OLD = `function cleanAgentSql(raw) {
  let s = String(raw || '').trim();
  // \`\`\` veya \`\`\`sql çitlerini ayıkla
  const fence = s.match(/\`\`\`(?:sql)?\\s*([\\s\\S]*?)\`\`\`/i);
  if (fence) s = fence[1].trim();
  // baştaki "SQL:" gibi etiketleri at
  s = s.replace(/^\\s*(sql|sorgu|query)\\s*[:\\-]\\s*/i, '').trim();
  return s;
}`;

const CLEAN_NEW = `function agentReplyLooksLikeError(s) {
  const t = String(s || '');
  if (!t.trim()) return false;
  return /session limit|rate limit|quota|credit|usage limit|out of extra|please.?retry|try again later|authentication|not logged in|api.?key|unauthorized|forbidden|overloaded|capacity|you'?ve hit|you have hit|resets \\d|billing|payment required|insufficient|invalid.?api|not_authorized|permission denied/i.test(t)
    || /^(error|hata|failed|başarısız)\\b/i.test(t.trim())
    || /i('m| am) (sorry|unable|not able)/i.test(t);
}
function isPlausibleSql(s) {
  const t = String(s || '').trim().replace(/;+\\s*$/,'');
  if (!t || t.length > 20000) return false;
  return /^(with|select|insert|update|delete|replace|merge|create|drop|alter|truncate|explain|analyze|show|describe|desc|pragma|call|do|begin|values)\\b/i.test(t)
    || /^\\(\\s*select\\b/i.test(t);
}
function parseAgentSql(raw) {
  const original = String(raw || '').trim();
  if (!original) return { error: 'Ajan boş yanıt verdi' };
  const short = original.replace(/\\s+/g, ' ').slice(0, 220);
  if (agentReplyLooksLikeError(original)) {
    if (/session limit|you'?ve hit|usage limit|quota|credit/i.test(original))
      return { error: 'Ajan kotası doldu — SQL üretilmedi, sorgu çalıştırılmadı. ' + short };
    if (/rate limit|overloaded|capacity/i.test(original))
      return { error: 'Ajan meşgul / rate limit — SQL çalıştırılmadı. ' + short };
    if (/auth|api.?key|not logged|unauthorized|not_authorized/i.test(original))
      return { error: 'Ajan oturumu yok veya API anahtarı geçersiz. Ayarlar’dan Claude’u kontrol et.' };
    return { error: 'Ajan SQL yerine mesaj döndü — sorgu çalıştırılmadı. ' + short };
  }
  let s = original;
  const fence = s.match(/\`\`\`(?:sql)?\\s*([\\s\\S]*?)\`\`\`/i);
  if (fence) s = fence[1].trim();
  s = s.replace(/^\\s*(sql|sorgu|query)\\s*[:\\-]\\s*/i, '').trim();
  if (!isPlausibleSql(s)) {
    const buried = s.match(/(?:^|\\n)\\s*((?:with|select|insert|update|delete|replace|merge|create|drop|alter|truncate|explain|show|describe|pragma)\\b[\\s\\S]+)/i);
    if (buried) s = buried[1].trim();
  }
  const semi = s.search(/;\\s*(?:\\n|$)/);
  if (semi >= 0) s = s.slice(0, semi).trim();
  if (!isPlausibleSql(s)) return { error: 'Ajan geçerli SQL üretmedi; yanıt çalıştırılmadı. ' + short };
  return { sql: s };
}
function cleanAgentSql(raw) {
  const p = parseAgentSql(raw);
  return p.sql || '';
}`;

// CLEAN_NEW is a JS template where I doubled backslashes for regexes that need to exist
// in the *decoded* body. The decoded body currently has real regex \s as two-char \\s
// wait: decoded body is the actual JS that runs. In that JS, regex is /\s/ i.e. backslash-s.
// So CLEAN_NEW as a JS template literal: `\\s` becomes \s in the string we insert into the body. Correct.

patchWrapped('ipc/db-git.js', (body) => {
  if (!body.includes('function cleanAgentSql')) throw new Error('cleanAgentSql missing in decoded body');
  if (!body.includes(CLEAN_OLD)) {
    // show nearby for debug
    const p = body.indexOf('function cleanAgentSql');
    console.error('OLD not found. Have:\n', JSON.stringify(body.slice(p, p + 420)));
    throw new Error('cleanAgentSql old block mismatch');
  }
  let next = body.replace(CLEAN_OLD, CLEAN_NEW);
  const oldUse = "  const sql = cleanAgentSql(gen.text);\n  if (!sql) return { ok: false, error: 'Ajan geçerli SQL üretemedi', request };";
  const newUse = "  const parsed = parseAgentSql(gen.text);\n  if (parsed.error || !parsed.sql) return { ok: false, error: (parsed && parsed.error) || 'Ajan geçerli SQL üretemedi', request };\n  const sql = parsed.sql;";
  if (!next.includes(oldUse)) {
    const p = next.indexOf('cleanAgentSql(gen.text)');
    console.error('use not found. Have:\n', JSON.stringify(next.slice(p - 20, p + 280)));
    throw new Error('cleanAgentSql use-site mismatch');
  }
  next = next.replace(oldUse, newUse);
  return next;
});

patchWrapped('ipc/ai-runtime.js', (body) => {
  const old = "      try { resolve({ text: (JSON.parse(out).result || '').trim() }); }\n      catch (err) { resolve({ error: 'yanıt çözümlenemedi' }); }";
  const neu = "      try {\n        const j = JSON.parse(out);\n        const text = String((j && (j.result || j.error || j.message)) || '').trim();\n        if (j && (j.is_error || j.subtype === 'error' || j.type === 'error')) return resolve({ error: text || 'ajan hatası', text });\n        resolve({ text });\n      } catch (err) { resolve({ error: 'yanıt çözümlenemedi' }); }";
  if (!body.includes(old)) {
    const p = body.indexOf('JSON.parse(out)');
    console.error('claude parse not found. Have:\n', JSON.stringify(body.slice(p - 80, p + 200)));
    throw new Error('runClaudeText parse mismatch');
  }
  return body.replace(old, neu);
});

console.log('patched ipc/db-git.js and ipc/ai-runtime.js');
