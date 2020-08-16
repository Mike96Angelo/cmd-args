// tslint:disable: no-console
import {
  Arg,
  ParsedOptions,
  CommandInternal,
  Program,
  ProgramInternal,
} from './types'
import { printProgram } from './print'
import { initConfig } from './initConfig'
import { validateParsedOptions } from './validateParsedOptions'

const OPTION = /^\-\-([^=]+)(?:(=)(.*)?)?$/
const OPTION_ALIAS = /^\-([^=])(?:(=)(.*)?)?$/
const FLAGS = /^\-(.*)$/

function parseArg(arg: string): Arg[] {
  // tslint:disable: object-shorthand-properties-first
  let match = arg.match(OPTION) || arg.match(OPTION_ALIAS)
  if (match) {
    const [, key, hasValue, value] = match

    return [
      {
        type: 'option',
        key,
        value,
        hasValue: hasValue != null,
      },
    ]
  }

  match = arg.match(FLAGS)
  if (match) {
    const [, flags] = match

    return flags.split('').map((key) => ({
      type: 'flag',
      key,
    }))
  }

  return [{ type: 'argument', value: arg }]
}

function getOptionValue(
  arg: Arg,
  next: Arg | undefined,
  program: ParsedOptions
) {
  if (!arg.hasValue) {
    if (next && next.type === 'argument') {
      arg.value = next.value

      return true
    }
    throw new ParseError(
      `Option ${arg.key} must specify a value.`,
      program
    )
  }

  return false
}

export class ParseError extends Error {
  name = 'ParseError'
  program: ParsedOptions

  constructor(message: string, program: ParsedOptions) {
    super(message)
    this.program = program
  }
}

function parseArguments(
  args: Arg[],
  config: CommandInternal,
  // internal
  parsedOptions: ParsedOptions = {
    command: [config.cmd],
    options: {},
  },
  currentConfig = config,
  argumentIndex = 0,
  index = 0,
  arg = args[index],
  next = args[index + 1]
): ParsedOptions {
  if (index >= args.length) {
    return parsedOptions
  }

  let skipNext = false

  if (arg.type === 'option' || arg.type === 'flag') {
    if (currentConfig.optionsByKey != null) {
      const option = currentConfig.optionsByKey[arg.key!]
      if (option) {
        if (option.type === 'flag') {
          if (arg.hasValue) {
            throw new ParseError(
              `Flag ${arg.key} cannot specify a value.`,
              parsedOptions
            )
          }
          parsedOptions.options[option.key] = true
        } else if (arg.type === 'flag') {
          throw new ParseError(
            `Option ${option.key} cannot be used as a flag.`,
            parsedOptions
          )
        } else if (option.multi) {
          skipNext = getOptionValue(
            arg,
            next,
            parsedOptions
          )

          const array = (parsedOptions.options[option.key] =
            parsedOptions.options[option.key] || [])

          array.push(arg.value)
        } else {
          skipNext = getOptionValue(
            arg,
            next,
            parsedOptions
          )
          if (option.key in parsedOptions.options) {
            throw new ParseError(
              `Option ${option.key} does not except multiple values.`,
              parsedOptions
            )
          }
          parsedOptions.options[option.key] = arg.value
        }
      } else {
        throw new ParseError(
          `Unknown option ${arg.key}.`,
          parsedOptions
        )
      }
    } else {
      throw new ParseError(
        `Unknown option ${arg.key}.`,
        parsedOptions
      )
    }
  } else if (
    argumentIndex === 0 &&
    currentConfig.commandsByKey != null
  ) {
    const command = currentConfig.commandsByKey[arg.value!]

    if (command) {
      parsedOptions.command.push(command.cmd)

      // tslint:disable: no-parameter-reassignment
      currentConfig = command
      argumentIndex = 0
    } else if (currentConfig.arguments) {
      const argument =
        currentConfig.arguments[argumentIndex]
      if (!argument) {
        throw new ParseError(
          `Unexpected argument '${arg.value}'.`,
          parsedOptions
        )
      }
      if (argument.multi) {
        const array = (parsedOptions.options[argument.key] =
          parsedOptions.options[argument.key] || [])

        array.push(arg.value)
      } else {
        parsedOptions.options[argument.key] = arg.value
        argumentIndex += 1
      }
    } else {
      throw new ParseError(
        `Unexpected argument '${arg.value}'.`,
        parsedOptions
      )
    }
  } else if (currentConfig.arguments) {
    const argument = currentConfig.arguments[argumentIndex]
    if (!argument) {
      throw new ParseError(
        `Unexpected argument '${arg.value}'.`,
        parsedOptions
      )
    }
    if (argument.multi) {
      const array = (parsedOptions.options[argument.key] =
        parsedOptions.options[argument.key] || [])

      array.push(arg.value)
    } else {
      parsedOptions.options[argument.key] = arg.value
      argumentIndex += 1
    }
  } else {
    throw new ParseError(
      `Unexpected argument '${arg.value}'.`,
      parsedOptions
    )
  }

  return parseArguments(
    args,
    config,
    // internal
    parsedOptions,
    currentConfig,
    argumentIndex,
    index + (skipNext ? 2 : 1)
  )
}

function createArgParser(config: Program) {
  const program = initConfig(config) as ProgramInternal

  function run() {
    try {
      const args = process.argv.slice(2)
      const parsedOptions = parseArguments(
        args
          .map(parseArg)
          .reduce((acc, next) => acc.concat(next), []),
        program
      )

      if (parsedOptions.options.help) {
        console.log(printHelp(parsedOptions))
        process.exit(0)
      } else if (parsedOptions.options.version) {
        console.log(printVersion())
        process.exit(0)
      } else {
        validateParsedOptions(parsedOptions, program)
      }

      return parsedOptions
    } catch (error) {
      if (error instanceof ParseError) {
        console.log(printError(error))
        process.exit(2)
      } else {
        throw error
      }
    }
  }

  function parse(args: string[]) {
    const programArgs = parseArguments(
      args
        .map(parseArg)
        .reduce((acc, next) => acc.concat(next), []),
      program
    )

    validateParsedOptions(programArgs, program)

    return programArgs
  }

  function printError(error: ParseError) {
    return `${error.message}\n\n${
      printProgram(error.program, program).usage
    }`
  }

  function printUsage(programArgs: ParsedOptions) {
    return printProgram(programArgs, program).usage
  }

  function printHelp(programArgs: ParsedOptions) {
    return printProgram(programArgs, program).help
  }

  function printVersion() {
    return program.version
  }

  return {
    run,
    parse,
    printError,
    printUsage,
    printHelp,
    printVersion,
  }
}

export { createArgParser }
