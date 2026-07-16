'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getLevel, setLevel } = require('../../database/db');
const Embed = require('../../utils/embed');
const leveling = require('../../utils/leveling');
const { t } = require('../../i18n');

module.exports = {
  category: 'leveling',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('givexp')
    .setDescription('Give or remove XP from a member (admin)')
    .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
    .addIntegerOption((o) => o.setName('amount').setDescription('XP to add (negative to remove)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const gid = interaction.guild.id;
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const data = getLevel(gid, user.id);
    if (amount >= 0) {
      const result = leveling.addXp(data, amount);
      setLevel(gid, user.id, { xp: result.xp, level: result.level, total_xp: result.totalXp });
    } else {
      const newTotal = Math.max(0, data.total_xp + amount);
      let level = 0; let remaining = newTotal;
      while (remaining >= leveling.xpForLevel(level)) { remaining -= leveling.xpForLevel(level); level++; }
      setLevel(gid, user.id, { xp: remaining, level, total_xp: newTotal });
    }
    const key = amount >= 0 ? 'lvl.givexp.added' : 'lvl.givexp.removed';
    return interaction.reply({ embeds: [Embed.success(t(gid, key, { amount: Math.abs(amount), user: user.toString() }))] });
  },
};
