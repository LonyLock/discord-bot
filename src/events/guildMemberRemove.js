'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../database/db');
const config = require('../../config.json');
const { buildGoodbyeEmbed } = require('../utils/greetings');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const cfg = getGuildConfig(member.guild.id);

    if (cfg.goodbye_enabled && cfg.goodbye_channel) {
      const channel = member.guild.channels.cache.get(cfg.goodbye_channel);
      if (channel) {
        channel.send({ embeds: [buildGoodbyeEmbed(member, cfg)] }).catch(() => {});
      }
    }

    if (cfg.join_log_channel) {
      const channel = member.guild.channels.cache.get(cfg.join_log_channel);
      if (channel) {
        const roles = member.roles?.cache
          ?.filter((r) => r.id !== member.guild.id)
          .map((r) => r.name)
          .join(', ') || 'None';
        const embed = new EmbedBuilder()
          .setColor(config.brand.errorColor)
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(`📤 ${member.user.tag} left.`)
          .addFields({ name: 'Roles', value: roles.slice(0, 1024) })
          .setFooter({ text: `ID: ${member.id}` })
          .setTimestamp();
        channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
      }
    }
  },
};
