import chalk from 'chalk'
import { Command } from '@oclif/command'

export abstract class WoolsackCommand extends Command {
  public logError(message: string) {
    this.error(chalk.red(message))
  }
}
