import { describe, expect, it } from 'vitest'
import { guidesFrom, rowsUnder, spread } from './axisMarks'
import { partsOf, plainOf, runsOf, runsWidth } from './runs'

describe('axis marks', () => {
  it('moves labels along an axis apart just enough', () => {
    const out = spread([{ at: 10, half: 5 }, { at: 0, half: 5 }, { at: 40, half: 5 }], 2)
    expect(out.map((o) => o.at)).toEqual([0, 12, 40])
  })

  it('puts a label under the x-axis on a lower row only when it would run into one', () => {
    const { placed, rows } = rowsUnder([{ x: 100, half: 10 }, { x: 0, half: 10 }, { x: 110, half: 10 }, { x: 200, half: 10 }])
    expect(placed.map((p) => [p.x, p.row])).toEqual([[0, 0], [100, 0], [110, 1], [200, 0]])
    expect(rows).toBe(2)
  })

  it('runs guides from a point to both axes, or one, and none along an axis', () => {
    expect(guidesFrom({ x: 50, y: 20 }, 10, 100)).toEqual([
      { x1: 50, y1: 20, x2: 10, y2: 20 },
      { x1: 50, y1: 20, x2: 50, y2: 100 },
    ])
    expect(guidesFrom({ x: 50, y: 20 }, 10, 100, { y: false })).toEqual([{ x1: 50, y1: 20, x2: 50, y2: 100 }])
    expect(guidesFrom({ x: 10, y: 20 }, 10, 100)).toEqual([{ x1: 10, y1: 20, x2: 10, y2: 100 }])
  })
})

describe('subscripts', () => {
  it('lowers the letter after _, or everything in braces after it', () => {
    expect(partsOf('S_1')).toEqual([{ text: 'S' }, { text: '1', sub: true }])
    expect(partsOf('PR_{2}')).toEqual([{ text: 'PR' }, { text: '2', sub: true }])
    expect(partsOf('D_{LF} shifts')).toEqual([{ text: 'D' }, { text: 'LF', sub: true }, { text: ' shifts' }])
    expect(partsOf('MS_2 and MS_1')).toEqual([{ text: 'MS' }, { text: '2', sub: true }, { text: ' and MS' }, { text: '1', sub: true }])
  })

  it('leaves text with no subscripts, and a stray _ or {, as written', () => {
    expect(partsOf('Price ceiling')).toEqual([{ text: 'Price ceiling' }])
    expect(partsOf('a_')).toEqual([{ text: 'a_' }])
    expect(partsOf('a_{b')).toEqual([{ text: 'a_{b' }])
  })

  it('moves a subscript down and the text after it back up', () => {
    expect(runsOf('P_e here', 10)).toEqual([{ text: 'P', dy: 0 }, { text: 'e', sub: true, dy: 2.2 }, { text: ' here', dy: -2.2 }])
  })

  it('measures a subscript smaller than the rest', () => {
    expect(runsWidth(runsOf('S_1', 10), 10)).toBeLessThan(runsWidth(runsOf('S1', 10), 10))
  })

  it('writes subscripts in Unicode where it can, for screen readers', () => {
    expect(plainOf('S_1 to S_2')).toBe('S₁ to S₂')
    expect(plainOf('P_e')).toBe('Pₑ')
    expect(plainOf('D_R')).toBe('D R')
  })
})
