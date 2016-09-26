#!/usr/bin/env node

var cmdArgs = require('cmd-args').create([
//  [<alias>, <flag>, <description>]
    ['h',  'help',               'Displays the help for this program.'],
    ['f',  'firstname=ARG',      'Required firstname arg.'            ],
    ['l',  'lastname[=ARG]',     'Optional lastname arg.'             ],
    ['m',  'middlename[=ARG+]',  'Optional multiple middlename args.' ],
    ['v',  'verbose',            'Verbose boolean flag.'              ],
    [null, 'quite',              'Quite boolean flag no alias.'       ],
]);

var CMD_ARGS = cmdArgs.parse(process.argv.slice(2));

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

// do stuff here
