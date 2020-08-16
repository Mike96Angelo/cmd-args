// tslint:disable: no-console
import {
  Option,
  Command,
  Argument,
  CommandInternal,
  ParsedOptions,
  ProgramInternal,
} from './types'

function printList(
  options: { option: string; description?: string }[]
) {
  const maxLength = options.reduce(
    (max, { option }) => Math.max(max, option.length),
    0
  )

  return options
    .map(
      (option) =>
        `  ${option.option.padEnd(maxLength, ' ')}  ${
          option.description || ''
        }`
    )
    .join('\n')
}

function printOption(
  option: Option<any>,
  hasAlias: boolean
) {
  const alias = hasAlias
    ? option.alias
      ? `-${option.alias}, `
      : '    '
    : ''

  const arg =
    option.type === 'option'
      ? option.multi
        ? option.required
          ? `=ARG+`
          : '[=ARG+]'
        : option.required
        ? `=ARG`
        : '[=ARG]'
      : ''

  const key = `--${option.key}${arg}`

  return `${alias}${key}`
}

function printEnv(option: Option<any>) {
  const arg = option.required ? `=ARG` : '[=ARG]'

  const env = `${option.env}${arg}`

  const key =
    option.type !== 'env' ? ` or --${option.key}` : ''

  return `${env}${key}`
}

function printOptions(cmd: Command) {
  if (
    !Array.isArray(cmd.options) ||
    cmd.options.length === 0
  ) {
    return ''
  }

  const optionStrings = []
  const options = cmd.options.filter(
    ({ type }) => type !== 'env'
  )

  if (options.length > 0) {
    const hasAlias = options.some(({ alias }) => alias)
    const optionStr = options.some(
      ({ type, required }) => required && type !== 'env'
    )
      ? 'OPTIONS'
      : '[OPTIONS]'

    optionStrings.push(
      `${cmd.cmd} ${optionStr}:\n${printList(
        options.map((option) => ({
          option: printOption(option, hasAlias),
          description: option.description,
        }))
      )}`
    )
  }

  const envs = cmd.options.filter(({ env }) => env)
  if (envs.length > 0) {
    const envStr = envs.some(({ required }) => required)
      ? 'ENV'
      : '[ENV]'

    optionStrings.push(
      `${cmd.cmd} ${envStr}:\n${printList(
        envs.map((option) => ({
          option: printEnv(option),
          description: option.description,
        }))
      )}`
    )
  }

  return `\n\n${optionStrings.join('\n\n')}`
}

function printArgument(argument: Argument<any>) {
  const arg = argument.multi
    ? argument.required
      ? `=ARG+`
      : '[=ARG+]'
    : argument.required
    ? `=ARG`
    : '[=ARG]'

  return `${argument.key}${arg}`
}

function printArguments(cmd: Command) {
  if (
    !Array.isArray(cmd.arguments) ||
    cmd.arguments.length === 0
  ) {
    return ''
  }

  const args = cmd.arguments.some(
    ({ required }) => required
  )
    ? 'ARGUMENTS'
    : '[ARGUMENTS]'

  return `\n\n${args}:\n${printList(
    cmd.arguments.map((argument) => ({
      option: printArgument(argument),
      description: argument.description,
    }))
  )}`
}

function printCMDs(cmd: Command) {
  if (
    !Array.isArray(cmd.commands) ||
    cmd.commands.length === 0
  ) {
    return ''
  }

  const args = cmd.commandRequired ? 'CMD' : '[CMD]'

  return `\n\n${args}:\n${printList(
    cmd.commands.map((command) => ({
      option: command.cmd,
      description: command.description,
    }))
  )}`
}

export function printProgram(
  parsedOptions: ParsedOptions,
  program: ProgramInternal
) {
  const cmds: CommandInternal[] = []

  const parts: string[] = []

  let currentConfig: CommandInternal | undefined = program
  let lastConfig: CommandInternal = program
  let index = 1
  while (currentConfig) {
    cmds.unshift(currentConfig)
    const options =
      currentConfig.options &&
      currentConfig.options.length > 0
        ? currentConfig.options.some(
            ({ required }) => required
          )
          ? 'OPTIONS'
          : '[OPTIONS]'
        : undefined

    parts.push(
      options
        ? `${currentConfig.cmd} ${options}`
        : currentConfig.cmd
    )

    lastConfig = currentConfig
    currentConfig =
      currentConfig.commandsByKey &&
      currentConfig.commandsByKey[
        parsedOptions.command[index]
      ]
    index += 1
  }

  let usage = parts.join(' ')
  const usageStrings: string[] = []

  let argumentStr: string | undefined

  if (
    !lastConfig.commandRequired &&
    (!lastConfig.arguments ||
      lastConfig.arguments.length === 0)
  ) {
    usageStrings.push(usage)
  }

  if (program.help) {
    usageStrings.push(`${usage} --help`)
  }

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

    usageStrings.push(`${usage} ${argumentStr}`)
  }

  if (
    lastConfig.commands &&
    lastConfig.commands.length > 0
  ) {
    const cmdStr = lastConfig.commandRequired
      ? 'CMD'
      : '[CMD]'

    usageStrings.push(`${usage} ${cmdStr}`)
  }

  usage = `Usage:\n${usageStrings
    .map((str) => `  ${str}`)
    .join('\n  OR\n')}`

  usage = lastConfig.title
    ? lastConfig.description
      ? `${lastConfig.title}\n\n${lastConfig.description}\n\n${usage}`
      : `${lastConfig.title}\n\n${usage}`
    : lastConfig.description
    ? `${lastConfig.description}\n\n${usage}`
    : usage

  return {
    usage,
    title: lastConfig.title,
    help: `${usage}${cmds
      .map(printOptions)
      .join('')}${printArguments(lastConfig)}${printCMDs(
      lastConfig
    )}`,
  }
}
