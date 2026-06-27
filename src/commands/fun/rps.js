'use strict';
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Embed = require('../../utils/embed');

const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' };

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder().setName('rps').setDescription('Play rock-paper-scissors against the bot'),
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rock').setLabel('Rock').setEmoji('🪨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('paper').setLabel('Paper').setEmoji('📄').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('scissors').setLabel('Scissors').setEmoji('✂️').setStyle(ButtonStyle.Secondary));
    const msg = await interaction.reply({ embeds: [Embed.info('🪨📄✂️ Rock Paper Scissors', 'Choose your move!')], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000, max: 1 });
    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'Not your game!', ephemeral: true });
      const user = i.customId;
      const bot = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
      const result = user === bot ? "It's a tie!" : BEATS[user] === bot ? 'You win! 🎉' : 'You lose! 😢';
      const embed = (user === bot ? Embed.warn : BEATS[user] === bot ? Embed.success : Embed.error)(
        `You chose ${EMOJI[user]} • I chose ${EMOJI[bot]}\n\n**${result}**`);
      await i.update({ embeds: [embed], components: [] });
    });
    collector.on('end', (c) => { if (!c.size) interaction.editReply({ components: [] }).catch(() => {}); });
  },
};
