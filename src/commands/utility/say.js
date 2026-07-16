'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');

module.exports = {
  category: 'utility',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot send a message (Manage Messages)')
    .addStringOption((o) => o.setName('message').setDescription('What to say').setRequired(true))
    .addChannelOption((o) => o.setName('channel').setDescription('Channel to send in'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    if (!channel.isTextBased()) return interaction.reply({ embeds: [Embed.error('That is not a text channel.')], ephemeral: true });
    await channel.send({ content: message, allowedMentions: { parse: [] } }).catch((e) => { throw e; });
    return interaction.reply({ embeds: [Embed.success(`Message sent to ${channel}.`)], ephemeral: true });
  },
};
