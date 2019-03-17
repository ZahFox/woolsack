import { createWriteStream } from 'fs-extra'
import { compress } from 'lzma-native'
import { cpus } from 'os'
import { Readable } from 'stream'

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

export function compressToFile(path: string, data: Buffer) {
  compress(data, { preset: 9, threads: cpus().length }, (compressed: Buffer) => {
    const input = bufferToStream(compressed)
    const output = createWriteStream(path)
    input.pipe(output)
  })
}
