'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Configure anti-raid protection (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('toggle').setDescription('Enable or disable anti-raid')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Enable/disable').setRequired(true)))
    .addSubcommand((s) => s.setName('minage').setDescription('Minimum account age for new members')
      .addIntegerOption((o) => o.setName('days').setDescription('Days (0 to disable this gate)').setRequired(true).setMinValue(0).setMaxValue(365)))
    .addSubcommand((s) => s.setName('action').setDescription('What to do to accounts that fail the age gate')
      .addStringOption((o) => o.setName('action').setDescription('Action').setRequired(true)
        .addChoices({ name: 'Kick', value: 'kick' }, { name: 'Ban', value: 'ban' }, { name: 'Timeout (1h)', value: 'timeout' })))
    .addSubcommand((s) => s.setName('joinrate').setDescription('Alert when this many members join within 10 seconds')
      .addIntegerOption((o) => o.setName('count').setDescription('Join burst threshold (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(100)))
    .addSubcommand((s) => s.setName('status').setDescription('Show the current anti-raid configuration')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      setGuildConfig(gid, { antiraid_enabled: enabled ? 1 : 0 });
      return interaction.reply({ embeds: [Embed.success(`Anti-raid is now **${enabled ? 'enabled' : 'disabled'}**.${enabled ? '\nRaid alerts and actions go to your mod-log channel.' : ''}`)] });
    }
    if (sub === 'minage') {
      const days = interaction.options.getInteger('days');
      setGuildConfig(gid, { antiraid_min_age_days: days });
      return interaction.reply({ embeds: [Embed.success(days ? `New accounts younger than **${days} day(s)** will be actioned.` : 'Account-age gate disabled.')] });
    }
    if (sub === 'action') {
      const action = interaction.options.getString('action');
      setGuildConfig(gid, { antiraid_action: action });
      return interaction.reply({ embeds: [Embed.success(`Accounts failing the age gate will be **${action === 'timeout' ? 'timed out (1h)' : action + 'ed'}**.`)] });
    }
    if (sub === 'joinrate') {
      const count = interaction.options.getInteger('count');
      setGuildConfig(gid, { antiraid_join_threshold: count });
      return interaction.reply({ embeds: [Embed.success(count ? `You'll be alerted when **${count}** members join within 10s.` : 'Join-burst alerts disabled.')] });
    }

    const c = getGuildConfig(gid);
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle('🛡️ Anti-Raid Configuration')
      .setDescription(`Master switch: ${c.antiraid_enabled ? '✅ Enabled' : '❌ Disabled'}`)
      .addFields(
        { name: 'Min account age', value: c.antiraid_min_age_days ? `${c.antiraid_min_age_days} day(s)` : 'Off', inline: true },
        { name: 'Action', value: c.antiraid_action || 'kick', inline: true },
        { name: 'Join-burst alert', value: c.antiraid_join_threshold ? `${c.antiraid_join_threshold} / 10s` : 'Off', inline: true }
      )
      .setFooter({ text: 'Alerts and actions are sent to the mod-log channel.' });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
