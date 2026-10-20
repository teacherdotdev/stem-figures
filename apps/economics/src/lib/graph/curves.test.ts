import { describe, expect, it } from 'vitest'
import { areaOf, along, bowed, centroidOf, crossings, flatSlopeFlat, intersect, lineThrough, shifted, xAt, yAt } from './curves'
import { braceOf } from './panel'

const BOX = { x0: 0, x1: 10, y0: 0, y1: 10 }

describe('curves', () => {
  it('finds where two lines cross, and reads each at a price or quantity', () => {
    const d = lineThrough({ x: 0, y: 9 }, { x: 1, y: 8.2 }, BOX)
    const s = lineThrough({ x: 0, y: 1 }, { x: 1, y: 1.8 }, BOX)
    const e = intersect(d, s)!
    expect(e.x).toBeCloseTo(5)
    expect(e.y).toBeCloseTo(5)
    expect(yAt(d, 2.5)).toBeCloseTo(7)
    expect(xAt(s, 3)).toBeCloseTo(2.5)
    expect(intersect(shifted(d, 1, 0), d)).toBeNull()
  })

  it('crosses a bent curve every time', () => {
    const zigzag = [{ x: 0, y: 0 }, { x: 2, y: 4 }, { x: 4, y: 0 }]
    expect(crossings(zigzag, [{ x: 0, y: 2 }, { x: 4, y: 2 }]).map((p) => p.x)).toEqual([1, 3])
  })

  it('bows a production possibilities curve out, keeps it straight at 1, and in below it', () => {
    const mid = (n: number) => yAt(bowed(10, 10, n), 5)!
    expect(mid(2)).toBeGreaterThan(5.1)
    expect(mid(1)).toBeCloseTo(5, 1)
    expect(mid(0.6)).toBeLessThan(4.9)
    const c = bowed(8, 6, 2)
    expect(c[0]).toEqual({ x: 0, y: 6 })
    expect(c.at(-1)!.x).toBeCloseTo(8)
  })

  it('runs flat, slopes down and runs flat again', () => {
    const c = flatSlopeFlat(3, 7, 8, 2, 10)
    expect(yAt(c, 1)).toBeCloseTo(8)
    expect(yAt(c, 5)).toBeCloseTo(5)
    expect(yAt(c, 9)).toBeCloseTo(2)
  })

  it('walks along a curve by its length', () => {
    const { at, dir } = along([{ x: 0, y: 0 }, { x: 10, y: 0 }], 0.25)
    expect(at).toEqual({ x: 2.5, y: 0 })
    expect(dir).toEqual({ x: 1, y: 0 })
  })

  it('measures a region', () => {
    const square = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }]
    expect(areaOf(square)).toBe(4)
    expect(centroidOf(square)).toEqual({ x: 1, y: 1 })
  })

  it('bulges a brace toward the side asked for', () => {
    expect(braceOf({ x: 0, y: 0 }, { x: 100, y: 0 }, 'below', 7).tip.y).toBeGreaterThan(0)
    expect(braceOf({ x: 0, y: 0 }, { x: 100, y: 0 }, 'above', 7).tip.y).toBeLessThan(0)
    expect(braceOf({ x: 0, y: 0 }, { x: 0, y: 100 }, 'left', 7).tip.x).toBeLessThan(0)
  })
})
