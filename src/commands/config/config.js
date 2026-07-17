'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { db, getGuildConfig, setGuildConfig, listIgnoredLogChannels } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

const textChannel = (o, name, desc) =>
  o.setName(name).setDescription(desc).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure the bot for this server (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('view').setDescription('View the current configuration'))
    .addSubcommand((s) => s.setName('prefix').setDescription('Set the legacy command prefix')
      .addStringOption((o) => o.setName('prefix').setDescription('New prefix (max 5 chars)').setRequired(true).setMaxLength(5)))
    .addSubcommand((s) => s.setName('welcome').setDescription('Configure welcome messages')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addChannelOption((o) => textChannel(o, 'channel', 'Welcome channel'))
      .addStringOption((o) => o.setName('message').setDescription('Use {user} {server} {membercount}')))
    .addSubcommand((s) => s.setName('goodbye').setDescription('Configure goodbye messages')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addChannelOption((o) => textChannel(o, 'channel', 'Goodbye channel'))
      .addStringOption((o) => o.setName('message').setDescription('Use {user} {server} {membercount}')))
    .addSubcommand((s) => s.setName('autorole').setDescription('Role automatically given to new members')
      .addRoleOption((o) => o.setName('role').setDescription('Role (omit to disable)')))
    .addSubcommand((s) => s.setName('modlog').setDescription('Channel for moderation logs')
      .addChannelOption((o) => textChannel(o, 'channel', 'Mod-log channel (omit to disable)')))
    .addSubcommand((s) => s.setName('messagelog').setDescription('Channel for edited/deleted message logs')
      .addChannelOption((o) => textChannel(o, 'channel', 'Message-log channel (omit to disable)')))
    .addSubcommand((s) => s.setName('joinlog').setDescription('Channel for join/leave & member-update logs')
      .addChannelOption((o) => textChannel(o, 'channel', 'Join-log channel (omit to disable)')))
    .addSubcommand((s) => s.setName('serverlog').setDescription('Channel for server changes (name/icon/emoji; fallback for role & channel logs)')
      .addChannelOption((o) => textChannel(o, 'channel', 'Server-log channel (omit to disable)')))
    .addSubcommand((s) => s.setName('voicelog').setDescription('Channel for voice join/leave/move logs')
      .addChannelOption((o) => textChannel(o, 'channel', 'Voice-log channel (omit to disable)')))
    .addSubcommand((s) => s.setName('rolelog').setDescription('Channel for role create/delete logs')
      .addChannelOption((o) => textChannel(o, 'channel', 'Role-log channel (omit to disable)')))
    .addSubcommand((s) => s.setName('channellog').setDescription('Channel for channel create/delete logs')
      .addChannelOption((o) => textChannel(o, 'channel', 'Channel-log channel (omit to disable)')))
    .addSubcommand((s) => s.setName('leveling').setDescription('Enable or disable the leveling system')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Enable/disable').setRequired(true)))
    .addSubcommand((s) => s.setName('levelup').setDescription('Configure level-up announcements')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addChannelOption((o) => textChannel(o, 'channel', 'Channel (omit = same channel)'))
      .addStringOption((o) => o.setName('message').setDescription('Use {user} {level} {server}')))
    .addSubcommand((s) => s.setName('economy').setDescription('Enable or disable the economy system')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Enable/disable').setRequired(true)))
    .addSubcommand((s) => s.setName('starboard').setDescription('Configure the starboard')
      .addChannelOption((o) => textChannel(o, 'channel', 'Starboard channel'))
      .addIntegerOption((o) => o.setName('threshold').setDescription('Stars required (default 3)').setMinValue(1)))
    .addSubcommand((s) => s.setName('suggestions').setDescription('Channel for /suggest submissions')
      .addChannelOption((o) => textChannel(o, 'channel', 'Suggestions channel (omit to disable)')))
    .addSubcommand((s) => s.setName('reset').setDescription('Reset ALL settings for this server')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    switch (sub) {
      case 'view':
        return viewConfig(interaction);

      case 'prefix': {
        const prefix = interaction.options.getString('prefix');
        setGuildConfig(gid, { prefix });
        return interaction.reply({ embeds: [Embed.success(`Legacy prefix set to \`${prefix}\``)] });
      }

      case 'welcome': {
        const enabled = interaction.options.getBoolean('enabled');
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        const patch = { welcome_enabled: enabled ? 1 : 0 };
        if (channel) patch.welcome_channel = channel.id;
        if (message) patch.welcome_message = message;
        setGuildConfig(gid, patch);
        return interaction.reply({ embeds: [Embed.success(`Welcome messages ${enabled ? 'enabled' : 'disabled'}.${channel ? ` Channel: ${channel}` : ''}`)] });
      }

      case 'goodbye': {
        const enabled = interaction.options.getBoolean('enabled');
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        const patch = { goodbye_enabled: enabled ? 1 : 0 };
        if (channel) patch.goodbye_channel = channel.id;
        if (message) patch.goodbye_message = message;
        setGuildConfig(gid, patch);
        return interaction.reply({ embeds: [Embed.success(`Goodbye messages ${enabled ? 'enabled' : 'disabled'}.${channel ? ` Channel: ${channel}` : ''}`)] });
      }

      case 'autorole': {
        const role = interaction.options.getRole('role');
        if (role && role.position >= interaction.guild.members.me.roles.highest.position)
          return interaction.reply({ embeds: [Embed.error('That role is higher than mine; I could not assign it.')], ephemeral: true });
        setGuildConfig(gid, { autorole: role?.id || null });
        return interaction.reply({ embeds: [Embed.success(role ? `New members will receive ${role}.` : 'Autorole disabled.')] });
      }

      case 'modlog':
        return setChannel(interaction, 'mod_log_channel', 'Moderation log');
      case 'messagelog':
        return setChannel(interaction, 'message_log_channel', 'Message log');
      case 'joinlog':
        return setChannel(interaction, 'join_log_channel', 'Join/leave log');
      case 'serverlog':
        return setChannel(interaction, 'server_log_channel', 'Server log');
      case 'voicelog':
        return setChannel(interaction, 'voice_log_channel', 'Voice log');
      case 'rolelog':
        return setChannel(interaction, 'role_log_channel', 'Role log');
      case 'channellog':
        return setChannel(interaction, 'channel_log_channel', 'Channel log');

      case 'leveling': {
        const enabled = interaction.options.getBoolean('enabled');
        setGuildConfig(gid, { leveling_enabled: enabled ? 1 : 0 });
        return interaction.reply({ embeds: [Embed.success(`Leveling system ${enabled ? 'enabled' : 'disabled'}.`)] });
      }

      case 'levelup': {
        const enabled = interaction.options.getBoolean('enabled');
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        const patch = { level_up_enabled: enabled ? 1 : 0 };
        if (channel) patch.level_up_channel = channel.id;
        if (message) patch.level_up_message = message;
        setGuildConfig(gid, patch);
        return interaction.reply({ embeds: [Embed.success(`Level-up announcements ${enabled ? 'enabled' : 'disabled'}.`)] });
      }

      case 'economy': {
        const enabled = interaction.options.getBoolean('enabled');
        setGuildConfig(gid, { economy_enabled: enabled ? 1 : 0 });
        return interaction.reply({ embeds: [Embed.success(`Economy system ${enabled ? 'enabled' : 'disabled'}.`)] });
      }

      case 'starboard': {
        const channel = interaction.options.getChannel('channel');
        const threshold = interaction.options.getInteger('threshold');
        const patch = {};
        if (channel) patch.starboard_channel = channel.id;
        if (threshold) patch.starboard_threshold = threshold;
        if (!channel && !threshold) patch.starboard_channel = null;
        setGuildConfig(gid, patch);
        return interaction.reply({ embeds: [Embed.success(channel ? `Starboard set to ${channel} (threshold ${threshold || getGuildConfig(gid).starboard_threshold}).` : 'Starboard disabled.')] });
      }

      case 'suggestions':
        return setChannel(interaction, 'suggestion_channel', 'Suggestions');

      case 'reset': {
        db.prepare('DELETE FROM guild_config WHERE guild_id = ?').run(gid);
        getGuildConfig(gid);
        return interaction.reply({ embeds: [Embed.success('All settings have been reset to defaults.')] });
      }
    }
  },
};

function setChannel(interaction, column, label) {
  const channel = interaction.options.getChannel('channel');
  setGuildConfig(interaction.guild.id, { [column]: channel?.id || null });
  return interaction.reply({ embeds: [Embed.success(channel ? `${label} channel set to ${channel}.` : `${label} disabled.`)] });
}

function viewConfig(interaction) {
  const c = getGuildConfig(interaction.guild.id);
  const ch = (id) => (id ? `<#${id}>` : '`not set`');
  const role = (id) => (id ? `<@&${id}>` : '`not set`');
  const bool = (v) => (v ? '✅' : '❌');
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(`⚙️ Configuration — ${interaction.guild.name}`)
    .addFields(
      { name: 'General', value: `Prefix: \`${c.prefix || config.defaults.prefix}\``, inline: false },
      { name: 'Logging', value: `Mod-log: ${ch(c.mod_log_channel)}\nMessage-log: ${ch(c.message_log_channel)}\nJoin-log: ${ch(c.join_log_channel)}\nVoice-log: ${ch(c.voice_log_channel)}\nRole-log: ${ch(c.role_log_channel)}\nChannel-log: ${ch(c.channel_log_channel)}\nServer-log: ${ch(c.server_log_channel)}\nIgnored: ${listIgnoredLogChannels(interaction.guild.id).length} channel(s)`, inline: true },
      { name: 'Greetings', value: `Welcome ${bool(c.welcome_enabled)}: ${ch(c.welcome_channel)}\nGoodbye ${bool(c.goodbye_enabled)}: ${ch(c.goodbye_channel)}\nAutorole: ${role(c.autorole)}`, inline: true },
      { name: 'Systems', value: `Leveling: ${bool(c.leveling_enabled)}\nEconomy: ${bool(c.economy_enabled)}\nAutomod: ${bool(c.automod_enabled)}`, inline: true },
      { name: 'Features', value: `Starboard: ${ch(c.starboard_channel)} (${c.starboard_threshold}⭐)\nSuggestions: ${ch(c.suggestion_channel)}\nTickets: ${c.ticket_category ? `<#${c.ticket_category}>` : '`not set`'}`, inline: true })
    .setFooter({ text: config.brand.footer });
  return interaction.reply({ embeds: [embed] });
}
