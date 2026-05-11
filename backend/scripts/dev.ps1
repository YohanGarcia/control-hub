$ErrorActionPreference = "Stop"

powershell -ExecutionPolicy Bypass -File ".\scripts\setup_local.ps1" -SkipVenv
powershell -ExecutionPolicy Bypass -File ".\scripts\migrate.ps1"
powershell -ExecutionPolicy Bypass -File ".\scripts\run_dev.ps1"
