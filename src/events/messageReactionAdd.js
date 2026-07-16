'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { db, getGuildConfig } = require('../database/db');
const config = require('../../config.json');

const getReactionRole = db.prepare(
  'SELECT * FROM reaction_roles WHERE message_id = ? AND emoji = ?'
);
const getStar = db.prepare('SELECT * FROM starboard WHERE original_id = ?');
const insertStar = db.prepare(
  'INSERT OR REPLACE INTO starboard (original_id, starboard_id, guild_id) VALUES (?, ?, ?)'
);

function emojiKey(reaction) {
  return reaction.emoji.id || reaction.emoji.name;
}

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user, client) {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => {});
    if (reaction.message.partial) await reaction.message.fetch().catch(() => {});
    const { guild } = reaction.message;
    if (!guild) return;

    // --- Reaction roles ---
    const rr = getReactionRole.get(reaction.message.id, emojiKey(reaction));
    if (rr) {
      const member = await guild.members.fetch(user.id).catch(() => null);
      const role = guild.roles.cache.get(rr.role_id);
      if (member && role) member.roles.add(role, 'Reaction role').catch(() => {});
    }

    // --- Starboard ---
    await handleStarboard(reaction, guild);
  },
};

async function handleStarboard(reaction, guild) {
  const cfg = getGuildConfig(guild.id);
  if (!cfg.starboard_channel) return;
  const star = cfg.starboard_emoji || '⭐';
  if ((reaction.emoji.name || reaction.emoji.id) !== star) return;

  const board = guild.channels.cache.get(cfg.starboard_channel);
  if (!board) return;
  const msg = reaction.message;
  if (msg.channel.id === board.id) return; // don't star the starboard
  if (msg.author?.bot) return;

  const count = reaction.count || 0;
  if (count < (cfg.starboard_threshold || 3)) return;

  const embed = new EmbedBuilder()
    .setColor(config.brand.warnColor)
    .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
    .setDescription(msg.content || '*No text content*')
    .addFields({ name: 'Source', value: `[Jump to message](${msg.url})` })
    .setFooter({ text: `${star} ${count}` })
    .setTimestamp(msg.createdTimestamp);

  const image = msg.attachments.find((a) => a.contentType?.startsWith('image'));
  if (image) embed.setImage(image.url);

  const existing = getStar.get(msg.id);
  if (existing) {
    const boardMsg = await board.messages.fetch(existing.starboard_id).catch(() => null);
    if (boardMsg) return boardMsg.edit({ embeds: [embed] }).catch(() => {});
  }
  const sent = await board.send({ embeds: [embed] }).catch(() => null);
  if (sent) insertStar.run(msg.id, sent.id, guild.id);
}
