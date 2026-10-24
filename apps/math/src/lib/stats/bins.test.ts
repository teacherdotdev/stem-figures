import { describe, expect, test } from 'vitest'
import { binData, checkBins, parseBin, type Bin } from './bins'

describe('bins as typed', () => {
  test('dashes and "to" leave the edges to the table', () => {
    for (const t of ['10–20', '10-20', '10 - 20', '10 to 20']) expect(parseBin(t)).toEqual({ lo: 10, hi: 20, holds: null })
    expect(parseBin('-10--5')).toEqual({ lo: -10, hi: -5, holds: null })
  })

  test('inequalities say which end holds a value on it', () => {
    expect(parseBin('10 ≤ x < 20')).toEqual({ lo: 10, hi: 20, holds: 'left' })
    expect(parseBin('20 < t <= 30')).toEqual({ lo: 20, hi: 30, holds: 'right' })
    expect(parseBin('1.5<=h<2.5')).toEqual({ lo: 1.5, hi: 2.5, holds: 'left' })
  })

  test('backwards or unreadable bins get a message', () => {
    expect(parseBin('20–10')).toHaveProperty('problem')
    expect(parseBin('ten to twenty')).toHaveProperty('problem')
  })

  test('gaps and overlaps', () => {
    const b = (lo: number, hi: number): Bin => ({ lo, hi, holds: null })
    expect(checkBins([b(0, 10), b(10, 20), b(20, 40)])).toBeNull()
    expect(checkBins([b(0, 9), b(10, 19)])).toContain('gap')
    expect(checkBins([b(0, 10), b(5, 20)])).toContain('overlap')
  })
})

describe('sorting a data set into bins', () => {
  const values = [10, 12, 19, 20, 25, 30]

  test('a value on an edge goes in the bin that starts there', () => {
    const { bins, counts } = binData(values, 10, 10, 'left')
    expect(bins.map((b) => [b.lo, b.hi])).toEqual([[10, 20], [20, 30], [30, 40]])
    expect(counts).toEqual([3, 2, 1])
  })

  test('or the bin that ends there', () => {
    const { bins, counts } = binData(values, 10, 10, 'right')
    expect(bins.map((b) => [b.lo, b.hi])).toEqual([[10, 20], [20, 30]])
    expect(counts).toEqual([4, 2])
  })

  test('every value lands in exactly one bin', () => {
    const data = [0.5, 1, 1.5, 2, 2.5, 3, 7.25, 9.99]
    for (const holds of ['left', 'right'] as const) {
      expect(binData(data, 0, 2, holds).counts.reduce((a, b) => a + b, 0)).toBe(data.length)
    }
  })

  test('bins reach back to hold values below the start', () => {
    expect(binData([3, 15], 10, 5, 'left').bins[0].lo).toBe(0)
  })
})
