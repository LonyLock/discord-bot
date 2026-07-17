'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

const P = PermissionFlagsBits;

// The moderation ladder, ordered top (most powerful) → bottom. `tier: 6` roles
// only appear in the 6-step ladder; everything else is in both the 5- and 6-step.
const LADDER = [
  { name: 'Admin', emoji: '🔴', color: 0xe74c3c, tier: 'both',
    perms: [P.ManageGuild, P.ManageRoles, P.ManageChannels, P.ViewAuditLog, P.ManageWebhooks, P.BanMembers, P.KickMembers, P.ModerateMembers, P.ManageMessages, P.ManageNicknames, P.MuteMembers, P.DeafenMembers, P.MoveMembers] },
  { name: 'Head Moderator', emoji: '🟠', color: 0xe67e22, tier: 'both',
    perms: [P.BanMembers, P.KickMembers, P.ModerateMembers, P.ManageMessages, P.ManageNicknames, P.MuteMembers, P.DeafenMembers, P.MoveMembers, P.ViewAuditLog] },
  { name: 'Moderator', emoji: '🟡', color: 0xf1c40f, tier: 'both',
    perms: [P.KickMembers, P.ModerateMembers, P.ManageMessages, P.ManageNicknames, P.MuteMembers, P.MoveMembers] },
  { name: 'Junior Moderator', emoji: '🟢', color: 0x2ecc71, tier: 'both',
    perms: [P.ModerateMembers, P.ManageMessages, P.MuteMembers] },
  { name: 'Trial Moderator', emoji: '🔵', color: 0x3498db, tier: 6,
    perms: [P.ModerateMembers, P.ManageMessages] },
  { name: 'Helper', emoji: '🟣', color: 0x9b59b6, tier: 'both',
    perms: [P.ManageMessages] },
];

const PERM_LABEL = new Map([
  [P.ManageGuild, 'Manage Server'], [P.ManageRoles, 'Manage Roles'], [P.ManageChannels, 'Manage Channels'],
  [P.ViewAuditLog, 'View Audit Log'], [P.ManageWebhooks, 'Manage Webhooks'], [P.BanMembers, 'Ban Members'],
  [P.KickMembers, 'Kick Members'], [P.ModerateMembers, 'Timeout Members'], [P.ManageMessages, 'Manage Messages'],
  [P.ManageNicknames, 'Manage Nicknames'], [P.MuteMembers, 'Voice Mute'], [P.DeafenMembers, 'Voice Deafen'],
  [P.MoveMembers, 'Voice Move'],
]);
const permLabel = (p) => PERM_LABEL.get(p) || String(p);

const ladderFor = (tiers) => LADDER.filter((r) => r.tier === 'both' || r.tier === tiers);
const allNames = new Set(LADDER.map((r) => r.name));

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
    const ladder = ladderFor(tiers);

    if (sub === 'preview') {
      const embed = new EmbedBuilder()
        .setColor(config.brand.color)
        .setTitle(`🛡️ Moderation ladder — ${tiers} tiers`)
        .setDescription('Top to bottom. Run `/config modroles create` to build these roles.')
        .addFields(ladder.map((r, i) => ({
          name: `${r.emoji} ${i + 1}. ${r.name}`,
          value: r.perms.map(permLabel).join(', '),
        })))
        .setFooter({ text: config.brand.footer });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'remove') {
      const targets = interaction.guild.roles.cache.filter((r) => allNames.has(r.name) && r.editable);
      if (!targets.size) return interaction.reply({ embeds: [Embed.warn('No matching moderation roles found that I can delete.')], ephemeral: true });
      await interaction.deferReply();
      const deleted = [];
      for (const role of targets.values()) {
        try { await role.delete(`Moderation ladder removed by ${interaction.user.tag}`); deleted.push(role.name); }
        catch { /* skip roles we cannot remove */ }
      }
      return interaction.editReply({ embeds: [Embed.success(`Deleted **${deleted.length}** role(s): ${deleted.map((n) => `\`${n}\``).join(', ') || '—'}`)] });
    }

    // create
    await interaction.deferReply();
    const me = interaction.guild.members.me;
    const created = [];
    const skipped = [];
    const dropped = new Set();

    // Created top→bottom: each new role lands just above @everyone, so the first
    // one created ends up highest — producing the intended ladder order.
    for (const spec of ladder) {
      const existing = interaction.guild.roles.cache.find((r) => r.name === spec.name);
      if (existing) { skipped.push(existing); continue; }
      const grantable = spec.perms.filter((p) => me.permissions.has(p));
      spec.perms.filter((p) => !me.permissions.has(p)).forEach((p) => dropped.add(permLabel(p)));
      try {
        const role = await interaction.guild.roles.create({
          name: spec.name,
          color: spec.color,
          hoist: true,
          mentionable: false,
          permissions: grantable,
          reason: `Moderation ladder created by ${interaction.user.tag}`,
        });
        created.push(role);
      } catch { /* continue on individual failures */ }
    }

    const embed = new EmbedBuilder()
      .setColor(config.brand.successColor)
      .setTitle(`🛡️ Moderation ladder — ${tiers} tiers`)
      .setFooter({ text: config.brand.footer });
    const lines = [];
    if (created.length) lines.push(`**Created (${created.length}):**\n${created.map((r) => `${r}`).join(' › ')}`);
    if (skipped.length) lines.push(`**Already existed (${skipped.length}):** ${skipped.map((r) => `\`${r.name}\``).join(', ')}`);
    if (!created.length && !skipped.length) lines.push('No roles were created.');
    lines.push('\nRoles are placed just below my highest role — drag them in **Server Settings → Roles** to fine-tune, and assign them to your staff.');
    if (dropped.size) lines.push(`\n⚠️ I couldn't grant some permissions because my own role lacks them: ${[...dropped].map((p) => `\`${p}\``).join(', ')}. Give me those (or Administrator), then re-run.`);
    embed.setDescription(lines.join('\n'));
    return interaction.editReply({ embeds: [embed] });
  },
};
