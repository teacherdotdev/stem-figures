import { describe, expect, test } from 'vitest'
import { correlation, describeCorrelation, leastSquares } from './regression'

const pts = (...xy: [number, number][]) => xy.map(([x, y]) => ({ x, y }))

describe('leastSquares', () => {
  test('points on a line give that line', () => {
    const fit = leastSquares(pts([0, 1], [1, 3], [2, 5], [3, 7]))!
    expect(fit.slope).toBeCloseTo(2)
    expect(fit.intercept).toBeCloseTo(1)
  })

  test('matches a worked example (LinReg on a TI-84)', () => {
    // x: 1..5, y: 2, 4, 5, 4, 5 → y = 0.6x + 2.2
    const fit = leastSquares(pts([1, 2], [2, 4], [3, 5], [4, 4], [5, 5]))!
    expect(fit.slope).toBeCloseTo(0.6)
    expect(fit.intercept).toBeCloseTo(2.2)
  })

  test('no line through fewer than two different x values', () => {
    expect(leastSquares(pts([1, 2]))).toBeNull()
    expect(leastSquares(pts([3, 1], [3, 5], [3, 9]))).toBeNull()
  })
})

describe('correlation', () => {
  test('a perfect line is ±1', () => {
    expect(correlation(pts([0, 0], [1, 2], [2, 4]))).toBeCloseTo(1)
    expect(correlation(pts([0, 4], [1, 2], [2, 0]))).toBeCloseTo(-1)
  })

  test('matches a worked example', () => {
    expect(correlation(pts([1, 2], [2, 4], [3, 5], [4, 4], [5, 5]))).toBeCloseTo(0.7746, 4)
  })

  test('none when a variable doesn’t vary', () => {
    expect(correlation(pts([1, 2], [2, 2], [3, 2]))).toBeNull()
  })

  test('described in words', () => {
    expect(describeCorrelation(0.92)).toBe('strong positive correlation')
    expect(describeCorrelation(-0.55)).toBe('moderate negative correlation')
    expect(describeCorrelation(0.35)).toBe('weak positive correlation')
    expect(describeCorrelation(-0.1)).toBe('little or no correlation')
  })
})
