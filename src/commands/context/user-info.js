'use strict';

const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');

// Right-click a member → Apps → "User Info".
module.exports = {
  category: 'context',
  guildOnly: true,
  data: new ContextMenuCommandBuilder().setName('User Info').setType(ApplicationCommandType.User),
  async execute(interaction) {
    const user = interaction.targetUser;
    const member = interaction.targetMember;
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: config.brand.footer })
      .setTimestamp();
    if (member?.joinedTimestamp) {
      embed.addFields({ name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });
    }
    if (member) {
      const roles = member.roles.cache
        .filter((r) => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => r.toString());
      embed.addFields({ name: `Roles (${roles.length})`, value: roles.slice(0, 20).join(' ') || 'None' });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
