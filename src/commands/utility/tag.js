'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { t } = require('../../i18n');

const getTag = db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?');
const setTag = db.prepare('INSERT OR REPLACE INTO tags (guild_id, name, content, author_id, uses, created) VALUES (?, ?, ?, ?, COALESCE((SELECT uses FROM tags WHERE guild_id=? AND name=?),0), ?)');
const delTag = db.prepare('DELETE FROM tags WHERE guild_id = ? AND name = ?');
const listTags = db.prepare('SELECT name FROM tags WHERE guild_id = ? ORDER BY uses DESC');
const bumpTag = db.prepare('UPDATE tags SET uses = uses + 1 WHERE guild_id = ? AND name = ?');

module.exports = {
  category: 'utility',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Create and use custom text tags')
    .addSubcommand((s) => s.setName('show').setDescription('Show a tag').addStringOption((o) => o.setName('name').setDescription('Tag name').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('create').setDescription('Create or edit a tag (Manage Messages)')
      .addStringOption((o) => o.setName('name').setDescription('Tag name').setRequired(true))
      .addStringOption((o) => o.setName('content').setDescription('Tag content').setRequired(true)))
    .addSubcommand((s) => s.setName('delete').setDescription('Delete a tag (Manage Messages)').addStringOption((o) => o.setName('name').setDescription('Tag name').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('list').setDescription('List all tags')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    if (sub === 'show') {
      const name = interaction.options.getString('name').toLowerCase();
      const tag = getTag.get(gid, name);
      if (!tag) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.tag.not_exist'))], ephemeral: true });
      bumpTag.run(gid, name);
      return interaction.reply({ content: tag.content });
    }
    if (sub === 'list') {
      const rows = listTags.all(gid);
      return interaction.reply({ embeds: [Embed.info(t(gid, 'util.tag.list_title'), rows.length ? rows.map((r) => `\`${r.name}\``).join(', ') : t(gid, 'util.tag.no_tags'))] });
    }
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ embeds: [Embed.error(t(gid, 'util.tag.need_perms'))], ephemeral: true });
    const name = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '-').slice(0, 50);
    if (sub === 'create') {
      const content = interaction.options.getString('content');
      setTag.run(gid, name, content, interaction.user.id, gid, name, Date.now());
      return interaction.reply({ embeds: [Embed.success(t(gid, 'util.tag.saved', { name, prefix: config.defaults.prefix }))] });
    }
    const res = delTag.run(gid, name);
    return interaction.reply({ embeds: [res.changes ? Embed.success(t(gid, 'util.tag.deleted', { name })) : Embed.error(t(gid, 'util.tag.not_exist'))] });
  },
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const rows = listTags.all(interaction.guild.id).filter((r) => r.name.includes(focused)).slice(0, 25);
    await interaction.respond(rows.map((r) => ({ name: r.name, value: r.name })));
  },
};
