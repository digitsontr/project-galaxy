#!/usr/bin/env python3
"""Sprint J: split main.js into lib/ + ipc/ without changing behavior."""
import json, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
src = (ROOT / 'main.js').read_text(encoding='utf-8')
if "require('./lib/config')" in src:
    raise SystemExit('main.js already split — abort')
lines = src.splitlines(True)

def chunk(a, b):
    return ''.join(lines[a - 1:b])

def assigns_for(body):
    names = []
    for m in re.finditer(r'^(?:async )?function (\w+)', body, re.M):
        names.append(m.group(1))
    for m in re.finditer(r'^(?:const|let|var) (\w+)\s*=', body, re.M):
        names.append(m.group(1))
    seen, out = set(), []
    for n in names:
        if n in seen:
            continue
        seen.add(n)
        out.append('g.%s = %s;' % (n, n))
    return '\n'.join(out)

def write_mod(rel, body):
    body = body.strip('\n') + '\n'
    assigns = assigns_for(body)
    text = (
        "'use strict';\n"
        "// Sprint J — davranış taşındı; kopyalanmadı.\n"
        "module.exports = function register(g) {\n"
        "  Function('g', 'with (g) {\\n' + " + json.dumps(body) + " + '\\n' + " + json.dumps(assigns) + " + '\\n}')(g);\n"
        "};\n"
    )
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')
    print('wrote', rel, 'bytes', len(text), 'bindings', assigns.count('g.'))

write_mod('lib/config.js', chunk(10, 83))
write_mod('lib/data.js', chunk(85, 181) + chunk(479, 554))
write_mod('lib/projects.js', chunk(183, 411))
write_mod('ipc/core.js', chunk(412, 478) + chunk(556, 941) + chunk(3034, 3279))
write_mod('ipc/db-git.js', chunk(942, 1562))
write_mod('ipc/ai-runtime.js', chunk(1563, 2276))
write_mod('ipc/infra.js', chunk(2277, 3011))

win = chunk(3012, 3032)
tail = chunk(3281, len(lines))
main = '''const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, dialog, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const os = require('os');

const g = {
  app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, dialog, safeStorage,
  fs, path, os, spawn, execFile,
  APP_DIR: __dirname,
  IS_MAS: !!process.mas,
  require, process, console, Buffer, setTimeout, clearTimeout, setInterval, clearInterval,
  Map, Set, Promise, JSON, Date, parseInt, parseFloat, isNaN, isFinite, Math, Error, Object, Array,
  String, Number, Boolean, encodeURIComponent, decodeURIComponent, URL, Intl, encodeURI, decodeURI
};

require('./lib/config')(g);
require('./lib/data')(g);
require('./lib/projects')(g);
require('./ipc/core')(g);
require('./ipc/db-git')(g);
require('./ipc/ai-runtime')(g);
require('./ipc/infra')(g);

const {
  APP_DIR, DATA_DIR, IS_MAS, migrateLegacyData, restoreBookmarks,
  needsOnboarding, createOnboardingWindow, autoDetectLocalDbs, openSettingsWindow
} = g;

''' + win + '\n' + tail

(ROOT / 'main.js').write_text(main, encoding='utf-8')
print('wrote main.js bytes', len(main), 'lines', main.count(chr(10)) + 1)
