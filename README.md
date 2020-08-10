# cmd-args

[![GitHub release](https://img.shields.io/github/release/Mike96angelo/cmd-args.svg?maxAge=21600)](https://github.com/Mike96Angelo/cmd-args)
[![npm version](https://img.shields.io/npm/v/cmd-args.svg?maxAge=21600)](https://www.npmjs.com/package/cmd-args)
[![npm downloads](https://img.shields.io/npm/dm/cmd-args.svg?maxAge=604800)](https://www.npmjs.com/package/cmd-args)
[![npm downloads](https://img.shields.io/npm/dt/cmd-args.svg?maxAge=604800)](https://www.npmjs.com/package/cmd-args)

A simple command-line argument parser for NodeJS command-line tools.

Install:

```
$ npm install cmd-args
```

example:

```typescript
import { createArgParser } from 'cmd-args'

const  myParser = createArgParser({
  cmd: 'my-cmd',
  title: 'My CMD',
  description: 'my-cmd description...',
  options: [
    {
      type: 'flag',
      key: 'verbose',
      alias: 'V',
      description: 'Enable verbose mode.'
    },
    {
      type: 'option',
      key: 'output-file',
      alias: 'o',
      description: 'Specifies location to write the output file. If not set the output will go to stdout.'
    }
  ],
  arguments: [
    {
      key: 'input-files',
      description: 'List of input files to be used.'
      multi: true,
      required: true
    }
  ]
});

var program = myParser.parse(process.argv.slice(2));

console.log(JSON.stringify(program), null, 2))
```

example run:

```bash
$ my-cmd file1 file2
```

outputs:

```json
{
  "cmd": "my-cmd",
  "options": {
    "verbose": false,
    "input-files": ["file1", "file2"]
  }
}
```

example run:

```bash
$ my-cmd file1 file2 -o file-out
```

outputs:

```json
{
  "cmd": "my-cmd",
  "options": {
    "verbose": false,
    "input-files": ["file1", "file2"],
    "output-file": "file-out"
  }
}
```

example run:

```bash
$ my-cmd file1 file2 --output-file file-out
```

outputs:

```json
{
  "cmd": "my-cmd",
  "options": {
    "verbose": false,
    "input-files": ["file1", "file2"],
    "output-file": "file-out"
  }
}
```

example run:

```bash
$ my-cmd -v file1 file2 --output-file file-out
```

outputs:

```json
{
  "cmd": "my-cmd",
  "options": {
    "verbose": true,
    "input-files": ["file1", "file2"],
    "output-file": "file-out"
  }
}
```
