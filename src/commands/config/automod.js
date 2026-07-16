'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db, getGuildConfig, setGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

const addWord = db.prepare('INSERT OR IGNORE INTO badwords (guild_id, word) VALUES (?, ?)');
const delWord = db.prepare('DELETE FROM badwords WHERE guild_id = ? AND word = ?');
const listWords = db.prepare('SELECT word FROM badwords WHERE guild_id = ?');

const FILTERS = {
  spam: 'automod_anti_spam',
  invites: 'automod_anti_invite',
  links: 'automod_anti_link',
  mentions: 'automod_anti_mention',
  caps: 'automod_anti_caps',
  badwords: 'automod_badwords',
};

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure auto-moderation (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('toggle').setDescription('Turn the whole automod system on or off')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Enable/disable').setRequired(true)))
    .addSubcommand((s) => s.setName('filter').setDescription('Toggle a specific filter')
      .addStringOption((o) => o.setName('type').setDescription('Filter type').setRequired(true)
        .addChoices(
          { name: 'Anti-Spam', value: 'spam' },
          { name: 'Anti-Invite', value: 'invites' },
          { name: 'Anti-Link', value: 'links' },
          { name: 'Anti-Mass-Mention', value: 'mentions' },
          { name: 'Anti-Caps', value: 'caps' },
          { name: 'Bad-Words Filter', value: 'badwords' }))
      .addBooleanOption((o) => o.setName('enabled').setDescription('Enable/disable').setRequired(true)))
    .addSubcommand((s) => s.setName('addword').setDescription('Add a word to the bad-words filter')
      .addStringOption((o) => o.setName('word').setDescription('Word/phrase to block').setRequired(true)))
    .addSubcommand((s) => s.setName('removeword').setDescription('Remove a word from the filter')
      .addStringOption((o) => o.setName('word').setDescription('Word/phrase to unblock').setRequired(true)))
    .addSubcommand((s) => s.setName('status').setDescription('Show the current automod configuration')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      setGuildConfig(gid, { automod_enabled: enabled ? 1 : 0 });
      return interaction.reply({ embeds: [Embed.success(`Automod is now **${enabled ? 'enabled' : 'disabled'}**.${enabled ? '\nEnable individual filters with `/automod filter`.' : ''}`)] });
    }

    if (sub === 'filter') {
      const type = interaction.options.getString('type');
      const enabled = interaction.options.getBoolean('enabled');
      setGuildConfig(gid, { [FILTERS[type]]: enabled ? 1 : 0 });
      return interaction.reply({ embeds: [Embed.success(`Filter **${type}** is now **${enabled ? 'on' : 'off'}**.`)] });
    }

    if (sub === 'addword') {
      const word = interaction.options.getString('word').toLowerCase().trim();
      addWord.run(gid, word);
      return interaction.reply({ embeds: [Embed.success(`Added \`${word}\` to the bad-words filter.`)], ephemeral: true });
    }

    if (sub === 'removeword') {
      const word = interaction.options.getString('word').toLowerCase().trim();
      const res = delWord.run(gid, word);
      return interaction.reply({ embeds: [res.changes ? Embed.success(`Removed \`${word}\`.`) : Embed.error('That word was not in the filter.')], ephemeral: true });
    }

    // status
    const c = getGuildConfig(gid);
    const bool = (v) => (v ? '✅' : '❌');
    const words = listWords.all(gid).length;
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle('🤖 Automod Configuration')
      .setDescription(`Master switch: ${bool(c.automod_enabled)}`)
      .addFields(
        { name: 'Anti-Spam', value: bool(c.automod_anti_spam), inline: true },
        { name: 'Anti-Invite', value: bool(c.automod_anti_invite), inline: true },
        { name: 'Anti-Link', value: bool(c.automod_anti_link), inline: true },
        { name: 'Anti-Mention', value: bool(c.automod_anti_mention), inline: true },
        { name: 'Anti-Caps', value: bool(c.automod_anti_caps), inline: true },
        { name: 'Bad-Words', value: `${bool(c.automod_badwords)} (${words} words)`, inline: true })
      .setFooter({ text: 'Members with Manage Messages are exempt.' });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
