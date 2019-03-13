import { isMaster, Worker as NodeWorker } from 'cluster'

import { BeginMigrationArgs } from './migrate'
import { MasterProcessMessageType } from './migrationWorker'

class Worker extends NodeWorker {
  public pid?: number
}

type ProviderConfigAck = {
  processId: number
}

type TransformAck = {
  success: boolean
}

/* ~~~ Worker Message Types ~~~ */

export enum WorkerProcessMessageType {
  ACK_TRANSFORM = 'ACK_TRANSFORM',
  ACK_PROVIDER_CONFIG = 'ACK_PROVIDER_CONFIG'
}

interface WorkerProcessMessage<T> {
  type: WorkerProcessMessageType
  data: T
}

interface RecieveAckConfigMessage extends WorkerProcessMessage<ProviderConfigAck> {
  type: WorkerProcessMessageType.ACK_PROVIDER_CONFIG
}

interface RecieveAckTransformMessage extends WorkerProcessMessage<TransformAck> {
  type: WorkerProcessMessageType.ACK_TRANSFORM
}

type IncomingMessage = RecieveAckConfigMessage | RecieveAckTransformMessage
type IncomingMessageHandler = (worker: Worker, message: IncomingMessage) => void
type MasterProcessFunctions = {
  beginMigration: () => void
  handleIncomingMessage: IncomingMessageHandler
}

export function configureWorker(worker: Worker, messageHandler: IncomingMessageHandler) {
  worker.on('message', (message: IncomingMessage) => messageHandler(worker, message))
}

export function configureMaster({ idList, transform }: BeginMigrationArgs): MasterProcessFunctions {
  if (!isMaster) {
    throw new Error('Tried to confgiure the master process from a worker process')
  }

  const workers = new Map<number, Worker>()
  const documentChunkSize = 10000
  const documentIds: string[] = idList.map(({ _id }) => _id).sort()
  const documentCount = documentIds.length
  const documentIdChunks: string[][] = splitIdListIntoChunks(documentIds, documentChunkSize, documentCount)

  if (documentIdChunks) {
  }

  function handleRecieveProviderConfigAck(worker: Worker, { processId }: ProviderConfigAck) {
    worker.pid = processId
    workers.set(processId, worker)
  }

  function handleRecieveTransformAck(worker: Worker, ack: TransformAck) {
    if (worker && ack) {
      return
    }
  }

  function handleIncomingMessage(worker: Worker, { type, data }: IncomingMessage) {
    switch (type) {
      case WorkerProcessMessageType.ACK_TRANSFORM:
        return handleRecieveProviderConfigAck(worker, data as ProviderConfigAck)
      case WorkerProcessMessageType.ACK_PROVIDER_CONFIG:
        return handleRecieveTransformAck(worker, data as TransformAck)
      default:
        throw new Error(`${type} is not a valid worker process message type`)
    }
  }

  async function beginMigration() {
    for (const worker of workers.values()) {
      worker.send({ type: MasterProcessMessageType.RECIEVE_TRANSFORM, data: transform.toString() })
    }
  }

  return {
    beginMigration,
    handleIncomingMessage
  }
}

function splitIdListIntoChunks(documentIds: string[], documentChunkSize: number, documentCount: number): string[][] {
  const chunks: string[][] = []

  for (let i = 0, j = documentCount; i < j; i += documentChunkSize) {
    chunks.push(documentIds.slice(i, i + documentChunkSize))
  }

  return chunks
}

/**
 * This is only intended to be used for unit tests
 */
export function getUtilsForTesting() {
  return {
    splitIdListIntoChunks
  }
}
