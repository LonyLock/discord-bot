'use strict';

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

/** Interpolate the {placeholders} used by welcome/goodbye templates. */
function render(template, member, { plainUser = false } = {}) {
  return (template || '')
    .replace(/{user}/g, plainUser ? member.user.tag : `${member}`)
    .replace(/{username}/g, member.user.username)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{server}/g, member.guild.name)
    .replace(/{membercount}/g, member.guild.memberCount);
}

/** The welcome embed exactly as posted on a real join. */
function buildWelcomeEmbed(member, cfg) {
  const text = render(cfg.welcome_message || 'Welcome {user} to **{server}**! You are member #{membercount}.', member);
  return new EmbedBuilder()
    .setColor(config.brand.successColor)
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setTitle('👋 A new member joined!')
    .setDescription(text)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Member #${member.guild.memberCount}` })
    .setTimestamp();
}

/** The goodbye embed exactly as posted on a real leave. */
function buildGoodbyeEmbed(member, cfg) {
  const text = render(cfg.goodbye_message || '{user} has left the server. We now have {membercount} members.', member, { plainUser: true });
  return new EmbedBuilder()
    .setColor(config.brand.errorColor)
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setTitle('👋 A member left')
    .setDescription(text)
    .setFooter({ text: `Member count: ${member.guild.memberCount}` })
    .setTimestamp();
}

module.exports = { render, buildWelcomeEmbed, buildGoodbyeEmbed };
