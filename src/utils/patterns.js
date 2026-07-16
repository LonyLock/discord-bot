'use strict';

/**
 * Shared text-detection patterns used by auto-moderation.
 * Kept in one place so the exact rules the bot enforces are unit-testable.
 */

const INVITE_RE = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/\S+/i;
const LINK_RE = /https?:\/\/\S+/i;

const isInvite = (content) => INVITE_RE.test(content || '');
const isLink = (content) => LINK_RE.test(content || '');

/**
 * True when a message is "shouting" — more than `ratio` of its letters are
 * uppercase, and it has enough letters for that to be meaningful.
 */
function isExcessiveCaps(content, ratio = 0.7, minLetters = 8) {
  if (!content || content.length <= 10) return false;
  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length <= minLetters) return false;
  const caps = content.replace(/[^A-Z]/g, '');
  return caps.length / letters.length > ratio;
}

module.exports = { INVITE_RE, LINK_RE, isInvite, isLink, isExcessiveCaps };
