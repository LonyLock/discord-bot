'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const { t } = require('../../i18n');

// Tables exported for a guild backup (all keyed by guild_id).
const TABLES = ['guild_config', 'levels', 'level_roles', 'economy', 'shop_items', 'warnings',
  'tags', 'reaction_roles', 'button_roles', 'autoresponders', 'badwords', 'scheduled_messages',
  'sticky_messages', 'counting', 'suggestions'];

module.exports = {
  category: 'utility',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 30,
  data: new SlashCommandBuilder()
    .setName('export')
    .setDescription('Export this server\'s bot data as a JSON backup (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const data = { guild_id: interaction.guild.id, exported_at: new Date().toISOString(), tables: {} };
    for (const table of TABLES) {
      try {
        data.tables[table] = db.prepare(`SELECT * FROM ${table} WHERE guild_id = ?`).all(interaction.guild.id);
      } catch { data.tables[table] = []; }
    }
    const json = JSON.stringify(data, null, 2);
    const rows = Object.values(data.tables).reduce((a, t) => a + t.length, 0);
    const file = new AttachmentBuilder(Buffer.from(json, 'utf8'), { name: `backup-${interaction.guild.id}.json` });
    return interaction.editReply({
      embeds: [Embed.success(t(interaction.guild.id, 'util.export.success', { rows, tables: TABLES.length }))],
      files: [file],
    });
  },
};
