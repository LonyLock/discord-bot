'use strict';

const logger = require('./logger');

/**
 * Validate environment configuration at startup and print clear, actionable
 * errors instead of letting the bot fail later with a cryptic message.
 * Exits the process when a required value is missing/invalid.
 */
function validateEnv() {
  const errors = [];
  const warnings = [];

  if (!process.env.DISCORD_TOKEN) {
    errors.push('DISCORD_TOKEN is missing. Copy .env.example to .env and add your bot token.');
  } else if (process.env.DISCORD_TOKEN.length < 50) {
    warnings.push('DISCORD_TOKEN looks unusually short — double-check it is the bot token, not the client secret.');
  }

  if (!process.env.CLIENT_ID) {
    warnings.push('CLIENT_ID is not set — you will need it to run "npm run deploy" (command registration).');
  } else if (!/^\d{16,20}$/.test(process.env.CLIENT_ID)) {
    warnings.push('CLIENT_ID does not look like a valid Discord application ID (expected 16–20 digits).');
  }

  if (process.env.OWNER_IDS) {
    const invalid = process.env.OWNER_IDS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((id) => !/^\d{16,20}$/.test(id));
    if (invalid.length) warnings.push(`OWNER_IDS contains invalid IDs: ${invalid.join(', ')}`);
  }

  // Dashboard prerequisites (only checked when enabled).
  if (process.env.DASHBOARD_ENABLED === 'true') {
    if (!process.env.CLIENT_SECRET) errors.push('DASHBOARD_ENABLED=true but CLIENT_SECRET is missing.');
    if (!process.env.SESSION_SECRET) warnings.push('SESSION_SECRET not set — a random one is generated per restart, which logs out all users on every restart.');
    if (process.env.DASHBOARD_PORT && Number.isNaN(Number(process.env.DASHBOARD_PORT))) {
      warnings.push('DASHBOARD_PORT is not a number; falling back to 3000.');
    }
  }

  for (const w of warnings) logger.warn(w);
  if (errors.length) {
    for (const e of errors) logger.error(e);
    logger.error('Startup aborted due to configuration errors above.');
    process.exit(1);
  }
}

module.exports = { validateEnv };
