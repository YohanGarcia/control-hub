param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("install", "configure", "start", "install-service", "uninstall-service", "start-service", "stop-service", "restart-service", "status")]
  [string]$Command,

  [string]$Server,
  [int]$DeviceId,
  [string]$AgentKey,
  [string]$Dir = "$env:USERPROFILE\control-hub-agent"
)

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/YohanGarcia/control-hub.git"
$ServiceName = "ControlHubAgent"
$AgentDir = Join-Path $Dir "agent"
$CredsFile = Join-Path $AgentDir ".agent_credentials.json"
$ServerFile = Join-Path $AgentDir ".server_url"

function Require-Command([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name is required"
  }
}

function Ensure-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "This command requires Administrator PowerShell. Re-run as Administrator."
  }
}

function Ensure-AgentConfigured {
  if (-not (Test-Path -LiteralPath $AgentDir)) {
    throw "Agent is not installed. Run install first."
  }
  if (-not (Test-Path -LiteralPath $CredsFile)) {
    throw "Credentials not found. Run configure first."
  }
  if (-not (Test-Path -LiteralPath $ServerFile)) {
    throw "Server URL not found. Run configure first."
  }
}

function Get-AgentPythonPath {
  return Join-Path $AgentDir ".venv\Scripts\python.exe"
}

function Get-AgentScriptPath {
  return Join-Path $AgentDir "agent.py"
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
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($CredsFile, $payload, $utf8NoBom)
    [System.IO.File]::WriteAllText($ServerFile, $Server, $utf8NoBom)
    "Credentials saved: $CredsFile"
    "Server configured: $Server"
  }

  "start" {
    Ensure-AgentConfigured

    $Server = (Get-Content -LiteralPath $ServerFile -Raw).Trim()
    $PythonExe = Get-AgentPythonPath
    & $PythonExe (Join-Path $AgentDir "agent.py") --server $Server --credentials-file $CredsFile
  }

  "install-service" {
    Ensure-Admin
    Ensure-AgentConfigured

    $PythonExe = Get-AgentPythonPath
    $AgentScript = Get-AgentScriptPath
    $Server = (Get-Content -LiteralPath $ServerFile -Raw).Trim()

    if (-not (Test-Path -LiteralPath $PythonExe)) {
      throw "Python virtual environment not found. Run install first."
    }

    $existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existing) {
      throw "Service '$ServiceName' already exists. Use restart-service or uninstall-service first."
    }

    $binPath = "`"$PythonExe`" `"$AgentScript`" --server `"$Server`" --credentials-file `"$CredsFile`""
    & sc.exe create $ServiceName binPath= $binPath start= auto DisplayName= "Control Hub Agent" | Out-Null
    & sc.exe description $ServiceName "Control Hub device agent service" | Out-Null
    "Service installed: $ServiceName"
    "Use: .\controlhub-agent.ps1 start-service"
  }

  "uninstall-service" {
    Ensure-Admin
    $existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $existing) {
      "Service '$ServiceName' is not installed."
      break
    }

    if ($existing.Status -ne "Stopped") {
      & sc.exe stop $ServiceName | Out-Null
      Start-Sleep -Seconds 2
    }

    & sc.exe delete $ServiceName | Out-Null
    "Service removed: $ServiceName"
  }

  "start-service" {
    Ensure-Admin
    & sc.exe start $ServiceName | Out-Null
    "Service start requested: $ServiceName"
  }

  "stop-service" {
    Ensure-Admin
    & sc.exe stop $ServiceName | Out-Null
    "Service stop requested: $ServiceName"
  }

  "restart-service" {
    Ensure-Admin
    & sc.exe stop $ServiceName | Out-Null
    Start-Sleep -Seconds 2
    & sc.exe start $ServiceName | Out-Null
    "Service restarted: $ServiceName"
  }

  "status" {
    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $svc) {
      "Service '$ServiceName' is not installed."
      break
    }
    "Service: $($svc.Name)"
    "Status: $($svc.Status)"
    "StartType: $($svc.StartType)"
  }
}
