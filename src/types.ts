export interface Argument<V> {
  key: string
  description?: string
  multi?: boolean
  required?: boolean
  default?: V
  parse?: (val: string) => V
}

export interface Option<V> extends Argument<V> {
  type: 'option' | 'flag' | 'env'
  env?: string
  alias?: string
}

export interface Command {
  cmd: string
  title?: string
  description?: string
  example?: string
  options?: Option<any>[]
  commands?: Command[]
  commandRequired?: boolean
  arguments?: Argument<any>[]
  run?: (options: Record<string, any>) => void
}

export interface Program extends Command {
  help?: boolean
  version?: string
}

export interface CommandInternal extends Command {
  optionsByKey: Record<string, Option<any>>
  commandsByKey: Record<string, CommandInternal>
}

export interface ProgramInternal
  extends Program,
    CommandInternal {}

export interface Arg {
  type: 'argument' | 'option' | 'flag'
  key?: string
  hasValue?: boolean
  value?: string
}

export interface ParsedOptions {
  command: string[]
  options: Record<string, any>
}
