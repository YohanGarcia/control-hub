# Backend (FastAPI)

## Setup rapido

### Opcion A: con uv (recomendada si ya lo usas)

```bash
uv venv
uv pip install -r requirements.txt
```

Tambien puedes usar script en PowerShell:

```powershell
./scripts/setup_local.ps1
```

Si tienes varias versiones de Python instaladas:

```powershell
./scripts/setup_local.ps1 -PythonVersion 3.11
```

### Opcion B: con pip clasico

1. Crear entorno virtual Python 3.11+.
2. Instalar dependencias:

```bash
pip install -r requirements.txt
```

3. Copiar `.env.example` a `.env` y ajustar valores.
4. Ejecutar migraciones:

```bash
alembic upgrade head
```

5. Iniciar API:

```bash
uvicorn app.main:app --reload
```

Base URL: `http://127.0.0.1:8000`

## Arranque rapido en Windows (sin Docker)

```powershell
./scripts/setup_local.ps1
./scripts/run_dev.ps1
```

Scripts utilitarios:

- `./scripts/migrate.ps1` aplica migraciones
- `./scripts/test.ps1` ejecuta tests
- `./scripts/dev.ps1` setup + migrate + run

CI:

- Workflow GitHub Actions: `.github/workflows/backend-tests.yml`

## Bootstrap admin local

Con la DB ya migrada:

```powershell
uv run python scripts/bootstrap_admin.py
```

Credenciales iniciales:

- Email: `admin@controlhub.app`
- Password temporal: la que configures al bootstrap

Luego configura 2FA con `POST /api/v1/auth/setup-2fa` y cambia la password inmediatamente.

## Flujo inicial seguro

1. `POST /api/v1/auth/setup-2fa`
2. `POST /api/v1/auth/change-password`
3. `POST /api/v1/auth/login`

`/auth/login` bloquea acceso hasta completar cambio de password inicial.
Tambien aplica bloqueo progresivo por intentos fallidos (IP + email).

## Endpoints utiles nuevos

- `GET /api/v1/devices/{device_id}/metrics?offset=0&limit=100&from_ts=<iso>&to_ts=<iso>`
- `GET /api/v1/audit/events?offset=0&limit=50`

Handshake de agente WS requiere query:

- `device_id`, `agent_key`, `ts`, `nonce`, `sig`
