'use strict';

const { combineCommands } = require('../../structures/combine');
const { anywhere } = require('../../structures/appcontexts');

// Combined /fun command — folds the mini-games and novelty commands into
// subcommands so the whole category costs one command slot. User-installable so
// the games work in any server or DM.
const command = combineCommands({
  name: 'fun',
  description: 'Mini-games and novelty commands',
  category: 'fun',
  parts: [
    require('./8ball'),
    require('./coinflip'),
    require('./dice'),
    require('./rps'),
    require('./guess'),
    require('./trivia'),
    require('./wouldyourather'),
    require('./choose'),
    require('./ship'),
    require('./mock'),
    require('./reverse'),
    require('./joke'),
    require('./meme'),
    require('./fact'),
  ],
});

anywhere(command.data);
module.exports = command;
