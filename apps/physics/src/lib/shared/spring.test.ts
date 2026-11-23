import { describe, expect, test } from 'vitest'
import { coilPath } from './spring'

/** The points of a path made of M and L commands. */
const pointsOf = (d: string) =>
  d
    .replace(/^M /, '')
    .split(' L ')
    .map((p) => p.split(' ').map(Number))
    .map(([x, y]) => ({ x, y }))

/** How many times the coil crosses its middle line (y = 0 on a level spring). */
const crossings = (d: string) => {
  let [n, last] = [0, 0]
  for (const { y } of pointsOf(d)) {
    const sign = Math.sign(Math.round(y * 100))
    if (sign && last && sign !== last) n++
    if (sign) last = sign
  }
  return n
}

describe('coilPath', () => {
  for (const style of ['zigzag', 'loops'] as const) {
    describe(style, () => {
      test('starts on the first point and ends on the second, at any angle', () => {
        for (const [from, to] of [
          [{ x: 10, y: 20 }, { x: 210, y: 20 }],
          [{ x: 100, y: 34 }, { x: 100, y: 260 }],
          [{ x: 0, y: 0 }, { x: -60, y: 80 }],
        ]) {
          const points = pointsOf(coilPath(from, to, 8, 20, style))
          expect(points[0]).toEqual(from)
          expect(points.at(-1)).toEqual(to)
        }
      })

      test('has straight leads at both ends, on the middle line', () => {
        const points = pointsOf(coilPath({ x: 0, y: 0 }, { x: 200, y: 0 }, 8, 20, style))
        expect(points[1]).toEqual({ x: 10, y: 0 })
        expect(points.at(-2)).toEqual({ x: 190, y: 0 })
      })

      test('keeps the same number of turns and the same width stretched or squashed', () => {
        for (const length of [60, 120, 240, 400]) {
          const d = coilPath({ x: 0, y: 0 }, { x: length, y: 0 }, 8, 20, style)
          expect(crossings(d)).toBe(style === 'zigzag' ? 15 : 16)
          const ys = pointsOf(d).map((p) => p.y)
          expect(Math.max(...ys)).toBeCloseTo(10, 0)
          expect(Math.min(...ys)).toBeCloseTo(-10, 0)
        }
      })

      test('stays between its two ends along the spring', () => {
        const xs = pointsOf(coilPath({ x: 0, y: 0 }, { x: 70, y: 0 }, 10, 20, style)).map((p) => p.x)
        expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
        expect(Math.max(...xs)).toBeLessThanOrEqual(70)
      })

      test('a spring of no length is a point, not an error', () => {
        const d = coilPath({ x: 5, y: 5 }, { x: 5, y: 5 }, 8, 20, style)
        expect(d).toBe('M 5 5 L 5 5')
        expect(d).not.toContain('NaN')
      })
    })
  }

  test('a zigzag swings evenly from side to side', () => {
    const points = pointsOf(coilPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 4, 20, 'zigzag')).slice(2, -2)
    expect(points.map((p) => p.y)).toEqual([10, -10, 10, -10, 10, -10, 10, -10])
    expect(points[1].x - points[0].x).toBeCloseTo(10)
  })

  test('squashed loops are drawn narrower along the spring, so neighbours never cross', () => {
    // Each turn crosses the one after it once, where they make a loop; a loop running into its neighbour would cross more.
    const cuts = (d: string) => {
      const p = pointsOf(d)
      const side = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
      let n = 0
      for (let i = 0; i < p.length - 1; i++) {
        for (let j = i + 2; j < p.length - 1; j++) {
          const [a, b, c, e] = [p[i], p[i + 1], p[j], p[j + 1]]
          if (side(a, b, c) * side(a, b, e) < 0 && side(c, e, a) * side(c, e, b) < 0) n++
        }
      }
      return n
    }
    for (const length of [50, 70, 140, 300]) {
      const n = cuts(coilPath({ x: 0, y: 0 }, { x: length, y: 0 }, 10, 20, 'loops'))
      expect(n).toBeGreaterThanOrEqual(9)
      expect(n).toBeLessThanOrEqual(10)
    }
  })
})
