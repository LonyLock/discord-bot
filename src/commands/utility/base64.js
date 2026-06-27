'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { truncate } = require('../../utils/helpers');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('base64')
    .setDescription('Encode or decode Base64 text')
    .addStringOption((o) => o.setName('mode').setDescription('Encode or decode').setRequired(true)
      .addChoices({ name: 'Encode', value: 'encode' }, { name: 'Decode', value: 'decode' }))
    .addStringOption((o) => o.setName('text').setDescription('The text').setRequired(true)),
  async execute(interaction) {
    const mode = interaction.options.getString('mode');
    const text = interaction.options.getString('text');
    try {
      const out = mode === 'encode'
        ? Buffer.from(text, 'utf8').toString('base64')
        : Buffer.from(text, 'base64').toString('utf8');
      return interaction.reply({ embeds: [Embed.info(mode === 'encode' ? '🔐 Encoded' : '🔓 Decoded', `\`\`\`\n${truncate(out, 1900)}\n\`\`\``)], ephemeral: true });
    } catch {
      return interaction.reply({ embeds: [Embed.error('Could not process that input.')], ephemeral: true });
    }
  },
};
