'use strict';

const {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} = require('discord.js');
const Embed = require('../utils/embed');
const { t } = require('../i18n');

/**
 * Merge several individual command modules into ONE parent slash command so a
 * whole category costs a single slot of Discord's 100-command cap.
 *
 * Each part is an ordinary command module ({ data, execute, permissions?,
 * guildOnly?, botPermissions?, autocomplete? }). A part whose builder already
 * carries subcommands becomes a subcommand GROUP; a flat part becomes a
 * subcommand. The parts' execute/autocomplete functions are reused unchanged —
 * they read options and getSubcommand() by name, which still resolve when nested.
 *
 * Because parts in one category can have different permission levels, the parent
 * carries no single permission gate; instead each part's guildOnly / permissions
 * / botPermissions are enforced here before dispatching, mirroring the checks in
 * events/interactionCreate.js.
 */

// Discord limits subcommand/group descriptions to 100 characters.
const trimDesc = (d) => {
  const s = (d || '').trim() || '…';
  return s.length > 100 ? `${s.slice(0, 99)}…` : s;
};

async function enforce(interaction, client, part) {
  const gid = interaction.guild?.id;
  const isOwner = client?.ownerIds?.includes(interaction.user.id);

  if (part.guildOnly && !interaction.guild) {
    await interaction.reply({ embeds: [Embed.error(t(gid, 'error.guild_only'))], ephemeral: true });
    return false;
  }
  if (part.permissions && interaction.guild && !isOwner) {
    const missing = interaction.memberPermissions.missing(part.permissions);
    if (missing.length) {
      await interaction.reply({ embeds: [Embed.error(t(gid, 'error.missing_perms', { perms: missing.join(', ') }))], ephemeral: true });
      return false;
    }
  }
  if (part.botPermissions && interaction.guild) {
    const missing = interaction.guild.members.me.permissions.missing(part.botPermissions);
    if (missing.length) {
      await interaction.reply({ embeds: [Embed.error(t(gid, 'error.bot_missing_perms', { perms: missing.join(', ') }))], ephemeral: true });
      return false;
    }
  }
  return true;
}

/**
 * @param {Object} cfg
 * @param {string} cfg.name         Parent command name.
 * @param {string} cfg.description  Parent command description.
 * @param {string} cfg.category     Help category.
 * @param {Array}  cfg.parts        Individual command modules to fold in.
 * @param {Object} [cfg.rename]     Map of part data.name → nested name (avoids collisions / tidies).
 */
function combineCommands({ name, description, category, parts, rename = {} }) {
  const builder = new SlashCommandBuilder().setName(name).setDescription(trimDesc(description));
  const routes = new Map();
  const nameOf = (p) => rename[p.data.name] || p.data.name;

  for (const part of parts) {
    const pname = nameOf(part);
    const opts = part.data.options || [];
    const nested = opts.length > 0 && opts[0] instanceof SlashCommandSubcommandBuilder;

    if (nested) {
      const group = new SlashCommandSubcommandGroupBuilder()
        .setName(pname)
        .setDescription(trimDesc(part.data.description));
      for (const sc of opts) group.addSubcommand(sc);
      builder.addSubcommandGroup(group);
      routes.set(`g:${pname}`, part);
    } else {
      const sub = new SlashCommandSubcommandBuilder()
        .setName(pname)
        .setDescription(trimDesc(part.data.description));
      for (const o of opts) sub.options.push(o);
      builder.addSubcommand(sub);
      routes.set(`s:${pname}`, part);
    }
  }

  const resolve = (interaction) => {
    const g = interaction.options.getSubcommandGroup(false);
    return routes.get(g ? `g:${g}` : `s:${interaction.options.getSubcommand()}`);
  };

  async function execute(interaction, client) {
    const part = resolve(interaction);
    if (!part) return;
    if ((await enforce(interaction, client, part)) === false) return;
    return part.execute(interaction, client);
  }

  const combined = {
    category,
    // Gate the whole command only when every part is guild-only (nicer UX);
    // otherwise per-part enforcement above handles it.
    guildOnly: parts.every((p) => p.guildOnly),
    data: builder,
    execute,
  };

  if (parts.some((p) => p.autocomplete)) {
    combined.autocomplete = async (interaction, client) => {
      const part = resolve(interaction);
      if (part?.autocomplete) return part.autocomplete(interaction, client);
    };
  }

  return combined;
}

module.exports = { combineCommands };
