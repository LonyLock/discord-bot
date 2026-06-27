'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { pick } = require('../../utils/helpers');

const WYR = [
  'be able to fly OR be invisible?',
  'have unlimited money OR unlimited free time?',
  'always be 10 minutes late OR always be 20 minutes early?',
  'have no internet for a month OR no phone for a year?',
  'be able to talk to animals OR speak every human language?',
  'live without music OR without movies?',
  'fight one horse-sized duck OR a hundred duck-sized horses?',
  'know how you die OR when you die?',
  'never have to sleep OR never have to eat?',
  'be the funniest person in the room OR the smartest?',
];

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder().setName('wyr').setDescription('Would you rather...?'),
  async execute(interaction) {
    const msg = await interaction.reply({ embeds: [Embed.info('🤷 Would You Rather', `Would you rather ${pick(WYR)}`)], fetchReply: true });
    await msg.react('🅰️').catch(() => {});
    await msg.react('🅱️').catch(() => {});
  },
};
