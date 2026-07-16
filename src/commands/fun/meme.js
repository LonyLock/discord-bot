'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { pick } = require('../../utils/helpers');

const COMPLIMENTS = [
  'You\'re basically a human exclamation point — full of energy!',
  'If you were a vegetable, you\'d be a cute-cumber.',
  'You\'re proof that the best things come in awesome packages.',
  'You light up the server like a perfectly indented codebase.',
  'You\'re the human equivalent of a green CI build.',
  'Your vibe is immaculate and your aura is 100% bug-free.',
];

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Send a wholesome compliment')
    .addUserOption((o) => o.setName('user').setDescription('Who to compliment')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    return interaction.reply({ content: `${user}`, embeds: [Embed.success(pick(COMPLIMENTS))] });
  },
};
