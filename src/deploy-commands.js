'use strict';

/**
 * Registers (or refreshes) all slash commands with Discord.
 *
 *   node src/deploy-commands.js            -> guild deploy if GUILD_ID set, else global
 *   node src/deploy-commands.js --global   -> force global deploy
 *   node src/deploy-commands.js --clear    -> remove all commands
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./structures/loaders');
const logger = require('./utils/logger');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  logger.error('DISCORD_TOKEN and CLIENT_ID are required in .env to deploy commands.');
  process.exit(1);
}

const args = process.argv.slice(2);
const forceGlobal = args.includes('--global');
const clear = args.includes('--clear');

const fakeClient = {};
const commands = loadCommands(fakeClient);
const body = clear
  ? []
  : [...commands.values(), ...fakeClient.contextMenus.values()].map((c) => c.data.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    const useGuild = guildId && !forceGlobal;
    const route = useGuild
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    logger.info(
      clear
        ? `Clearing commands ${useGuild ? `from guild ${guildId}` : 'globally'}…`
        : `Deploying ${body.length} commands ${useGuild ? `to guild ${guildId}` : 'globally'}…`
    );

    const data = await rest.put(route, { body });
    logger.success(`Done. ${Array.isArray(data) ? data.length : 0} commands now registered.`);
    if (!useGuild && !clear) {
      logger.info('Global commands can take up to 1 hour to appear. Set GUILD_ID for instant testing.');
    }
  } catch (err) {
    logger.error('Deployment failed:', err);
    process.exit(1);
  }
})();
