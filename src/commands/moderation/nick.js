'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { t } = require('../../i18n');

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
    const gid = interaction.guild.id;
    const user = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [Embed.error(t(gid, 'mod.not_in_server'))], ephemeral: true });
    if (!member.manageable) return interaction.reply({ embeds: [Embed.error(t(gid, 'mod.nick.not_manageable'))], ephemeral: true });
    await member.setNickname(nickname || null, `Changed by ${interaction.user.tag}`).catch((e) => { throw e; });
    return interaction.reply({ embeds: [Embed.success(nickname ? t(gid, 'mod.nick.set', { user: user.tag, nick: nickname }) : t(gid, 'mod.nick.reset', { user: user.tag }))] });
  },
};
