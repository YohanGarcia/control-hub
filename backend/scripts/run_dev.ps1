param(
    [int]$Port = 8001
)

$ErrorActionPreference = "Stop"

uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port $Port
