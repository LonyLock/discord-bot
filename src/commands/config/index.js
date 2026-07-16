'use strict';

const { combineCommands } = require('../../structures/combine');

// Combined /config command — folds the server-administration commands into
// subcommand groups (each former command keeps its own subcommands). The inner
// `config` command is renamed to `server` to avoid /config config.
module.exports = combineCommands({
  name: 'config',
  description: 'Server administration and configuration (admin)',
  category: 'config',
  parts: [
    require('./config'),
    require('./automod'),
    require('./antiraid'),
    require('./autoresponder'),
    require('./command-toggle'),
    require('./counting'),
    require('./logignore'),
    require('./sticky'),
    require('./language'),
    require('./suggestion'),
  ],
  rename: {
    config: 'server',
  },
});
