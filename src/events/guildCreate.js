'use strict';

const { Events } = require('discord.js');
const { getGuildConfig, isGuildBlacklisted } = require('../database/db');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    // Refuse blacklisted guilds — leave immediately.
    if (isGuildBlacklisted(guild.id)) {
      logger.warn(`Left blacklisted guild on join: ${guild.name} (${guild.id})`);
      await guild.leave().catch(() => {});
      return;
    }
    getGuildConfig(guild.id); // ensure a config row exists
    logger.success(`Joined new guild: ${guild.name} (${guild.id}) — ${guild.memberCount} members.`);
  },
};
