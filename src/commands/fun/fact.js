'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { pick } = require('../../utils/helpers');

const FACTS = [
  'Honey never spoils — archaeologists have found 3,000-year-old honey still edible.',
  'Octopuses have three hearts and blue blood.',
  'Bananas are berries, but strawberries are not.',
  'A group of flamingos is called a "flamboyance".',
  'The Eiffel Tower can grow more than 15 cm taller in summer due to heat expansion.',
  'Sharks existed before trees did.',
  'There are more possible games of chess than atoms in the observable universe.',
  'A day on Venus is longer than a year on Venus.',
  'Wombat poop is cube-shaped.',
  'The first computer "bug" was an actual moth found in a Harvard computer in 1947.',
  'Hot water can freeze faster than cold water under certain conditions (the Mpemba effect).',
  'The unicorn is the national animal of Scotland.',
];

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder().setName('fact').setDescription('Get a random fun fact'),
  async execute(interaction) {
    return interaction.reply({ embeds: [Embed.info('🧠 Did you know?', pick(FACTS))] });
  },
};
