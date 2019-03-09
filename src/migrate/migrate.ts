import { CouchConfig } from '../config'

export type migrateArgs = {
  config: CouchConfig
  databaseName: string
}

export async function migrate(args: migrateArgs) {
  console.log(args)
}
