'use strict';

/** Tiny colorized console logger with timestamps. */
const c = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function stamp() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function log(color, tag, ...args) {
  console.log(`${c.gray}${stamp()}${c.reset} ${color}[${tag}]${c.reset}`, ...args);
}

module.exports = {
  info: (...a) => log(c.cyan, 'INFO', ...a),
  success: (...a) => log(c.green, 'OK', ...a),
  warn: (...a) => log(c.yellow, 'WARN', ...a),
  error: (...a) => log(c.red, 'ERROR', ...a),
  debug: (...a) => process.env.NODE_ENV !== 'production' && log(c.blue, 'DEBUG', ...a),
};
