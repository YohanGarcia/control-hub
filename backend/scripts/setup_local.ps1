param(
    [switch]$SkipVenv,
    [string]$PythonVersion = "3.11"
)

$ErrorActionPreference = "Stop"

if (-not $SkipVenv) {
    uv venv --python $PythonVersion
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

uv pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path -LiteralPath ".env")) {
    Copy-Item -LiteralPath ".env.example" -Destination ".env"
}

Write-Host "Dependencias instaladas y .env listo." -ForegroundColor Green
