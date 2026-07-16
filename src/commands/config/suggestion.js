'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db, getGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

const getById = db.prepare('SELECT * FROM suggestions WHERE guild_id = ? AND id = ?');
const setStatus = db.prepare('UPDATE suggestions SET status = ? WHERE id = ?');

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Approve or reject a suggestion (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName('action').setDescription('Action').setRequired(true)
      .addChoices({ name: 'Approve', value: 'approved' }, { name: 'Reject', value: 'rejected' }, { name: 'Consider', value: 'considered' }))
    .addIntegerOption((o) => o.setName('id').setDescription('Suggestion ID').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason / response')),
  async execute(interaction) {
    const action = interaction.options.getString('action');
    const id = interaction.options.getInteger('id');
    const reason = interaction.options.getString('reason');
    const sug = getById.get(interaction.guild.id, id);
    if (!sug) return interaction.reply({ embeds: [Embed.error('No suggestion with that ID.')], ephemeral: true });
    setStatus.run(action, id);
    const colors = { approved: config.brand.successColor, rejected: config.brand.errorColor, considered: config.brand.warnColor };
    const labels = { approved: '✅ Approved', rejected: '❌ Rejected', considered: '🤔 Under Consideration' };
    const cfg = getGuildConfig(interaction.guild.id);
    const channel = interaction.guild.channels.cache.get(cfg.suggestion_channel);
    if (channel && sug.message_id) {
      const msg = await channel.messages.fetch(sug.message_id).catch(() => null);
      if (msg) {
        const embed = EmbedBuilder.from(msg.embeds[0]).setColor(colors[action])
          .spliceFields(0, 1, { name: 'Status', value: `${labels[action]} by ${interaction.user.tag}${reason ? `\n> ${reason}` : ''}` });
        await msg.edit({ embeds: [embed] }).catch(() => {});
      }
    }
    return interaction.reply({ embeds: [Embed.success(`Suggestion #${id} marked as **${action}**.`)] });
  },
};
