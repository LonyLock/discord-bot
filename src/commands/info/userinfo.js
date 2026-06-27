'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');

module.exports = {
  category: 'info',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show detailed information about a user')
    .addUserOption((o) => o.setName('user').setDescription('The user')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;
    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor && member.displayHexColor !== '#000000' ? member.displayHexColor : config.brand.color)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true })
      .setFooter({ text: config.brand.footer })
      .setTimestamp();
    if (member) {
      const roles = member.roles.cache.filter((r) => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position);
      embed.addFields(
        { name: 'Joined Server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'Nickname', value: member.nickname || 'None', inline: true },
        { name: 'Highest Role', value: member.roles.highest.toString(), inline: true },
        { name: `Roles [${roles.size}]`, value: roles.size ? roles.map((r) => r.toString()).slice(0, 20).join(' ') : 'None' });
      if (member.premiumSinceTimestamp) embed.addFields({ name: 'Boosting Since', value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, inline: true });
    }
    return interaction.reply({ embeds: [embed] });
  },
};
