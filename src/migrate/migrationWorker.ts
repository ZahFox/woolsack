import {
  CouchFactory,
  ICouchDocument,
  ICouchProvider,
  MockProvider,
  IFetchResponse,
  BulkUpdateResponseList
} from 'bf-lib-couch'
import { ensureFile, writeJSON } from 'fs-extra'
import * as jiff from 'jiff'

import { isFunction, waitUntilApplicationExits } from '../common'
import { Environment } from '../config'
import { MigrateArgs } from './migrate'
import { WorkerProcessMessageType, ChunkConfig } from './migrationMaster'

/* ~~~ Master Message Types ~~~ */

export enum MasterProcessMessageType {
  STOP = 'STOP',
  RECIEVE_CHUNK = 'RECIEVE_CHUNK',
  RECIEVE_MIGRATION_ARGS = 'RECIEVE_MIGRATION_ARGS',
  RECIEVE_TRANSFORM = 'RECIEVE_TRANSFORM'
}

interface MasterProcessMessage<T> {
  type: MasterProcessMessageType
  data: T
}

interface RecieveStopMessage extends MasterProcessMessage<void> {
  type: MasterProcessMessageType.STOP
}

interface RecieveChunkMessage extends MasterProcessMessage<ChunkConfig> {
  type: MasterProcessMessageType.RECIEVE_CHUNK
}

interface RecieveMigrationArgsMessage extends MasterProcessMessage<MigrateArgs> {
  type: MasterProcessMessageType.RECIEVE_MIGRATION_ARGS
}

interface RecieveTransformMessage extends MasterProcessMessage<string> {
  type: MasterProcessMessageType.RECIEVE_TRANSFORM
}

type IcomingMessage = RecieveStopMessage | RecieveChunkMessage | RecieveMigrationArgsMessage | RecieveTransformMessage

type TransformFunction = (document: ICouchDocument) => ICouchDocument

interface Worker {
  provider: ICouchProvider | null
  transform: TransformFunction | null
}

const worker: Worker = {
  provider: null,
  transform: null
}

configureWorker()

async function configureWorker() {
  process.on('message', (message: IcomingMessage) => handleIncomingMessage(message))
  await waitUntilApplicationExits()
}

function handleIncomingMessage({ type, data }: IcomingMessage) {
  switch (type) {
    case MasterProcessMessageType.STOP:
      return handleStop()
    case MasterProcessMessageType.RECIEVE_CHUNK:
      return handleRecieveChunk(data as ChunkConfig)
    case MasterProcessMessageType.RECIEVE_MIGRATION_ARGS:
      return handleRecieveMigrationArgs(data as MigrateArgs)
    case MasterProcessMessageType.RECIEVE_TRANSFORM:
      return handleRecieveTransform(data as string)
    default:
      throw new Error(`${type} is not a valid master process message type`)
  }
}

function handleStop() {
  sendMessage(WorkerProcessMessageType.PROCESS_FINISHED)
  process.exit(0)
}

// TODO: Add error handling to this
async function handleRecieveChunk({ index, ids }: ChunkConfig) {
  if (!worker.provider) {
    throw new Error('Tried to send a chunk to a worker process with no provider.')
  }

  if (!worker.transform) {
    throw new Error('Tried to send a chunk to a worker process with no transform function.')
  }

  const idsLength = ids.length
  const statFileName = `${index}__${ids[0]}__${ids[idsLength - 1]}.diff.json`
  const fullStatFilePath = `${process.cwd()}/${statFileName}`
  const diffMap: Record<string, { rev: string; diff: any }> = {}
  await ensureFile(fullStatFilePath)

  // TODO: Refactor bf-couch-lib to accept string[] instead of IDocID[]
  const idObjects = ids.map(id => ({ _id: id }))
  const documents: IFetchResponse = await worker.provider.getBulkTool().getDocGroup(idObjects)
  const updatedDocuments: ICouchDocument[] = []

  for (const { doc } of documents.rows) {
    const originalDocument: ICouchDocument = JSON.parse(JSON.stringify(doc))
    const updatedDocument: ICouchDocument = worker.transform(originalDocument)
    updatedDocuments.push(updatedDocument)
    diffMap[originalDocument._id] = { rev: originalDocument._rev, diff: jiff.diff(originalDocument, updatedDocument) }
  }

  const results: BulkUpdateResponseList = await worker.provider.getBulkTool().bulkUpdate(updatedDocuments)

  for (const result of results) {
    if (!result.ok) {
      console.error(`Failed to update document: ${result.id}`)
    }
  }

  await writeJSON(fullStatFilePath, diffMap)
  await sendMessage(WorkerProcessMessageType.CHUNK_COMPLETED, index)
}

async function handleRecieveMigrationArgs(config: MigrateArgs) {
  const provider: ICouchProvider = await getCouchProvider(config)
  worker.provider = provider

  sendMessage(WorkerProcessMessageType.ACK_MIGRATION_ARGS, {
    success: true
  })
}

function handleRecieveTransform(transformString: string): () => any {
  try {
    const transform = eval(transformString)

    if (!isFunction(transform)) {
      throw new Error(`Worker process recieved an invalid transform function`)
    }

    worker.transform = transform

    sendMessage(WorkerProcessMessageType.ACK_TRANSFORM, {
      success: true
    })

    return transform
  } catch (e) {
    console.log(e)
    throw new Error(`Worker process recieved an invalid transform function`)
  }
}

function sendMessage<T>(type: WorkerProcessMessageType, data?: T) {
  if (process.send) {
    process.send({
      type,
      data
    })
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
/* ~~~ Testing Utils ~~~ *?

/**
 * This is only intended to be used for unit tests
 */
export function getUtilsForTesting() {
  return {
    getCouchProvider,
    handleRecieveTransform
  }
}
