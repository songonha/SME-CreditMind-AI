#!/usr/bin/env bash
# Run FastAPI with project venv so deps (httpx, etc.) match requirements.txt.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ ! -x .venv/bin/python ]]; then
  echo "[backend] Creating .venv and installing dependencies..."
  python3 -m venv .venv
  .venv/bin/pip install --upgrade pip -q
  .venv/bin/pip install -r requirements.txt
elif ! .venv/bin/python -c "import httpx" 2>/dev/null; then
  echo "[backend] Missing packages in .venv; installing requirements.txt..."
  .venv/bin/pip install -r requirements.txt
fi

exec .venv/bin/python run.py
