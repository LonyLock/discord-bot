'use strict';
const { SlashCommandBuilder, ComponentType } = require('discord.js');
const Embed = require('../../utils/embed');
const { randInt } = require('../../utils/helpers');

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder().setName('guess').setDescription('Guess the number between 1 and 100 (chat your guesses)'),
  async execute(interaction) {
    const target = randInt(1, 100);
    let tries = 0;
    await interaction.reply({ embeds: [Embed.info('🔢 Guess the Number', 'I picked a number between **1** and **100**. Type your guesses in chat! You have 60 seconds and 7 tries.')] });
    const filter = (m) => m.author.id === interaction.user.id && /^\d{1,3}$/.test(m.content.trim());
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 7 });
    collector.on('collect', (m) => {
      tries++;
      const guess = parseInt(m.content.trim(), 10);
      if (guess === target) { m.reply({ embeds: [Embed.success(`🎉 Correct! The number was **${target}**. You got it in **${tries}** tries!`)] }); return collector.stop('win'); }
      m.reply({ embeds: [Embed.warn(guess < target ? '📈 Higher!' : '📉 Lower!')] }).catch(() => {});
    });
    collector.on('end', (c, reason) => { if (reason !== 'win') interaction.followUp({ embeds: [Embed.error(`Game over! The number was **${target}**.`)] }).catch(() => {}); });
  },
};
