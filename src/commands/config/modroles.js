'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { ladderFor, permLabel, createLadder, removeLadder } = require('../../services/modladder');

const P = PermissionFlagsBits;

function tiersOption(o) {
  return o.setName('tiers').setDescription('How many steps in the ladder (default 6)')
    .addChoices({ name: '6 tiers', value: 6 }, { name: '5 tiers', value: 5 });
}

module.exports = {
  category: 'config',
  guildOnly: true,
  permissions: [P.ManageRoles],
  botPermissions: [P.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('modroles')
    .setDescription('Create a ready-made moderation role hierarchy')
    .addSubcommand((s) => s.setName('preview').setDescription('Show the ladder and its permissions without creating anything')
      .addIntegerOption(tiersOption))
    .addSubcommand((s) => s.setName('create').setDescription('Create the moderation role ladder on this server')
      .addIntegerOption(tiersOption))
    .addSubcommand((s) => s.setName('remove').setDescription('Delete the roles this command created')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const tiers = interaction.options.getInteger('tiers') || 6;

    if (sub === 'preview') {
      const embed = new EmbedBuilder()
        .setColor(config.brand.color)
        .setTitle(`🛡️ Moderation ladder — ${tiers} tiers`)
        .setDescription('Top to bottom. Run `/config modroles create` to build these roles.')
        .addFields(ladderFor(tiers).map((r, i) => ({
          name: `${r.emoji} ${i + 1}. ${r.name}`,
          value: r.perms.map(permLabel).join(', '),
        })))
        .setFooter({ text: config.brand.footer });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'remove') {
      await interaction.deferReply();
      const { deleted } = await removeLadder(interaction.guild, `Moderation ladder removed by ${interaction.user.tag}`);
      return interaction.editReply({
        embeds: [deleted.length
          ? Embed.success(`Deleted **${deleted.length}** role(s): ${deleted.map((n) => `\`${n}\``).join(', ')}`)
          : Embed.warn('No matching moderation roles found that I can delete.')],
      });
    }

    // create
    await interaction.deferReply();
    const { created, skipped, failed, dropped } = await createLadder(interaction.guild, tiers, `Moderation ladder created by ${interaction.user.tag}`);

    const lines = [];
    if (created.length) lines.push(`**Created (${created.length}):**\n${created.map((r) => `${r}`).join(' › ')}`);
    if (skipped.length) lines.push(`**Already existed (${skipped.length}):** ${skipped.map((r) => `\`${r.name}\``).join(', ')}`);
    if (failed.length) lines.push(`**Failed (${failed.length}):** ${failed.map((n) => `\`${n}\``).join(', ')}`);
    if (!created.length && !skipped.length) lines.push('No roles were created.');
    lines.push('\nRoles are placed just below my highest role — drag them in **Server Settings → Roles** to fine-tune, and assign them to your staff.');
    if (dropped.length) lines.push(`\n⚠️ I couldn't grant some permissions because my own role lacks them: ${dropped.map((p) => `\`${p}\``).join(', ')}. Give me those (or Administrator), then re-run.`);

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.brand.successColor)
        .setTitle(`🛡️ Moderation ladder — ${tiers} tiers`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: config.brand.footer })],
    });
  },
};
