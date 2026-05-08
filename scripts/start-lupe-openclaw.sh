#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/lupe.env"

cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing lupe.env."
  echo "Copy lupe.env.example to lupe.env, fill in LUPE_DASHBOARD_KEY, then run this again."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ -z "${LUPE_DASHBOARD_KEY:-}" || "$LUPE_DASHBOARD_KEY" == "paste-dashboard-api-key-here" ]]; then
  echo "Set LUPE_DASHBOARD_KEY in lupe.env before launching Lupe."
  exit 1
fi

echo "Testing dashboard connection..."
python3 client/test_connection.py

echo "Sending startup heartbeat..."
python3 client/startup.py

echo "Flushing queued dashboard events..."
python3 client/flush_queue.py || true

if [[ "$#" -gt 0 ]]; then
  command=("$@")
elif [[ -n "${LUPE_OPENCLAW_COMMAND:-}" ]]; then
  read -r -a command <<< "$LUPE_OPENCLAW_COMMAND"
else
  command=(tui)
fi

echo "Launching OpenClaw: openclaw ${command[*]}"
exec openclaw "${command[@]}"
