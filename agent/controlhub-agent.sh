#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/YohanGarcia/control-hub.git"
INSTALL_DIR_DEFAULT="${HOME}/control-hub-agent"

usage() {
  cat <<'EOF'
Usage:
  controlhub-agent.sh install [--dir <path>]
  controlhub-agent.sh configure --server <url> --device-id <id> --agent-key <key> [--dir <path>]
  controlhub-agent.sh start [--dir <path>]

Commands:
  install    Download/update agent repository and install dependencies.
  configure  Save credentials for future starts.
  start      Run the agent using saved credentials.
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required"
    exit 1
  fi
}

cmd="${1:-}"
if [[ -z "$cmd" ]]; then
  usage
  exit 1
fi
shift || true

install_dir="$INSTALL_DIR_DEFAULT"
server=""
device_id=""
agent_key=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      install_dir="$2"
      shift 2
      ;;
    --server)
      server="$2"
      shift 2
      ;;
    --device-id)
      device_id="$2"
      shift 2
      ;;
    --agent-key)
      agent_key="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

agent_dir="$install_dir/agent"
creds_file="$agent_dir/.agent_credentials.json"

case "$cmd" in
  install)
    require_cmd git
    require_cmd python3

    if [[ ! -d "$install_dir" ]]; then
      git clone --depth 1 "$REPO_URL" "$install_dir"
    else
      git -C "$install_dir" pull --ff-only
    fi

    cd "$agent_dir"
    python3 -m venv .venv
    source .venv/bin/activate
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    echo "Install complete: $agent_dir"
    ;;

  configure)
    if [[ -z "$server" || -z "$device_id" || -z "$agent_key" ]]; then
      echo "configure requires --server --device-id --agent-key"
      exit 1
    fi
    if [[ ! -d "$agent_dir" ]]; then
      echo "Agent is not installed. Run install first."
      exit 1
    fi

    mkdir -p "$agent_dir"
    cat > "$creds_file" <<EOF
{"device_id": $device_id, "agent_key": "$agent_key"}
EOF
    chmod 600 "$creds_file" || true
    echo "Credentials saved: $creds_file"
    echo "Server configured: $server"
    printf "%s\n" "$server" > "$agent_dir/.server_url"
    ;;

  start)
    if [[ ! -d "$agent_dir" ]]; then
      echo "Agent is not installed. Run install first."
      exit 1
    fi
    if [[ ! -f "$creds_file" ]]; then
      echo "Credentials not found. Run configure first."
      exit 1
    fi
    if [[ ! -f "$agent_dir/.server_url" ]]; then
      echo "Server URL not found. Run configure first."
      exit 1
    fi

    server="$(cat "$agent_dir/.server_url")"
    cd "$agent_dir"
    source .venv/bin/activate
    exec python agent.py --server "$server" --credentials-file "$creds_file"
    ;;

  *)
    echo "Unknown command: $cmd"
    usage
    exit 1
    ;;
esac
