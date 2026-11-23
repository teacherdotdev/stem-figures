import { describe, expect, it } from 'vitest'
import { niceRange } from './niceRange'

describe('fitting an axis', () => {
  it('counts in tidy steps', () => {
    expect(niceRange(0, 308.8, true)).toEqual([0, 320, 20])
    expect(niceRange(-20, 120)).toEqual([-20, 120, 10])
    expect(niceRange(0, 20, true)).toEqual([0, 20, 1])
  })

  it('fits small ranges, never rounding an end to 0', () => {
    expect(niceRange(0, 0.00208, true)).toEqual([0, 0.0022, 0.0002])
    expect(niceRange(0, 0.0208, true)).toEqual([0, 0.022, 0.002])
    expect(niceRange(0, 0.0048, true)).toEqual([0, 0.005, 0.00025])
  })

  it('ends on a whole step, even a step of 0.025', () => {
    expect(niceRange(0, 0.4677, true)).toEqual([0, 0.475, 0.025])
  })
})
