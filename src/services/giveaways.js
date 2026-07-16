'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../database/db');
const config = require('../../config.json');
const { relative } = require('../utils/time');

const insertGiveaway = db.prepare(`
  INSERT INTO giveaways (message_id, channel_id, guild_id, prize, winners, host_id, end_at, required_role, required_level)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const getGiveaway = db.prepare('SELECT * FROM giveaways WHERE message_id = ?');
const markEnded = db.prepare('UPDATE giveaways SET ended = 1 WHERE message_id = ?');
const addEntry = db.prepare(
  'INSERT OR IGNORE INTO giveaway_entries (message_id, user_id) VALUES (?, ?)'
);
const removeEntry = db.prepare(
  'DELETE FROM giveaway_entries WHERE message_id = ? AND user_id = ?'
);
const hasEntry = db.prepare(
  'SELECT 1 FROM giveaway_entries WHERE message_id = ? AND user_id = ?'
);
const countEntries = db.prepare(
  'SELECT COUNT(*) AS c FROM giveaway_entries WHERE message_id = ?'
);
const listEntries = db.prepare('SELECT user_id FROM giveaway_entries WHERE message_id = ?');
const dueGiveaways = db.prepare('SELECT * FROM giveaways WHERE ended = 0 AND end_at <= ?');

function buildEmbed(g, entryCount, ended = false, winners = []) {
  const embed = new EmbedBuilder()
    .setColor(ended ? config.brand.warnColor : config.brand.color)
    .setTitle(`🎉 ${g.prize}`)
    .setFooter({ text: `${g.winners} winner(s) • Hosted by the staff` })
    .setTimestamp(g.end_at);

  if (ended) {
    embed.setDescription(
      winners.length
        ? `**Winners:** ${winners.map((id) => `<@${id}>`).join(', ')}\n**Entries:** ${entryCount}`
        : `Ended — not enough entries to draw a winner.\n**Entries:** ${entryCount}`
    );
  } else {
    embed.setDescription(
      `Click 🎉 below to enter!\n\n**Ends:** ${relative(g.end_at)}\n**Entries:** ${entryCount}\n**Host:** <@${g.host_id}>${
        g.required_role ? `\n**Required role:** <@&${g.required_role}>` : ''
      }${g.required_level ? `\n**Required level:** ${g.required_level}+` : ''}`
    );
  }
  return embed;
}

function buttonRow(entryCount, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel(`Enter (${entryCount})`)
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
}

async function startGiveaway(channel, { prize, winners, durationMs, hostId, requiredRole, requiredLevel = 0 }) {
  const endAt = Date.now() + durationMs;
  const placeholder = { prize, winners, host_id: hostId, end_at: endAt, required_role: requiredRole, required_level: requiredLevel };
  const message = await channel.send({
    embeds: [buildEmbed(placeholder, 0)],
    components: [buttonRow(0)],
  });
  insertGiveaway.run(
    message.id, channel.id, channel.guild.id, prize, winners, hostId, endAt, requiredRole || null, requiredLevel || 0
  );
  return message;
}

/** Toggle a user's entry; returns { entered: bool, count }. */
function toggleEntry(messageId, userId) {
  if (hasEntry.get(messageId, userId)) {
    removeEntry.run(messageId, userId);
    return { entered: false, count: countEntries.get(messageId).c };
  }
  addEntry.run(messageId, userId);
  return { entered: true, count: countEntries.get(messageId).c };
}

function pickWinners(messageId, count) {
  const pool = listEntries.all(messageId).map((r) => r.user_id);
  const winners = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

/** End a giveaway now: edit the message, announce winners. */
async function endGiveaway(client, messageId, reroll = false) {
  const g = getGiveaway.get(messageId);
  if (!g) return { error: 'Giveaway not found.' };
  if (g.ended && !reroll) return { error: 'That giveaway has already ended.' };

  const channel = await client.channels.fetch(g.channel_id).catch(() => null);
  if (!channel) {
    markEnded.run(messageId);
    return { error: 'The giveaway channel no longer exists.' };
  }

  const winners = pickWinners(messageId, g.winners);
  const entryCount = countEntries.get(messageId).c;
  markEnded.run(messageId);

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (message) {
    await message
      .edit({ embeds: [buildEmbed(g, entryCount, true, winners)], components: [buttonRow(entryCount, true)] })
      .catch(() => {});
  }

  if (winners.length) {
    await channel
      .send(`🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(', ')}! You won **${g.prize}**!`)
      .catch(() => {});
  } else {
    await channel.send(`No valid entries for **${g.prize}** — no winner could be drawn.`).catch(() => {});
  }
  return { winners, entryCount };
}

/** Called periodically to end giveaways whose timers expired. */
async function processDue(client) {
  const due = dueGiveaways.all(Date.now());
  for (const g of due) {
    await endGiveaway(client, g.message_id).catch(() => {});
  }
}

module.exports = {
  startGiveaway,
  toggleEntry,
  endGiveaway,
  processDue,
  getGiveaway,
  buildEmbed,
  buttonRow,
  countEntries,
};
