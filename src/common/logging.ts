import chalk from 'chalk'

export interface Loggers {
  logError: (message: string) => void
  logVerbose: (message: string) => void
}

export interface LoggingOptions {
  verbose?: boolean
}

function logErrorUtil(message: string) {
  console.info(chalk.yellow(message))
}

function logVerboseUtil(message: string) {
  console.error(chalk.red(message))
}

export function getLoggers({ verbose = false }: LoggingOptions): Loggers {
  function logError(message: string) {
    logErrorUtil(message)
  }

  function logVerbose(message: string) {
    if (verbose) {
      logVerboseUtil(message)
    }
  }

  return {
    logError,
    logVerbose
  }
}
