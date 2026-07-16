'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { pick } = require('../../utils/helpers');

const ANSWERS = ['It is certain.', 'Without a doubt.', 'Yes, definitely.', 'You may rely on it.', 'Most likely.',
  'Outlook good.', 'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.', 'Cannot predict now.',
  'Don\'t count on it.', 'My reply is no.', 'Very doubtful.', 'Outlook not so good.', 'Absolutely not.'];

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption((o) => o.setName('question').setDescription('Your question').setRequired(true)),
  async execute(interaction) {
    const q = interaction.options.getString('question');
    return interaction.reply({ embeds: [Embed.info('🎱 Magic 8-Ball', `**Q:** ${q}\n**A:** ${pick(ANSWERS)}`)] });
  },
};
