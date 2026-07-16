'use strict';

const { combineCommands } = require('../../structures/combine');

// Combined /fun command — folds the mini-games and novelty commands into
// subcommands so the whole category costs one command slot.
module.exports = combineCommands({
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
