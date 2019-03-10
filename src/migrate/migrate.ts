import { ICouchDocument } from 'bf-lib-couch'
import { stat } from 'fs-extra'

import { CouchConfig } from '../config'

export type migrateArgs = {
  config: CouchConfig
  databaseName: string
}

interface MigrationScript {
  transform: (document: ICouchDocument) => ICouchDocument
}

export async function migrate(args: migrateArgs) {
  console.log(args)
  await ensureMigrateFileExists()
  const { transform } = importMigrationScript()
  transform({ _id: '', _rev: '' })
}

function importMigrationScript(): MigrationScript {
  const migrationScript = require(`${process.cwd()}/migrate.js`)

  if (typeof migrationScript !== 'function') {
    throw new Error('The migrate.js script must export a function that returns the transform function.')
  }

  const migrationFunctions = migrationScript()

  if (!migrationFunctions || typeof migrationFunctions.transform !== 'function') {
    throw new Error('No transform function was returned from the migrate.js script')
  }

  return migrationFunctions as MigrationScript
}

async function ensureMigrateFileExists() {
  try {
    const result = await stat(`${process.cwd()}/migrate.js`)
    if (!result.isFile) {
      throw new Error('A migrate.js script is required to apply a database migration.')
    }
  } catch (e) {
    throw new Error('A migrate.js script is required to apply a database migration.')
  }
}
