'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { parseDuration, formatDuration, relative } = require('../../utils/time');
const { t } = require('../../i18n');

const insert = db.prepare(
  'INSERT INTO scheduled_messages (guild_id, channel_id, content, next_run, interval_ms, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const list = db.prepare('SELECT * FROM scheduled_messages WHERE guild_id = ? ORDER BY next_run ASC');
const getOne = db.prepare('SELECT * FROM scheduled_messages WHERE id = ? AND guild_id = ?');
const del = db.prepare('DELETE FROM scheduled_messages WHERE id = ? AND guild_id = ?');

module.exports = {
  category: 'utility',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Schedule announcements (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('add').setDescription('Schedule a message')
      .addChannelOption((o) => o.setName('channel').setDescription('Target channel').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addStringOption((o) => o.setName('message').setDescription('Message content').setRequired(true).setMaxLength(2000))
      .addStringOption((o) => o.setName('in').setDescription('Delay before first send, e.g. 1h, 1d').setRequired(true))
      .addStringOption((o) => o.setName('repeat').setDescription('Repeat interval, e.g. 1d, 1w (omit for one-time)')))
    .addSubcommand((s) => s.setName('list').setDescription('List scheduled messages'))
    .addSubcommand((s) => s.setName('delete').setDescription('Delete a scheduled message')
      .addIntegerOption((o) => o.setName('id').setDescription('Schedule ID').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'add') {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      const delay = parseDuration(interaction.options.getString('in'));
      if (!delay || delay < 30_000) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.schedule.min_delay'))], ephemeral: true });
      const repeatStr = interaction.options.getString('repeat');
      let interval = 0;
      if (repeatStr) {
        interval = parseDuration(repeatStr);
        if (!interval || interval < 600_000) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.schedule.min_interval'))], ephemeral: true });
      }
      const perms = channel.permissionsFor(interaction.guild.members.me);
      if (!perms?.has(PermissionFlagsBits.SendMessages)) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.schedule.no_perms', { channel: channel.toString() }))], ephemeral: true });
      const nextRun = Date.now() + delay;
      const info = insert.run(gid, channel.id, message, nextRun, interval, interaction.user.id, Date.now());
      const vars = { id: info.lastInsertRowid, channel: channel.toString(), when: relative(nextRun), interval: formatDuration(interval) };
      return interaction.reply({ embeds: [Embed.success(t(gid, interval ? 'util.schedule.added_repeat' : 'util.schedule.added_once', vars))] });
    }

    if (sub === 'list') {
      const rows = list.all(gid);
      if (!rows.length) return interaction.reply({ embeds: [Embed.info(t(gid, 'util.schedule.title'), t(gid, 'util.schedule.nothing'))] });
      const embed = new EmbedBuilder().setColor(config.brand.color).setTitle(t(gid, 'util.schedule.title'))
        .setDescription(rows.map((r) => `**#${r.id}** → <#${r.channel_id}> ${relative(r.next_run)}${r.interval_ms ? ` • every ${formatDuration(r.interval_ms)}` : ''}\n> ${r.content.slice(0, 80)}`).join('\n\n'))
        .setFooter({ text: config.brand.footer });
      return interaction.reply({ embeds: [embed] });
    }

    const id = interaction.options.getInteger('id');
    if (!getOne.get(id, gid)) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.schedule.not_found'))], ephemeral: true });
    del.run(id, gid);
    return interaction.reply({ embeds: [Embed.success(t(gid, 'util.schedule.deleted', { id }))] });
  },
};
