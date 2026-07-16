'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { t } = require('../../i18n');

const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  category: 'utility',
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a reaction poll')
    .addStringOption((o) => o.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption((o) => o.setName('options').setDescription('Up to 10 options, separated by | (omit for yes/no)')),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const question = interaction.options.getString('question');
    const raw = interaction.options.getString('options');
    const embed = new EmbedBuilder().setColor(config.brand.color).setTitle('📊 ' + question)
      .setFooter({ text: t(gid, 'util.poll.by', { user: interaction.user.tag }) }).setTimestamp();
    if (!raw) {
      embed.setDescription('👍 Yes\n👎 No');
      const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
      await msg.react('👍'); await msg.react('👎');
      return;
    }
    const options = raw.split('|').map((s) => s.trim()).filter(Boolean).slice(0, 10);
    if (options.length < 2) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.poll.need_options'))], ephemeral: true });
    embed.setDescription(options.map((o, i) => `${NUM[i]} ${o}`).join('\n'));
    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < options.length; i++) await msg.react(NUM[i]).catch(() => {});
  },
};
