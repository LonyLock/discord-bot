'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');

/**
 * Send a paginated embed message with First / Prev / Next / Last buttons.
 * @param {import('discord.js').RepliableInteraction} interaction
 * @param {import('discord.js').EmbedBuilder[]} pages
 * @param {object} [opts]
 */
async function paginate(interaction, pages, opts = {}) {
  const { ephemeral = false, time = 120_000 } = opts;
  if (!pages.length) return;

  if (pages.length === 1) {
    const payload = { embeds: [pages[0]], ephemeral };
    return interaction.deferred || interaction.replied
      ? interaction.editReply(payload)
      : interaction.reply(payload);
  }

  let index = 0;
  const makeRow = (i) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pg_first').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(i === 0),
      new ButtonBuilder().setCustomId('pg_prev').setEmoji('◀️').setStyle(ButtonStyle.Primary).setDisabled(i === 0),
      new ButtonBuilder().setCustomId('pg_count').setLabel(`${i + 1} / ${pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId('pg_next').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(i === pages.length - 1),
      new ButtonBuilder().setCustomId('pg_last').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(i === pages.length - 1)
    );

  const payload = { embeds: [pages[index]], components: [makeRow(index)], ephemeral };
  const message =
    interaction.deferred || interaction.replied
      ? await interaction.editReply(payload)
      : await interaction.reply({ ...payload, fetchReply: true });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time,
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'These buttons are not for you.', ephemeral: true });
    }
    if (i.customId === 'pg_first') index = 0;
    else if (i.customId === 'pg_prev') index = Math.max(0, index - 1);
    else if (i.customId === 'pg_next') index = Math.min(pages.length - 1, index + 1);
    else if (i.customId === 'pg_last') index = pages.length - 1;
    await i.update({ embeds: [pages[index]], components: [makeRow(index)] });
  });

  collector.on('end', async () => {
    try {
      await interaction.editReply({ components: [] });
    } catch { /* message may be gone */ }
  });
}

module.exports = { paginate };
