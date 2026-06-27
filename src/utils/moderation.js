'use strict';

const { EmbedBuilder } = require('discord.js');
const { db, getGuildConfig } = require('../database/db');
const config = require('../../config.json');

const insertLog = db.prepare(`
  INSERT INTO modlogs (guild_id, user_id, moderator_id, action, reason, timestamp)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const ACTION_COLORS = {
  ban: config.brand.errorColor,
  tempban: config.brand.errorColor,
  unban: config.brand.successColor,
  kick: '#E67E22',
  timeout: config.brand.warnColor,
  untimeout: config.brand.successColor,
  warn: config.brand.warnColor,
  mute: config.brand.warnColor,
  unmute: config.brand.successColor,
  purge: '#95A5A6',
};

/**
 * Record a moderation action and post it to the configured mod-log channel.
 */
async function logModAction(guild, { action, target, moderator, reason, extra }) {
  const targetId = target?.id ?? target;
  insertLog.run(guild.id, String(targetId), moderator.id, action, reason ?? null, Date.now());

  const cfg = getGuildConfig(guild.id);
  if (!cfg.mod_log_channel) return;
  const channel = guild.channels.cache.get(cfg.mod_log_channel);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(ACTION_COLORS[action] || config.brand.color)
    .setAuthor({
      name: `${moderator.tag ?? moderator.username} (${moderator.id})`,
      iconURL: moderator.displayAvatarURL?.(),
    })
    .setTitle(`Moderation — ${action.charAt(0).toUpperCase() + action.slice(1)}`)
    .addFields(
      {
        name: 'User',
        value: target?.tag
          ? `${target.tag} (\`${targetId}\`)`
          : `<@${targetId}> (\`${targetId}\`)`,
        inline: false,
      },
      { name: 'Reason', value: reason || 'No reason provided', inline: false }
    )
    .setFooter({ text: config.brand.footer })
    .setTimestamp();

  if (extra) embed.addFields({ name: 'Details', value: extra, inline: false });

  channel.send({ embeds: [embed] }).catch(() => {});
}

/**
 * Validate that a moderator can act on a target member.
 * Returns an error string, or null when the action is allowed.
 */
function checkHierarchy(interaction, targetMember) {
  if (!targetMember) return null; // user not in guild (e.g. ban by ID)
  const me = interaction.guild.members.me;
  const author = interaction.member;

  if (targetMember.id === interaction.user.id) return "You can't target yourself.";
  if (targetMember.id === interaction.client.user.id) return "I can't target myself.";
  if (targetMember.id === interaction.guild.ownerId) return "You can't target the server owner.";

  if (
    author.id !== interaction.guild.ownerId &&
    author.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0
  ) {
    return 'You cannot target someone with an equal or higher role than you.';
  }
  if (me.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
    return 'My role is not high enough to perform this action on that member.';
  }
  return null;
}

module.exports = { logModAction, checkHierarchy };
