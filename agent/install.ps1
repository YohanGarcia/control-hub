param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [Parameter(Mandatory = $true)]
  [int]$DeviceId,

  [Parameter(Mandatory = $true)]
  [string]$AgentKey,

  [string]$TargetDir = "$env:USERPROFILE\control-hub-agent"
)

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/YohanGarcia/control-hub.git"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is required"
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw "python is required"
}

if (-not (Test-Path -LiteralPath $TargetDir)) {
  git clone --depth 1 $RepoUrl $TargetDir
} else {
  git -C $TargetDir pull --ff-only
}

$AgentDir = Join-Path $TargetDir "agent"
python -m venv "$AgentDir\.venv"

$PythonExe = Join-Path $AgentDir ".venv\Scripts\python.exe"
& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install -r (Join-Path $AgentDir "requirements.txt")

Write-Host "Starting Control Hub agent..."
& $PythonExe (Join-Path $AgentDir "agent.py") --server $Server --device-id $DeviceId --agent-key $AgentKey
