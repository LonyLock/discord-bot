'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

/** Recursively collect all .js files inside a directory. */
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** Load every command file into client.commands. */
function loadCommands(client) {
  client.commands = new Collection();
  const dir = path.join(__dirname, '..', 'commands');
  let count = 0;

  const register = (file) => {
    try {
      const command = require(file);
      if (!command?.data?.name || typeof command.execute !== 'function') {
        logger.warn(`Skipping invalid command file: ${path.basename(file)}`);
        return;
      }
      command.category = command.category || path.basename(path.dirname(file));
      client.commands.set(command.data.name, command);
      count++;
    } catch (err) {
      logger.error(`Failed to load command ${path.basename(file)}:`, err.message);
    }
  };

  // A category folder with an index.js is a combined command: load only the
  // index (which folds its siblings into subcommands) and skip the parts.
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const indexFile = path.join(full, 'index.js');
      if (fs.existsSync(indexFile)) register(indexFile);
      else for (const file of walk(full)) register(file);
    } else if (entry.name.endsWith('.js')) {
      register(full);
    }
  }

  logger.success(`Loaded ${count} slash commands.`);
  return client.commands;
}

/** Wire up every event file to the client. */
function loadEvents(client) {
  const dir = path.join(__dirname, '..', 'events');
  let count = 0;
  for (const file of walk(dir)) {
    try {
      const event = require(file);
      if (!event?.name || typeof event.execute !== 'function') {
        logger.warn(`Skipping invalid event file: ${path.basename(file)}`);
        continue;
      }
      const handler = (...args) => event.execute(...args, client);
      if (event.once) client.once(event.name, handler);
      else client.on(event.name, handler);
      count++;
    } catch (err) {
      logger.error(`Failed to load event ${path.basename(file)}:`, err.message);
    }
  }
  logger.success(`Loaded ${count} event listeners.`);
}

module.exports = { walk, loadCommands, loadEvents };
