'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');

module.exports = {
  category: 'info',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Show information about a role')
    .addRoleOption((o) => o.setName('role').setDescription('The role').setRequired(true)),
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const perms = role.permissions.toArray();
    const embed = new EmbedBuilder()
      .setColor(role.hexColor === '#000000' ? config.brand.color : role.hexColor)
      .setTitle(`Role: ${role.name}`)
      .addFields(
        { name: 'ID', value: role.id, inline: true },
        { name: 'Color', value: role.hexColor, inline: true },
        { name: 'Members', value: `${role.members.size}`, inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Position', value: `${role.position}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
        { name: `Key Permissions`, value: perms.includes('Administrator') ? 'Administrator (all)' : (perms.slice(0, 10).join(', ') || 'None') })
      .setFooter({ text: config.brand.footer });
    return interaction.reply({ embeds: [embed] });
  },
};
