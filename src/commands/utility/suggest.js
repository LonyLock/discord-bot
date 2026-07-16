'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db, getGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { t } = require('../../i18n');

const insertSuggestion = db.prepare('INSERT INTO suggestions (guild_id, user_id, content, created_at) VALUES (?, ?, ?, ?)');
const setMessageId = db.prepare('UPDATE suggestions SET message_id = ? WHERE id = ?');

module.exports = {
  category: 'utility',
  guildOnly: true,
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion to the server')
    .addStringOption((o) => o.setName('suggestion').setDescription('Your suggestion').setRequired(true).setMaxLength(1500)),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const cfg = getGuildConfig(gid);
    if (!cfg.suggestion_channel) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.suggest.not_setup'))], ephemeral: true });
    const channel = interaction.guild.channels.cache.get(cfg.suggestion_channel);
    if (!channel) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.suggest.no_channel'))], ephemeral: true });
    const content = interaction.options.getString('suggestion');
    const info = insertSuggestion.run(gid, interaction.user.id, content, Date.now());
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setTitle(t(gid, 'util.suggest.title', { id: info.lastInsertRowid }))
      .setDescription(content)
      .addFields({ name: t(gid, 'util.suggest.status'), value: t(gid, 'util.suggest.pending') })
      .setFooter({ text: config.brand.footer })
      .setTimestamp();
    const msg = await channel.send({ embeds: [embed] }).catch(() => null);
    if (msg) { setMessageId.run(msg.id, info.lastInsertRowid); await msg.react('👍').catch(() => {}); await msg.react('👎').catch(() => {}); }
    return interaction.reply({ embeds: [Embed.success(t(gid, 'util.suggest.submitted', { channel: channel.toString(), id: info.lastInsertRowid }))], ephemeral: true });
  },
};
