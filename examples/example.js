#!/usr/bin/env node

var cmdArgs = require('cmd-args').create([
    ['h', 'help',         'Displays the help screen.'],
    ['r', 'red[=ARG+]',   'Colors the output red.'],
    ['g', 'green',        'Colors the output green.'],
    ['b', 'blue',         'Colors the output blue.'],
]);

var CMD_ARGS = cmdArgs.parse(process.argv.slice(2));

console.log(CMD_ARGS);

if (!CMD_ARGS.argv.length || CMD_ARGS.options.help) { // show help and exit
    console.log('\nUsage: <program> <flags> <filepath>');
    console.log('\nFlags:');
    console.log(cmdArgs.help());
    process.exit(0);
}

if (CMD_ARGS.error) { // show arg error and exit
    console.error(CMD_ARGS.error);
    process.exit(0);
}
