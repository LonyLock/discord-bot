'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');

const P = PermissionFlagsBits;
// A role counts as "staff" when it grants any real moderation power.
const STAFF_PERMS = [P.Administrator, P.ManageGuild, P.BanMembers, P.KickMembers, P.ModerateMembers, P.ManageMessages];

module.exports = {
  category: 'info',
  guildOnly: true,
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Show the server staff, grouped by role'),
  async execute(interaction) {
    await interaction.deferReply();
    const guild = interaction.guild;
    // Best effort full member fetch so role membership is accurate; falls back to cache.
    await guild.members.fetch({ time: 10_000 }).catch(() => {});

    const staffRoles = guild.roles.cache
      .filter((r) => r.id !== guild.id && !r.managed && STAFF_PERMS.some((p) => r.permissions.has(p)))
      .sort((a, b) => b.position - a.position);
    if (!staffRoles.size) return interaction.editReply({ embeds: [Embed.warn('No roles with moderation permissions found.')] });

    // Each member is listed once, under their highest staff role.
    const seen = new Set();
    const fields = [];
    for (const role of staffRoles.values()) {
      const members = role.members
        .filter((m) => !m.user.bot && !seen.has(m.id))
        .sort((a, b) => a.user.username.localeCompare(b.user.username));
      if (!members.size) continue;
      members.forEach((m) => seen.add(m.id));
      const list = members.map((m) => `• ${m.user.tag}`).join('\n');
      fields.push({
        name: `${role.name} — ${members.size}`,
        value: list.length > 1024 ? `${list.slice(0, 1000)}\n… and more` : list,
      });
      if (fields.length >= 12) break; // keep the embed readable
    }
    if (!fields.length) return interaction.editReply({ embeds: [Embed.warn('No human members hold a staff role.')] });

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`🛡️ Staff — ${guild.name}`)
      .setDescription(`**${seen.size}** staff member(s) across **${fields.length}** role(s).`)
      .addFields(fields)
      .setFooter({ text: config.brand.footer })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  },
};
