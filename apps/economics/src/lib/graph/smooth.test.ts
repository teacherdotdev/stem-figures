import { describe, expect, it } from 'vitest'
import { smoothThrough } from './smooth'

describe('smooth curves through points', () => {
  const pts = [{ x: 6500, y: 70 }, { x: 8000, y: 80 }, { x: 8800, y: 90 }, { x: 9300, y: 100 }, { x: 9600, y: 110 }, { x: 9900, y: 130 }]

  it('goes through every point, in order of the coordinate it is read by', () => {
    const c = smoothThrough([...pts].reverse(), 'y')
    for (const p of pts) expect(c.some((q) => Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9)).toBe(true)
    expect(c[0]).toEqual(pts[0])
    expect(c.at(-1)).toEqual(pts.at(-1))
  })

  it('never overshoots: a curve that only rises keeps rising', () => {
    const c = smoothThrough(pts, 'y')
    for (let k = 1; k < c.length; k++) {
      expect(c[k].y).toBeGreaterThan(c[k - 1].y)
      expect(c[k].x).toBeGreaterThanOrEqual(c[k - 1].x)
    }
  })

  it('leaves two points as a straight line', () => {
    expect(smoothThrough([{ x: 0, y: 0 }, { x: 1, y: 2 }])).toEqual([{ x: 0, y: 0 }, { x: 1, y: 2 }])
  })
})
