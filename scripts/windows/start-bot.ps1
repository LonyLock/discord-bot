# Starts the bot (which also runs the embedded web dashboard and every module)
# if it is not already running. Safe to run repeatedly.
. (Join-Path $PSScriptRoot '_common.ps1')

if (Start-Bot) {
    Write-Host 'Bot started.'
} else {
    Write-Host 'Bot is already running.'
}
