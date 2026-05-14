#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/YohanGarcia/control-hub.git"
TARGET_DIR="${HOME}/control-hub-agent"

SERVER_URL=""
DEVICE_ID=""
AGENT_KEY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server)
      SERVER_URL="$2"
      shift 2
      ;;
    --device-id)
      DEVICE_ID="$2"
      shift 2
      ;;
    --agent-key)
      AGENT_KEY="$2"
      shift 2
      ;;
    --dir)
      TARGET_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$SERVER_URL" || -z "$DEVICE_ID" || -z "$AGENT_KEY" ]]; then
  echo "Usage: install.sh --server <url> --device-id <id> --agent-key <key> [--dir <path>]"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required"
  exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  git clone --depth 1 "$REPO_URL" "$TARGET_DIR"
else
  git -C "$TARGET_DIR" pull --ff-only
fi

cd "$TARGET_DIR/agent"
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

echo "Starting Control Hub agent..."
exec python agent.py --server "$SERVER_URL" --device-id "$DEVICE_ID" --agent-key "$AGENT_KEY"
