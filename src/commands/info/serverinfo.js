'use strict';
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../../config.json');

module.exports = {
  category: 'info',
  guildOnly: true,
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Show information about this server'),
  async execute(interaction) {
    const g = interaction.guild;
    await g.members.fetch().catch(() => {});
    const owner = await g.fetchOwner().catch(() => null);
    const channels = g.channels.cache;
    const text = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voice = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
    const bots = g.members.cache.filter((m) => m.user.bot).size;
    const levels = ['None', 'Low', 'Medium', 'High', 'Highest'];
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(g.name)
      .setThumbnail(g.iconURL({ size: 256 }))
      .addFields(
        { name: '👑 Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
        { name: '🆔 ID', value: g.id, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 Members', value: `${g.memberCount} (${bots} bots)`, inline: true },
        { name: '💬 Channels', value: `${text} text • ${voice} voice`, inline: true },
        { name: '🎭 Roles', value: `${g.roles.cache.size}`, inline: true },
        { name: '😀 Emojis', value: `${g.emojis.cache.size}`, inline: true },
        { name: '🚀 Boosts', value: `${g.premiumSubscriptionCount || 0} (Tier ${g.premiumTier})`, inline: true },
        { name: '🛡️ Verification', value: levels[g.verificationLevel] || 'Unknown', inline: true })
      .setFooter({ text: config.brand.footer })
      .setTimestamp();
    if (g.bannerURL()) embed.setImage(g.bannerURL({ size: 1024 }));
    return interaction.reply({ embeds: [embed] });
  },
};
