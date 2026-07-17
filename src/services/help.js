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

const SUBCOMMAND = 1;
const SUBCOMMAND_GROUP = 2;

/**
 * Immediate subcommands / subcommand groups of a (possibly combined) command.
 * Returns [] for a plain command. Group entries carry their child subcommand names.
 */
function subEntries(cmd) {
  let json;
  try { json = cmd.data.toJSON(); } catch { return []; }
  const entries = [];
  for (const o of json.options || []) {
    if (o.type === SUBCOMMAND) entries.push({ name: o.name, description: o.description });
    else if (o.type === SUBCOMMAND_GROUP) {
      entries.push({ name: o.name, description: o.description, children: (o.options || []).map((s) => s.name) });
    }
  }
  return entries;
}

/** Number of runnable leaves in a command (subcommands, or 1 for a plain command). */
function leafCount(cmd) {
  const subs = subEntries(cmd);
  if (!subs.length) return 1;
  return subs.reduce((n, e) => n + (e.children ? e.children.length : 1), 0);
}

/** Flatten one command into runnable leaves with their full slash path + options. */
function flatten(cmd) {
  let json;
  try { json = cmd.data.toJSON(); } catch { return []; }
  const opts = json.options || [];
  const hasSubs = opts.some((o) => o.type === SUBCOMMAND || o.type === SUBCOMMAND_GROUP);
  if (!hasSubs) {
    return [{ path: json.name, description: json.description, options: opts, category: cmd.category }];
  }
  const out = [];
  for (const o of opts) {
    if (o.type === SUBCOMMAND) {
      out.push({ path: `${json.name} ${o.name}`, description: o.description, options: o.options || [], category: cmd.category });
    } else if (o.type === SUBCOMMAND_GROUP) {
      for (const s of o.options || []) {
        out.push({ path: `${json.name} ${o.name} ${s.name}`, description: s.description, options: s.options || [], category: cmd.category });
      }
    }
  }
  return out;
}

/** Every runnable command path across the bot (e.g. "info user", "config automod enable"). */
function commandIndex(client) {
  const out = [];
  for (const cmd of client.commands.values()) out.push(...flatten(cmd));
  return out;
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
    // A category that is a single combined command lists its subcommands.
    const subs = cmds.length === 1 ? subEntries(cmds[0]) : [];
    let value;
    let count;
    if (subs.length) {
      count = leafCount(cmds[0]);
      value = `**/${cmds[0].data.name}** — ${subs.map((e) => `\`${e.name}\``).join(' · ')}`;
    } else {
      count = cmds.length;
      value = cmds.map((c) => `\`${c.data.name}\``).join(', ') || 'None';
    }
    embed.addFields({ name: `${meta.emoji} ${meta.label} — ${count}`, value, inline: false });
  }
  embed.setFooter({ text: config.brand.footer }).setTimestamp();
  return embed;
}

function categoryEmbed(client, category) {
  const map = categories(client);
  const cmds = map.get(category) || [];
  const meta = CATEGORY_META[category] || { emoji: '•', label: category };
  // A combined category (single parent command) is expanded into its subcommands.
  const subs = cmds.length === 1 ? subEntries(cmds[0]) : [];
  let description;
  if (subs.length) {
    const parent = cmds[0].data.name;
    description = subs
      .map((e) => (e.children
        ? `**/${parent} ${e.name}** — ${e.children.map((x) => `\`${x}\``).join(', ')}`
        : `**/${parent} ${e.name}** — ${e.description}`))
      .join('\n');
  } else {
    description = cmds
      .sort((a, b) => a.data.name.localeCompare(b.data.name))
      .map((c) => `**/${c.data.name}** — ${c.data.description}`)
      .join('\n') || 'No commands in this category.';
  }
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(`${meta.emoji} ${meta.label} Commands`)
    .setDescription(description)
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

module.exports = { overviewEmbed, categoryEmbed, selectRow, CATEGORY_META, commandIndex };
