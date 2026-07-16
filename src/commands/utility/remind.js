'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const { parseDuration, formatDuration, relative } = require('../../utils/time');
const { t } = require('../../i18n');

const insertReminder = db.prepare('INSERT INTO reminders (user_id, channel_id, guild_id, message, remind_at, created_at) VALUES (?, ?, ?, ?, ?, ?)');
const listReminders = db.prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_at ASC LIMIT 10');
const delReminder = db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set, list, or delete reminders')
    .addSubcommand((s) => s.setName('me').setDescription('Set a reminder')
      .addStringOption((o) => o.setName('when').setDescription('e.g. 10m, 2h, 1d').setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription('What to remind you about').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('List your reminders'))
    .addSubcommand((s) => s.setName('delete').setDescription('Delete a reminder')
      .addIntegerOption((o) => o.setName('id').setDescription('Reminder ID').setRequired(true))),
  async execute(interaction) {
    const gid = interaction.guild?.id;
    const sub = interaction.options.getSubcommand();
    if (sub === 'me') {
      const ms = parseDuration(interaction.options.getString('when'));
      if (!ms || ms < 10000 || ms > 31536000000) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.remind.invalid_duration'))], ephemeral: true });
      const message = interaction.options.getString('message');
      const remindAt = Date.now() + ms;
      insertReminder.run(interaction.user.id, interaction.channel.id, interaction.guild?.id || null, message, remindAt, Date.now());
      return interaction.reply({ embeds: [Embed.success(t(gid, 'util.remind.set', { when: relative(remindAt), duration: formatDuration(ms), message }))] });
    }
    if (sub === 'list') {
      const rows = listReminders.all(interaction.user.id);
      if (!rows.length) return interaction.reply({ embeds: [Embed.info(t(gid, 'util.remind.title'), t(gid, 'util.remind.none'))], ephemeral: true });
      return interaction.reply({ embeds: [Embed.info(t(gid, 'util.remind.title_your'), rows.map((r) => `**#${r.id}** • ${relative(r.remind_at)}\n> ${r.message}`).join('\n\n'))], ephemeral: true });
    }
    const id = interaction.options.getInteger('id');
    const res = delReminder.run(id, interaction.user.id);
    return interaction.reply({ embeds: [res.changes ? Embed.success(t(gid, 'util.remind.deleted', { id })) : Embed.error(t(gid, 'util.remind.not_found'))], ephemeral: true });
  },
};
