#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${LUPE_ENV_FILE:-$ROOT_DIR/lupe.env}"
SECRETS_FILE="${LUPE_SECRETS_FILE:-${OPENCLAW_SECRETS_FILE:-$HOME/.openclaw/.env.secrets}}"

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$file"
    set +a
  fi
}

cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing lupe.env."
  echo "Copy lupe.env.example to lupe.env, fill in LUPE_DASHBOARD_KEY, then run this again."
  exit 1
fi

load_env_file "$ENV_FILE"
load_env_file "$SECRETS_FILE"

if [[ -z "${LUPE_DASHBOARD_KEY:-}" || "$LUPE_DASHBOARD_KEY" == "paste-dashboard-api-key-here" ]]; then
  echo "Set LUPE_DASHBOARD_KEY in lupe.env before launching Lupe."
  exit 1
fi

if [[ -z "${LUPE_API_TOKEN:-}" ]]; then
  echo "Warning: LUPE_API_TOKEN is not set. Xyren content approvals will fail before reaching the API."
  echo "Add LUPE_API_TOKEN to lupe.env or $SECRETS_FILE for cron/non-interactive OpenClaw runs."
fi

if [[ "${LUPE_OPENCLAW_DRY_RUN:-}" == "1" ]]; then
  echo "OpenClaw launcher dry run complete."
  exit 0
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
