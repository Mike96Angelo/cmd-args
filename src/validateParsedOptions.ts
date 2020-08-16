import { CommandInternal, ParsedOptions } from './types'
import { ParseError } from './cmd-args'

export function validateParsedOptions(
  parsedOptions: ParsedOptions,
  config: CommandInternal,
  index = 1
) {
  if (config.options) {
    for (const option of config.options) {
      let arg = parsedOptions.options[option.key]

      if (arg != null) {
        arg = parsedOptions.options[
          option.key
        ] = option.parse
          ? option.multi
            ? arg.map(option.parse)
            : option.parse(arg)
          : arg
      } else if (option.env) {
        arg = process.env[option.env]
        parsedOptions.options[option.key] = option.parse
          ? option.parse(arg)
          : arg
      } else if (option.type === 'flag') {
        arg = parsedOptions.options[option.key] = false
      }

      if (arg == null) {
        if (option.required) {
          throw new ParseError(
            option.type === 'env'
              ? `Missing required env var ${option.env}`
              : `Missing required option ${option.key}.`,
            parsedOptions
          )
        } else {
          parsedOptions.options[option.key] = option.default
        }
      }
    }
  }

  if (config.arguments) {
    for (const argument of config.arguments) {
      const arg = parsedOptions.options[argument.key]

      if (arg != null) {
        parsedOptions.options[argument.key] =
          arg != null && argument.parse
            ? argument.multi
              ? arg.map(argument.parse)
              : argument.parse(arg)
            : arg
      } else if (argument.required) {
        throw new ParseError(
          `Missing required argument ${argument.key}.`,
          parsedOptions
        )
      } else {
        parsedOptions.options[argument.key] =
          argument.default
      }
    }
  }

  if (index === parsedOptions.command.length) {
    return
  }

  const cmd = config.commandsByKey
    ? config.commandsByKey[parsedOptions.command[index]]
    : undefined

  validateParsedOptions(parsedOptions, cmd!, index + 1)
}
