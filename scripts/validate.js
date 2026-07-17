'use strict';

/**
 * CI / pre-flight validation — no Discord token required.
 * Verifies every command loads, builds a valid slash-command payload, has a
 * unique name and an execute() function, and that every event/service loads.
 *
 *   npm run validate
 */

const path = require('node:path');
const { loadCommands, walk } = require('../src/structures/loaders');

let errors = 0;
const fail = (...m) => { console.error('  ✗', ...m); errors++; };

const client = {};
const commands = loadCommands(client);
const names = new Set();
for (const [name, cmd] of commands) {
  try {
    const json = cmd.data.toJSON();
    if (names.has(json.name)) fail(`duplicate command name: ${json.name}`);
    names.add(json.name);
    if (typeof cmd.execute !== 'function') fail(`${name}: missing execute()`);
    if (!cmd.category) fail(`${name}: missing category`);
  } catch (e) {
    fail(`${name}: failed to build — ${e.message}`);
  }
}
console.log(`Commands: ${commands.size} loaded, ${names.size} unique names.`);

const ctxNames = new Set();
for (const [name, cmd] of client.contextMenus) {
  try {
    cmd.data.toJSON();
    if (ctxNames.has(name)) fail(`duplicate context-menu name: ${name}`);
    ctxNames.add(name);
    if (typeof cmd.execute !== 'function') fail(`context ${name}: missing execute()`);
  } catch (e) {
    fail(`context ${name}: failed to build — ${e.message}`);
  }
}
console.log(`Context menus: ${client.contextMenus.size} loaded.`);

const events = walk(path.join(__dirname, '..', 'src', 'events'));
for (const f of events) {
  try {
    const ev = require(f);
    if (!ev.name || typeof ev.execute !== 'function') fail(`${path.basename(f)}: invalid event export`);
  } catch (e) {
    fail(`${path.basename(f)}: ${e.message}`);
  }
}
console.log(`Events: ${events.length} loaded.`);

for (const s of ['tickets', 'giveaways', 'scheduler', 'help', 'music']) {
  try { require(`../src/services/${s}`); }
  catch (e) { fail(`service ${s}: ${e.message}`); }
}
try { require('../src/dashboard/server'); }
catch (e) { fail(`dashboard: ${e.message}`); }
console.log('Services + dashboard: loaded.');

if (errors) {
  console.error(`\n❌ Validation failed with ${errors} error(s).`);
  process.exit(1);
}
console.log('\n✅ All checks passed.');
process.exit(0);
