#!/bin/zsh
# Arranca SRAK L ZIT en el navegador.
cd "$(dirname "$0")"
# pone al día la versión y la caché para jugar sin conexión
command -v node >/dev/null && node tools/pwa.mjs
( sleep 1; open "http://localhost:8766/" ) &
exec python3 tools/serve.py
