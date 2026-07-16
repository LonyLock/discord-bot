'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');

const disable = db.prepare('INSERT OR IGNORE INTO disabled_commands (guild_id, command) VALUES (?, ?)');
const enable = db.prepare('DELETE FROM disabled_commands WHERE guild_id = ? AND command = ?');
const listDisabled = db.prepare('SELECT command FROM disabled_commands WHERE guild_id = ?');

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('command')
    .setDescription('Enable or disable a command on this server (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('disable').setDescription('Disable a command')
      .addStringOption((o) => o.setName('name').setDescription('Command name').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('enable').setDescription('Re-enable a command')
      .addStringOption((o) => o.setName('name').setDescription('Command name').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('list').setDescription('List disabled commands')),
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    if (sub === 'list') {
      const rows = listDisabled.all(gid);
      return interaction.reply({ embeds: [Embed.info('🚫 Disabled Commands', rows.length ? rows.map((r) => `\`${r.command}\``).join(', ') : 'None.')] });
    }
    const name = interaction.options.getString('name').toLowerCase();
    if (!client.commands.has(name)) return interaction.reply({ embeds: [Embed.error('No such command.')], ephemeral: true });
    if (['command', 'config'].includes(name)) return interaction.reply({ embeds: [Embed.error('You cannot disable core admin commands.')], ephemeral: true });
    if (sub === 'disable') { disable.run(gid, name); return interaction.reply({ embeds: [Embed.success(`Disabled \`/${name}\`.`)] }); }
    enable.run(gid, name);
    return interaction.reply({ embeds: [Embed.success(`Enabled \`/${name}\`.`)] });
  },
  async autocomplete(interaction, client) {
    const focused = interaction.options.getFocused().toLowerCase();
    const matches = [...client.commands.keys()].filter((n) => n.includes(focused)).slice(0, 25);
    await interaction.respond(matches.map((n) => ({ name: n, value: n })));
  },
};
