'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');

const setCounting = db.prepare('INSERT OR REPLACE INTO counting (channel_id, guild_id, current, last_user_id, best) VALUES (?, ?, 0, NULL, COALESCE((SELECT best FROM counting WHERE channel_id=?),0))');
const delCounting = db.prepare('DELETE FROM counting WHERE channel_id = ?');
const getCounting = db.prepare('SELECT * FROM counting WHERE channel_id = ?');

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('counting')
    .setDescription('Set up the counting game in a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((s) => s.setName('enable').setDescription('Enable counting in this channel'))
    .addSubcommand((s) => s.setName('disable').setDescription('Disable counting in this channel'))
    .addSubcommand((s) => s.setName('stats').setDescription('Show the counting stats for this channel')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const cid = interaction.channel.id;
    if (sub === 'enable') {
      setCounting.run(cid, interaction.guild.id, cid);
      return interaction.reply({ embeds: [Embed.success('Counting enabled! Start from **1**. Everyone counts up — no counting twice in a row, no mistakes!')] });
    }
    if (sub === 'disable') {
      const res = delCounting.run(cid);
      return interaction.reply({ embeds: [res.changes ? Embed.success('Counting disabled in this channel.') : Embed.error('Counting was not enabled here.')] });
    }
    const game = getCounting.get(cid);
    if (!game) return interaction.reply({ embeds: [Embed.error('Counting is not enabled in this channel.')], ephemeral: true });
    return interaction.reply({ embeds: [Embed.info('🔢 Counting Stats', `**Current:** ${game.current}\n**Best streak:** ${game.best}`)] });
  },
};
