'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../database/db');
const config = require('../../config.json');
const antiraid = require('../services/antiraid');
const { buildWelcomeEmbed } = require('../utils/greetings');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    // Anti-raid runs first — if the member is removed, skip everything else.
    const removed = await antiraid.check(member, client).catch(() => false);
    if (removed) return;

    const cfg = getGuildConfig(member.guild.id);

    // Auto-role.
    if (cfg.autorole) {
      const role = member.guild.roles.cache.get(cfg.autorole);
      if (role) member.roles.add(role, 'Autorole on join').catch(() => {});
    }

    // Welcome message.
    if (cfg.welcome_enabled && cfg.welcome_channel) {
      const channel = member.guild.channels.cache.get(cfg.welcome_channel);
      if (channel) {
        channel.send({ content: `${member}`, embeds: [buildWelcomeEmbed(member, cfg)] }).catch(() => {});
      }
    }

    // Join log.
    if (cfg.join_log_channel) {
      const channel = member.guild.channels.cache.get(cfg.join_log_channel);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(config.brand.successColor)
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(`📥 **${member.user.tag}** joined.`)
          .addFields({
            name: 'Account created',
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          })
          .setFooter({ text: `ID: ${member.id}` })
          .setTimestamp();
        channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
      }
    }
  },
};
