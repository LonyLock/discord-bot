# Shows whether the bot is running and the last few watchdog log lines.
. (Join-Path $PSScriptRoot '_common.ps1')

$proc = Get-BotProcess
if ($proc) {
    Write-Host ("Bot is RUNNING (PID {0}, started {1})." -f $proc.ProcessId, $proc.CreationDate) -ForegroundColor Green
} else {
    Write-Host 'Bot is NOT running.' -ForegroundColor Yellow
}

if (Test-Path $LogFile) {
    Write-Host "`nLast log lines ($LogFile):"
    Get-Content $LogFile -Tail 10
}
