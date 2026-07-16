'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const giveaways = require('../../services/giveaways');
const { parseDuration, formatDuration, relative } = require('../../utils/time');

const listActive = db.prepare('SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 ORDER BY end_at ASC');

module.exports = {
  category: 'giveaways',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Run giveaways (Manage Server)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('start').setDescription('Start a giveaway')
      .addStringOption((o) => o.setName('prize').setDescription('What is being given away').setRequired(true))
      .addStringOption((o) => o.setName('duration').setDescription('e.g. 1h, 1d').setRequired(true))
      .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(20))
      .addRoleOption((o) => o.setName('required_role').setDescription('Role required to enter'))
      .addIntegerOption((o) => o.setName('required_level').setDescription('Minimum level required to enter').setMinValue(1)))
    .addSubcommand((s) => s.setName('end').setDescription('End a giveaway now')
      .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand((s) => s.setName('reroll').setDescription('Reroll a finished giveaway')
      .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('List active giveaways')),
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const ms = parseDuration(interaction.options.getString('duration'));
      if (!ms || ms < 10000 || ms > 2592000000) return interaction.reply({ embeds: [Embed.error('Duration must be between 10s and 30d.')], ephemeral: true });
      const winners = interaction.options.getInteger('winners') || 1;
      const requiredRole = interaction.options.getRole('required_role');
      const requiredLevel = interaction.options.getInteger('required_level') || 0;
      const msg = await giveaways.startGiveaway(interaction.channel, { prize, winners, durationMs: ms, hostId: interaction.user.id, requiredRole: requiredRole?.id, requiredLevel });
      return interaction.reply({ embeds: [Embed.success(`Giveaway for **${prize}** started! Ends ${relative(Date.now() + ms)} (in ${formatDuration(ms)}). [Jump](${msg.url})`)], ephemeral: true });
    }

    if (sub === 'end') {
      const result = await giveaways.endGiveaway(client, interaction.options.getString('message_id'));
      return interaction.reply({ embeds: [result.error ? Embed.error(result.error) : Embed.success(`Giveaway ended with ${result.entryCount} entries.`)], ephemeral: true });
    }

    if (sub === 'reroll') {
      const result = await giveaways.endGiveaway(client, interaction.options.getString('message_id'), true);
      return interaction.reply({ embeds: [result.error ? Embed.error(result.error) : Embed.success('Giveaway rerolled!')], ephemeral: true });
    }

    const rows = listActive.all(interaction.guild.id);
    const embed = new EmbedBuilder().setColor(config.brand.color).setTitle('🎉 Active Giveaways')
      .setDescription(rows.map((g) => `**${g.prize}** — ends ${relative(g.end_at)} • [Jump](https://discord.com/channels/${g.guild_id}/${g.channel_id}/${g.message_id})`).join('\n') || 'No active giveaways.');
    return interaction.reply({ embeds: [embed] });
  },
};
