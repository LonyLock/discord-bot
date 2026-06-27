'use strict';

/**
 * Embedded web dashboard.
 *
 * Runs inside the bot process so it shares the same SQLite database AND has
 * live access to the discord.js client cache (channels, roles, member counts).
 * Because it's the same process, any settings saved here take effect instantly
 * — the guild-config cache is invalidated by setGuildConfig().
 *
 * Auth is a minimal, dependency-free Discord OAuth2 flow (identify + guilds).
 */

const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');

const { db, getGuildConfig, setGuildConfig } = require('../database/db');
const logger = require('../utils/logger');
const config = require('../../config.json');

const MANAGE_GUILD = 0x20n;
const DISCORD_API = 'https://discord.com/api/v10';

function hasManageGuild(guild) {
  if (guild.owner) return true;
  try {
    return (BigInt(guild.permissions) & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

function start(client) {
  if (process.env.DASHBOARD_ENABLED !== 'true') {
    logger.info('Dashboard disabled (set DASHBOARD_ENABLED=true to enable).');
    return;
  }
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const baseUrl = (process.env.DASHBOARD_URL || `http://localhost:${process.env.DASHBOARD_PORT || 3000}`).replace(/\/$/, '');
  const port = Number(process.env.DASHBOARD_PORT) || 3000;
  const redirectUri = `${baseUrl}/callback`;

  if (!clientId || !clientSecret) {
    logger.warn('Dashboard not started: CLIENT_ID and CLIENT_SECRET are required.');
    return;
  }

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(
    session({
      secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
    })
  );

  // Shared template locals.
  app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.brand = config.brand;
    res.locals.botName = client.user?.username || config.brand.name;
    res.locals.botAvatar = client.user?.displayAvatarURL({ size: 128 }) || null;
    res.locals.inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=1374891765494&scope=bot%20applications.commands`;
    res.locals.path = req.path;
    next();
  });

  const requireAuth = (req, res, next) => (req.session.user ? next() : res.redirect('/login'));

  /* ---------------------------- Routes ---------------------------- */
  app.get('/', (req, res) => {
    res.render('index', {
      stats: {
        guilds: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
        commands: client.commands.size,
      },
    });
  });

  // Begin OAuth.
  app.get('/login', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.state = state;
    const url =
      `${DISCORD_API}/oauth2/authorize?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=identify%20guilds&state=${state}`;
    res.redirect(url);
  });

  app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

  // OAuth callback.
  app.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.state) {
      return res.status(400).render('error', { code: 400, message: 'Invalid OAuth state. Please try logging in again.' });
    }
    try {
      const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenRes.ok) throw new Error(`Token exchange failed (${tokenRes.status})`);
      const token = await tokenRes.json();

      const [userRes, guildsRes] = await Promise.all([
        fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${token.access_token}` } }),
        fetch(`${DISCORD_API}/users/@me/guilds`, { headers: { Authorization: `Bearer ${token.access_token}` } }),
      ]);
      const user = await userRes.json();
      const guilds = await guildsRes.json();

      req.session.user = {
        id: user.id,
        username: user.username,
        global_name: user.global_name,
        avatar: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`,
      };
      req.session.guilds = Array.isArray(guilds) ? guilds.filter(hasManageGuild) : [];
      res.redirect('/servers');
    } catch (err) {
      logger.error('OAuth callback error:', err.message);
      res.status(500).render('error', { code: 500, message: 'Authentication failed. Please try again.' });
    }
  });

  // Server selector.
  app.get('/servers', requireAuth, (req, res) => {
    const managed = (req.session.guilds || []).map((g) => ({
      ...g,
      botPresent: client.guilds.cache.has(g.id),
      iconUrl: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
        : null,
    }));
    managed.sort((a, b) => Number(b.botPresent) - Number(a.botPresent) || a.name.localeCompare(b.name));
    res.render('servers', { guilds: managed });
  });

  // Manage a single guild.
  app.get('/servers/:id', requireAuth, (req, res) => {
    const guildId = req.params.id;
    const sessionGuild = (req.session.guilds || []).find((g) => g.id === guildId);
    if (!sessionGuild) return res.status(403).render('error', { code: 403, message: 'You do not manage that server.' });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.render('invite', { guild: sessionGuild });
    }

    const cfg = getGuildConfig(guildId);
    const textChannels = guild.channels.cache
      .filter((c) => c.type === 0 || c.type === 5)
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .map((c) => ({ id: c.id, name: c.name }));
    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id && !r.managed)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }));
    const categories = guild.channels.cache
      .filter((c) => c.type === 4)
      .map((c) => ({ id: c.id, name: c.name }));

    res.render('manage', {
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 128 }),
        memberCount: guild.memberCount,
        channelCount: guild.channels.cache.size,
        roleCount: guild.roles.cache.size,
      },
      cfg,
      textChannels,
      roles,
      categories,
      saved: req.query.saved === '1',
      csrf: (req.session.csrf = crypto.randomBytes(16).toString('hex')),
    });
  });

  // Save guild settings.
  app.post('/servers/:id', requireAuth, (req, res) => {
    const guildId = req.params.id;
    const sessionGuild = (req.session.guilds || []).find((g) => g.id === guildId);
    if (!sessionGuild) return res.status(403).render('error', { code: 403, message: 'You do not manage that server.' });
    if (!req.body._csrf || req.body._csrf !== req.session.csrf) {
      return res.status(403).render('error', { code: 403, message: 'Invalid form token. Please reload and try again.' });
    }

    const b = req.body;
    const orNull = (v) => (v && v !== 'none' ? v : null);
    const bool = (v) => (v === 'on' || v === 'true' || v === '1' ? 1 : 0);

    setGuildConfig(guildId, {
      prefix: (b.prefix || config.defaults.prefix).slice(0, 5),
      welcome_enabled: bool(b.welcome_enabled),
      welcome_channel: orNull(b.welcome_channel),
      welcome_message: b.welcome_message?.slice(0, 1500) || null,
      goodbye_enabled: bool(b.goodbye_enabled),
      goodbye_channel: orNull(b.goodbye_channel),
      goodbye_message: b.goodbye_message?.slice(0, 1500) || null,
      autorole: orNull(b.autorole),
      mod_log_channel: orNull(b.mod_log_channel),
      message_log_channel: orNull(b.message_log_channel),
      join_log_channel: orNull(b.join_log_channel),
      leveling_enabled: bool(b.leveling_enabled),
      level_up_enabled: bool(b.level_up_enabled),
      level_up_channel: orNull(b.level_up_channel),
      level_up_message: b.level_up_message?.slice(0, 1500) || null,
      economy_enabled: bool(b.economy_enabled),
      starboard_channel: orNull(b.starboard_channel),
      starboard_threshold: Math.max(1, parseInt(b.starboard_threshold, 10) || 3),
      suggestion_channel: orNull(b.suggestion_channel),
      automod_enabled: bool(b.automod_enabled),
      automod_anti_spam: bool(b.automod_anti_spam),
      automod_anti_invite: bool(b.automod_anti_invite),
      automod_anti_link: bool(b.automod_anti_link),
      automod_anti_mention: bool(b.automod_anti_mention),
      automod_anti_caps: bool(b.automod_anti_caps),
      automod_badwords: bool(b.automod_badwords),
    });
    logger.info(`Dashboard: ${req.session.user.username} updated settings for guild ${guildId}`);
    res.redirect(`/servers/${guildId}?saved=1`);
  });

  // Per-guild leaderboards (read-only, public-ish but requires login to view server).
  app.get('/servers/:id/leaderboard', requireAuth, (req, res) => {
    const guildId = req.params.id;
    if (!(req.session.guilds || []).some((g) => g.id === guildId)) {
      return res.status(403).render('error', { code: 403, message: 'You do not manage that server.' });
    }
    const guild = client.guilds.cache.get(guildId);
    const levels = db
      .prepare('SELECT user_id, level, total_xp FROM levels WHERE guild_id = ? ORDER BY total_xp DESC LIMIT 15')
      .all(guildId);
    const economy = db
      .prepare('SELECT user_id, (wallet + bank) AS total FROM economy WHERE guild_id = ? ORDER BY total DESC LIMIT 15')
      .all(guildId);
    const resolve = (id) => {
      const m = guild?.members.cache.get(id);
      return m ? m.user.username : id;
    };
    res.render('leaderboard', {
      guild: { id: guildId, name: guild?.name || 'Server', icon: guild?.iconURL({ size: 128 }) },
      levels: levels.map((l) => ({ ...l, name: resolve(l.user_id) })),
      economy: economy.map((e) => ({ ...e, name: resolve(e.user_id) })),
      currency: config.economy.currencySymbol,
    });
  });

  app.use((req, res) => res.status(404).render('error', { code: 404, message: 'Page not found.' }));

  app.listen(port, () => {
    logger.success(`Dashboard running at ${baseUrl}`);
    logger.info(`OAuth redirect URI (add this in the Developer Portal): ${redirectUri}`);
  });
}

module.exports = { start };
