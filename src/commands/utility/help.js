'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const help = require('../../services/help');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { anywhere } = require('../../structures/appcontexts');
const { t } = require('../../i18n');

module.exports = {
  category: 'utility',
  cooldown: 3,
  data: anywhere(new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show the interactive help menu or details about a command')
    .addStringOption((o) => o.setName('command').setDescription('Get details about a specific command').setAutocomplete(true))),
  async execute(interaction, client) {
    const gid = interaction.guild?.id;
    const query = interaction.options.getString('command');
    if (query) {
      const q = query.toLowerCase().replace(/^\//, '').trim();
      const index = help.commandIndex(client);
      // Match a full path ("info user") or fall back to a top-level command name.
      const entry = index.find((e) => e.path === q)
        || index.find((e) => e.path.split(' ')[0] === q);
      if (!entry) return interaction.reply({ embeds: [Embed.error(t(gid, 'util.help.no_command', { query }))], ephemeral: true });
      const opts = entry.options?.map((o) => `\`${o.name}\`${o.required ? '' : t(gid, 'util.help.optional')} — ${o.description}`).join('\n') || t(gid, 'util.help.none');
      const embed = new EmbedBuilder()
        .setColor(config.brand.color)
        .setTitle(`/${entry.path}`)
        .setDescription(entry.description)
        .addFields(
          { name: t(gid, 'util.help.field.category'), value: entry.category, inline: true },
          { name: t(gid, 'util.help.field.options'), value: opts })
        .setFooter({ text: config.brand.footer });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    return interaction.reply({ embeds: [help.overviewEmbed(client)], components: [help.selectRow(client, 'overview')] });
  },
  async autocomplete(interaction, client) {
    const focused = interaction.options.getFocused().toLowerCase();
    const paths = help.commandIndex(client).map((e) => e.path);
    const matches = paths.filter((p) => p.includes(focused)).slice(0, 25);
    await interaction.respond(matches.map((p) => ({ name: `/${p}`, value: p })));
  },
};
