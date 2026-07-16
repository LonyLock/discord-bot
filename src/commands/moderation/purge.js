'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { t } = require('../../i18n');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages from this channel')
    .addIntegerOption((o) => o.setName('amount').setDescription('How many messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName('user').setDescription('Only delete messages from this user'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });
    let messages = await interaction.channel.messages.fetch({ limit: 100 });
    messages = messages.filter((m) => Date.now() - m.createdTimestamp < 1209600000); // <14d
    if (user) messages = messages.filter((m) => m.author.id === user.id);
    const toDelete = [...messages.values()].slice(0, amount);
    if (!toDelete.length) return interaction.editReply({ embeds: [Embed.error(t(gid, 'mod.purge.none'))] });
    const deleted = await interaction.channel.bulkDelete(toDelete, true).catch((e) => { throw e; });
    const msg = user
      ? t(gid, 'mod.purge.success_from', { count: deleted.size, user: user.tag })
      : t(gid, 'mod.purge.success', { count: deleted.size });
    return interaction.editReply({ embeds: [Embed.success(msg)] });
  },
};
