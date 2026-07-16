'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embed = require('../../utils/embed');
const { db } = require('../../database/db');
const { logModAction, checkHierarchy } = require('../../utils/moderation');

const insertWarn = db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)');
const countWarn = db.prepare('SELECT COUNT(*) AS c FROM warnings WHERE guild_id = ? AND user_id = ?');

module.exports = {
  category: 'moderation',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member')
    .addUserOption((o) => o.setName('user').setDescription('The member to warn').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const hierErr = checkHierarchy(interaction, member);
      if (hierErr) return interaction.reply({ embeds: [Embed.error(hierErr)], ephemeral: true });
    }
    insertWarn.run(interaction.guild.id, user.id, interaction.user.id, reason, Date.now());
    const total = countWarn.get(interaction.guild.id, user.id).c;
    await user.send({ embeds: [Embed.warn(`You were **warned** in **${interaction.guild.name}**.\nReason: ${reason}\nYou now have **${total}** warning(s).`)] }).catch(() => {});
    await logModAction(interaction.guild, { action: 'warn', target: user, moderator: interaction.user, reason, extra: `Total warnings: ${total}` });
    return interaction.reply({ embeds: [Embed.success(`**${user.tag}** has been warned. They now have **${total}** warning(s). | ${reason}`)] });
  },
};
