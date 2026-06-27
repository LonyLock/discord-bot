'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../../database/db');
const Embed = require('../../utils/embed');

const setAfk = db.prepare('INSERT OR REPLACE INTO afk (user_id, guild_id, reason, timestamp) VALUES (?, ?, ?, ?)');

module.exports = {
  category: 'utility',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set your AFK status')
    .addStringOption((o) => o.setName('reason').setDescription('Why are you AFK?')),
  async execute(interaction) {
    const reason = interaction.options.getString('reason') || 'AFK';
    setAfk.run(interaction.user.id, interaction.guild.id, reason, Date.now());
    return interaction.reply({ embeds: [Embed.success(`I set your AFK status: ${reason}`)] });
  },
};
