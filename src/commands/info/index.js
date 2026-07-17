'use strict';

const { combineCommands } = require('../../structures/combine');

// Combined /info command — folds the individual lookup commands into subcommands
// so the whole category costs one slot of Discord's 100-command limit.
module.exports = combineCommands({
  name: 'info',
  description: 'Look up server, user, role, channel and bot information',
  category: 'info',
  parts: [
    require('./userinfo'),
    require('./avatar'),
    require('./serverinfo'),
    require('./servericon'),
    require('./roleinfo'),
    require('./channelinfo'),
    require('./membercount'),
    require('./botinfo'),
  ],
  rename: {
    userinfo: 'user',
    serverinfo: 'server',
    servericon: 'icon',
    roleinfo: 'role',
    channelinfo: 'channel',
    membercount: 'members',
    botinfo: 'bot',
  },
});
