'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db, getGuildConfig } = require('../../database/db');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

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
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.suggestion_channel) return interaction.reply({ embeds: [Embed.error('Suggestions are not set up. An admin can use `/config suggestions`.')], ephemeral: true });
    const channel = interaction.guild.channels.cache.get(cfg.suggestion_channel);
    if (!channel) return interaction.reply({ embeds: [Embed.error('The suggestions channel no longer exists.')], ephemeral: true });
    const content = interaction.options.getString('suggestion');
    const info = insertSuggestion.run(interaction.guild.id, interaction.user.id, content, Date.now());
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setTitle(`Suggestion #${info.lastInsertRowid}`)
      .setDescription(content)
      .addFields({ name: 'Status', value: '🕓 Pending' })
      .setFooter({ text: config.brand.footer })
      .setTimestamp();
    const msg = await channel.send({ embeds: [embed] }).catch(() => null);
    if (msg) { setMessageId.run(msg.id, info.lastInsertRowid); await msg.react('👍').catch(() => {}); await msg.react('👎').catch(() => {}); }
    return interaction.reply({ embeds: [Embed.success(`Your suggestion was submitted to ${channel}! (#${info.lastInsertRowid})`)], ephemeral: true });
  },
};
