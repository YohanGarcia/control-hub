$ErrorActionPreference = "Stop"

$env:PYTHONPATH = "."
uv run pytest -q
