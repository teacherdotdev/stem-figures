import { describe, expect, it } from 'vitest'
import { branchEnds, insertSeriesTile } from './tileSeries'

describe('series tiles inside a parallel branch', () => {
  it('extends the selected upper branch without an intermediate connection to the lower path', () => {
    const tiles = insertSeriesTile([
      { kind: 'led', column: 0, branch: -1 },
      { kind: 'cell', column: 0, branch: 0 },
      { kind: 'battery', column: 1, branch: 0 },
    ], 0, -1)
    expect(tiles).toContainEqual({ kind: 'wire', column: 1, branch: -1 })
    expect(tiles).toContainEqual({ kind: 'battery', column: 2, branch: 0 })
    expect(branchEnds(tiles, 0, -1)).toEqual({ left: true, right: false })
    expect(branchEnds(tiles, 1, -1)).toEqual({ left: false, right: true })
  })
  it('preserves other series branches crossing an inserted column', () => {
    const tiles = insertSeriesTile([
      { kind: 'resistor', column: 0, branch: 1 },
      { kind: 'bulb', column: 1, branch: 1 },
      { kind: 'led', column: 0, branch: -1 },
    ], 0, -1)
    expect(tiles).toContainEqual({ kind: 'wire', column: 1, branch: 1 })
    expect(branchEnds(tiles, 1, 1)).toEqual({ left: false, right: false })
  })
  it('can insert before the first tile in an upper branch', () => {
    const tiles = insertSeriesTile([{ kind: 'led', column: 0, branch: -1 }], -1, -1)
    expect(tiles).toContainEqual({ kind: 'wire', column: 0, branch: -1 })
    expect(tiles).toContainEqual({ kind: 'led', column: 1, branch: -1 })
    expect(branchEnds(tiles, 0, -1)).toEqual({ left: true, right: false })
  })
})
