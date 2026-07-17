<#
.SYNOPSIS
    Removes the Discord bot Task Scheduler tasks created by install-tasks.ps1.
    Run from an elevated PowerShell (Run as Administrator).
#>
param([string]$TaskPrefix = 'DiscordBot')

$ErrorActionPreference = 'Stop'

foreach ($name in @("$TaskPrefix-Start", "$TaskPrefix-Watchdog")) {
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
        Write-Host "Removed '$name'."
    } else {
        Write-Host "'$name' not found (already removed)."
    }
}

Write-Host "`nDone. Note: this does not stop a bot that is already running — close it via Task Manager (node.exe) if needed."
