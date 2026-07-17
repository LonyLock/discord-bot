# Shared helpers for the Discord bot Windows autostart / watchdog scripts.
# Dot-sourced by start-bot.ps1, watchdog.ps1 and status-bot.ps1.

$ErrorActionPreference = 'Stop'

# Repo root = two levels up from scripts/windows/.
$script:Root      = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:IndexPath = Join-Path $Root 'src\index.js'
$script:LogDir    = Join-Path $Root 'logs'
$script:LogFile   = Join-Path $LogDir 'watchdog.log'

function Write-BotLog {
    param([string]$Message)
    if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LogFile -Value "[$ts] $Message"
}

# Find the node.exe process running THIS bot (matches src\index.js in its command line).
function Get-BotProcess {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains($IndexPath) }
}

function Test-BotRunning { [bool](Get-BotProcess) }

# Locate node.exe. Falls back to common install dirs since a Scheduler task may
# run without the interactive user's PATH.
function Resolve-NodePath {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in @(
            (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
            (Join-Path ${env:ProgramFiles(x86)} 'nodejs\node.exe'),
            (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe'))) {
        if ($p -and (Test-Path $p)) { return $p }
    }
    throw 'node.exe not found on PATH. Install Node.js (all users) or edit Resolve-NodePath in _common.ps1.'
}

# Start the bot if it is not already running. Returns $true if it launched a new instance.
function Start-Bot {
    if (Test-BotRunning) { return $false }
    $node = Resolve-NodePath
    Start-Process -FilePath $node -ArgumentList "`"$IndexPath`"" -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
    Write-BotLog "Started bot (node: $node)"
    return $true
}
