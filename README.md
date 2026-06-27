# 🤖 Nexus — All-in-One Discord Bot

A **feature-packed, self-contained Discord bot** built with [discord.js v14](https://discord.js.org/).
It bundles moderation, automod, economy, leveling, tickets, giveaways, reaction roles, music, logging,
and dozens of utility/fun commands — **with no AI dependencies and no external services**. All state is
stored locally in an embedded SQLite database, so it runs anywhere Node.js does.

> **91 slash commands** across **11 categories**, plus background message-driven systems.

---

## ✨ Features

### 🛡️ Moderation
`ban` · `tempban` (auto-unban) · `unban` · `kick` · `timeout` · `untimeout` · `warn` · `warnings` ·
`clearwarnings` · `modlogs` · `purge` (with user filter) · `slowmode` · `lock` · `unlock` · `nick`
- Role-hierarchy safety checks on every action
- Full mod-log embeds + persistent infraction history per user

### 🤖 Auto-Moderation
Toggleable per-server filters via `/automod`:
- Anti-spam (rate limiting with auto-timeout)
- Anti-invite, anti-link, anti-mass-mention, anti-caps
- Custom bad-words filter
- Members with *Manage Messages* are automatically exempt

### 🪙 Economy
`balance` · `daily` (with streaks) · `weekly` · `work` · `crime` · `rob` · `deposit` · `withdraw` ·
`pay` · `richest` (leaderboard) · `shop` · `additem` · `removeitem` · `buy` (with role rewards) ·
`inventory` · `slots` · `coinflip`

### 📈 Leveling
`rank` (with progress bar) · `levels` (leaderboard) · `givexp` · `levelrole` (role rewards per level)
- Configurable XP curve, anti-spam cooldown, level-up announcements & channel

### 🎫 Tickets
`/ticket setup` posts a panel with a button. Users open private ticket channels; staff can
`claim`, `add`/`remove` members, and `close` (with transcripts logged).

### 🎉 Giveaways
`/giveaway start|end|reroll|list` — button-entry giveaways with multiple winners, role requirements,
and automatic drawing when the timer expires.

### 🎭 Roles
`role add/remove` · `reactionrole create/add/remove/list` · `inrole` · per-server **autorole** on join

### 🎵 Music
`play` (YouTube search or URL) · `skip` · `stop` · `queue` · `nowplaying` · `pause` · `loop` · `volume`
- Built on `@discordjs/voice` + `play-dl`. Degrades gracefully if voice deps are unavailable.

### 🔧 Utility
`help` (interactive menu) · `ping` · `poll` · `remind me/list/delete` · `afk` · `tag` (custom commands) ·
`embed` (builder) · `say` · `math` (safe evaluator) · `timestamp` · `base64` · `snipe` · `suggest`

### ℹ️ Information
`userinfo` · `serverinfo` · `botinfo` · `avatar` · `roleinfo` · `channelinfo` · `membercount` · `servericon`

### 🎮 Fun
`8ball` · `roll` · `flip` · `rps` · `trivia` · `guess` · `choose` · `mock` · `reverse` · `joke` ·
`fact` · `wyr` · `ship` · `compliment`

### ⚙️ Configuration & Engagement Systems
- `/config` — one hub for prefix, welcome/goodbye, logging channels, autorole, starboard, suggestions & more
- **Starboard** — pin popular messages by ⭐ reactions
- **Suggestions** — `/suggest` + admin approve/reject/consider
- **Auto-responders** — trigger → response (contains / exact / starts-with)
- **Sticky messages** — keep a note pinned to the bottom of a channel
- **Counting game** — collaborative counting channel with best-streak tracking
- **Per-server command toggles** — disable any command with `/command disable`
- **Welcome/Goodbye** & **join/leave + message edit/delete logging**

---

## 🚀 Setup

### 1. Prerequisites
- **Node.js 18+** (tested on Node 22)
- A Discord application & bot — create one at the [Developer Portal](https://discord.com/developers/applications)

### 2. Install
```bash
git clone <this-repo>
cd discord-bot
npm install
```

### 3. Configure
```bash
cp .env.example .env
```
Edit `.env` and set at minimum:
```
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-application-id
GUILD_ID=your-test-server-id   # optional but recommended for instant command updates
OWNER_IDS=your-user-id         # optional
```

### 4. Enable Privileged Intents
In the Developer Portal → **Bot** tab, enable:
- ✅ **Server Members Intent**
- ✅ **Message Content Intent**

### 5. Register slash commands
```bash
npm run deploy            # guild deploy if GUILD_ID is set (instant), else global
node src/deploy-commands.js --global   # force global deploy
node src/deploy-commands.js --clear    # remove all commands
```

### 6. Run
```bash
npm start      # production
npm run dev    # auto-restart on file changes (node --watch)
```

### 7. Invite the bot
Use this URL (replace `CLIENT_ID`) with the `bot` + `applications.commands` scopes:
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=1374891765494&scope=bot%20applications.commands
```

---

## 🗂️ Project Structure
```
discord-bot/
├── config.json              # branding, economy/leveling/automod tunables
├── .env.example             # environment template
├── src/
│   ├── index.js             # client bootstrap, intents, global handlers
│   ├── deploy-commands.js   # slash-command registration script
│   ├── database/db.js       # SQLite schema + helpers (better-sqlite3)
│   ├── structures/          # dynamic command & event loaders
│   ├── utils/               # embeds, logger, time, leveling math, pagination, helpers
│   ├── services/            # tickets, giveaways, music, scheduler, help
│   ├── events/              # gateway event handlers
│   └── commands/            # slash commands grouped by category
└── data/                    # SQLite database (auto-created, git-ignored)
```

## 🧩 Configuration
Global tunables (currency amounts, XP curve, automod thresholds, brand colors) live in
[`config.json`](./config.json). Per-server settings are managed at runtime through `/config`,
`/automod`, `/ticket setup`, etc., and persist in the database.

## 🔒 Notes
- The bot stores everything locally in `data/bot.db` — **no external database or API keys required** (besides your bot token).
- `ephemeral`/`fetchReply` style replies are used for a clean UX.
- Music streaming requires outbound access to YouTube; if blocked, the rest of the bot is unaffected.

## 📜 License
MIT — do whatever you like.
