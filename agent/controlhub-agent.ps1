param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("install", "configure", "start")]
  [string]$Command,

  [string]$Server,
  [int]$DeviceId,
  [string]$AgentKey,
  [string]$Dir = "$env:USERPROFILE\control-hub-agent"
)

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/YohanGarcia/control-hub.git"
$AgentDir = Join-Path $Dir "agent"
$CredsFile = Join-Path $AgentDir ".agent_credentials.json"
$ServerFile = Join-Path $AgentDir ".server_url"

function Require-Command([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name is required"
  }
}

switch ($Command) {
  "install" {
    Require-Command git
    Require-Command python

    if (-not (Test-Path -LiteralPath $Dir)) {
      git clone --depth 1 $RepoUrl $Dir
    } else {
      git -C $Dir pull --ff-only
    }

    python -m venv "$AgentDir\.venv"
    $PythonExe = Join-Path $AgentDir ".venv\Scripts\python.exe"
    & $PythonExe -m pip install --upgrade pip
    & $PythonExe -m pip install -r (Join-Path $AgentDir "requirements.txt")
    "Install complete: $AgentDir"
  }

  "configure" {
    if ([string]::IsNullOrWhiteSpace($Server) -or $DeviceId -le 0 -or [string]::IsNullOrWhiteSpace($AgentKey)) {
      throw "configure requires -Server, -DeviceId and -AgentKey"
    }
    if (-not (Test-Path -LiteralPath $AgentDir)) {
      throw "Agent is not installed. Run install first."
    }

    $payload = @{ device_id = $DeviceId; agent_key = $AgentKey } | ConvertTo-Json -Compress
    Set-Content -LiteralPath $CredsFile -Value $payload -Encoding UTF8
    Set-Content -LiteralPath $ServerFile -Value $Server -Encoding UTF8
    "Credentials saved: $CredsFile"
    "Server configured: $Server"
  }

  "start" {
    if (-not (Test-Path -LiteralPath $AgentDir)) {
      throw "Agent is not installed. Run install first."
    }
    if (-not (Test-Path -LiteralPath $CredsFile)) {
      throw "Credentials not found. Run configure first."
    }
    if (-not (Test-Path -LiteralPath $ServerFile)) {
      throw "Server URL not found. Run configure first."
    }

    $Server = (Get-Content -LiteralPath $ServerFile -Raw).Trim()
    $PythonExe = Join-Path $AgentDir ".venv\Scripts\python.exe"
    & $PythonExe (Join-Path $AgentDir "agent.py") --server $Server --credentials-file $CredsFile
  }
}
