'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { fetchJson } = require('../../utils/helpers');

// Free, key-less image APIs. Each source maps the JSON response to an image URL.
const SOURCES = {
  cat: { emoji: '🐱', url: 'https://api.thecatapi.com/v1/images/search', pick: (d) => d?.[0]?.url },
  dog: { emoji: '🐶', url: 'https://dog.ceo/api/breeds/image/random', pick: (d) => d?.message },
  fox: { emoji: '🦊', url: 'https://randomfox.ca/floof/', pick: (d) => d?.image },
  duck: { emoji: '🦆', url: 'https://random-d.uk/api/random', pick: (d) => d?.url?.replace(/^http:/, 'https:') },
};

module.exports = {
  category: 'fun',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('img')
    .setDescription('Random animal picture')
    .addStringOption((o) => o.setName('type').setDescription('What animal').setRequired(true)
      .addChoices(...Object.keys(SOURCES).map((k) => ({ name: `${SOURCES[k].emoji} ${k}`, value: k })))),
  async execute(interaction) {
    const type = interaction.options.getString('type');
    const src = SOURCES[type];
    await interaction.deferReply();
    const data = await fetchJson(src.url);
    const image = src.pick(data);
    if (!image) return interaction.editReply({ embeds: [Embed.error('The image service is not responding — try again in a moment.')] });
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`${src.emoji} Random ${type}`)
      .setImage(image)
      .setFooter({ text: config.brand.footer });
    return interaction.editReply({ embeds: [embed] });
  },
};
