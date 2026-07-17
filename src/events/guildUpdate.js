'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');

/** Server-settings log: name, icon and vanity changes. */
module.exports = {
  name: Events.GuildUpdate,
  execute(oldGuild, newGuild) {
    const changes = [];
    if (oldGuild.name !== newGuild.name) changes.push(`**Name:** ${oldGuild.name} → **${newGuild.name}**`);
    if (oldGuild.icon !== newGuild.icon) changes.push('**Icon** changed');
    if (oldGuild.banner !== newGuild.banner) changes.push('**Banner** changed');
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      changes.push(`**Vanity URL:** ${oldGuild.vanityURLCode || '—'} → ${newGuild.vanityURLCode || '—'}`);
    }
    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setColor(config.brand.warnColor)
      .setTitle('🏠 Server Updated')
      .setDescription(changes.join('\n'))
      .setThumbnail(newGuild.iconURL({ size: 128 }))
      .setTimestamp();
    sendLog(newGuild, 'server_log_channel', embed);
  },
};
