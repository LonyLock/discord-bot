'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { pick } = require('../../utils/helpers');

const JOKES = [
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'I told my computer I needed a break, and now it won\'t stop sending me KitKats.',
  'Why did the developer go broke? Because he used up all his cache.',
  'There are 10 types of people: those who understand binary and those who don\'t.',
  'Why was the JavaScript developer sad? Because he didn\'t Node how to Express himself.',
  'A SQL query walks into a bar, walks up to two tables and asks: "Can I join you?"',
  'Why do Java developers wear glasses? Because they don\'t C#.',
  'How many programmers does it take to change a light bulb? None, that\'s a hardware problem.',
  'I would tell you a UDP joke, but you might not get it.',
  'Why did the chicken cross the road? To get to the other side... effects of debugging.',
  'My code doesn\'t work, I have no idea why. My code works, I have no idea why.',
  'Why did the function return early? It had a date.',
];

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder().setName('joke').setDescription('Get a random joke'),
  async execute(interaction) {
    return interaction.reply({ embeds: [Embed.info('😂 Joke', pick(JOKES))] });
  },
};
