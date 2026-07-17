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

const {
  db,
  getGuildConfig,
  setGuildConfig,
  listIgnoredLogChannels,
  ignoreLogChannel,
  unignoreLogChannel,
  blacklistUser,
  unblacklistUser,
  listBlacklistedUsers,
  blacklistGuild,
  unblacklistGuild,
  listBlacklistedGuilds,
} = require('../database/db');
const logger = require('../utils/logger');
const config = require('../../config.json');
const { buildRows } = require('../services/buttonroles');
const { parseDuration, formatDuration } = require('../utils/time');
const i18n = require('../i18n');

const MANAGE_GUILD = 0x20n;
const DISCORD_API = 'https://discord.com/api/v10';
const CORE_COMMANDS = ['config', 'command', 'logignore']; // may never be disabled

/* Prepared statements for the list-based features managed by the dashboard. */
const q = {
  badwordsList: db.prepare('SELECT word FROM badwords WHERE guild_id = ? ORDER BY word'),
  badwordAdd: db.prepare('INSERT OR IGNORE INTO badwords (guild_id, word) VALUES (?, ?)'),
  badwordDel: db.prepare('DELETE FROM badwords WHERE guild_id = ? AND word = ?'),

  arList: db.prepare('SELECT * FROM autoresponders WHERE guild_id = ? ORDER BY trigger'),
  arAdd: db.prepare('INSERT OR REPLACE INTO autoresponders (guild_id, trigger, response, match_mode) VALUES (?, ?, ?, ?)'),
  arDel: db.prepare('DELETE FROM autoresponders WHERE guild_id = ? AND trigger = ?'),

  lrList: db.prepare('SELECT * FROM level_roles WHERE guild_id = ? ORDER BY level'),
  lrAdd: db.prepare('INSERT OR REPLACE INTO level_roles (guild_id, level, role_id) VALUES (?, ?, ?)'),
  lrDel: db.prepare('DELETE FROM level_roles WHERE guild_id = ? AND level = ?'),

  shopList: db.prepare('SELECT * FROM shop_items WHERE guild_id = ? ORDER BY price'),
  shopAdd: db.prepare('INSERT INTO shop_items (guild_id, name, description, price, role_id, stock) VALUES (?, ?, ?, ?, ?, ?)'),
  shopDel: db.prepare('DELETE FROM shop_items WHERE guild_id = ? AND id = ?'),

  tagList: db.prepare('SELECT name, content, uses FROM tags WHERE guild_id = ? ORDER BY name'),
  tagAdd: db.prepare('INSERT OR REPLACE INTO tags (guild_id, name, content, author_id, uses, created) VALUES (?, ?, ?, ?, 0, ?)'),
  tagDel: db.prepare('DELETE FROM tags WHERE guild_id = ? AND name = ?'),

  disList: db.prepare('SELECT command FROM disabled_commands WHERE guild_id = ?'),
  disAdd: db.prepare('INSERT OR IGNORE INTO disabled_commands (guild_id, command) VALUES (?, ?)'),
  disDel: db.prepare('DELETE FROM disabled_commands WHERE guild_id = ? AND command = ?'),

  rrList: db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ?'),
  rrDel: db.prepare('DELETE FROM reaction_roles WHERE message_id = ? AND emoji = ?'),

  brList: db.prepare('SELECT * FROM button_roles WHERE guild_id = ? ORDER BY message_id, id'),
  brGet: db.prepare('SELECT * FROM button_roles WHERE id = ? AND guild_id = ?'),
  brDel: db.prepare('DELETE FROM button_roles WHERE id = ? AND guild_id = ?'),
  brCount: db.prepare('SELECT COUNT(*) AS c FROM button_roles WHERE message_id = ?'),
  brDelMsg: db.prepare('DELETE FROM button_roles WHERE message_id = ?'),

  schedList: db.prepare('SELECT * FROM scheduled_messages WHERE guild_id = ? ORDER BY next_run'),
  schedAdd: db.prepare('INSERT INTO scheduled_messages (guild_id, channel_id, content, next_run, interval_ms, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  schedDel: db.prepare('DELETE FROM scheduled_messages WHERE id = ? AND guild_id = ?'),
};

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

  app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.brand = config.brand;
    res.locals.botName = client.user?.username || config.brand.name;
    res.locals.botAvatar = client.user?.displayAvatarURL({ size: 128 }) || null;
    res.locals.inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=1374891765494&scope=bot%20applications.commands`;
    res.locals.path = req.path;
    res.locals.isOwner = !!req.session.user && client.ownerIds.includes(req.session.user.id);
    next();
  });

  const requireAuth = (req, res, next) => (req.session.user ? next() : res.redirect('/login'));
  const requireOwner = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (!client.ownerIds.includes(req.session.user.id)) {
      return res.status(403).render('error', { code: 403, message: 'This area is restricted to bot owners.' });
    }
    next();
  };

  /* --------------------------- helpers --------------------------- */
  const newCsrf = (req) => (req.session.csrf = crypto.randomBytes(16).toString('hex'));
  const badCsrf = (req) => !req.body._csrf || req.body._csrf !== req.session.csrf;

  // Resolve + authorize a guild for the current session. Returns the live
  // discord.js Guild, or null after having already sent a response.
  function resolveGuild(req, res) {
    const guildId = req.params.id;
    const sessionGuild = (req.session.guilds || []).find((g) => g.id === guildId);
    if (!sessionGuild) {
      res.status(403).render('error', { code: 403, message: 'You do not manage that server.' });
      return null;
    }
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      res.render('invite', { guild: sessionGuild });
      return null;
    }
    return guild;
  }

  function guildLists(guild) {
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
    return { textChannels, roles, categories };
  }

  const guildMeta = (guild) => ({
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL({ size: 128 }),
    memberCount: guild.memberCount,
    channelCount: guild.channels.cache.size,
    roleCount: guild.roles.cache.size,
  });

  const orNull = (v) => (v && v !== 'none' ? v : null);
  const bool = (v) => (v === 'on' || v === 'true' || v === '1' ? 1 : 0);

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

  app.get('/servers', requireAuth, (req, res) => {
    const managed = (req.session.guilds || []).map((g) => ({
      ...g,
      botPresent: client.guilds.cache.has(g.id),
      iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
    }));
    managed.sort((a, b) => Number(b.botPresent) - Number(a.botPresent) || a.name.localeCompare(b.name));
    res.render('servers', { guilds: managed });
  });

  /* ----- Main settings ----- */
  app.get('/servers/:id', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    const { textChannels, roles, categories } = guildLists(guild);
    res.render('manage', {
      active: 'settings',
      guild: guildMeta(guild),
      cfg: getGuildConfig(guild.id),
      textChannels,
      roles,
      categories,
      locales: i18n.available(),
      saved: req.query.saved === '1',
      csrf: newCsrf(req),
    });
  });

  app.post('/servers/:id', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token. Please reload and try again.' });
    const b = req.body;

    const validLocale = i18n.available().some((l) => l.code === b.locale);
    setGuildConfig(guild.id, {
      prefix: (b.prefix || config.defaults.prefix).slice(0, 5),
      locale: validLocale ? b.locale : i18n.DEFAULT,
      welcome_enabled: bool(b.welcome_enabled),
      welcome_channel: orNull(b.welcome_channel),
      welcome_message: b.welcome_message?.slice(0, 1500) || null,
      goodbye_enabled: bool(b.goodbye_enabled),
      goodbye_channel: orNull(b.goodbye_channel),
      goodbye_message: b.goodbye_message?.slice(0, 1500) || null,
      autorole: orNull(b.autorole),
      mute_role: orNull(b.mute_role),
      boost_role: orNull(b.boost_role),
      verify_role: orNull(b.verify_role),
      mod_log_channel: orNull(b.mod_log_channel),
      message_log_channel: orNull(b.message_log_channel),
      join_log_channel: orNull(b.join_log_channel),
      server_log_channel: orNull(b.server_log_channel),
      voice_log_channel: orNull(b.voice_log_channel),
      role_log_channel: orNull(b.role_log_channel),
      channel_log_channel: orNull(b.channel_log_channel),
      leveling_enabled: bool(b.leveling_enabled),
      level_up_enabled: bool(b.level_up_enabled),
      level_up_channel: orNull(b.level_up_channel),
      level_up_message: b.level_up_message?.slice(0, 1500) || null,
      economy_enabled: bool(b.economy_enabled),
      starboard_channel: orNull(b.starboard_channel),
      starboard_threshold: Math.max(1, parseInt(b.starboard_threshold, 10) || 3),
      suggestion_channel: orNull(b.suggestion_channel),
      ticket_category: orNull(b.ticket_category),
      ticket_support_role: orNull(b.ticket_support_role),
      ticket_log_channel: orNull(b.ticket_log_channel),
      automod_enabled: bool(b.automod_enabled),
      automod_anti_spam: bool(b.automod_anti_spam),
      automod_anti_invite: bool(b.automod_anti_invite),
      automod_anti_link: bool(b.automod_anti_link),
      automod_anti_mention: bool(b.automod_anti_mention),
      automod_anti_caps: bool(b.automod_anti_caps),
      automod_badwords: bool(b.automod_badwords),
      antiraid_enabled: bool(b.antiraid_enabled),
      antiraid_min_age_days: Math.max(0, Math.min(365, parseInt(b.antiraid_min_age_days, 10) || 0)),
      antiraid_action: ['kick', 'ban', 'timeout'].includes(b.antiraid_action) ? b.antiraid_action : 'kick',
      antiraid_join_threshold: Math.max(0, Math.min(100, parseInt(b.antiraid_join_threshold, 10) || 0)),
    });

    // Note: the log-ignore list is managed on its own /logignore page so that
    // saving this form never accidentally clears it.

    logger.info(`Dashboard: ${req.session.user.username} updated settings for guild ${guild.id}`);
    res.redirect(`/servers/${guild.id}?saved=1`);
  });

  /* ----- Log ignore list ----- */
  app.get('/servers/:id/logignore', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    const { textChannels, categories } = guildLists(guild);
    const nameOf = (id) => {
      const c = guild.channels.cache.get(id);
      if (!c) return `Unknown (${id})`;
      return c.type === 4 ? `📁 ${c.name}` : `#${c.name}`;
    };
    res.render('logignore', {
      active: 'logignore',
      guild: guildMeta(guild),
      textChannels,
      categories,
      ignored: listIgnoredLogChannels(guild.id).map((id) => ({ id, name: nameOf(id) })),
      csrf: newCsrf(req),
    });
  });
  app.post('/servers/:id/logignore', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    const { _action, channel } = req.body;
    if (_action === 'add' && channel && channel !== 'none') ignoreLogChannel(guild.id, channel);
    else if (_action === 'remove' && channel) unignoreLogChannel(guild.id, channel);
    res.redirect(`/servers/${guild.id}/logignore`);
  });

  /* ----- Bad-words filter ----- */
  app.get('/servers/:id/badwords', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    res.render('badwords', {
      active: 'badwords',
      guild: guildMeta(guild),
      words: q.badwordsList.all(guild.id).map((r) => r.word),
      csrf: newCsrf(req),
    });
  });
  app.post('/servers/:id/badwords', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    if (req.body._action === 'add' && req.body.word) {
      req.body.word.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean).slice(0, 50)
        .forEach((w) => q.badwordAdd.run(guild.id, w.slice(0, 100)));
    } else if (req.body._action === 'remove' && req.body.word) {
      q.badwordDel.run(guild.id, req.body.word);
    }
    res.redirect(`/servers/${guild.id}/badwords`);
  });

  /* ----- Auto-responders ----- */
  app.get('/servers/:id/autoresponders', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    res.render('autoresponders', {
      active: 'autoresponders',
      guild: guildMeta(guild),
      responders: q.arList.all(guild.id),
      csrf: newCsrf(req),
    });
  });
  app.post('/servers/:id/autoresponders', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    const b = req.body;
    if (b._action === 'add' && b.trigger && b.response) {
      const mode = ['contains', 'exact', 'startswith'].includes(b.match) ? b.match : 'contains';
      q.arAdd.run(guild.id, b.trigger.toLowerCase().slice(0, 100), b.response.slice(0, 1500), mode);
    } else if (b._action === 'remove' && b.trigger) {
      q.arDel.run(guild.id, b.trigger);
    }
    res.redirect(`/servers/${guild.id}/autoresponders`);
  });

  /* ----- Level roles ----- */
  app.get('/servers/:id/levelroles', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    const { roles } = guildLists(guild);
    res.render('levelroles', {
      active: 'levelroles',
      guild: guildMeta(guild),
      roles,
      levelRoles: q.lrList.all(guild.id),
      csrf: newCsrf(req),
    });
  });
  app.post('/servers/:id/levelroles', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    const b = req.body;
    if (b._action === 'add' && b.level && b.role) {
      const level = Math.max(1, Math.min(1000, parseInt(b.level, 10) || 1));
      q.lrAdd.run(guild.id, level, b.role);
    } else if (b._action === 'remove' && b.level) {
      q.lrDel.run(guild.id, parseInt(b.level, 10));
    }
    res.redirect(`/servers/${guild.id}/levelroles`);
  });

  /* ----- Economy shop ----- */
  app.get('/servers/:id/shop', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    const { roles } = guildLists(guild);
    res.render('shop', {
      active: 'shop',
      guild: guildMeta(guild),
      roles,
      items: q.shopList.all(guild.id),
      currency: config.economy.currencySymbol,
      csrf: newCsrf(req),
    });
  });
  app.post('/servers/:id/shop', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    const b = req.body;
    if (b._action === 'add' && b.name && b.price) {
      const price = Math.max(1, parseInt(b.price, 10) || 1);
      const stock = b.stock ? Math.max(0, parseInt(b.stock, 10)) : -1;
      q.shopAdd.run(guild.id, b.name.slice(0, 80), b.description?.slice(0, 200) || null, price, orNull(b.role), stock);
    } else if (b._action === 'remove' && b.item_id) {
      q.shopDel.run(guild.id, parseInt(b.item_id, 10));
    }
    res.redirect(`/servers/${guild.id}/shop`);
  });

  /* ----- Tags ----- */
  app.get('/servers/:id/tags', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    res.render('tags', {
      active: 'tags',
      guild: guildMeta(guild),
      tags: q.tagList.all(guild.id),
      prefix: getGuildConfig(guild.id).prefix || config.defaults.prefix,
      csrf: newCsrf(req),
    });
  });
  app.post('/servers/:id/tags', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    const b = req.body;
    if (b._action === 'add' && b.name && b.content) {
      const name = b.name.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
      q.tagAdd.run(guild.id, name, b.content.slice(0, 2000), req.session.user.id, Date.now());
    } else if (b._action === 'remove' && b.name) {
      q.tagDel.run(guild.id, b.name);
    }
    res.redirect(`/servers/${guild.id}/tags`);
  });

  /* ----- Command enable/disable ----- */
  app.get('/servers/:id/commands', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    const disabled = new Set(q.disList.all(guild.id).map((r) => r.command));
    const byCategory = {};
    for (const cmd of client.commands.values()) {
      const cat = cmd.category || 'other';
      (byCategory[cat] ||= []).push({
        name: cmd.data.name,
        description: cmd.data.description,
        enabled: !disabled.has(cmd.data.name),
        core: CORE_COMMANDS.includes(cmd.data.name),
      });
    }
    for (const cat of Object.keys(byCategory)) byCategory[cat].sort((a, b) => a.name.localeCompare(b.name));
    res.render('commands', {
      active: 'commands',
      guild: guildMeta(guild),
      byCategory,
      csrf: newCsrf(req),
    });
  });
  app.post('/servers/:id/commands', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    // Checked boxes (name in body) = enabled; everything else = disabled.
    const enabled = new Set([].concat(req.body.enabled || []));
    for (const cmd of client.commands.values()) {
      const name = cmd.data.name;
      if (CORE_COMMANDS.includes(name)) { q.disDel.run(guild.id, name); continue; }
      if (enabled.has(name)) q.disDel.run(guild.id, name);
      else q.disAdd.run(guild.id, name);
    }
    logger.info(`Dashboard: ${req.session.user.username} updated command toggles for guild ${guild.id}`);
    res.redirect(`/servers/${guild.id}/commands`);
  });

  /* ----- Reaction roles (list + remove) ----- */
  app.get('/servers/:id/reactionroles', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    const rows = q.rrList.all(guild.id).map((r) => ({
      ...r,
      link: `https://discord.com/channels/${guild.id}/${r.channel_id}/${r.message_id}`,
      roleName: guild.roles.cache.get(r.role_id)?.name || r.role_id,
      display: /^\d+$/.test(r.emoji) ? `<:e:${r.emoji}>` : r.emoji,
    }));
    res.render('reactionroles', {
      active: 'reactionroles',
      guild: guildMeta(guild),
      reactionRoles: rows,
      csrf: newCsrf(req),
    });
  });
  app.post('/servers/:id/reactionroles', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    if (req.body._action === 'remove' && req.body.message_id && req.body.emoji) {
      q.rrDel.run(req.body.message_id, req.body.emoji);
    }
    res.redirect(`/servers/${guild.id}/reactionroles`);
  });

  /* ----- Button roles (list + remove) ----- */
  app.get('/servers/:id/buttonroles', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    const rows = q.brList.all(guild.id).map((r) => ({
      ...r,
      roleName: guild.roles.cache.get(r.role_id)?.name || r.role_id,
      link: `https://discord.com/channels/${guild.id}/${r.channel_id}/${r.message_id}`,
    }));
    res.render('buttonroles', { active: 'buttonroles', guild: guildMeta(guild), buttonRoles: rows, csrf: newCsrf(req) });
  });
  app.post('/servers/:id/buttonroles', requireAuth, async (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    if (req.body._action === 'remove' && req.body.button_id) {
      const row = q.brGet.get(parseInt(req.body.button_id, 10), guild.id);
      if (row) {
        q.brDel.run(row.id, guild.id);
        // Rebuild the live message's buttons (or delete the record set if empty).
        const channel = guild.channels.cache.get(row.channel_id);
        const msg = channel && (await channel.messages.fetch(row.message_id).catch(() => null));
        if (msg) await msg.edit({ components: buildRows(row.message_id) }).catch(() => {});
        if (!q.brCount.get(row.message_id).c) q.brDelMsg.run(row.message_id);
      }
    }
    res.redirect(`/servers/${guild.id}/buttonroles`);
  });

  /* ----- Scheduled messages ----- */
  app.get('/servers/:id/scheduled', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    const { textChannels } = guildLists(guild);
    const rows = q.schedList.all(guild.id).map((r) => ({
      ...r,
      channelName: guild.channels.cache.get(r.channel_id)?.name || r.channel_id,
      repeat: r.interval_ms ? formatDuration(r.interval_ms) : null,
    }));
    res.render('scheduled', { active: 'scheduled', guild: guildMeta(guild), textChannels, scheduled: rows, csrf: newCsrf(req) });
  });
  app.post('/servers/:id/scheduled', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    const b = req.body;
    if (b._action === 'add' && b.channel && b.message && b.delay) {
      const delay = parseDuration(b.delay);
      const interval = b.repeat ? parseDuration(b.repeat) : 0;
      if (delay && delay >= 30_000 && guild.channels.cache.has(b.channel) && (!b.repeat || (interval && interval >= 600_000))) {
        q.schedAdd.run(guild.id, b.channel, b.message.slice(0, 2000), Date.now() + delay, interval || 0, req.session.user.id, Date.now());
      }
    } else if (b._action === 'remove' && b.sched_id) {
      q.schedDel.run(parseInt(b.sched_id, 10), guild.id);
    }
    res.redirect(`/servers/${guild.id}/scheduled`);
  });

  /* ----- Leaderboards ----- */
  app.get('/servers/:id/leaderboard', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    const levels = db.prepare('SELECT user_id, level, total_xp FROM levels WHERE guild_id = ? ORDER BY total_xp DESC LIMIT 15').all(guild.id);
    const economy = db.prepare('SELECT user_id, (wallet + bank) AS total FROM economy WHERE guild_id = ? ORDER BY total DESC LIMIT 15').all(guild.id);
    const resolve = (id) => guild.members.cache.get(id)?.user.username || id;
    res.render('leaderboard', {
      active: 'leaderboard',
      guild: guildMeta(guild),
      levels: levels.map((l) => ({ ...l, name: resolve(l.user_id) })),
      economy: economy.map((e) => ({ ...e, name: resolve(e.user_id) })),
      currency: config.economy.currencySymbol,
    });
  });

  app.get('/servers/:id/analytics', requireAuth, (req, res) => {
    const guild = resolveGuild(req, res);
    if (!guild) return;
    const gid = guild.id;
    const now = Date.now();
    const d7 = now - 7 * 864e5;
    const d30 = now - 30 * 864e5;

    const count = (sql, ...p) => db.prepare(sql).get(gid, ...p).c;
    const totals = {
      actions: count('SELECT COUNT(*) c FROM modlogs WHERE guild_id = ?'),
      actions7: count('SELECT COUNT(*) c FROM modlogs WHERE guild_id = ? AND timestamp > ?', d7),
      actions30: count('SELECT COUNT(*) c FROM modlogs WHERE guild_id = ? AND timestamp > ?', d30),
      warnings: count('SELECT COUNT(*) c FROM warnings WHERE guild_id = ?'),
    };
    const byAction = db.prepare('SELECT action, COUNT(*) c FROM modlogs WHERE guild_id = ? GROUP BY action ORDER BY c DESC').all(gid);
    const modRows = db.prepare('SELECT moderator_id, COUNT(*) total FROM modlogs WHERE guild_id = ? GROUP BY moderator_id ORDER BY total DESC LIMIT 15').all(gid);
    const actionRows = db.prepare('SELECT moderator_id, action, COUNT(*) c FROM modlogs WHERE guild_id = ? GROUP BY moderator_id, action').all(gid);
    const warnRows = db.prepare('SELECT moderator_id, COUNT(*) c FROM warnings WHERE guild_id = ? GROUP BY moderator_id').all(gid);

    const breakdown = {};
    for (const r of actionRows) (breakdown[r.moderator_id] ||= {})[r.action] = r.c;
    const warnMap = Object.fromEntries(warnRows.map((w) => [w.moderator_id, w.c]));
    const resolve = (uid) => guild.members.cache.get(uid)?.user.username || uid;
    const moderators = modRows.map((m) => ({
      id: m.moderator_id,
      name: resolve(m.moderator_id),
      total: m.total,
      actions: breakdown[m.moderator_id] || {},
      warnings: warnMap[m.moderator_id] || 0,
    }));
    const recent = db
      .prepare('SELECT action, user_id, moderator_id, reason, timestamp FROM modlogs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 20')
      .all(gid)
      .map((r) => ({ ...r, moderator: resolve(r.moderator_id), target: resolve(r.user_id) }));

    res.render('analytics', { active: 'analytics', guild: guildMeta(guild), totals, byAction, moderators, recent });
  });

  /* ========================= OWNER PANEL ========================= */
  app.get('/owner', requireOwner, (req, res) => {
    const topCommands = db
      .prepare('SELECT command, uses FROM command_stats ORDER BY uses DESC LIMIT 10')
      .all();
    const totalUses = db.prepare('SELECT COALESCE(SUM(uses),0) AS t FROM command_stats').get().t;
    res.render('owner', {
      active: 'overview',
      stats: {
        guilds: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
        commands: client.commands.size,
        totalUses,
        uptime: Date.now() - (client.startedAt || Date.now()),
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
        ping: Math.round(client.ws.ping),
        node: process.version,
      },
      topCommands,
      blacklistedUsers: listBlacklistedUsers().length,
      blacklistedGuilds: listBlacklistedGuilds().length,
    });
  });

  app.get('/owner/analytics', requireOwner, (req, res) => {
    const now = Date.now();
    const d7 = now - 7 * 864e5;
    const d30 = now - 30 * 864e5;
    const mapCount = (sql) => Object.fromEntries(db.prepare(sql).all().map((r) => [r.guild_id, r.c]));
    const modByGuild = mapCount('SELECT guild_id, COUNT(*) c FROM modlogs GROUP BY guild_id');
    const warnByGuild = mapCount('SELECT guild_id, COUNT(*) c FROM warnings GROUP BY guild_id');
    const econByGuild = mapCount('SELECT guild_id, COUNT(*) c FROM economy GROUP BY guild_id');
    const lvlByGuild = mapCount('SELECT guild_id, COUNT(*) c FROM levels GROUP BY guild_id');

    const servers = [...client.guilds.cache.values()]
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL({ size: 64 }),
        members: g.memberCount || 0,
        modActions: modByGuild[g.id] || 0,
        warnings: warnByGuild[g.id] || 0,
        econUsers: econByGuild[g.id] || 0,
        levelUsers: lvlByGuild[g.id] || 0,
      }))
      .sort((a, b) => b.modActions - a.modActions || b.members - a.members);

    const byAction = db.prepare('SELECT action, COUNT(*) c FROM modlogs GROUP BY action ORDER BY c DESC').all();
    const modRows = db.prepare('SELECT moderator_id, COUNT(*) total FROM modlogs GROUP BY moderator_id ORDER BY total DESC LIMIT 20').all();
    const actionRows = db.prepare('SELECT moderator_id, action, COUNT(*) c FROM modlogs GROUP BY moderator_id, action').all();
    const breakdown = {};
    for (const r of actionRows) (breakdown[r.moderator_id] ||= {})[r.action] = r.c;
    const resolveUser = (uid) => client.users.cache.get(uid)?.username || uid;
    const moderators = modRows.map((m) => ({
      id: m.moderator_id,
      name: resolveUser(m.moderator_id),
      total: m.total,
      actions: breakdown[m.moderator_id] || {},
    }));

    const totals = {
      servers: servers.length,
      members: servers.reduce((a, s) => a + s.members, 0),
      actions: db.prepare('SELECT COUNT(*) c FROM modlogs').get().c,
      actions7: db.prepare('SELECT COUNT(*) c FROM modlogs WHERE timestamp > ?').get(d7).c,
      actions30: db.prepare('SELECT COUNT(*) c FROM modlogs WHERE timestamp > ?').get(d30).c,
    };

    res.render('owner_analytics', { active: 'analytics', servers, byAction, moderators, totals });
  });

  app.get('/owner/servers', requireOwner, (req, res) => {
    const guilds = [...client.guilds.cache.values()]
      .map((g) => ({
        id: g.id,
        name: g.name,
        members: g.memberCount || 0,
        icon: g.iconURL({ size: 64 }),
        ownerId: g.ownerId,
      }))
      .sort((a, b) => b.members - a.members);
    res.render('owner_servers', { active: 'servers', guilds, csrf: newCsrf(req) });
  });

  app.post('/owner/servers', requireOwner, async (req, res) => {
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    const { _action, guild_id: gid, reason } = req.body;
    const guild = client.guilds.cache.get(gid);
    if (_action === 'leave' && guild) {
      await guild.leave().catch(() => {});
      logger.warn(`Owner ${req.session.user.username} made the bot leave ${gid}`);
    } else if (_action === 'blacklist' && gid) {
      blacklistGuild(gid, reason || `Blacklisted by ${req.session.user.username}`);
      if (guild) await guild.leave().catch(() => {});
      logger.warn(`Owner ${req.session.user.username} blacklisted guild ${gid}`);
    }
    res.redirect('/owner/servers');
  });

  app.get('/owner/blacklist', requireOwner, (req, res) => {
    res.render('owner_blacklist', {
      active: 'blacklist',
      users: listBlacklistedUsers(),
      guilds: listBlacklistedGuilds(),
      csrf: newCsrf(req),
    });
  });

  app.post('/owner/blacklist', requireOwner, (req, res) => {
    if (badCsrf(req)) return res.status(403).render('error', { code: 403, message: 'Invalid form token.' });
    const { _action, target_id: id, reason } = req.body;
    const validId = /^\d{16,20}$/.test(id || '');
    if (_action === 'user_add' && validId) {
      if (client.ownerIds.includes(id)) {
        // never blacklist an owner
      } else blacklistUser(id, reason || `Added by ${req.session.user.username}`);
    } else if (_action === 'user_remove' && id) {
      unblacklistUser(id);
    } else if (_action === 'guild_add' && validId) {
      blacklistGuild(id, reason || `Added by ${req.session.user.username}`);
      const g = client.guilds.cache.get(id);
      if (g) g.leave().catch(() => {});
    } else if (_action === 'guild_remove' && id) {
      unblacklistGuild(id);
    }
    res.redirect('/owner/blacklist');
  });

  app.use((req, res) => res.status(404).render('error', { code: 404, message: 'Page not found.' }));

  app.listen(port, () => {
    logger.success(`Dashboard running at ${baseUrl}`);
    logger.info(`OAuth redirect URI (add this in the Developer Portal): ${redirectUri}`);
  });
}

module.exports = { start };
