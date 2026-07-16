'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { progressBar } = require('../../utils/helpers');

module.exports = {
  category: 'fun',
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calculate the love compatibility between two people')
    .addUserOption((o) => o.setName('first').setDescription('First person').setRequired(true))
    .addUserOption((o) => o.setName('second').setDescription('Second person')),
  async execute(interaction) {
    const a = interaction.options.getUser('first');
    const b = interaction.options.getUser('second') || interaction.user;
    const seed = (BigInt(a.id) + BigInt(b.id)) % 101n;
    const pct = Number(seed);
    const heart = pct > 75 ? '💖' : pct > 50 ? '❤️' : pct > 25 ? '💛' : '💔';
    return interaction.reply({ embeds: [Embed.info('💘 Love Calculator', `**${a.username}** + **${b.username}**\n\n${heart} **${pct}%**\n\`${progressBar(pct, 100)}\``)] });
  },
};
