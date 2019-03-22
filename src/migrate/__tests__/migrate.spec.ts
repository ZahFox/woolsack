import { ICouchProvider, IDocId } from 'bf-lib-couch'

import { CouchConfig, Environment } from '../../config'
import { getUtilsForTesting } from '../migrate'
import { sampleDocs } from './sampleDocs'

const config: CouchConfig = {
  user: 'test',
  password: 'test',
  host: 'test',
  port: '9001'
}

const databaseName = 'test'
const env = Environment.TEST

const { getCouchProvider, getIdList } = getUtilsForTesting()

const getProvider = async () => await getCouchProvider({ env, config, databaseName, options: { verbose: false } })
const preLoadProvider = async (provider: ICouchProvider, docs: any[]) =>
  docs.forEach(async doc => await provider.insert(doc))

describe('migrate', () => {
  it('Should be able to create CouchDB Providers for testing', async () => {
    const provider: ICouchProvider = await getProvider()
    const testDoc = { test: 'wow' }
    const { id } = await provider.insert(testDoc)
    const doc = await provider.get(id)

    expect(doc).toHaveProperty('_id')
    expect(doc).toHaveProperty('_rev')
    expect(doc).toMatchObject(testDoc)
  })

  it('Should get a list of a valid document IDs using an empty selector', async () => {
    const provider: ICouchProvider = await getProvider()
    await preLoadProvider(provider, sampleDocs)
    const idList: IDocId[] = await getIdList(provider, {})

    expect(idList).toBeInstanceOf(Array)
    expect(idList).toHaveLength(sampleDocs.length)

    for (const id of idList) {
      expect(Object.keys(id)).toHaveLength(1)
      expect(id).toHaveProperty('_id')
      const doc = await provider.get(id._id)
      expect(doc).toHaveProperty('_id')
      expect(doc).toHaveProperty('_rev')
      expect(doc._id).toEqual(id._id)
    }
  })
})
