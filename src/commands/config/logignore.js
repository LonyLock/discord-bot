'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const {
  ignoreLogChannel,
  unignoreLogChannel,
  listIgnoredLogChannels,
} = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('logignore')
    .setDescription('Exclude channels (or categories) from logging (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Stop logging a channel or category')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel or category to ignore')
            .setRequired(true)
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement,
              ChannelType.GuildVoice,
              ChannelType.GuildForum,
              ChannelType.GuildCategory
            )
        )
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Resume logging a channel or category')
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Channel or category to stop ignoring').setRequired(true)
        )
    )
    .addSubcommand((s) => s.setName('list').setDescription('List the channels where logging is disabled')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'add') {
      const channel = interaction.options.getChannel('channel');
      ignoreLogChannel(gid, channel.id);
      const note =
        channel.type === ChannelType.GuildCategory
          ? ` Every channel under this category will also be ignored.`
          : '';
      return interaction.reply({
        embeds: [Embed.success(`Logging is now **disabled** in ${channel}.${note}`)],
      });
    }

    if (sub === 'remove') {
      const channel = interaction.options.getChannel('channel');
      const res = unignoreLogChannel(gid, channel.id);
      return interaction.reply({
        embeds: [
          res.changes
            ? Embed.success(`Logging is now **re-enabled** in ${channel}.`)
            : Embed.error('That channel was not on the ignore list.'),
        ],
      });
    }

    // list
    const ids = listIgnoredLogChannels(gid);
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle('🚫 Channels Excluded From Logging')
      .setDescription(
        ids.length
          ? ids.map((id) => `<#${id}> \`${id}\``).join('\n')
          : 'No channels are ignored. Logging works everywhere.'
      )
      .setFooter({ text: 'Applies to message, join/leave and mod logs.' });
    return interaction.reply({ embeds: [embed] });
  },
};
