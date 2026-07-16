'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const help = require('../../services/help');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

module.exports = {
  category: 'utility',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show the interactive help menu or details about a command')
    .addStringOption((o) => o.setName('command').setDescription('Get details about a specific command').setAutocomplete(true)),
  async execute(interaction, client) {
    const query = interaction.options.getString('command');
    if (query) {
      const cmd = client.commands.get(query.toLowerCase());
      if (!cmd) return interaction.reply({ embeds: [Embed.error(`No command named \`${query}\`.`)], ephemeral: true });
      const opts = cmd.data.options?.map((o) => `\`${o.name}\`${o.required ? '' : ' (optional)'} — ${o.description}`).join('\n') || 'None';
      const embed = new EmbedBuilder()
        .setColor(config.brand.color)
        .setTitle(`/${cmd.data.name}`)
        .setDescription(cmd.data.description)
        .addFields(
          { name: 'Category', value: cmd.category, inline: true },
          { name: 'Cooldown', value: `${cmd.cooldown ?? config.cooldownDefaultSeconds}s`, inline: true },
          { name: 'Options', value: opts })
        .setFooter({ text: config.brand.footer });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    return interaction.reply({ embeds: [help.overviewEmbed(client)], components: [help.selectRow(client, 'overview')] });
  },
  async autocomplete(interaction, client) {
    const focused = interaction.options.getFocused().toLowerCase();
    const matches = [...client.commands.keys()].filter((n) => n.includes(focused)).slice(0, 25);
    await interaction.respond(matches.map((n) => ({ name: n, value: n })));
  },
};
