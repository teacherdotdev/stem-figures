import { describe, expect, test } from 'vitest'
import { Phi, PhiInverse, cdf, inverse, phi } from './normal'

describe('the area left of z', () => {
  // From a standard normal table, to 4 decimal places.
  test.each([
    [0, 0.5],
    [1, 0.8413],
    [-1, 0.1587],
    [1.96, 0.975],
    [-1.645, 0.05],
    [2, 0.9772],
    [-3, 0.0013],
    [0.5, 0.6915],
    [2.33, 0.9901],
  ])('Φ(%s) = %s', (z, area) => {
    expect(Phi(z)).toBeCloseTo(area, 4)
  })

  test('is accurate far into the tails', () => {
    // Φ(−6) ≈ 9.8659e-10, Φ(−8) ≈ 6.2210e-16
    expect(Phi(-6) / 9.865876450377e-10).toBeCloseTo(1, 8)
    expect(Phi(-8) / 6.22096057427e-16).toBeCloseTo(1, 7)
    expect(Phi(40)).toBe(1)
  })

  test('the empirical rule', () => {
    expect(Phi(1) - Phi(-1)).toBeCloseTo(0.6827, 4)
    expect(Phi(2) - Phi(-2)).toBeCloseTo(0.9545, 4)
    expect(Phi(3) - Phi(-3)).toBeCloseTo(0.9973, 4)
  })

  test('with a mean and SD', () => {
    expect(cdf(130, 100, 15)).toBeCloseTo(0.9772, 4)
    expect(1 - cdf(600, 500, 100)).toBeCloseTo(0.1587, 4)
  })

  test('the curve’s height', () => {
    expect(phi(0)).toBeCloseTo(0.3989, 4)
    expect(phi(1)).toBeCloseTo(0.242, 4)
  })
})

describe('the z with a given area to its left', () => {
  test.each([
    [0.5, 0],
    [0.975, 1.96],
    [0.95, 1.6449],
    [0.9, 1.2816],
    [0.1, -1.2816],
    [0.01, -2.3263],
    [0.001, -3.0902],
  ])('Φ⁻¹(%s) = %s', (p, z) => {
    expect(PhiInverse(p)).toBeCloseTo(z, 4)
  })

  test('undoes Φ', () => {
    // Past about 6, Φ(z) is too close to 1 for a double to tell values apart.
    for (let z = -7; z <= 6; z += 0.37) expect(PhiInverse(Phi(z))).toBeCloseTo(z, 6)
  })

  test('at the ends and outside', () => {
    expect(PhiInverse(0)).toBe(-Infinity)
    expect(PhiInverse(1)).toBe(Infinity)
    expect(PhiInverse(1.2)).toBeNaN()
  })

  test('with a mean and SD (invNorm)', () => {
    expect(inverse(0.9, 100, 15)).toBeCloseTo(119.2233, 3)
  })
})
