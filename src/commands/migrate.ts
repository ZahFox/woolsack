import { flags } from '@oclif/command'

import { isString, WoolsackCommand } from '../common'
import { CouchConfig, Environment, getConfig, getEnv } from '../config'
import { migrate } from '../migrate'

export default class Migrate extends WoolsackCommand {
  static description = 'use a function to update a set of documents'

  static examples = [`$ woolsack migrate -d test-database`]

  static flags = {
    help: flags.help({ char: 'h' }),
    databaseName: flags.string({ char: 'd', description: 'the database that the migration will be applied to' })
  }

  static args = []

  async run() {
    try {
      const { flags } = this.parse(Migrate)

      if (!isString(flags.databaseName)) {
        this.logError('A database name is required to run a migration')
      }

      const databaseName = flags.databaseName as string
      const env: Environment = getEnv()
      const config: CouchConfig = getConfig()
      await migrate({ config, databaseName, env })
    } catch (e) {
      this.logError(e.message)
    }
  }
}
