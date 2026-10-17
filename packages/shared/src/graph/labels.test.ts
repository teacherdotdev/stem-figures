import { describe, expect, it } from 'vitest'
import { DASHES, alongCurve, besidePoint, crosses, layoutKey, placer, textBox, textWidth } from './labels'

const overlap = (a: { x0: number; y0: number; x1: number; y1: number }, b: typeof a) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

describe('measuring labels', () => {
  it('matches bold Arial, as Chromium draws it', () => {
    // Widths measured in Chromium with Liberation Sans Bold (Arial's metrics), per letter at size 1.
    expect(textWidth('Inflection point (N = K/2)', 1)).toBeCloseTo(0.443 * 26, 1)
    expect(textWidth('Fastest growth (N = K/2)', 1)).toBeCloseTo(0.478 * 24, 1)
    expect(textWidth('Carrying capacity (K)', 1)).toBeCloseTo(0.479 * 21, 1)
    expect(textWidth('1000', 1)).toBeCloseTo(0.556 * 4, 2)
  })

  it('boxes a line of text from its anchor, capitals up and descenders down', () => {
    expect(textBox({ x: 100, y: 50, anchor: 'start' }, 40, 10)).toEqual({ x0: 100, y0: 42.2, x1: 140, y1: 53 })
    expect(textBox({ x: 100, y: 50, anchor: 'end' }, 40, 10).x0).toBe(60)
    expect(textBox({ x: 100, y: 50, anchor: 'middle' }, 40, 10).x0).toBe(80)
  })

  it('tells when a segment passes through a box', () => {
    const box = { x0: 0, y0: 0, x1: 10, y1: 10 }
    expect(crosses({ x1: -5, y1: 5, x2: 15, y2: 5 }, box)).toBe(true)
    expect(crosses({ x1: 2, y1: 2, x2: 3, y2: 3 }, box)).toBe(true)
    expect(crosses({ x1: -5, y1: 20, x2: 20, y2: 15 }, box)).toBe(false)
    expect(crosses({ x1: -5, y1: -1, x2: 15, y2: -1 }, box)).toBe(false)
  })
})

describe('the placer', () => {
  const bounds = { x0: 0, y0: 0, x1: 400, y1: 300 }

  it('takes the first place that touches nothing', () => {
    const place = placer(bounds)
    place.line([{ x: 0, y: 100 }, { x: 400, y: 100 }])
    const spot = place.place([{ x: 50, y: 104, anchor: 'start' }, { x: 50, y: 80, anchor: 'start' }], 60, 12)
    expect(spot.y).toBe(80)
  })

  it('keeps labels off ones already placed, and inside its bounds', () => {
    const place = placer(bounds)
    const spots = [{ x: 390, y: 50, anchor: 'start' as const }, { x: 100, y: 50, anchor: 'start' as const }, { x: 100, y: 90, anchor: 'start' as const }]
    const a = place.place(spots, 60, 12)
    const b = place.place(spots, 60, 12)
    expect(a.x).toBe(100)
    expect(b.y).toBe(90)
    expect(overlap(a.box, b.box)).toBe(false)
  })

  it('crosses a soft line before a hard one, and takes the least bad place when none is free', () => {
    const place = placer(bounds)
    place.line([{ x: 0, y: 100 }, { x: 400, y: 100 }])
    place.line([{ x: 0, y: 200 }, { x: 400, y: 200 }], true)
    const spot = place.place([{ x: 50, y: 104, anchor: 'start' }, { x: 50, y: 204, anchor: 'start' }], 60, 12)
    expect(spot.y).toBe(204)
    const scored = place.choose([{ box: { x0: 10, y0: 95, x1: 50, y1: 105 } }], false)
    expect(scored.score).toBeGreaterThan(0)
  })
})

describe('places to offer', () => {
  it('beside a marked point: below right first, then above', () => {
    const spots = besidePoint({ x: 100, y: 100 }, 10)
    expect(spots[0]).toEqual({ x: 112, y: 113, anchor: 'start' })
    expect(spots[1].y).toBeLessThan(100)
    expect(spots).toHaveLength(6)
  })

  it('along a curve, from its far end back, either side of it', () => {
    const pts = Array.from({ length: 21 }, (_, k) => ({ x: k * 10, y: 100 }))
    const spots = alongCurve(pts, 10)
    expect(spots[0].x).toBeGreaterThan(spots.at(-1)!.x)
    expect(spots.slice(0, 4).map((s) => s.y > 100)).toEqual([false, true, false, true])
    expect(alongCurve([{ x: 0, y: 0 }], 10)).toEqual([])
  })
})

describe('the key', () => {
  const curves = [{ index: 0, name: 'Pepsin' }, { index: 1, name: 'Salivary amylase' }, { index: 2, name: 'Trypsin' }]
  const at = { midX: 250, top: 400, left: 14, fs: 14, labelFs: 14.7 }

  it('centers one row under the graph, a line sample before each name', () => {
    const key = layoutKey(curves, { ...at, wrap: 480 })
    const ys = new Set(key.entries.map((e) => e.sample.y1))
    expect(ys.size).toBe(1)
    const first = key.entries[0]
    expect(first.text.x).toBe(first.sample.x2 + 6)
    expect((first.sample.x1 + key.right) / 2).toBeCloseTo(250, 6)
    expect(key.bottom).toBeGreaterThan(400)
  })

  it('wraps onto more rows when one would be too wide', () => {
    const key = layoutKey(curves, { ...at, wrap: 200 })
    expect(new Set(key.entries.map((e) => e.sample.y1)).size).toBeGreaterThan(1)
    for (const e of key.entries) expect(e.sample.x1).toBeGreaterThanOrEqual(14)
  })

  it('has a dash for each of three curves, the first solid', () => {
    expect(DASHES).toHaveLength(3)
    expect(DASHES[0]).toBeUndefined()
    expect(new Set(DASHES).size).toBe(3)
  })
})
