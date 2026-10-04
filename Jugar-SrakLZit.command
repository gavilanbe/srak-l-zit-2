#!/bin/zsh
# Arranca SRAK L ZIT en el navegador.
cd "$(dirname "$0")"
( sleep 1; open "http://localhost:8766/" ) &
exec python3 tools/serve.py
