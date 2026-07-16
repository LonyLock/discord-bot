'use strict';

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const config = require('../../config.json');

const CATEGORY_META = {
  moderation: { emoji: '🛡️', label: 'Moderation', desc: 'Keep your server safe' },
  automod: { emoji: '🤖', label: 'Auto-Mod', desc: 'Automatic moderation' },
  economy: { emoji: '🪙', label: 'Economy', desc: 'Currency, shop & gambling' },
  leveling: { emoji: '📈', label: 'Leveling', desc: 'XP, ranks & leaderboards' },
  fun: { emoji: '🎮', label: 'Fun', desc: 'Games & entertainment' },
  utility: { emoji: '🔧', label: 'Utility', desc: 'Helpful tools' },
  info: { emoji: 'ℹ️', label: 'Information', desc: 'Server & user info' },
  config: { emoji: '⚙️', label: 'Configuration', desc: 'Server setup (admin)' },
  tickets: { emoji: '🎫', label: 'Tickets', desc: 'Support ticket system' },
  giveaways: { emoji: '🎉', label: 'Giveaways', desc: 'Run giveaways' },
  roles: { emoji: '🎭', label: 'Roles', desc: 'Role management' },
  music: { emoji: '🎵', label: 'Music', desc: 'Voice & music playback' },
};

function categories(client) {
  const map = new Map();
  for (const cmd of client.commands.values()) {
    const cat = cmd.category || 'utility';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(cmd);
  }
  return map;
}

function overviewEmbed(client) {
  const map = categories(client);
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(`${config.brand.name} — Help Menu`)
    .setDescription(
      `Hello! I'm **${config.brand.name}**, an all-in-one Discord bot with **${client.commands.size}** commands.\n` +
        'Use the dropdown below to browse a category, or use `/help command:<name>` for details on a specific command.'
    )
    .setThumbnail(client.user.displayAvatarURL());

  for (const [cat, cmds] of [...map].sort((a, b) => a[0].localeCompare(b[0]))) {
    const meta = CATEGORY_META[cat] || { emoji: '•', label: cat };
    embed.addFields({
      name: `${meta.emoji} ${meta.label} — ${cmds.length}`,
      value: cmds.map((c) => `\`${c.data.name}\``).join(', ') || 'None',
      inline: false,
    });
  }
  embed.setFooter({ text: config.brand.footer }).setTimestamp();
  return embed;
}

function categoryEmbed(client, category) {
  const map = categories(client);
  const cmds = map.get(category) || [];
  const meta = CATEGORY_META[category] || { emoji: '•', label: category };
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(`${meta.emoji} ${meta.label} Commands`)
    .setDescription(
      cmds
        .sort((a, b) => a.data.name.localeCompare(b.data.name))
        .map((c) => `**/${c.data.name}** — ${c.data.description}`)
        .join('\n') || 'No commands in this category.'
    )
    .setFooter({ text: config.brand.footer })
    .setTimestamp();
  return embed;
}

function selectRow(client, selected) {
  const map = categories(client);
  const options = [...map.keys()]
    .sort()
    .map((cat) => {
      const meta = CATEGORY_META[cat] || { emoji: '•', label: cat, desc: ' ' };
      return {
        label: meta.label,
        value: cat,
        description: meta.desc,
        emoji: meta.emoji,
        default: cat === selected,
      };
    });
  options.unshift({
    label: 'Overview',
    value: 'overview',
    description: 'Back to the main menu',
    emoji: '🏠',
    default: selected === 'overview' || !selected,
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder('📚 Choose a category…')
      .addOptions(options.slice(0, 25))
  );
}

module.exports = { overviewEmbed, categoryEmbed, selectRow, CATEGORY_META };
