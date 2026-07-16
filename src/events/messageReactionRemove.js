'use strict';

const { Events } = require('discord.js');
const { db } = require('../database/db');

const getReactionRole = db.prepare(
  'SELECT * FROM reaction_roles WHERE message_id = ? AND emoji = ?'
);

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => {});
    const { guild } = reaction.message;
    if (!guild) return;

    const rr = getReactionRole.get(reaction.message.id, reaction.emoji.id || reaction.emoji.name);
    if (rr) {
      const member = await guild.members.fetch(user.id).catch(() => null);
      const role = guild.roles.cache.get(rr.role_id);
      if (member && role) member.roles.remove(role, 'Reaction role removed').catch(() => {});
    }
  },
};
