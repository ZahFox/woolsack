import chalk from 'chalk'
import { Command } from '@oclif/command'

export abstract class WoolsackCommand extends Command {
  public logError(message: string) {
    this.error(chalk.red(message))
  }
}

export function logError(message: string) {
  console.error(chalk.red(message))
}

export function logVerbose(message: string) {
  console.info(chalk.yellow(message))
}
