'use strict';
const { SlashCommandBuilder } = require('discord.js');
const Embed = require('../../utils/embed');
const { t } = require('../../i18n');

/** Safe arithmetic evaluator (no eval) — supports + - * / % ^ and parentheses. */
function evaluate(expr) {
  const tokens = expr.match(/(\d+\.?\d*|[+\-*/%^()])/g);
  if (!tokens || tokens.join('') !== expr.replace(/\s+/g, '')) throw new Error('Invalid characters');
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  function parseExpr() {
    let v = parseTerm();
    while (peek() === '+' || peek() === '-') { const op = next(); const r = parseTerm(); v = op === '+' ? v + r : v - r; }
    return v;
  }
  function parseTerm() {
    let v = parseFactor();
    while (peek() === '*' || peek() === '/' || peek() === '%') { const op = next(); const r = parseFactor(); v = op === '*' ? v * r : op === '/' ? v / r : v % r; }
    return v;
  }
  function parseFactor() {
    let v = parseBase();
    while (peek() === '^') { next(); v = Math.pow(v, parseFactor()); }
    return v;
  }
  function parseBase() {
    if (peek() === '(') { next(); const v = parseExpr(); if (next() !== ')') throw new Error('Mismatched parentheses'); return v; }
    if (peek() === '-') { next(); return -parseBase(); }
    const t = next();
    if (t === undefined || isNaN(parseFloat(t))) throw new Error('Unexpected token');
    return parseFloat(t);
  }
  const result = parseExpr();
  if (pos < tokens.length) throw new Error('Unexpected trailing token');
  return result;
}

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('math')
    .setDescription('Evaluate a math expression')
    .addStringOption((o) => o.setName('expression').setDescription('e.g. (2 + 3) * 4 ^ 2').setRequired(true)),
  async execute(interaction) {
    const gid = interaction.guild?.id;
    const expr = interaction.options.getString('expression');
    try {
      const result = evaluate(expr);
      if (!isFinite(result)) throw new Error('Result is not finite');
      return interaction.reply({ embeds: [Embed.info(t(gid, 'util.math.title'), t(gid, 'util.math.result', { expr, result }))] });
    } catch (e) {
      return interaction.reply({ embeds: [Embed.error(t(gid, 'util.math.error', { error: e.message }))], ephemeral: true });
    }
  },
};
