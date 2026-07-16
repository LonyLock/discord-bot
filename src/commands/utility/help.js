'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const help = require('../../services/help');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { t } = require('../../i18n');

module.exports = {
  category: 'utility',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show the interactive help menu or details about a command')
    .addStringOption((o) => o.setName('command').setDescription('Get details about a specific command').setAutocomplete(true)),
  async execute(interaction, client) {
    const gid = interaction.guild?.id;
    const query = interaction.options.getString('command');
    if (query) {
      const cmd = client.commands.get(query.toLowerCase());
      if (!cmd) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.help.no_command', { query }))], ephemeral: true });
      const opts = cmd.data.options?.map((o) => `\`${o.name}\`${o.required ? '' : t(gid, 'util.help.optional')} — ${o.description}`).join('\n') || t(gid, 'util.help.none');
      const embed = new EmbedBuilder()
        .setColor(config.brand.color)
        .setTitle(`/${cmd.data.name}`)
        .setDescription(cmd.data.description)
        .addFields(
          { name: t(gid, 'util.help.field.category'), value: cmd.category, inline: true },
          { name: t(gid, 'util.help.field.cooldown'), value: `${cmd.cooldown ?? config.cooldownDefaultSeconds}s`, inline: true },
          { name: t(gid, 'util.help.field.options'), value: opts })
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
