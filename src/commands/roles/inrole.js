'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { truncate } = require('../../utils/helpers');

module.exports = {
  category: 'roles',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('inrole')
    .setDescription('List members who have a specific role')
    .addRoleOption((o) => o.setName('role').setDescription('The role').setRequired(true)),
  async execute(interaction) {
    await interaction.guild.members.fetch().catch(() => {});
    const role = interaction.options.getRole('role');
    const members = role.members.map((m) => m.user.tag);
    if (!members.length) return interaction.reply({ embeds: [Embed.info('👥 In Role', `No members have ${role}.`)] });
    const embed = new EmbedBuilder().setColor(role.hexColor === '#000000' ? config.brand.color : role.hexColor)
      .setTitle(`Members with ${role.name} — ${members.length}`)
      .setDescription(truncate(members.join(', '), 4000));
    return interaction.reply({ embeds: [embed] });
  },
};
