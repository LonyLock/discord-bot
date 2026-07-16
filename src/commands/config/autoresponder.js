'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

const addAr = db.prepare('INSERT OR REPLACE INTO autoresponders (guild_id, trigger, response, match_mode) VALUES (?, ?, ?, ?)');
const delAr = db.prepare('DELETE FROM autoresponders WHERE guild_id = ? AND trigger = ?');
const listAr = db.prepare('SELECT * FROM autoresponders WHERE guild_id = ?');

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('autoresponder')
    .setDescription('Manage automatic responses (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('add').setDescription('Add an auto-responder')
      .addStringOption((o) => o.setName('trigger').setDescription('Trigger text').setRequired(true))
      .addStringOption((o) => o.setName('response').setDescription('Bot response').setRequired(true))
      .addStringOption((o) => o.setName('match').setDescription('How to match')
        .addChoices({ name: 'Contains', value: 'contains' }, { name: 'Exact', value: 'exact' }, { name: 'Starts with', value: 'startswith' })))
    .addSubcommand((s) => s.setName('remove').setDescription('Remove an auto-responder')
      .addStringOption((o) => o.setName('trigger').setDescription('Trigger text').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('List auto-responders')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    if (sub === 'add') {
      const trigger = interaction.options.getString('trigger').toLowerCase().slice(0, 100);
      const response = interaction.options.getString('response');
      const match = interaction.options.getString('match') || 'contains';
      addAr.run(gid, trigger, response, match);
      return interaction.reply({ embeds: [Embed.success(`Auto-responder added for \`${trigger}\` (${match}).`)] });
    }
    if (sub === 'remove') {
      const trigger = interaction.options.getString('trigger').toLowerCase();
      const res = delAr.run(gid, trigger);
      return interaction.reply({ embeds: [res.changes ? Embed.success(`Removed auto-responder \`${trigger}\`.`) : Embed.error('No such auto-responder.')] });
    }
    const rows = listAr.all(gid);
    const embed = new EmbedBuilder().setColor(config.brand.color).setTitle('💬 Auto-Responders')
      .setDescription(rows.map((r) => `\`${r.trigger}\` (${r.match_mode}) → ${r.response.slice(0, 60)}`).join('\n') || 'None configured.');
    return interaction.reply({ embeds: [embed] });
  },
};
