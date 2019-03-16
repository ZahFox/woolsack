import { IDocId } from 'bf-lib-couch'
import { isMaster } from 'cluster'
import { ChildProcess } from 'child_process'

import { logVerbose as logVerboseUtil } from '../common'
import { BeginMigrationArgs, MigrateArgs } from './migrate'
import { MasterProcessMessageType } from './migrationWorker'

export interface ChunkConfig {
  index: number
  ids: string[]
}

enum ChunkStatus {
  ACTIVE = 'ACTIVE',
  COMPLETE = 'COMPLETE',
  WAITING = 'WAITING'
}

interface ProviderConfigAck {
  processId: number
}

interface TransformAck {
  success: boolean
}

/* ~~~ ChildProcess Message Types ~~~ */

export enum WorkerProcessMessageType {
  ACK_MIGRATION_ARGS = 'ACK_MIGRATION_ARGS',
  ACK_TRANSFORM = 'ACK_TRANSFORM',
  CHUNK_COMPLETED = 'CHUNK_COMPLETED',
  PROCESS_FINISHED = 'PROCESS_FINISHED'
}

interface ChildProcessProcessMessage<T> {
  type: WorkerProcessMessageType
  data: T
}

interface RecieveAckMigrationArgsMessage extends ChildProcessProcessMessage<ProviderConfigAck> {
  type: WorkerProcessMessageType.ACK_MIGRATION_ARGS
}

interface RecieveAckTransformMessage extends ChildProcessProcessMessage<TransformAck> {
  type: WorkerProcessMessageType.ACK_TRANSFORM
}

interface RecieveChunkCompletedMessage extends ChildProcessProcessMessage<number> {
  type: WorkerProcessMessageType.CHUNK_COMPLETED
}

interface RecieveProcessFinishedMessage extends ChildProcessProcessMessage<void> {
  type: WorkerProcessMessageType.PROCESS_FINISHED
}

type IncomingMessage =
  | RecieveAckMigrationArgsMessage
  | RecieveAckTransformMessage
  | RecieveChunkCompletedMessage
  | RecieveProcessFinishedMessage

type IncomingMessageHandler = (worker: ChildProcess, message: IncomingMessage) => void

interface MasterProcessFunctions {
  beginMigration: () => void
  handleIncomingMessage: IncomingMessageHandler
  workers: Map<number, ChildProcess>
}

export function configureWorker(
  worker: ChildProcess,
  messageHandler: IncomingMessageHandler,
  { args, transform, workers }: BeginMigrationArgs
) {
  if (args.options.verbose) {
    logVerboseUtil(`Configuring new worker process ${worker.pid}`)
  }

  workers.set(worker.pid, worker)
  worker.on('message', (message: IncomingMessage) => messageHandler(worker, message))
  worker.send({ type: MasterProcessMessageType.RECIEVE_TRANSFORM, data: transform.toString() })
}

export function configureMaster(idList: IDocId[], args: MigrateArgs): MasterProcessFunctions {
  if (!isMaster) {
    console.warn('The master process was configured from a worker process.')
  }

  const workers = new Map<number, ChildProcess>()
  const verbose = args.options.verbose

  const chunkTracker: Map<number, ChunkStatus> = new Map()
  const documentChunkSize = 10000
  const documentIds: string[] = idList.map(({ _id }) => _id).sort()
  const documentCount = documentIds.length
  const documentIdChunks: string[][] = splitIdListIntoChunks(documentIds, documentChunkSize, documentCount)

  logVerbose(
    `Found ${documentCount} documents. They have been divided into ${documentIdChunks.length} ${
      documentIdChunks.length > 1 ? 'chunks' : 'chunk'
    } of ${documentChunkSize}`
  )

  function logVerbose(message: string) {
    if (verbose) {
      logVerboseUtil(message)
    }
  }

  function handleRecieveTransform(worker: ChildProcess, ack: TransformAck) {
    if (ack.success) {
      logVerbose(`Worker Process ${worker.pid} successfully recieved its transform function.`)
    }
  }

  function handleRecieveMigrationArgsAck(worker: ChildProcess, ack: TransformAck) {
    // TODO: This should eventually check for a sum of numCPUs ACK before beginning the migration

    if (ack.success) {
      logVerbose(`Worker Process ${worker.pid} successfully recieved its migration arguments.`)
      return distributeChunks()
    }
  }

  function handleRecieveChunkComplete(worker: ChildProcess, chunkIndex: number) {
    chunkTracker.set(chunkIndex, ChunkStatus.COMPLETE)

    for (const [index, value] of chunkTracker) {
      if (value === ChunkStatus.WAITING) {
        chunkTracker.set(index, ChunkStatus.ACTIVE)
        worker.send({
          type: MasterProcessMessageType.RECIEVE_CHUNK,
          data: { index, ids: documentIdChunks[index] }
        })
        return
      }
    }

    worker.send({ type: MasterProcessMessageType.STOP })
  }

  function handleProcessFinished(worker: ChildProcess) {
    logVerbose(`Worker Process ${worker.pid} finished execution successfully.`)

    // TODO: This should eventually be aware of multiple worker processes
    console.log('Migration Completed.')
    process.exit(0)
  }

  function distributeChunks() {
    const chunkCount = documentIdChunks.length
    const workerProcesses = workers.values()
    let chunkIndex = 0
    let workerIndex = 0

    for (const worker of workerProcesses) {
      if (chunkIndex === chunkCount || workerIndex === chunkCount) {
        break
      }

      chunkTracker.set(chunkIndex, ChunkStatus.ACTIVE)

      worker.send({
        type: MasterProcessMessageType.RECIEVE_CHUNK,
        data: { index: chunkIndex, ids: documentIdChunks[chunkIndex] }
      })

      chunkIndex++
      workerIndex++
    }
  }

  function handleIncomingMessage(worker: ChildProcess, { type, data }: IncomingMessage) {
    switch (type) {
      case WorkerProcessMessageType.ACK_MIGRATION_ARGS:
        return handleRecieveMigrationArgsAck(worker, data as TransformAck)
      case WorkerProcessMessageType.ACK_TRANSFORM:
        return handleRecieveTransform(worker, data as TransformAck)
      case WorkerProcessMessageType.CHUNK_COMPLETED:
        return handleRecieveChunkComplete(worker, data as number)
      case WorkerProcessMessageType.PROCESS_FINISHED:
        return handleProcessFinished(worker)
      default:
        throw new Error(`${type} is not a valid worker process message type`)
    }
  }

  async function beginMigration() {
    for (let i = 0; i < documentIdChunks.length; i++) {
      chunkTracker.set(i, ChunkStatus.WAITING)
    }

    for (const worker of workers.values()) {
      worker.send({ type: MasterProcessMessageType.RECIEVE_MIGRATION_ARGS, data: args })
    }
  }

  return {
    beginMigration,
    handleIncomingMessage,
    workers
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
