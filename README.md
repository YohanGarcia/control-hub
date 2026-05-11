# Control Hub

Control Hub is an open-source platform to monitor and control remote devices (Windows/Linux) from a single app.

- Backend: FastAPI + PostgreSQL + Redis + WebSocket
- Client: Flutter (Web, Windows, Android, iOS)
- Agent: Python daemon for managed devices
- Security model: JWT + refresh tokens + TOTP 2FA + audit trail

## Repository structure

```text
control-hub/
  backend/      # FastAPI API, auth, WebSocket hub, actions
  agent/        # Python remote agent
  app_flutter/  # Flutter UI (web, desktop, mobile)
  infra/        # Docker Compose + Nginx deployment configs
  docs/         # Product and API notes
```

## Quick start (local)

Requirements:

- Python 3.11+
- Flutter SDK
- PostgreSQL + Redis

1) Start backend:

```bash
cd backend
cp .env.example .env
# set JWT_SECRET_KEY and database/redis settings
./scripts/setup_local.ps1
./scripts/run_dev.ps1
```

2) Start agent on a managed device:

```bash
cd agent
python -m pip install -r requirements.txt
python agent.py --server http://127.0.0.1:8001 --device-id <ID> --agent-key <AGENT_KEY>
```

3) Start Flutter app:

```bash
cd app_flutter
flutter pub get
flutter run
```

## Raspberry Pi deployment (single host)

For a lightweight all-in-one host (web + api + db + redis on same server):

```bash
cd app_flutter
flutter build web --release
cd ../infra
docker compose -f docker-compose.rpi.yml up -d --build
```

Use Tailscale or local IP when you do not have a public domain yet.

## Open source collaboration

- Contribution guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- License: `LICENSE`

## Security note before publishing

- Commit `backend/.env.example`, never commit `backend/.env`.
- Rotate any local keys/tokens used during development before making the repo public.
