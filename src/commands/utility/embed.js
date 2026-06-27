'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');

module.exports = {
  category: 'utility',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Build and send a custom embed (Manage Messages)')
    .addStringOption((o) => o.setName('title').setDescription('Embed title'))
    .addStringOption((o) => o.setName('description').setDescription('Embed description (use \\n for new lines)'))
    .addStringOption((o) => o.setName('color').setDescription('Hex color, e.g. #5865F2'))
    .addStringOption((o) => o.setName('image').setDescription('Image URL'))
    .addStringOption((o) => o.setName('footer').setDescription('Footer text'))
    .addChannelOption((o) => o.setName('channel').setDescription('Channel to send in'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const color = interaction.options.getString('color');
    const image = interaction.options.getString('image');
    const footer = interaction.options.getString('footer');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    if (!title && !description && !image) return interaction.reply({ embeds: [Embed.error('Provide at least a title, description, or image.')], ephemeral: true });
    const embed = new EmbedBuilder().setColor(/^#?[0-9a-fA-F]{6}$/.test(color || '') ? color : '#5865F2');
    if (title) embed.setTitle(title.slice(0, 256));
    if (description) embed.setDescription(description.replace(/\\n/g, '\n').slice(0, 4096));
    if (image) embed.setImage(image);
    if (footer) embed.setFooter({ text: footer.slice(0, 2048) });
    try { await channel.send({ embeds: [embed] }); }
    catch (e) { return interaction.reply({ embeds: [Embed.error(`Failed: ${e.message}`)], ephemeral: true }); }
    return interaction.reply({ embeds: [Embed.success(`Embed sent to ${channel}.`)], ephemeral: true });
  },
};
