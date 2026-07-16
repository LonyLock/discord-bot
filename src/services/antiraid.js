'use strict';

const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../database/db');
const { sendLog } = require('../utils/logchannel');
const config = require('../../config.json');
const { formatDuration } = require('../utils/time');

const BURST_WINDOW_MS = 10_000;
const TIMEOUT_MS = 60 * 60 * 1000; // 1h for the timeout action

/**
 * Run anti-raid checks for a joining member.
 * Returns true if the member was kicked/banned/timed-out (so the caller can
 * skip the welcome message).
 */
async function check(member, client) {
  const cfg = getGuildConfig(member.guild.id);
  if (!cfg.antiraid_enabled) return false;

  // 1) New-account gate.
  if (cfg.antiraid_min_age_days > 0) {
    const ageMs = Date.now() - member.user.createdTimestamp;
    const minMs = cfg.antiraid_min_age_days * 86_400_000;
    if (ageMs < minMs) {
      return takeAction(member, cfg.antiraid_action, `Account age ${formatDuration(ageMs)} is below the ${cfg.antiraid_min_age_days}-day minimum`);
    }
  }

  // 2) Join-burst detection (alert only — no mass action, to avoid collateral).
  if (cfg.antiraid_join_threshold > 0) {
    const key = member.guild.id;
    const now = Date.now();
    const recent = (client.joinTracker.get(key) || []).filter((t) => now - t < BURST_WINDOW_MS);
    recent.push(now);
    client.joinTracker.set(key, recent);
    if (recent.length >= cfg.antiraid_join_threshold) {
      client.joinTracker.set(key, []); // reset so we alert once per burst
      const embed = new EmbedBuilder()
        .setColor(config.brand.errorColor)
        .setTitle('🚨 Possible Raid Detected')
        .setDescription(
          `**${recent.length}** members joined within ${BURST_WINDOW_MS / 1000}s ` +
            `(threshold: ${cfg.antiraid_join_threshold}).\nConsider raising verification or locking the server.`
        )
        .setTimestamp();
      sendLog(member.guild, 'mod_log_channel', embed);
    }
  }
  return false;
}

async function takeAction(member, action, reason) {
  const dm = new EmbedBuilder()
    .setColor(config.brand.errorColor)
    .setDescription(`You were removed from **${member.guild.name}** by anti-raid protection.\nReason: ${reason}`);
  await member.send({ embeds: [dm] }).catch(() => {});

  let done = false;
  try {
    if (action === 'ban') {
      await member.ban({ reason: `Anti-raid: ${reason}` });
      done = true;
    } else if (action === 'timeout') {
      await member.timeout(TIMEOUT_MS, `Anti-raid: ${reason}`);
      done = true;
    } else {
      await member.kick(`Anti-raid: ${reason}`);
      done = true;
    }
  } catch {
    return false;
  }

  const embed = new EmbedBuilder()
    .setColor(config.brand.warnColor)
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setTitle(`🛡️ Anti-Raid — ${action}`)
    .addFields(
      { name: 'User', value: `${member.user.tag} (\`${member.id}\`)`, inline: false },
      { name: 'Reason', value: reason, inline: false }
    )
    .setTimestamp();
  sendLog(member.guild, 'mod_log_channel', embed);
  return done;
}

module.exports = { check };
