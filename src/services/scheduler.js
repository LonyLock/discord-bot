'use strict';

const { EmbedBuilder } = require('discord.js');
const { db } = require('../database/db');
const config = require('../../config.json');
const logger = require('../utils/logger');
const giveaways = require('./giveaways');

const dueReminders = db.prepare('SELECT * FROM reminders WHERE remind_at <= ?');
const deleteReminder = db.prepare('DELETE FROM reminders WHERE id = ?');
const dueTempBans = db.prepare('SELECT * FROM temp_bans WHERE unban_at <= ?');
const deleteTempBan = db.prepare('DELETE FROM temp_bans WHERE guild_id = ? AND user_id = ?');

async function runReminders(client) {
  const now = Date.now();
  for (const r of dueReminders.all(now)) {
    deleteReminder.run(r.id);
    try {
      const channel = await client.channels.fetch(r.channel_id).catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(config.brand.color)
        .setTitle('⏰ Reminder')
        .setDescription(r.message)
        .setFooter({ text: config.brand.footer })
        .setTimestamp(r.created_at);
      if (channel?.isTextBased()) {
        await channel.send({ content: `<@${r.user_id}>`, embeds: [embed] });
      } else {
        const user = await client.users.fetch(r.user_id).catch(() => null);
        if (user) await user.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      logger.debug('Reminder delivery failed:', err.message);
    }
  }
}

async function runTempBans(client) {
  const now = Date.now();
  for (const tb of dueTempBans.all(now)) {
    deleteTempBan.run(tb.guild_id, tb.user_id);
    try {
      const guild = await client.guilds.fetch(tb.guild_id).catch(() => null);
      if (guild) {
        await guild.bans.remove(tb.user_id, 'Temporary ban expired').catch(() => {});
        logger.info(`Auto-unbanned ${tb.user_id} in ${tb.guild_id}`);
      }
    } catch (err) {
      logger.debug('Temp-ban removal failed:', err.message);
    }
  }
}

/** Start all periodic jobs. Runs every 15 seconds. */
function start(client) {
  const tick = async () => {
    await runReminders(client).catch((e) => logger.error('reminder tick', e));
    await runTempBans(client).catch((e) => logger.error('tempban tick', e));
    await giveaways.processDue(client).catch((e) => logger.error('giveaway tick', e));
  };
  tick();
  setInterval(tick, 15_000);
  logger.success('Scheduler started (reminders, temp-bans, giveaways).');
}

module.exports = { start };
