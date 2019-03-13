import { isMaster, Worker as NodeWorker } from 'cluster'

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
type ConfigureWorkerSetup = {
  handleIncomingMessage: (worker: Worker, message: IncomingMessage) => void
}

export function configureMaster(): ConfigureWorkerSetup {
  if (!isMaster) {
    throw new Error('Tried to confgiure the master process from a worker process')
  }

  const workers = new Map<number, Worker>()

  function handleRecieveProviderConfigAck(worker: Worker, { processId }: ProviderConfigAck) {
    worker.pid = processId
    workers.set(processId, worker)
  }

  function handleRecieveTransformAck(worker: Worker, ack: TransformAck) {
    if (worker && ack) {
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

  return {
    handleIncomingMessage
  }
}

export function configureWorker(worker: Worker, setup: ConfigureWorkerSetup) {
  worker.on('message', (message: IncomingMessage) => setup.handleIncomingMessage(worker, message))
}
