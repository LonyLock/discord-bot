'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig, isLogIgnored } = require('../database/db');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');

/** Voice activity log: joins, leaves and moves between voice channels. */
module.exports = {
  name: Events.VoiceStateUpdate,
  execute(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    const member = newState.member || oldState.member;
    if (!guild || !member || member.user.bot) return;
    if (oldState.channelId === newState.channelId) return; // mute/deafen/stream — not logged

    // Cheap cached-config check first; skip all DB/embed work when unset.
    if (!getGuildConfig(guild.id).voice_log_channel) return;

    // Respect the per-guild ignore list for BOTH endpoints of the transition,
    // using raw ids so an uncached/deleted channel still honours the list.
    if (isLogIgnored(
      guild.id,
      oldState.channelId, oldState.channel?.parentId,
      newState.channelId, newState.channel?.parentId
    )) return;

    const oldChan = oldState.channel ?? (oldState.channelId ? `<#${oldState.channelId}>` : null);
    const newChan = newState.channel ?? (newState.channelId ? `<#${newState.channelId}>` : null);

    let color; let title; let description;
    if (!oldState.channelId) {
      color = config.brand.successColor;
      title = '🔊 Voice Join';
      description = `**${member.user.tag}** joined ${newChan}`;
    } else if (!newState.channelId) {
      color = config.brand.errorColor;
      title = '🔇 Voice Leave';
      description = `**${member.user.tag}** left ${oldChan}`;
    } else {
      color = config.brand.warnColor;
      title = '🔀 Voice Move';
      description = `**${member.user.tag}** moved ${oldChan} → ${newChan}`;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp();
    sendLog(guild, 'voice_log_channel', embed);
  },
};
