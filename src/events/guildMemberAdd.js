'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../database/db');
const config = require('../../config.json');
const antiraid = require('../services/antiraid');

function render(template, member) {
  return (template || '')
    .replace(/{user}/g, `${member}`)
    .replace(/{username}/g, member.user.username)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{server}/g, member.guild.name)
    .replace(/{membercount}/g, member.guild.memberCount);
}

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
        const text = render(cfg.welcome_message || 'Welcome {user} to **{server}**! You are member #{membercount}.', member);
        const embed = new EmbedBuilder()
          .setColor(config.brand.successColor)
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setTitle('👋 A new member joined!')
          .setDescription(text)
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: `Member #${member.guild.memberCount}` })
          .setTimestamp();
        channel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
      }
    }

    // Join log.
    if (cfg.join_log_channel) {
      const channel = member.guild.channels.cache.get(cfg.join_log_channel);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(config.brand.successColor)
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(`📥 ${member} joined.`)
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
