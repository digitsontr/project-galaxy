'use strict';
// Galaxy MCP stdio JSON-RPC istemcisi — initialize → tools/list → tools/call.
// OAuth / şifre MCP sürecinin işi; Galaxy yalnızca komut + args + env taşır.

const { cliSpawn } = require('./cli');

const PROTOCOL = '2024-11-05';

function parseEnv(env) {
  if (!env) return {};
  if (typeof env === 'object' && !Array.isArray(env)) {
    const out = {};
    for (const k of Object.keys(env)) {
      const v = env[k];
      if (v == null) continue;
      out[String(k)] = String(v);
    }
    return out;
  }
  const out = {};
  String(env).split(/\r?\n/).forEach(line => {
    const s = line.trim();
    if (!s || s.startsWith('#')) return;
    const i = s.indexOf('=');
    if (i <= 0) return;
    out[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  });
  return out;
}

function splitArgs(args) {
  if (Array.isArray(args)) return args.map(a => String(a));
  const s = String(args || '').trim();
  if (!s) return [];
  const out = [];
  let cur = '', q = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === q) q = '';
      else cur += c;
    } else if (c === '"' || c === "'") q = c;
    else if (/\s/.test(c)) { if (cur) { out.push(cur); cur = ''; } }
    else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

class McpClient {
  constructor({ command, args, env, timeoutMs, extraEnv }) {
    this.command = String(command || '').trim();
    this.args = splitArgs(args);
    this.envPatch = parseEnv(env);
    this.extraEnv = extraEnv || process.env;
    this.timeoutMs = timeoutMs || 25000;
    this.child = null;
    this.buf = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map();
    this.closed = false;
  }

  start() {
    if (!this.command) return Promise.reject(new Error('MCP komutu boş'));
    return new Promise((resolve, reject) => {
      try {
        this.child = cliSpawn(this.command, this.args, {
          env: { ...this.extraEnv, ...this.envPatch },
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (err) {
        return reject(err);
      }
      this.child.on('error', err => {
        if (!this.closed) reject(err);
      });
      this.child.stdout.on('data', chunk => this._onData(chunk));
      this.child.stderr.on('data', () => {});
      this.child.on('close', () => {
        this.closed = true;
        for (const [, p] of this.pending) p.reject(new Error('MCP süreci kapandı'));
        this.pending.clear();
      });
      // spawn senkron başarılıysa bir tick sonra hazır
      setImmediate(resolve);
    });
  }

  _onData(chunk) {
    this.buf = Buffer.concat([this.buf, Buffer.from(chunk)]);
    for (;;) {
      const nl = this.buf.indexOf(10); // '\n'
      if (nl < 0) return;
      const line = this.buf.slice(0, nl).toString('utf8').replace(/\r$/, '');
      this.buf = this.buf.slice(nl + 1);
      if (!line.trim()) continue;
      let msg;
      try { msg = JSON.parse(line); } catch (e) { continue; }
      if (msg && msg.id != null && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      }
    }
  }

  request(method, params) {
    const id = this.nextId++;
    const payload = { jsonrpc: '2.0', id, method, params: params || {} };
    const line = JSON.stringify(payload) + '\n';
    return new Promise((resolve, reject) => {
      if (!this.child || this.closed) return reject(new Error('MCP bağlı değil'));
      const t = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('MCP zaman aşımı: ' + method));
      }, this.timeoutMs);
      this.pending.set(id, {
        resolve: r => { clearTimeout(t); resolve(r); },
        reject: e => { clearTimeout(t); reject(e); }
      });
      try { this.child.stdin.write(line); } catch (err) { clearTimeout(t); this.pending.delete(id); reject(err); }
    });
  }

  notify(method, params) {
    const payload = { jsonrpc: '2.0', method, params: params || {} };
    const line = JSON.stringify(payload) + '\n';
    try { this.child.stdin.write(line); } catch (e) {}
  }

  async initialize() {
    const result = await this.request('initialize', {
      protocolVersion: PROTOCOL,
      capabilities: {},
      clientInfo: { name: 'galaxy', version: '1.0.0' }
    });
    this.notify('notifications/initialized', {});
    return result;
  }

  async listTools() {
    const r = await this.request('tools/list', {});
    return (r && r.tools) || [];
  }

  async callTool(name, args) {
    return this.request('tools/call', { name, arguments: args || {} });
  }

  stop() {
    this.closed = true;
    try { if (this.child && !this.child.killed) this.child.kill(); } catch (e) {}
    this.child = null;
  }
}

async function withClient(spec, fn, extraEnv) {
  const c = new McpClient({
    command: spec.command,
    args: spec.args,
    env: spec.env,
    extraEnv: extraEnv || process.env,
    timeoutMs: spec.timeoutMs
  });
  try {
    await c.start();
    await c.initialize();
    return await fn(c);
  } finally {
    c.stop();
  }
}

module.exports = { McpClient, withClient, parseEnv, splitArgs };
