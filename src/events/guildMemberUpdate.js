'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../database/db');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    // Fetch partials if needed.
    if (oldMember.partial) await oldMember.fetch().catch(() => {});
    const guild = newMember.guild;

    // Boost started / ended: grant or remove the configured booster role.
    const wasBoosting = Boolean(oldMember.premiumSinceTimestamp);
    const isBoosting = Boolean(newMember.premiumSinceTimestamp);
    if (wasBoosting !== isBoosting) {
      const cfg = getGuildConfig(guild.id);
      const role = cfg.boost_role && guild.roles.cache.get(cfg.boost_role);
      if (role && role.position < guild.members.me.roles.highest.position) {
        if (isBoosting) newMember.roles.add(role, 'Server boost started').catch(() => {});
        else newMember.roles.remove(role, 'Server boost ended').catch(() => {});
      }
      const embed = new EmbedBuilder()
        .setColor(isBoosting ? '#f47fff' : config.brand.warnColor)
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle(isBoosting ? '💎 Server Boost Started' : '💎 Server Boost Ended')
        .setDescription(role ? `Boost role: ${role}` : null)
        .setFooter({ text: `ID: ${newMember.id}` })
        .setTimestamp();
      sendLog(guild, 'join_log_channel', embed);
    }

    // Nickname change.
    if (oldMember.nickname !== newMember.nickname) {
      const embed = new EmbedBuilder()
        .setColor(config.brand.color)
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle('✏️ Nickname Changed')
        .addFields(
          { name: 'Before', value: oldMember.nickname || '*none*', inline: true },
          { name: 'After', value: newMember.nickname || '*none*', inline: true }
        )
        .setFooter({ text: `ID: ${newMember.id}` })
        .setTimestamp();
      sendLog(guild, 'join_log_channel', embed);
    }

    // Role changes.
    const before = oldMember.roles.cache;
    const after = newMember.roles.cache;
    const added = after.filter((r) => !before.has(r.id));
    const removed = before.filter((r) => !after.has(r.id));
    if (added.size || removed.size) {
      const embed = new EmbedBuilder()
        .setColor(config.brand.color)
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle('🎭 Roles Updated')
        .setFooter({ text: `ID: ${newMember.id}` })
        .setTimestamp();
      if (added.size) embed.addFields({ name: 'Added', value: added.map((r) => r.toString()).join(' ').slice(0, 1024) });
      if (removed.size) embed.addFields({ name: 'Removed', value: removed.map((r) => r.toString()).join(' ').slice(0, 1024) });
      sendLog(guild, 'join_log_channel', embed);
    }

    // Timeout applied / lifted.
    const oldTo = oldMember.communicationDisabledUntilTimestamp || 0;
    const newTo = newMember.communicationDisabledUntilTimestamp || 0;
    if (oldTo !== newTo) {
      const applied = newTo > Date.now();
      const embed = new EmbedBuilder()
        .setColor(applied ? config.brand.warnColor : config.brand.successColor)
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle(applied ? '🔇 Timed Out' : '🔊 Timeout Removed')
        .setFooter({ text: `ID: ${newMember.id}` })
        .setTimestamp();
      if (applied) embed.addFields({ name: 'Until', value: `<t:${Math.floor(newTo / 1000)}:F>` });
      sendLog(guild, 'join_log_channel', embed);
    }
  },
};
