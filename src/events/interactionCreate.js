'use strict';

const { Events, Collection, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { db, getGuildConfig, trackCommand, isUserBlacklisted } = require('../database/db');
const Embed = require('../utils/embed');
const logger = require('../utils/logger');
const tickets = require('../services/tickets');
const giveaways = require('../services/giveaways');
const help = require('../services/help');
const config = require('../../config.json');

const isDisabled = db.prepare(
  'SELECT 1 FROM disabled_commands WHERE guild_id = ? AND command = ?'
);
const getSuggestion = db.prepare('SELECT * FROM suggestions WHERE message_id = ?');
const setSuggestionStatus = db.prepare('UPDATE suggestions SET status = ? WHERE message_id = ?');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) return handleCommand(interaction, client);
      if (interaction.isAutocomplete()) return handleAutocomplete(interaction, client);
      if (interaction.isButton()) return handleButton(interaction, client);
      if (interaction.isStringSelectMenu()) return handleSelect(interaction, client);
      if (interaction.isModalSubmit()) return handleModal(interaction, client);
    } catch (err) {
      logger.error('interactionCreate error:', err);
      const payload = { embeds: [Embed.error('An unexpected error occurred.')], flags: MessageFlags.Ephemeral };
      if (interaction.isRepliable()) {
        interaction.replied || interaction.deferred
          ? interaction.followUp(payload).catch(() => {})
          : interaction.reply(payload).catch(() => {});
      }
    }
  },
};

/* ------------------------------------------------------------------ */
/*  Slash commands                                                    */
/* ------------------------------------------------------------------ */
async function handleCommand(interaction, client) {
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Globally blacklisted users cannot use commands (owners are exempt).
  if (isUserBlacklisted(interaction.user.id) && !client.ownerIds.includes(interaction.user.id)) {
    return interaction.reply({
      embeds: [Embed.error('You are blacklisted from using this bot.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Per-guild disabled commands (owners bypass).
  if (
    interaction.guild &&
    isDisabled.get(interaction.guild.id, command.data.name) &&
    !client.ownerIds.includes(interaction.user.id)
  ) {
    return interaction.reply({
      embeds: [Embed.error('This command is disabled on this server.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Guild-only guard.
  if (command.guildOnly && !interaction.guild) {
    return interaction.reply({
      embeds: [Embed.error('This command can only be used in a server.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Permission gating (member + bot).
  if (command.permissions && interaction.guild) {
    const missing = interaction.memberPermissions.missing(command.permissions);
    if (missing.length && !client.ownerIds.includes(interaction.user.id)) {
      return interaction.reply({
        embeds: [Embed.error(`You need the following permission(s): \`${missing.join(', ')}\``)],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
  if (command.botPermissions && interaction.guild) {
    const missing = interaction.guild.members.me.permissions.missing(command.botPermissions);
    if (missing.length) {
      return interaction.reply({
        embeds: [Embed.error(`I need the following permission(s): \`${missing.join(', ')}\``)],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // Cooldowns.
  const cdAmount = (command.cooldown ?? config.cooldownDefaultSeconds) * 1000;
  if (cdAmount > 0) {
    if (!client.cooldowns.has(command.data.name)) {
      client.cooldowns.set(command.data.name, new Collection());
    }
    const timestamps = client.cooldowns.get(command.data.name);
    const now = Date.now();
    if (timestamps.has(interaction.user.id)) {
      const expires = timestamps.get(interaction.user.id) + cdAmount;
      if (now < expires) {
        return interaction.reply({
          embeds: [Embed.warn(`Please wait <t:${Math.round(expires / 1000)}:R> before using \`/${command.data.name}\` again.`)],
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cdAmount);
  }

  trackCommand(command.data.name);
  try {
    await command.execute(interaction, client);
  } catch (err) {
    logger.error(`Error in /${command.data.name}:`, err);
    const payload = {
      embeds: [Embed.error('Something went wrong while running that command.')],
      flags: MessageFlags.Ephemeral,
    };
    interaction.replied || interaction.deferred
      ? interaction.followUp(payload).catch(() => {})
      : interaction.reply(payload).catch(() => {});
  }
}

async function handleAutocomplete(interaction, client) {
  const command = client.commands.get(interaction.commandName);
  if (!command?.autocomplete) return;
  try {
    await command.autocomplete(interaction, client);
  } catch (err) {
    logger.debug('Autocomplete error:', err.message);
  }
}

/* ------------------------------------------------------------------ */
/*  Buttons                                                           */
/* ------------------------------------------------------------------ */
async function handleButton(interaction, client) {
  const id = interaction.customId;

  // --- Tickets ---
  if (id === 'ticket_open') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await tickets.createTicket(interaction.guild, interaction.user);
    return interaction.editReply(
      result.error
        ? { embeds: [Embed.error(result.error)] }
        : { embeds: [Embed.success(`Your ticket has been created: ${result.channel}`)] }
    );
  }
  if (id === 'ticket_close') {
    await interaction.reply({ embeds: [Embed.warn('Closing this ticket…')] });
    return tickets.closeTicket(interaction.channel, interaction.user);
  }
  if (id === 'ticket_claim') {
    const cfg = getGuildConfig(interaction.guild.id);
    const isStaff =
      interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels) ||
      (cfg.ticket_support_role && interaction.member.roles.cache.has(cfg.ticket_support_role));
    if (!isStaff) {
      return interaction.reply({ embeds: [Embed.error('Only staff can claim tickets.')], flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ embeds: [Embed.success(`${interaction.user} has claimed this ticket.`)] });
  }

  // --- Giveaways ---
  if (id === 'giveaway_enter') {
    const g = giveaways.getGiveaway(interaction.message.id);
    if (!g || g.ended) {
      return interaction.reply({ embeds: [Embed.error('This giveaway has ended.')], flags: MessageFlags.Ephemeral });
    }
    if (g.required_role && !interaction.member.roles.cache.has(g.required_role)) {
      return interaction.reply({
        embeds: [Embed.error(`You need the <@&${g.required_role}> role to enter.`)],
        flags: MessageFlags.Ephemeral,
      });
    }
    const { entered, count } = giveaways.toggleEntry(interaction.message.id, interaction.user.id);
    await interaction.message
      .edit({ components: [giveaways.buttonRow(count)] })
      .catch(() => {});
    return interaction.reply({
      embeds: [entered ? Embed.success('You have entered the giveaway! 🎉') : Embed.warn('You have left the giveaway.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // --- Suggestions voting ---
  if (id === 'suggest_up' || id === 'suggest_down') {
    return interaction.reply({
      embeds: [Embed.info(null, 'Use the reactions above to vote on this suggestion.')],
      flags: MessageFlags.Ephemeral,
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Select menus                                                      */
/* ------------------------------------------------------------------ */
async function handleSelect(interaction, client) {
  if (interaction.customId === 'help_select') {
    const value = interaction.values[0];
    const embed = value === 'overview' ? help.overviewEmbed(client) : help.categoryEmbed(client, value);
    return interaction.update({ embeds: [embed], components: [help.selectRow(client, value)] });
  }
}

/* ------------------------------------------------------------------ */
/*  Modals                                                            */
/* ------------------------------------------------------------------ */
async function handleModal(interaction, client) {
  if (interaction.customId === 'ticket_modal') {
    const subject = interaction.fields.getTextInputValue('subject');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await tickets.createTicket(interaction.guild, interaction.user, subject);
    return interaction.editReply(
      result.error
        ? { embeds: [Embed.error(result.error)] }
        : { embeds: [Embed.success(`Your ticket has been created: ${result.channel}`)] }
    );
  }
}
