'use strict';

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');

module.exports = {
  category: 'utility',
  guildOnly: true,
  cooldown: 30,
  data: new SlashCommandBuilder()
    .setName('mydata')
    .setDescription('Export or delete your personal data on this server')
    .addSubcommand((s) => s.setName('export').setDescription('Download a copy of your data'))
    .addSubcommand((s) => s.setName('delete').setDescription('Delete your economy, level, inventory & AFK data')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const uid = interaction.user.id;

    if (sub === 'export') {
      await interaction.deferReply({ ephemeral: true });
      const data = {
        user_id: uid,
        guild_id: gid,
        exported_at: new Date().toISOString(),
        level: db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(gid, uid) || null,
        economy: db.prepare('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?').get(gid, uid) || null,
        inventory: db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ?').all(gid, uid),
        warnings: db.prepare('SELECT id, reason, timestamp FROM warnings WHERE guild_id = ? AND user_id = ?').all(gid, uid),
        reminders: db.prepare('SELECT * FROM reminders WHERE user_id = ?').all(uid),
      };
      const file = new AttachmentBuilder(Buffer.from(JSON.stringify(data, null, 2), 'utf8'), { name: 'my-data.json' });
      return interaction.editReply({ embeds: [Embed.success('Here is a copy of your data on this server.')], files: [file] });
    }

    // delete — self-service reset of personal (non-moderation) data.
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM levels WHERE guild_id = ? AND user_id = ?').run(gid, uid);
      db.prepare('DELETE FROM economy WHERE guild_id = ? AND user_id = ?').run(gid, uid);
      db.prepare('DELETE FROM inventory WHERE guild_id = ? AND user_id = ?').run(gid, uid);
      db.prepare('DELETE FROM afk WHERE user_id = ? AND guild_id = ?').run(uid, gid);
      db.prepare('DELETE FROM reminders WHERE user_id = ? AND guild_id = ?').run(uid, gid);
    });
    tx();
    return interaction.reply({
      embeds: [Embed.success('Your economy, level, inventory, AFK and reminder data on this server has been deleted.\n*Moderation records (warnings) are retained by the server.*')],
      ephemeral: true,
    });
  },
};
