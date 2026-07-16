'use strict';
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Embed = require('../../utils/embed');
const { pick, shuffle } = require('../../utils/helpers');

const QUESTIONS = [
  { q: 'What is the capital of Australia?', a: 'Canberra', wrong: ['Sydney', 'Melbourne', 'Perth'] },
  { q: 'How many bits are in a byte?', a: '8', wrong: ['4', '16', '32'] },
  { q: 'What planet is known as the Red Planet?', a: 'Mars', wrong: ['Venus', 'Jupiter', 'Mercury'] },
  { q: 'Who wrote "Romeo and Juliet"?', a: 'Shakespeare', wrong: ['Dickens', 'Tolstoy', 'Hemingway'] },
  { q: 'What is the largest ocean on Earth?', a: 'Pacific', wrong: ['Atlantic', 'Indian', 'Arctic'] },
  { q: 'What year did the first iPhone release?', a: '2007', wrong: ['2005', '2009', '2010'] },
  { q: 'What gas do plants absorb from the atmosphere?', a: 'Carbon dioxide', wrong: ['Oxygen', 'Nitrogen', 'Hydrogen'] },
  { q: 'What language runs in a web browser?', a: 'JavaScript', wrong: ['Python', 'C++', 'Java'] },
  { q: 'How many continents are there?', a: '7', wrong: ['5', '6', '8'] },
  { q: 'What is the chemical symbol for gold?', a: 'Au', wrong: ['Ag', 'Gd', 'Go'] },
];

module.exports = {
  category: 'fun',
  cooldown: 5,
  data: new SlashCommandBuilder().setName('trivia').setDescription('Answer a random trivia question'),
  async execute(interaction) {
    const item = pick(QUESTIONS);
    const choices = shuffle([item.a, ...item.wrong]);
    const row = new ActionRowBuilder().addComponents(
      choices.map((c, i) => new ButtonBuilder().setCustomId(`t${i}`).setLabel(c.slice(0, 80)).setStyle(ButtonStyle.Primary)));
    const msg = await interaction.reply({ embeds: [Embed.info('❓ Trivia', `${item.q}\n\n*You have 20 seconds.*`)], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000, max: 1 });
    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'Not your trivia!', ephemeral: true });
      const chosen = choices[parseInt(i.customId.slice(1), 10)];
      const correct = chosen === item.a;
      await i.update({ embeds: [(correct ? Embed.success : Embed.error)(`${correct ? 'Correct!' : 'Wrong!'} The answer was **${item.a}**.`)], components: [] });
    });
    collector.on('end', (c) => { if (!c.size) interaction.editReply({ embeds: [Embed.warn(`Time's up! The answer was **${item.a}**.`)], components: [] }).catch(() => {}); });
  },
};
