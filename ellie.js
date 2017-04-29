#!/usr/bin/env node

var ellie = new(require('./lib/Elizabeth').Elizabeth);

var command = null;
if (process.argv.length > 2) {
  command = process.argv[2];
}

if (command == 'init') {
  ellie.startInit();
} else if (command == 'show') {
  ellie.showProfile();
} else if (command == 'export') {
  ellie.startExport();
} else {
  ellie.printHelp();
}
