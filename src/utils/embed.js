'use strict';

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

/** Factory helpers for consistently-branded embeds. */
function base() {
  return new EmbedBuilder()
    .setColor(config.brand.color)
    .setFooter({ text: config.brand.footer })
    .setTimestamp();
}

module.exports = {
  base,
  info: (title, description) =>
    base().setColor(config.brand.color).setTitle(title ?? null).setDescription(description ?? null),
  success: (description, title) =>
    base()
      .setColor(config.brand.successColor)
      .setDescription(`✅ ${description}`)
      .setTitle(title ?? null),
  error: (description, title) =>
    base()
      .setColor(config.brand.errorColor)
      .setDescription(`❌ ${description}`)
      .setTitle(title ?? null),
  warn: (description, title) =>
    base()
      .setColor(config.brand.warnColor)
      .setDescription(`⚠️ ${description}`)
      .setTitle(title ?? null),
};
