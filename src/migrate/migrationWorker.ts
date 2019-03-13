import { CouchFactory, ICouchDocument, ICouchProvider, MockProvider } from 'bf-lib-couch'
import { isMaster } from 'cluster'

import { isFunction } from '../common'
import { Environment } from '../config'
import { migrateArgs } from './migrate'
import { WorkerProcessMessageType } from './migrationMaster'

/* ~~~ Master Message Types ~~~ */

enum MasterProcessMessageType {
  RECIEVE_TRANSFORM = 'RECIEVE_TRANSFORM',
  RECIEVE_PROVIDER_CONFIG = 'RECIEVE_PROVIDER_CONFIG'
}

interface MasterProcessMessage<T> {
  type: MasterProcessMessageType
  data: T
}

interface RecieveProviderConfigMessage extends MasterProcessMessage<migrateArgs> {
  type: MasterProcessMessageType.RECIEVE_PROVIDER_CONFIG
}

interface RecieveTransformMessage extends MasterProcessMessage<string> {
  type: MasterProcessMessageType.RECIEVE_TRANSFORM
}

type IcomingMessage = RecieveProviderConfigMessage | RecieveTransformMessage

type TransformFunction = (document: ICouchDocument) => ICouchDocument
type Worker = {
  provider: ICouchProvider | null
  transform: TransformFunction | null
}

const worker: Worker = {
  provider: null,
  transform: null
}

if (!isMaster) {
  configureWorker()
}

function configureWorker() {
  process.on('message', (message: IcomingMessage) => handleIncomingMessage(message))
}

function handleIncomingMessage({ type, data }: IcomingMessage) {
  switch (type) {
    case MasterProcessMessageType.RECIEVE_TRANSFORM:
      return handleRecieveTransform(data as string)
    case MasterProcessMessageType.RECIEVE_PROVIDER_CONFIG:
      return handleRecieveProviderConfig(data as migrateArgs)
    default:
      throw new Error(`${type} is not a valid master process message type`)
  }
}

function handleRecieveTransform(transformString: string): Function {
  try {
    const transform = eval(transformString)

    if (!isFunction(transform)) {
      throw new Error(`Worker process recieved an invalid transform function`)
    }

    worker.transform = transform
    if (process.send) {
      process.send({
        type: WorkerProcessMessageType.ACK_TRANSFORM,
        data: {
          success: true
        }
      })
    }
    return transform
  } catch (e) {
    console.log(e)
    throw new Error(`Worker process recieved an invalid transform function`)
  }
}

async function handleRecieveProviderConfig(config: migrateArgs) {
  const provider: ICouchProvider = await getCouchProvider(config)
  worker.provider = provider

  if (process.send) {
    process.send({
      type: WorkerProcessMessageType.ACK_PROVIDER_CONFIG,
      data: {
        processId: process.pid
      }
    })
  }
}

/* ~~~ Functions for interacting with CouchDB providers from bf-lib-couch ~~~ */

async function getCouchProvider({ env, databaseName }: migrateArgs): Promise<ICouchProvider> {
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

/**
 * This is only intended to be used for unit tests
 */
export function getUtilsForTesting() {
  return {
    getCouchProvider,
    handleRecieveTransform
  }
}
