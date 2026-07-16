'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

const addRR = db.prepare('INSERT OR REPLACE INTO reaction_roles (guild_id, message_id, channel_id, emoji, role_id) VALUES (?, ?, ?, ?, ?)');
const delRR = db.prepare('DELETE FROM reaction_roles WHERE message_id = ? AND emoji = ?');
const listRR = db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ?');

function parseEmoji(input) {
  const custom = input.match(/<a?:\w+:(\d+)>/);
  if (custom) return custom[1];
  return input.trim();
}

module.exports = {
  category: 'roles',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.AddReactions],
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Set up reaction roles (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) => s.setName('create').setDescription('Post a new reaction-role message')
      .addStringOption((o) => o.setName('emoji').setDescription('Emoji to react with').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Role to grant').setRequired(true))
      .addStringOption((o) => o.setName('title').setDescription('Embed title'))
      .addStringOption((o) => o.setName('description').setDescription('Embed description')))
    .addSubcommand((s) => s.setName('add').setDescription('Add a reaction role to an existing message')
      .addStringOption((o) => o.setName('message_id').setDescription('Target message ID').setRequired(true))
      .addStringOption((o) => o.setName('emoji').setDescription('Emoji').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription('Remove a reaction role')
      .addStringOption((o) => o.setName('message_id').setDescription('Message ID').setRequired(true))
      .addStringOption((o) => o.setName('emoji').setDescription('Emoji').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('List all reaction roles')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'list') {
      const rows = listRR.all(gid);
      const embed = new EmbedBuilder().setColor(config.brand.color).setTitle('🎭 Reaction Roles')
        .setDescription(rows.map((r) => `${r.emoji.match(/^\d+$/) ? `<:e:${r.emoji}>` : r.emoji} → <@&${r.role_id}> ([msg](https://discord.com/channels/${gid}/${r.channel_id}/${r.message_id}))`).join('\n') || 'None configured.');
      return interaction.reply({ embeds: [embed] });
    }

    const role = interaction.options.getRole('role');
    if (role && role.position >= interaction.guild.members.me.roles.highest.position)
      return interaction.reply({ embeds: [Embed.error('That role is higher than mine; I cannot assign it.')], ephemeral: true });
    const emoji = parseEmoji(interaction.options.getString('emoji') || '');

    if (sub === 'create') {
      const embed = new EmbedBuilder().setColor(config.brand.color)
        .setTitle(interaction.options.getString('title') || '🎭 Reaction Roles')
        .setDescription(`${interaction.options.getString('description') || 'React to get a role!'}\n\n${interaction.options.getString('emoji')} → ${role}`)
        .setFooter({ text: config.brand.footer });
      const msg = await interaction.channel.send({ embeds: [embed] });
      try { await msg.react(interaction.options.getString('emoji')); }
      catch { await msg.delete().catch(() => {}); return interaction.reply({ embeds: [Embed.error('I could not react with that emoji. Use a standard emoji or one from this server.')], ephemeral: true }); }
      addRR.run(gid, msg.id, interaction.channel.id, emoji, role.id);
      return interaction.reply({ embeds: [Embed.success('Reaction-role message created!')], ephemeral: true });
    }

    const messageId = interaction.options.getString('message_id');
    const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (!msg) return interaction.reply({ embeds: [Embed.error('Message not found in this channel.')], ephemeral: true });

    if (sub === 'add') {
      try { await msg.react(interaction.options.getString('emoji')); }
      catch { return interaction.reply({ embeds: [Embed.error('I could not react with that emoji.')], ephemeral: true }); }
      addRR.run(gid, msg.id, interaction.channel.id, emoji, role.id);
      return interaction.reply({ embeds: [Embed.success(`Reaction role added: ${interaction.options.getString('emoji')} → ${role}`)], ephemeral: true });
    }
    const res = delRR.run(messageId, emoji);
    return interaction.reply({ embeds: [res.changes ? Embed.success('Reaction role removed.') : Embed.error('No reaction role found for that emoji.')], ephemeral: true });
  },
};
