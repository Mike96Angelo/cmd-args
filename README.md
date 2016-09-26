# cmd-args v1.0.0
A simple command-line argument parser for NodeJS command-line tools.

Install:
```
$ npm install cmd-args
```

example (my-program.js):

```javascript
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

if (CMD_ARGS.options.help) { // show help and exit
    console.log('\nUsage: my-program <flags>');
    console.log('\nFlags:');
    console.log(cmdArgs.help());
    process.exit(0);
}

console.log(CMD_ARGS);
```

Terminal:
```
$ node my-program --help

Usage: my-program <flags>

Flags:
    -h, --help                 Displays the help for this program.
    -f, --firstname=ARG        Required firstname arg.
    -l, --lastname[=ARG]       Optional lastname arg.
    -m, --middlename[=ARG+]    Optional multiple middlename args.
    -v, --verbose              Verbose boolean flag.
        --quite                Quite boolean flag no alias.
        

$ node my-program
{
  argv: [],
  options: {},
  error: [Error: Missing required option: -f, --firstname]
}

$ node my-program --firstname
{
  argv: [],
  options: {},
  error: [Error: Invalid value supplied: -f, --firstname]
}

$ node my-program --firstname John
{
  argv: [],
  options: {
    firstname: 'John'
  },
  error: null
}

$ node my-program -f John
{
  argv: [],
  options: {
    firstname: 'John'
  },
  error: null
}

$ node my-program test -f John
{
  argv: ['test'],
  options: {
    firstname: 'John'
  },
  error: null
}

$ node my-program test -f John -m Jim
{
  argv: ['test'],
  options: {
    firstname: 'John',
    middlename: ['Jim']
  },
  error: null
}

$ node my-program test -f John -m Jim -m Joe
{
  argv: ['test'],
  options: {
    firstname: 'John',
    middlename: ['Jim', 'Joe']
  },
  error: null
}

$ node my-program test -f John -m Jim -m Joe -l Doe
{
  argv: ['test'],
  options: {
    firstname: 'John',
    middlename: ['John', 'Jim'],
    lastname: 'Doe'
  },
  error: null
}

$ node my-program test -f John -m Jim -m Joe -l Doe -l Bob
{
  argv: ['test'],
  options: {
    firstname: 'John',
    middlename: ['John', 'Jim'],
    lastname: 'Doe'
  },
  error: [Error: Flag already set: -l, --lastname]
}

$ node my-program test -fmml John Jim Joe Doe
{
  argv: ['test'],
  options: {
    firstname: 'John',
    middlename: ['John', 'Jim'],
    lastname: 'Doe'
  },
  error: null
}

$ node my-program test -vfmml John Jim Joe Doe
{
  argv: ['test'],
  options: {
    verbose: true,
    firstname: 'John',
    middlename: ['John', 'Jim'],
    lastname: 'Doe'
  },
  error: null
}

$ node my-program test -fmml John Jim Joe Doe --quite
{
  argv: ['test'],
  options: {
    firstname: 'John',
    middlename: ['John', 'Jim'],
    lastname: 'Doe',
    quite: true
  },
  error: null
}
```
