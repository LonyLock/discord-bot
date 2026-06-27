'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');

module.exports = {
  category: 'info',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('membercount').setDescription('Show the server member count'),
  async execute(interaction) {
    await interaction.guild.members.fetch().catch(() => {});
    const total = interaction.guild.memberCount;
    const bots = interaction.guild.members.cache.filter((m) => m.user.bot).size;
    return interaction.reply({ embeds: [Embed.info('👥 Member Count', `**Total:** ${total}\n**Humans:** ${total - bots}\n**Bots:** ${bots}`)] });
  },
};
