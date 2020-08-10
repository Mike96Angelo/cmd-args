interface Argument<V> {
  key: string
  description?: string
  multi?: boolean
  required?: boolean
  default?: V
  parse?: (val: string) => V
}

interface Option<V> extends Argument<V> {
  type: 'option' | 'flag'
  alias?: string
}

interface Command {
  cmd: string
  title?: string
  description?: string
  example?: string
  help?: boolean
  version?: string
  options?: Option<any>[]
  commands?: Command[]
  commandRequired?: boolean
  arguments?: Argument<any>[]
}

interface Program extends Command {
  parseOnly?: boolean
}

interface CommandInternal extends Command {
  optionsByKey?: Record<string, Option<any>>
  commandsByKey?: Record<string, CommandInternal>
}

interface Arg {
  type: 'argument' | 'option' | 'flag'
  key?: string
  hasValue?: boolean
  value?: string
}

interface CommandArgs {
  cmd: string
  options: Record<string, any>
  command?: CommandArgs
}

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
  program: CommandArgs
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

class ParseError extends Error {
  name = 'ParseError'
  program: CommandArgs

  constructor(message: string, program: CommandArgs) {
    super(message)
    this.program = program
  }
}

function parseArguments(
  args: Arg[],
  config: CommandInternal,
  // internal
  programArgs: CommandArgs = {
    cmd: config.cmd,
    options: {},
  },
  commandArgs = programArgs,
  currentConfig = config,
  argumentIndex = 0,
  index = 0,
  arg = args[index],
  next = args[index + 1]
): CommandArgs {
  if (index >= args.length) {
    return programArgs
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
              programArgs
            )
          }
          commandArgs.options[option.key] = true
        } else if (arg.type === 'flag') {
          throw new ParseError(
            `Option ${option.key} cannot be used as a flag.`,
            programArgs
          )
        } else if (option.multi) {
          skipNext = getOptionValue(arg, next, programArgs)

          const array = (commandArgs.options[option.key] =
            commandArgs.options[option.key] || [])

          array.push(arg.value)
        } else {
          skipNext = getOptionValue(arg, next, programArgs)
          if (option.key in commandArgs.options) {
            throw new ParseError(
              `Option ${option.key} does not except multiple values.`,
              programArgs
            )
          }
          commandArgs.options[option.key] = arg.value
        }
      } else {
        throw new ParseError(
          `Unknown option ${arg.key}.`,
          programArgs
        )
      }
    } else {
      throw new ParseError(
        `Unknown option ${arg.key}.`,
        programArgs
      )
    }
  } else if (
    argumentIndex === 0 &&
    currentConfig.commandsByKey != null
  ) {
    const command = currentConfig.commandsByKey[arg.value!]

    if (command) {
      commandArgs.command = {
        cmd: command.cmd,
        options: {},
      }

      // tslint:disable: no-parameter-reassignment
      commandArgs = commandArgs.command
      currentConfig = command
      argumentIndex = 0
    } else if (currentConfig.arguments) {
      const argument =
        currentConfig.arguments[argumentIndex]
      if (!argument) {
        throw new ParseError(
          `Unexpected argument '${arg.value}'.`,
          programArgs
        )
      }
      if (argument.multi) {
        const array = (commandArgs.options[argument.key] =
          commandArgs.options[argument.key] || [])

        array.push(arg.value)
      } else {
        commandArgs.options[argument.key] = arg.value
        argumentIndex += 1
      }
    } else {
      throw new ParseError(
        `Unexpected argument '${arg.value}'.`,
        programArgs
      )
    }
  } else if (currentConfig.arguments) {
    const argument = currentConfig.arguments[argumentIndex]
    if (!argument) {
      throw new ParseError(
        `Unexpected argument '${arg.value}'.`,
        programArgs
      )
    }
    if (argument.multi) {
      const array = (commandArgs.options[argument.key] =
        commandArgs.options[argument.key] || [])

      array.push(arg.value)
    } else {
      commandArgs.options[argument.key] = arg.value
      argumentIndex += 1
    }
  } else {
    throw new ParseError(
      `Unexpected argument '${arg.value}'.`,
      programArgs
    )
  }

  return parseArguments(
    args,
    config,
    // internal
    programArgs,
    commandArgs,
    currentConfig,
    argumentIndex,
    index + (skipNext ? 2 : 1)
  )
}

function validateProgramArgs(
  programArgs: CommandArgs,
  config: CommandInternal
) {
  if (config.options) {
    for (const option of config.options) {
      const arg = programArgs.options[option.key]

      if (arg != null) {
        programArgs.options[option.key] = option.parse
          ? option.multi
            ? arg.map(option.parse)
            : option.parse(arg)
          : arg
      } else if (option.required) {
        throw new ParseError(
          `Missing required option ${option.key}.`,
          programArgs
        )
      } else if (option.type === 'flag') {
        programArgs.options[option.key] = false
      } else {
        programArgs.options[option.key] = option.default
      }
    }
  }

  if (config.arguments) {
    for (const argument of config.arguments) {
      const arg = programArgs.options[argument.key]

      if (arg != null) {
        programArgs.options[argument.key] =
          arg != null && argument.parse
            ? argument.multi
              ? arg.map(argument.parse)
              : argument.parse(arg)
            : arg
      } else if (argument.required) {
        throw new ParseError(
          `Missing required argument ${argument.key}.`,
          programArgs
        )
      } else {
        programArgs.options[argument.key] = argument.default
      }
    }
  }

  if (programArgs.command) {
    const cmd = config.commandsByKey
      ? config.commandsByKey[programArgs.command.cmd]
      : undefined

    if (cmd == null) {
      throw new Error(`This should never happen.`)
    }

    validateProgramArgs(programArgs.command, cmd)
  }
}

function initConfig(config: Command) {
  const program: CommandInternal = { ...config }

  let optionsByKey = {}

  if (program.options) {
    program.optionsByKey = {}
    for (const option of program.options) {
      if (option.key in program.optionsByKey) {
        throw new Error(
          `Option ${option.key} conflicts with another.`
        )
      }

      program.optionsByKey[option.key] = option

      if (option.alias != null) {
        if (option.alias in program.optionsByKey) {
          throw new Error(
            `Option ${option.alias} conflicts with another.`
          )
        }

        program.optionsByKey[option.alias] = option
      }
    }
    optionsByKey = { ...program.optionsByKey }
  }

  if (program.arguments) {
    let required = true
    let multi = false
    for (const argument of program.arguments) {
      if (argument.key in optionsByKey) {
        throw new Error(
          `Argument ${argument.key} conflicts with another.`
        )
      } else {
        optionsByKey[argument.key] = argument
      }
      if (required) {
        if (!argument.required) {
          required = false
        }
      } else if (argument.required) {
        throw new Error(
          `Required argument ${argument.key} cannot follow an optional argument.`
        )
      }

      if (multi) {
        throw new Error(
          `Argument ${argument.key} cannot follow a multi-argument.`
        )
      } else {
        if (argument.multi) {
          multi = true
        }
      }
    }
  }

  if (program.commands) {
    program.commandsByKey = {}
    for (const command of program.commands) {
      if (program.commandsByKey[command.cmd] != null) {
        throw new Error(
          `Command ${command.cmd} conflicts with another.`
        )
      }

      program.commandsByKey[command.cmd] = initConfig(
        command
      ) as CommandInternal
    }
  }

  return program
}

function createArgParser(config: Program) {
  const program = initConfig(config)

  function parse(args: string[]) {
    const programArgs = parseArguments(
      args
        .map(parseArg)
        .reduce((acc, next) => acc.concat(next), []),
      program
    )

    validateProgramArgs(programArgs, program)

    return programArgs
  }

  function printError(error: ParseError) {
    return `${error.message}\n\n${printUsage(
      error.program
    )}`
  }

  function printUsage(programArgs: CommandArgs) {
    let currentArgs: CommandArgs | undefined = programArgs
    let currentConfig: CommandInternal | undefined = program
    let lastConfig: CommandInternal = currentConfig

    const parts: string[] = []

    while (currentArgs && currentConfig) {
      lastConfig = currentConfig
      parts.push(
        lastConfig.options
          ? `${currentArgs.cmd} [OPTIONS]`
          : currentArgs.cmd
      )

      currentConfig =
        currentConfig.commandsByKey && currentArgs.command
          ? currentConfig.commandsByKey[
              currentArgs.command.cmd
            ]
          : undefined
      currentArgs = currentArgs.command
    }

    let usage = parts.join(' ')

    let argumentStr: string | undefined

    if (lastConfig.arguments) {
      const requiredArgs = lastConfig.arguments
        .filter(({ required }) => required)
        .map(({ key, multi }) =>
          multi ? `<${key}>...` : `<${key}>`
        )
        .join(' ')

      const optionalArgs = lastConfig.arguments
        .filter(({ required }) => !required)
        .map(({ key, multi }) =>
          multi ? `<${key}>...` : `<${key}>`
        )
        .join(' ')

      argumentStr = requiredArgs
        ? optionalArgs
          ? `${requiredArgs} [${optionalArgs}]`
          : requiredArgs
        : undefined
    }

    const cmdStr = lastConfig.commandRequired
      ? 'CMD'
      : '[CMD]'

    usage = argumentStr
      ? lastConfig.commands
        ? `Usage:\n  ${usage} ${argumentStr}\n  OR\n  ${usage} ${cmdStr}`
        : `Usage:\n  ${usage} ${argumentStr}`
      : lastConfig.commands
      ? `Usage:\n  ${usage} ${cmdStr}`
      : `Usage:\n  ${usage}`

    usage = lastConfig.title
      ? lastConfig.description
        ? `${lastConfig.title}\n\n${lastConfig.description}\n\n${usage}`
        : `${lastConfig.title}\n\n${usage}`
      : lastConfig.description
      ? `${lastConfig.description}\n\n${usage}`
      : usage

    return usage
  }

  function printHelp(programArgs: CommandArgs) {
    return printUsage(programArgs)
  }

  return { parse, printError, printUsage, printHelp }
}

export { createArgParser }
