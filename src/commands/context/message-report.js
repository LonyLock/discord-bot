'use strict';

const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const config = require('../../../config.json');
const { getGuildConfig } = require('../../database/db');
const { sendLog } = require('../../utils/logchannel');
const { truncate } = require('../../utils/helpers');

// Right-click a message → Apps → "Report to Staff": forwards it to the mod-log.
module.exports = {
  category: 'context',
  guildOnly: true,
  data: new ContextMenuCommandBuilder().setName('Report to Staff').setType(ApplicationCommandType.Message),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.mod_log_channel) {
      return interaction.reply({ embeds: [Embed.error('There is no mod-log channel configured for reports.')], ephemeral: true });
    }
    const msg = interaction.targetMessage;
    const embed = new EmbedBuilder()
      .setColor(config.brand.warnColor)
      .setTitle('🚩 Message reported')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription(truncate(msg.content || '*No text content*', 2000))
      .addFields(
        { name: 'Author', value: `${msg.author} (\`${msg.author.id}\`)`, inline: true },
        { name: 'Channel', value: `${msg.channel}`, inline: true },
        { name: 'Reported by', value: `${interaction.user}`, inline: true },
        { name: 'Message', value: `[Jump](${msg.url})` },
      )
      .setFooter({ text: config.brand.footer })
      .setTimestamp();
    sendLog(interaction.guild, 'mod_log_channel', embed);
    return interaction.reply({ embeds: [Embed.success('Thanks — your report was sent to the staff team.')], ephemeral: true });
  },
};
