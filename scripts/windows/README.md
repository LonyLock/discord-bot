# Windows autostart & watchdog

Runs the bot — which includes the **web dashboard and every module in a single
`node src/index.js` process** — automatically on boot, and restarts it if it
crashes, using **Windows Task Scheduler**.

## Files
| Script | Purpose |
|--------|---------|
| `install-tasks.ps1` | Registers the two scheduled tasks (run once, **as Administrator**) |
| `uninstall-tasks.ps1` | Removes the tasks |
| `start-bot.ps1` | Starts the bot if it isn't already running |
| `watchdog.ps1` | Restarts the bot if it's down (run by the scheduler every few minutes) |
| `status-bot.ps1` | Shows whether the bot is running + recent log lines |
| `_common.ps1` | Shared helpers (dot-sourced) |

## One-time setup
1. Make sure the bot runs manually first: `npm install`, fill in `.env`
   (set `DASHBOARD_ENABLED=true` for the web dashboard), and `npm start` works.
2. Open **PowerShell as Administrator**, then:
   ```powershell
   cd path\to\discord-bot\scripts\windows
   powershell -ExecutionPolicy Bypass -File .\install-tasks.ps1
   ```
   Optional: `-WatchdogMinutes 2` (check interval), `-TaskPrefix MyBot` (task names).
3. Start it now without rebooting:
   ```powershell
   Start-ScheduledTask -TaskName DiscordBot-Start
   ```

## What it does
- **`DiscordBot-Start`** — at every system startup, launches the bot (hidden).
- **`DiscordBot-Watchdog`** — at startup and every N minutes, checks whether the
  bot's `node.exe` (running `src\index.js`) is alive and relaunches it if not.

Both tasks run as **your user, whether you're logged on or not** (no stored
password), with highest privileges. The bot process is detected by matching
`src\index.js` in its command line, so only one instance ever runs.

## Managing it
```powershell
.\status-bot.ps1                                   # is it up? recent log
Start-ScheduledTask  -TaskName DiscordBot-Start    # start now
Get-ScheduledTask    -TaskName DiscordBot-*         # inspect the tasks
Disable-ScheduledTask -TaskName DiscordBot-Watchdog # pause auto-restart
.\uninstall-tasks.ps1                              # remove both tasks (as admin)
```

To **stop** the bot for good, disable/uninstall the watchdog first (otherwise it
relaunches within a few minutes), then end `node.exe` in Task Manager.

Restart/heartbeat events are logged to `..\..\logs\watchdog.log`.

## Notes
- Node.js should be installed for **all users** (`C:\Program Files\nodejs`) so the
  scheduler can find it; otherwise edit `Resolve-NodePath` in `_common.ps1`.
- Prefer a battle-tested supervisor? `pm2` + `pm2-installer` also works on Windows;
  these scripts are the zero-extra-dependency option.
