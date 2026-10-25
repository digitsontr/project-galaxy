#!/usr/bin/env python3
# Gerçek PTY köprüsü: stdin/stdout bir soket olsa bile kabuğa tty verir.
# Electron spawn() pipe kullandığı için macOS `script` (tcgetattr) patlıyor.
import os, pty, sys
cwd = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
shell = sys.argv[2] if len(sys.argv) > 2 else os.environ.get('SHELL', '/bin/zsh')
cols = sys.argv[3] if len(sys.argv) > 3 else '100'
rows = sys.argv[4] if len(sys.argv) > 4 else '30'
try:
    os.chdir(cwd)
except OSError:
    pass
os.environ['TERM'] = os.environ.get('TERM') or 'xterm-256color'
os.environ['COLUMNS'] = cols
os.environ['LINES'] = rows
# login_shell değil: proje cwd'si korunsun
pty.spawn([shell, '-i'])
