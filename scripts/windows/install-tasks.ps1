<#
.SYNOPSIS
    Registers Windows Task Scheduler tasks that auto-start the Discord bot (with its
    embedded web dashboard and all modules) at boot, and restart it if it stops.

.DESCRIPTION
    Creates two tasks, running as the current user whether logged on or not (S4U —
    no stored password), with highest privileges:

      <prefix>-Start     -> runs at system startup, launches the bot.
      <prefix>-Watchdog  -> at startup and every N minutes, restarts the bot if it is down.

    Run this ONCE from an ELEVATED PowerShell (Run as Administrator).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install-tasks.ps1
    powershell -ExecutionPolicy Bypass -File .\install-tasks.ps1 -WatchdogMinutes 2
#>
param(
    [int]$WatchdogMinutes = 3,
    [string]$TaskPrefix = 'DiscordBot'
)

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
    throw 'Run this script from an elevated PowerShell (right-click -> Run as Administrator).'
}

$here        = $PSScriptRoot
$startScript = Join-Path $here 'start-bot.ps1'
$watchScript = Join-Path $here 'watchdog.ps1'
$startName   = "$TaskPrefix-Start"
$watchName   = "$TaskPrefix-Watchdog"

function New-PsAction {
    param([string]$ScriptPath)
    New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""
}

# Run as the current user, whether logged on or not, no stored password, elevated.
$userId    = "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType S4U -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -MultipleInstances IgnoreNew

# --- Start-at-boot task ---
$startTrigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName $startName -Action (New-PsAction $startScript) `
    -Trigger $startTrigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Registered '$startName' (runs at startup)."

# --- Watchdog task: at startup + repeat every N minutes (~indefinitely) ---
$repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes $WatchdogMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 3650)).Repetition
$watchTrigger = New-ScheduledTaskTrigger -AtStartup
$watchTrigger.Repetition = $repetition
Register-ScheduledTask -TaskName $watchName -Action (New-PsAction $watchScript) `
    -Trigger $watchTrigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Registered '$watchName' (checks every $WatchdogMinutes min; restarts if down)."

Write-Host "`nDone. The bot auto-starts on boot and is restarted within $WatchdogMinutes minute(s) if it crashes."
Write-Host "Start it now without rebooting:  Start-ScheduledTask -TaskName '$startName'"
Write-Host "Logs: $(Join-Path (Resolve-Path (Join-Path $here '..\..')) 'logs\watchdog.log')"
