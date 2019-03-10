import * as jiff from 'jiff'

describe('diff', () => {
  it('Should return an empty array for indentical objects', () => {
    const obj1: any = {}
    const obj2: any = {}
    const result1 = jiff.diff(obj1, obj2)
    expect(result1).toEqual([])

    const obj3: any = { a: {}, b: [{ c: null }, 'wow'], c: 33, d: { e: { f: { g: [null, undefined, null] } } } }
    const obj4: any = { a: {}, b: [{ c: null }, 'wow'], c: 33, d: { e: { f: { g: [null, undefined, null] } } } }
    const result2 = jiff.diff(obj3, obj4)
    expect(result2).toEqual([])
  })

  it('Should be able to detect the difference between two objects', () => {
    const obj1: any = { a: [22], lot: { a: 33, b: 32 }, c: null, d: 32, f: [{ g: { a: [1, 2, 3, 4] } }] }
    const obj2: any = {
      a: true,
      lot: { b: 33, a: 32 },
      c: null,
      f: [{ g: { b: { a: { c: [1, 2, 3, 4] } } } }]
    }

    const expectedDiff = `[{"op":"add","path":"/f/0","value":{"g":{"b":{"a":{"c":[1,2,3,4]}}}}},{"op":"test","path":"/f/1","value":{"g":{"a":[1,2,3,4]}}},{"op":"remove","path":"/f/1"},{"op":"test","path":"/lot/a","value":33},{"op":"replace","path":"/lot/a","value":32},{"op":"test","path":"/lot/b","value":32},{"op":"replace","path":"/lot/b","value":33},{"op":"test","path":"/a","value":[22]},{"op":"replace","path":"/a","value":true},{"op":"test","path":"/d","value":32},{"op":"remove","path":"/d"}]`
    const result1 = jiff.diff(obj1, obj2)
    expect(result1).toEqual(JSON.parse(expectedDiff))
  })

  it('Should be able to revert an object using a diff', () => {
    const obj1: any = { a: [22], lot: { a: 33, b: 32 }, c: null, d: 32, f: [{ g: { a: [1, 2, 3, 4] } }] }
    const obj2: any = {
      a: true,
      lot: { b: 33, a: 32 },
      c: null,
      f: [{ g: { b: { a: { c: [1, 2, 3, 4] } } } }]
    }
    const patch = jiff.diff(obj1, obj2)
    const inverse = jiff.inverse(patch)

    const obj3 = jiff.patch(inverse, obj2)

    expect(obj3).toEqual(obj1)
  })

  it('Should be able to update an object using a diff', () => {
    const obj1: any = { a: [22], lot: { a: 33, b: 32 }, c: null, d: 32, f: [{ g: { a: [1, 2, 3, 4] } }] }
    const obj2: any = {
      a: true,
      lot: { b: 33, a: 32 },
      c: null,
      f: [{ g: { b: { a: { c: [1, 2, 3, 4] } } } }]
    }
    const patch = jiff.diff(obj1, obj2)

    const obj3 = jiff.patch(patch, obj1)
    expect(obj3).toEqual(obj2)
  })
})
