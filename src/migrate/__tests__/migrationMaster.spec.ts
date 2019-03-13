import { getUtilsForTesting } from '../migrationMaster'

const { splitIdListIntoChunks } = getUtilsForTesting()

describe('Migration Master', () => {
  it('Should be able to split a list of IDs into chunks', () => {
    const idList1 = ['123', '245', '678', '91011', '121314', '151617', '91011', '121314', '151617']
    const chunkSize1 = 3
    const chunks1 = splitIdListIntoChunks(idList1, chunkSize1, idList1.length)

    expect(chunks1).toHaveLength(3)
    expect(chunks1.flat()).toEqual(idList1)

    const idList2 = [
      '123123',
      '213123124',
      '213123123',
      '32112',
      '123123',
      'asdasdasd',
      'asdasdas',
      '12312312',
      'dassadsad',
      '21321123',
      'sadfdfsgfds',
      '213123124',
      '213123'
    ]
    const chunkSize2 = 5
    const chunks2 = splitIdListIntoChunks(idList2, chunkSize2, idList2.length)

    expect(chunks2).toHaveLength(3)
    expect(chunks2[0]).toHaveLength(chunkSize2)
    expect(chunks2[1]).toHaveLength(chunkSize2)
    expect(chunks2[2]).toHaveLength(chunkSize2 - 2)
    expect(chunks2.flat()).toEqual(idList2)
  })
})
