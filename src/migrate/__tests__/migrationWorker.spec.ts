import { getUtilsForTesting } from '../migrationWorker'

const { handleRecieveTransform } = getUtilsForTesting()

describe('Migration Worker', () => {
  it('Should be able to accept transform function strings and reject invalid ones', () => {
    const testDoc = { color: 'red', number: 33 }
    const fn = (doc: any) => {
      return { ...doc, test: true }
    }
    const fnString = fn.toString()
    const transform: Function = handleRecieveTransform(fnString)

    expect(transform).toBeInstanceOf(Function)
    const newDoc = transform(testDoc)
    expect(newDoc).toMatchObject(testDoc)
    expect(newDoc).toHaveProperty('test')
    expect(newDoc.test).toEqual(true)
  })
})
