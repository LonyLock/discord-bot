'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');

const setSticky = db.prepare('INSERT OR REPLACE INTO sticky_messages (channel_id, guild_id, content, last_message_id) VALUES (?, ?, ?, NULL)');
const delSticky = db.prepare('DELETE FROM sticky_messages WHERE channel_id = ?');
const getSticky = db.prepare('SELECT * FROM sticky_messages WHERE channel_id = ?');

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Pin a sticky message that stays at the bottom of this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((s) => s.setName('set').setDescription('Set the sticky message for this channel')
      .addStringOption((o) => o.setName('content').setDescription('The message').setRequired(true).setMaxLength(2000)))
    .addSubcommand((s) => s.setName('remove').setDescription('Remove the sticky message from this channel')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'set') {
      const content = interaction.options.getString('content');
      setSticky.run(interaction.channel.id, interaction.guild.id, content);
      return interaction.reply({ embeds: [Embed.success('Sticky message set. It will follow new messages in this channel.')] });
    }
    const existing = getSticky.get(interaction.channel.id);
    if (existing?.last_message_id) interaction.channel.messages.fetch(existing.last_message_id).then((m) => m.delete().catch(() => {})).catch(() => {});
    const res = delSticky.run(interaction.channel.id);
    return interaction.reply({ embeds: [res.changes ? Embed.success('Sticky message removed.') : Embed.error('No sticky message in this channel.')] });
  },
};
