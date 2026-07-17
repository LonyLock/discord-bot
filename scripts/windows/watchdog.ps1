# Health check: if the bot process is gone (crash / manual kill / after reboot),
# restart it. Intended to run every few minutes via Task Scheduler.
. (Join-Path $PSScriptRoot '_common.ps1')

if (Test-BotRunning) {
    # Healthy — stay quiet to keep the log small. Uncomment to record heartbeats:
    # Write-BotLog 'OK'
    exit 0
}

Write-BotLog 'Bot not running — restarting.'
Start-Bot | Out-Null
