'use strict';

const { combineCommands } = require('../../structures/combine');

// Combined /roles command — folds role management, self-assign systems and
// verification into subcommand groups. The inner `role` command is renamed to
// `manage` to avoid /roles role.
module.exports = combineCommands({
  name: 'roles',
  description: 'Role management and self-assign systems (admin)',
  category: 'roles',
  parts: [
    require('./role'),
    require('./buttonrole'),
    require('./reactionrole'),
    require('./verify'),
    require('./inrole'),
  ],
  rename: {
    role: 'manage',
    buttonrole: 'button',
    reactionrole: 'reaction',
    inrole: 'in',
  },
});
