'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const i18n = require('../../i18n');

const CHOICES = i18n.available().map((l) => ({ name: l.name, value: l.code }));

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('language')
    .setDescription('View or set the bot language for this server (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName('set').setDescription('Language to use').addChoices(...CHOICES)),

  async execute(interaction) {
    const gid = interaction.guild.id;
    const set = interaction.options.getString('set');
    if (set) {
      setGuildConfig(gid, { locale: set });
      const name = i18n.available().find((l) => l.code === set)?.name || set;
      return interaction.reply({ embeds: [Embed.success(i18n.t(gid, 'language.set', { lang: name }))] });
    }
    const current = getGuildConfig(gid).locale || i18n.DEFAULT;
    const name = i18n.available().find((l) => l.code === current)?.name || current;
    const list = i18n.available().map((l) => `${l.name} (\`${l.code}\`)`).join(', ');
    return interaction.reply({ embeds: [Embed.info('🌐 Language', i18n.t(gid, 'language.current', { lang: name, list }))] });
  },
};
