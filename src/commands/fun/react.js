'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { fetchJson } = require('../../utils/helpers');

// Anime reaction GIFs from nekos.best (SFW, key-less). action -> phrasing.
const ACTIONS = {
  hug: { emoji: '🤗', text: (a, b) => (b ? `**${a}** hugs **${b}**!` : `**${a}** wants a hug!`) },
  pat: { emoji: '🫳', text: (a, b) => (b ? `**${a}** pats **${b}**.` : `**${a}** pats the air.`) },
  slap: { emoji: '👋', text: (a, b) => (b ? `**${a}** slaps **${b}**!` : `**${a}** slaps... no one?`) },
  kiss: { emoji: '💋', text: (a, b) => (b ? `**${a}** kisses **${b}**!` : `**${a}** blows a kiss!`) },
  cuddle: { emoji: '🫂', text: (a, b) => (b ? `**${a}** cuddles **${b}**.` : `**${a}** wants to cuddle.`) },
  poke: { emoji: '👉', text: (a, b) => (b ? `**${a}** pokes **${b}**.` : `**${a}** pokes around.`) },
  bite: { emoji: '😬', text: (a, b) => (b ? `**${a}** bites **${b}**!` : `**${a}** chomps!`) },
  highfive: { emoji: '🙏', text: (a, b) => (b ? `**${a}** high-fives **${b}**!` : `**${a}** raises a hand for a high-five!`) },
  wave: { emoji: '👋', text: (a, b) => (b ? `**${a}** waves at **${b}**!` : `**${a}** waves!`) },
  dance: { emoji: '🕺', text: (a, b) => (b ? `**${a}** dances with **${b}**!` : `**${a}** is dancing!`) },
  cry: { emoji: '😢', text: () => 'The tears are flowing…' },
  blush: { emoji: '😊', text: (a) => `**${a}** is blushing!` },
};

module.exports = {
  category: 'fun',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('react')
    .setDescription('Send an anime reaction GIF')
    .addStringOption((o) => o.setName('action').setDescription('Reaction').setRequired(true)
      .addChoices(...Object.keys(ACTIONS).map((k) => ({ name: `${ACTIONS[k].emoji} ${k}`, value: k }))))
    .addUserOption((o) => o.setName('user').setDescription('Who it is aimed at')),
  async execute(interaction) {
    const action = interaction.options.getString('action');
    const target = interaction.options.getUser('user');
    const meta = ACTIONS[action];
    await interaction.deferReply();
    const data = await fetchJson(`https://nekos.best/api/v2/${action}`);
    const result = data?.results?.[0];
    if (!result?.url) return interaction.editReply({ embeds: [Embed.error('The GIF service is not responding — try again in a moment.')] });
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setDescription(`${meta.emoji} ${meta.text(interaction.user.username, target && target.id !== interaction.user.id ? target.username : null)}`)
      .setImage(result.url)
      .setFooter({ text: result.anime_name ? `Anime: ${result.anime_name}` : config.brand.footer });
    return interaction.editReply({ embeds: [embed] });
  },
};
