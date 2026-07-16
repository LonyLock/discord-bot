'use strict';

const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const scheduler = require('../services/scheduler');
const dashboard = require('../dashboard/server');
const { isGuildBlacklisted } = require('../database/db');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.success(`Logged in as ${client.user.tag} (${client.user.id})`);
    logger.info(
      `Serving ${client.guilds.cache.size} guild(s) and ${client.users.cache.size} cached user(s).`
    );

    // Rotating presence so the bot always looks alive.
    const activities = [
      { name: '/help • all-in-one bot', type: ActivityType.Watching },
      { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
      { name: 'moderation & economy', type: ActivityType.Playing },
      { name: 'your commands', type: ActivityType.Listening },
    ];
    let i = 0;
    setInterval(() => {
      const a = activities[i % activities.length];
      client.user.setActivity(a.name, { type: a.type });
      i++;
    }, 60_000);

    scheduler.start(client);

    // Safety net: leave any blacklisted guilds we're currently in.
    for (const guild of client.guilds.cache.values()) {
      if (isGuildBlacklisted(guild.id)) {
        logger.warn(`Leaving blacklisted guild: ${guild.name} (${guild.id})`);
        guild.leave().catch(() => {});
      }
    }

    // Launch the web dashboard (no-op unless DASHBOARD_ENABLED=true).
    try {
      dashboard.start(client);
    } catch (err) {
      logger.error('Failed to start dashboard:', err.message);
    }
  },
};
