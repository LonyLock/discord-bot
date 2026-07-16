'use strict';

const { ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { db } = require('../database/db');

const q = {
  forMessage: db.prepare('SELECT * FROM button_roles WHERE message_id = ? ORDER BY id ASC'),
  forGuild: db.prepare('SELECT * FROM button_roles WHERE guild_id = ? ORDER BY message_id, id'),
  insert: db.prepare(
    'INSERT INTO button_roles (guild_id, channel_id, message_id, role_id, label, emoji, style) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ),
  hasRole: db.prepare('SELECT 1 FROM button_roles WHERE message_id = ? AND role_id = ? LIMIT 1'),
  removeRole: db.prepare('DELETE FROM button_roles WHERE message_id = ? AND role_id = ?'),
  removeMessage: db.prepare('DELETE FROM button_roles WHERE message_id = ?'),
  count: db.prepare('SELECT COUNT(*) AS c FROM button_roles WHERE message_id = ?'),
};

/** Rebuild the ActionRows (up to 5 rows × 5 buttons) for a button-role message. */
function buildRows(messageId) {
  const buttons = q.forMessage.all(messageId);
  const rows = [];
  for (let i = 0; i < buttons.length && rows.length < 5; i += 5) {
    const row = new ActionRowBuilder();
    for (const b of buttons.slice(i, i + 5)) {
      const btn = new ButtonBuilder()
        .setCustomId(`buttonrole:${b.role_id}`)
        .setLabel(b.label)
        .setStyle(b.style || 1);
      if (b.emoji) {
        try { btn.setEmoji(b.emoji); } catch { /* invalid emoji — skip */ }
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

module.exports = { buildRows, q };
