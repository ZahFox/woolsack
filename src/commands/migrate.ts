import { flags } from '@oclif/command'

import { isString, WoolsackCommand } from '../common'
import { CouchConfig, Environment, getConfig, getEnv } from '../config'
import { migrate } from '../migrate'

export default class Migrate extends WoolsackCommand {
  public static description = 'use a function to update a set of documents'

  public static examples = [`$ woolsack migrate -d test-database`]

  public static flags = {
    help: flags.help({ char: 'h' }),
    databaseName: flags.string({ char: 'd', description: 'the database that the migration will be applied to' })
  }

  public static args = []

  public async run() {
    try {
      const { flags: runtimeFlags } = this.parse(Migrate)

      if (!isString(runtimeFlags.databaseName)) {
        this.logError('A database name is required to run a migration')
      }

      const databaseName = runtimeFlags.databaseName as string
      const env: Environment = getEnv()
      const config: CouchConfig = getConfig()
      await migrate({ config, databaseName, env })
    } catch (e) {
      this.logError(e.message)
    }
  }
}
