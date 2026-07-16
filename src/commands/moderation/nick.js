'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageNicknames],
  botPermissions: [PermissionFlagsBits.ManageNicknames],
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Change or reset a member\'s nickname')
    .addUserOption((o) => o.setName('user').setDescription('The member').setRequired(true))
    .addStringOption((o) => o.setName('nickname').setDescription('New nickname (leave empty to reset)').setMaxLength(32))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [Embed.error('That user is not in this server.')], ephemeral: true });
    if (!member.manageable) return interaction.reply({ embeds: [Embed.error('I cannot change that member\'s nickname (role hierarchy).')], ephemeral: true });
    await member.setNickname(nickname || null, `Changed by ${interaction.user.tag}`).catch((e) => { throw e; });
    return interaction.reply({ embeds: [Embed.success(nickname ? `Nickname for **${user.tag}** set to **${nickname}**.` : `Nickname for **${user.tag}** reset.`)] });
  },
};
