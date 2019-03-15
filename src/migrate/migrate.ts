import {
  CouchFactory,
  ICouchDocument,
  ICouchProvider,
  IDocId,
  IFindResults,
  IMangoSelector,
  MockProvider
} from 'bf-lib-couch'
import { fork } from 'cluster'
import { stat } from 'fs-extra'

import { isAnEmptyArray, isArray } from '../common'
import { CouchConfig, Environment } from '../config'
import { configureMaster, configureWorker } from './migrationMaster'

export interface MigrateArgs {
  env: Environment
  config: CouchConfig
  databaseName: string
}

export interface MigrationGroup {
  startId: string
  endId: string
  idList: string[]
}

export interface BeginMigrationArgs {
  idList: IDocId[]
  transform: (document: ICouchDocument) => ICouchDocument
}

interface MigrationScript {
  transform: (document: ICouchDocument) => ICouchDocument
  selector: () => IMangoSelector
}

export async function migrate(args: MigrateArgs) {
  const provider = await getCouchProvider(args)
  const { transform, selector } = await importMigrationScript()
  const idList: IDocId[] = await getIdList(provider, selector())

  if (isAnEmptyArray(idList)) {
    throw new Error('No documents were found using the provided Mango selector.')
  }

  await beginMigration({ idList, transform }, args)
}

/* ~~~ Functions for applying the migration ~~~ */

async function beginMigration(args: BeginMigrationArgs, migrationArgs: MigrateArgs) {
  const { beginMigration: migrationTrigger, handleIncomingMessage } = configureMaster(args, migrationArgs)
  const worker = fork('./migrationWorker')
  configureWorker(worker, handleIncomingMessage)
  await migrationTrigger()
}

/* ~~~ Functions for handling the migration script ~~~ */

async function importMigrationScript(): Promise<MigrationScript> {
  await ensureMigrationScriptExists()
  const migrationScript = require(`${process.cwd()}/migrate.js`)

  if (typeof migrationScript !== 'function') {
    throw new Error('The migrate.js script must export a function that returns the transform and selector functions.')
  }

  const migrationFunctions = migrationScript()

  if (!migrationFunctions || typeof migrationFunctions.transform !== 'function') {
    throw new Error('No transform function was returned from the migrate.js script')
  }

  if (typeof migrationFunctions.selector !== 'function') {
    throw new Error('No selector function was returned from the migrate.js script')
  }

  return migrationFunctions as MigrationScript
}

async function ensureMigrationScriptExists() {
  try {
    const result = await stat(`${process.cwd()}/migrate.js`)
    if (!result.isFile) {
      throw new Error('A migrate.js script is required to apply a database migration.')
    }
  } catch (e) {
    throw new Error('A migrate.js script is required to apply a database migration.')
  }
}

/* ~~~ Functions for interacting with CouchDB providers from bf-lib-couch ~~~ */

async function getCouchProvider({ env, databaseName }: MigrateArgs): Promise<ICouchProvider> {
  switch (env) {
    case Environment.PRODUCTION:
      const factory = new CouchFactory()
      const realProvider = await factory.create(databaseName)
      return realProvider
    case Environment.TEST:
      const mockProvider = new MockProvider()
      return mockProvider
  }
}

async function getIdList(provider: ICouchProvider, selector: IMangoSelector): Promise<IDocId[]> {
  try {
    const results: IFindResults = await provider.getBulkTool().getIdList(selector)

    if (!results || !isArray(results.docs) || isAnEmptyArray(results.docs)) {
      return []
    }

    return results.docs
  } catch (e) {
    return []
  }
}

/**
 * This is only intended to be used for unit tests
 */
export function getUtilsForTesting() {
  return {
    getCouchProvider,
    getIdList
  }
}
