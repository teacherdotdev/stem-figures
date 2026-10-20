import { describe, expect, it } from 'vitest'
import { daughter, decayConstant, halfLifeTimes, halvesText, percentText, remaining } from './decay'

describe('radioactive decay', () => {
  it('halves every half-life', () => {
    expect(remaining(0, 5730)).toBe(1)
    expect(remaining(5730, 5730)).toBeCloseTo(0.5, 12)
    expect(remaining(2 * 5730, 5730)).toBeCloseTo(0.25, 12)
    expect(remaining(3 * 8.02, 8.02)).toBeCloseTo(0.125, 12)
  })

  it('never reaches zero', () => {
    expect(remaining(50 * 12.3, 12.3)).toBeGreaterThan(0)
  })

  it('has a decay constant λ with λ·T½ = ln 2, the same curve as e^(−λt)', () => {
    for (const half of [5730, 8.02, 4.47, 110]) {
      expect(decayConstant(half) * half).toBeCloseTo(Math.LN2, 12)
      expect(remaining(1.7 * half, half)).toBeCloseTo(Math.exp(-decayConstant(half) * 1.7 * half), 12)
    }
  })

  it('grows a stable daughter that equals the parent at one half-life', () => {
    expect(daughter(5730, 5730)).toBeCloseTo(remaining(5730, 5730), 12)
    expect(daughter(0, 5730)).toBe(0)
  })

  it('keeps parent plus daughter equal to what it started with', () => {
    for (const t of [0, 100, 5730, 20000]) expect(remaining(t, 5730) + daughter(t, 5730)).toBeCloseTo(1, 12)
  })

  it('names the half-lives and what’s left after each', () => {
    expect(halfLifeTimes(5730, 3)).toEqual([5730, 11460, 17190])
    expect([1, 2, 3].map(halvesText)).toEqual(['T½', '2T½', '3T½'])
    expect([1, 2, 3, 4].map(percentText)).toEqual(['50%', '25%', '12.5%', '6.25%'])
  })
})
