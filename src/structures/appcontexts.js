'use strict';

const { ApplicationIntegrationType, InteractionContextType } = require('discord.js');

/**
 * Mark a command builder as **user-installable** and usable everywhere: in
 * guilds (whether or not the bot is a member), in the bot's DM, and in private /
 * group DMs. Only apply to commands that don't need the bot to be a guild member
 * — i.e. commands that rely on nothing beyond the interaction itself.
 */
function anywhere(builder) {
  builder
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);
  return builder;
}

module.exports = { anywhere };
