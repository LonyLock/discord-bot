'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { isLogIgnored } = require('../database/db');
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

    let color; let title; let description;
    if (!oldState.channelId) {
      color = config.brand.successColor;
      title = '🔊 Voice Join';
      description = `**${member.user.tag}** joined ${newState.channel}`;
    } else if (!newState.channelId) {
      color = config.brand.errorColor;
      title = '🔇 Voice Leave';
      description = `**${member.user.tag}** left ${oldState.channel ?? `<#${oldState.channelId}>`}`;
    } else {
      color = config.brand.warnColor;
      title = '🔀 Voice Move';
      description = `**${member.user.tag}** moved ${oldState.channel ?? `<#${oldState.channelId}>`} → ${newState.channel}`;
    }

    // Respect the per-guild ignore list for the voice channel (or its category).
    const chan = newState.channel || oldState.channel;
    if (chan && isLogIgnored(guild.id, chan.id, chan.parentId)) return;

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
