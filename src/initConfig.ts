import { CommandInternal, Command, Program } from './types'

export function initConfig(
  rootProgram: Program,
  config: Command = rootProgram,
  previousOptionsByKey?: CommandInternal['optionsByKey']
) {
  const program: CommandInternal = {
    ...config,
    optionsByKey: previousOptionsByKey
      ? { ...previousOptionsByKey }
      : {},
    commandsByKey: {},
  }

  if (rootProgram === config) {
    if (rootProgram.help) {
      program.options = program.options || []
      program.options.unshift({
        type: 'flag',
        key: 'help',
        description: 'Prints help text for this command.',
      })
    }

    if (rootProgram.version) {
      program.options = program.options || []
      program.options.unshift({
        type: 'flag',
        key: 'version',
        description: 'Prints version of this command.',
      })
    }
  }

  if (program.options) {
    program.options.forEach((option) => {
      if (option.type === 'env' && !option.env) {
        throw new Error(
          `Option ${option.key} of type env must specify the env property.`
        )
      }

      if (option.env && option.multi) {
        throw new Error(
          `Option ${option.key} cannot specify both env and multi.`
        )
      }

      if (option.alias && option.alias.length > 1) {
        throw new Error(
          `Alias for option ${option.key} must only be 1 character.`
        )
      }

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
    })
  }

  const currentOptionsByKey = { ...program.optionsByKey }

  if (program.arguments) {
    let required = true
    let multi = false
    for (const argument of program.arguments) {
      if (argument.key in program.optionsByKey) {
        throw new Error(
          `Argument ${argument.key} conflicts with another.`
        )
      } else {
        program.optionsByKey[argument.key] = argument as any
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
    for (const command of program.commands) {
      if (program.commandsByKey[command.cmd] != null) {
        throw new Error(
          `Command ${command.cmd} conflicts with another.`
        )
      }

      program.commandsByKey[command.cmd] = initConfig(
        rootProgram,
        command,
        currentOptionsByKey
      ) as CommandInternal
    }
  }

  return program
}
