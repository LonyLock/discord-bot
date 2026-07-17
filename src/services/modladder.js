'use strict';

// Shared moderation-ladder data + create/remove logic, used by the
// /config modroles command and the scripts/create-modroles.js helper.

const { PermissionFlagsBits: P } = require('discord.js');

// The ladder, ordered top (most powerful) → bottom. `tier: 6` roles only appear
// in the 6-step ladder; the rest are in both the 5- and 6-step versions.
const LADDER = [
  { name: 'Администратор', emoji: '🔴', color: 0xe74c3c, tier: 'both',
    perms: [P.ManageGuild, P.ManageRoles, P.ManageChannels, P.ViewAuditLog, P.ManageWebhooks, P.BanMembers, P.KickMembers, P.ModerateMembers, P.ManageMessages, P.ManageNicknames, P.MuteMembers, P.DeafenMembers, P.MoveMembers] },
  { name: 'Старший модератор', emoji: '🟠', color: 0xe67e22, tier: 'both',
    perms: [P.BanMembers, P.KickMembers, P.ModerateMembers, P.ManageMessages, P.ManageNicknames, P.MuteMembers, P.DeafenMembers, P.MoveMembers, P.ViewAuditLog] },
  { name: 'Модератор', emoji: '🟡', color: 0xf1c40f, tier: 'both',
    perms: [P.KickMembers, P.ModerateMembers, P.ManageMessages, P.ManageNicknames, P.MuteMembers, P.MoveMembers] },
  { name: 'Младший модератор', emoji: '🟢', color: 0x2ecc71, tier: 'both',
    perms: [P.ModerateMembers, P.ManageMessages, P.MuteMembers] },
  { name: 'Стажёр', emoji: '🔵', color: 0x3498db, tier: 6,
    perms: [P.ModerateMembers, P.ManageMessages] },
  { name: 'Помощник', emoji: '🟣', color: 0x9b59b6, tier: 'both',
    perms: [P.ManageMessages] },
];

const PERM_LABEL = new Map([
  [P.ManageGuild, 'Управление сервером'], [P.ManageRoles, 'Управление ролями'], [P.ManageChannels, 'Управление каналами'],
  [P.ViewAuditLog, 'Просмотр журнала аудита'], [P.ManageWebhooks, 'Управление вебхуками'], [P.BanMembers, 'Банить участников'],
  [P.KickMembers, 'Кикать участников'], [P.ModerateMembers, 'Тайм-аут участникам'], [P.ManageMessages, 'Управление сообщениями'],
  [P.ManageNicknames, 'Управление никами'], [P.MuteMembers, 'Мут в голосовых'], [P.DeafenMembers, 'Глушить в голосовых'],
  [P.MoveMembers, 'Перемещать в голосовых'],
]);
const permLabel = (p) => PERM_LABEL.get(p) || String(p);

const ladderFor = (tiers) => LADDER.filter((r) => r.tier === 'both' || r.tier === tiers);
const allNames = new Set(LADDER.map((r) => r.name));

/**
 * Create the ladder on a guild (top→bottom, so the first role created lands
 * highest). Skips roles that already exist by name, and drops any permission the
 * bot's own role lacks (Discord forbids granting perms you don't hold).
 * @returns {Promise<{created:Array, skipped:Array, failed:string[], dropped:string[]}>}
 */
async function createLadder(guild, tiers, reason) {
  const me = guild.members.me;
  const created = [];
  const skipped = [];
  const failed = [];
  const dropped = new Set();

  for (const spec of ladderFor(tiers)) {
    const existing = guild.roles.cache.find((r) => r.name === spec.name);
    if (existing) { skipped.push(existing); continue; }
    const grantable = spec.perms.filter((p) => me.permissions.has(p));
    spec.perms.filter((p) => !me.permissions.has(p)).forEach((p) => dropped.add(permLabel(p)));
    try {
      const role = await guild.roles.create({
        name: spec.name,
        color: spec.color,
        hoist: true,
        mentionable: false,
        permissions: grantable,
        reason,
      });
      created.push(role);
    } catch {
      failed.push(spec.name);
    }
  }
  return { created, skipped, failed, dropped: [...dropped] };
}

/** Delete every ladder role the bot is able to manage. */
async function removeLadder(guild, reason) {
  const targets = guild.roles.cache.filter((r) => allNames.has(r.name) && r.editable);
  const deleted = [];
  for (const role of targets.values()) {
    try { await role.delete(reason); deleted.push(role.name); }
    catch { /* skip roles we cannot remove */ }
  }
  return { deleted };
}

module.exports = { LADDER, PERM_LABEL, permLabel, ladderFor, allNames, createLadder, removeLadder };
