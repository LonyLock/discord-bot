'use strict';

const config = require('../../config.json');

/** XP required to advance FROM a given level to the next. */
function xpForLevel(level) {
  return Math.floor(config.leveling.baseXp * Math.pow(level + 1, config.leveling.growthFactor));
}

/** Total cumulative XP needed to reach a level (for ranking math). */
function totalXpForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

/** Random XP awarded per qualifying message. */
function randomXp() {
  const { xpPerMessageMin: min, xpPerMessageMax: max } = config.leveling;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Add XP to a level record, returning { leveledUp, newLevel, xp, level }.
 * Mutates and returns the resulting values (does not persist).
 */
function addXp(current, amount) {
  let xp = current.xp + amount;
  let level = current.level;
  let leveledUp = false;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    leveledUp = true;
  }
  return { leveledUp, level, xp, totalXp: current.total_xp + amount };
}

module.exports = { xpForLevel, totalXpForLevel, randomXp, addXp };
