import { describe, expect, it } from 'vitest'
import { crosses, textBox, textWidth } from '$shared/graph/labels'
import { overlaps } from '$lib/graph/testing'
import { buildPhillips, fitOf, inflationAt, modelOf } from './figure'
import { CURVATURES, LABEL_KEYS, phillipsSettings, type PhillipsSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const tidy = (over: Partial<PhillipsSettings> = {}) => phillipsSettings.tidy({ ...phillipsSettings.defaults, ...over })
const build = (over: Partial<PhillipsSettings> = {}) => buildPhillips(tidy(over))
const panel = (over: Partial<PhillipsSettings> = {}) => build(over).figure.panels[0]
const texts = (over: Partial<PhillipsSettings>) => panel(over).labels.map((l) => l.runs?.map((r) => r.text).join('') ?? '')
const numbered = { look: 'numeric' } as const

type Seg = { x1: number; y1: number; x2: number; y2: number }
/** Whether two segments on the drawing cross or touch. */
const segmentsMeet = (a: Seg, b: Seg) => gap(a, b) < 0.5
/** How far apart two segments on the drawing come. */
function gap(a: Seg, b: Seg) {
  const side = (s: Seg, x: number, y: number) => Math.sign((s.x2 - s.x1) * (y - s.y1) - (s.y2 - s.y1) * (x - s.x1))
  if (side(a, b.x1, b.y1) * side(a, b.x2, b.y2) < 0 && side(b, a.x1, a.y1) * side(b, a.x2, a.y2) < 0) return 0
  const to = (px: number, py: number, s: Seg) => {
    const dx = s.x2 - s.x1
    const dy = s.y2 - s.y1
    const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / (dx * dx + dy * dy || 1)))
    return Math.hypot(px - s.x1 - t * dx, py - s.y1 - t * dy)
  }
  return Math.min(to(a.x1, a.y1, b), to(a.x2, a.y2, b), to(b.x1, b.y1, a), to(b.x2, b.y2, a))
}

describe('phillips curve', () => {
  it('draws a convex SRPC sloping down, crossing a vertical LRPC at the natural rate', () => {
    const m = modelOf(tidy())
    expect(m.A).toEqual({ x: 5, y: 3.5 })
    expect(inflationAt(m.srpc1, 5)).toBeCloseTo(3.5)
    // Sloping down, and bending: steeper on the left than on the right.
    const slope = (u: number) => inflationAt(m.srpc1, u + 0.01) - inflationAt(m.srpc1, u)
    expect(slope(3)).toBeLessThan(slope(7))
    expect(slope(7)).toBeLessThan(0)
    // Every curvature crosses the LRPC at A sloping down at 1, bending more or less either side.
    for (const curvature of CURVATURES) {
      const c = modelOf(tidy({ curvature })).srpc1
      expect((inflationAt(c, 5.001) - inflationAt(c, 4.999)) / 0.002).toBeCloseTo(-1, 3)
    }
    expect(inflationAt(modelOf(tidy({ curvature: 'strong' })).srpc1, 3)).toBeGreaterThan(inflationAt(modelOf(tidy({ curvature: 'gentle' })).srpc1, 3))
    const p = panel()
    expect(p.curves).toHaveLength(2)
    expect(texts({})).toEqual(expect.arrayContaining(['SRPC', 'LRPC', 'un', 'A', 'π']))
  })

  it('moves up the SRPC from A to B, and in the long run back to the LRPC at C at the higher inflation', () => {
    const m = modelOf(tidy({ movement: 'along', along: 'up', longRun: true }))
    expect(m.B!.x).toBeLessThan(m.A.x)
    expect(m.B!.y).toBeGreaterThan(m.A.y)
    expect(m.C).toEqual({ x: m.A.x, y: m.B!.y })
    expect(inflationAt(m.srpc2!, m.A.x)).toBeCloseTo(m.B!.y)
    expect(texts({ movement: 'along', longRun: true })).toEqual(expect.arrayContaining(['SRPC1', 'SRPC2', 'A', 'B', 'C', 'π1', 'π2', 'u1', 'un']))
    const down = modelOf(tidy({ movement: 'along', along: 'down' }))
    expect(down.B!.x).toBeGreaterThan(down.A.x)
    expect(down.B!.y).toBeLessThan(down.A.y)
  })

  it('shifts the SRPC up along the LRPC, with stagflation after a supply shock', () => {
    const shock = modelOf(tidy({ movement: 'srpc', srpcSide: 'right', cause: 'shock' }))
    expect(shock.srpc2!.pe).toBeGreaterThan(shock.pe)
    expect(shock.B!.x).toBeGreaterThan(shock.A.x)
    expect(shock.B!.y).toBeGreaterThan(shock.A.y)
    const expect2 = modelOf(tidy({ movement: 'srpc', srpcSide: 'left', cause: 'expectations' }))
    expect(expect2.B!.x).toBe(expect2.A.x)
    expect(expect2.B!.y).toBeLessThan(expect2.A.y)
    expect(panel({ movement: 'srpc', arrows: 3 }).arrows.length).toBe(4)
    expect(panel({ movement: 'srpc', arrows: 0, pathArrows: false }).arrows).toHaveLength(0)
  })

  it('shifts the LRPC and the SRPC with it when the natural rate falls', () => {
    const m = modelOf(tidy({ movement: 'lrpc', lrpcSide: 'left' }))
    expect(m.un2).toBeLessThan(m.un)
    expect(inflationAt(m.srpc2!, m.un2!)).toBeCloseTo(m.pe)
    expect(texts({ movement: 'lrpc' })).toEqual(expect.arrayContaining(['LRPC1', 'LRPC2', 'SRPC1', 'SRPC2', 'un1', 'un2']))
    expect(panel({ movement: 'lrpc', withSrpc: false }).curves).toHaveLength(3)
  })

  it('goes through the points typed on a numbered graph, with % on the numbers and the axes crossing at 0 for deflation', () => {
    const g = build({ ...numbered, movement: 'along', longRun: true })
    expect(g.model.B).toEqual({ x: 3, y: 6 })
    expect(g.model.C).toEqual({ x: 5, y: 6 })
    expect(g.readout).toEqual(['A: 5% unemployment, 2% inflation', 'B: 3% unemployment, 6% inflation', 'C: 5% unemployment, 6% inflation'])
    // The SRPC falls below 0 at high unemployment, so the inflation axis runs below 0.
    expect(Number(fitOf(tidy(numbered)).yFrom)).toBeLessThan(0)
    const p = g.figure.panels[0]
    expect(p.xAxis.y).toBeLessThan(p.grid.y + p.grid.h)
    expect(p.numbers.map((n) => n.text)).toEqual(expect.arrayContaining(['0%', '4%', '−1%', '10%']))
    // The rates written at the x-axis go under the grid, clear of the LRPC running down through the negative band.
    const un = p.labels.find((l) => l.runs?.map((r) => r.text).join('') === 'un')!
    expect(un.y).toBeGreaterThan(p.grid.y + p.grid.h)
    // One dashed guide across at B and C's shared inflation rate, so the dashes don't run together.
    const across = p.guides.filter((g) => g.y1 === g.y2)
    expect(new Set(across.map((g) => g.y1)).size).toBe(across.length)
    expect(texts({ ...numbered, percent: 'titles' })).toEqual(expect.arrayContaining(['Unemployment rate (%)', 'Inflation rate (%)']))
    expect(panel({ ...numbered, percent: 'titles' }).numbers.map((n) => n.text)).toContain('5')
    // A supply shock to typed rates.
    const shock = build({ ...numbered, movement: 'srpc', expected2: 5, uShock: 6 })
    expect(shock.model.B!.x).toBe(6)
    expect(shock.model.B!.y).toBeCloseTo(4)
  })

  it('says which way a numbered movement goes from where B is, whatever the hidden direction setting', () => {
    expect(build({ ...numbered, movement: 'along', along: 'up', u2: 8, pi2: -1 }).label).toMatch(/a movement down the short-run curve/)
    expect(build({ ...numbered, movement: 'along', along: 'down', u2: 3, pi2: 6 }).label).toMatch(/a movement up the short-run curve/)
    expect(build({ movement: 'along', along: 'down' }).label).toMatch(/a movement down the short-run curve/)
  })

  it('fits deflation with room for the SRPC above A, every point, and arrows clear of the numbers on the grid', () => {
    for (const over of [
      { movement: 'along', u2: 8, pi2: -1 },
      { movement: 'along', u2: 8, pi2: -1, longRun: true },
      { movement: 'along', expected: -1, u2: 9, pi2: -3, longRun: true },
      { movement: 'srpc', expected2: -2, uShock: 4 },
      { movement: 'lrpc', expected: -1, lrpcSide: 'right', nru2: 7 },
    ] as Partial<PhillipsSettings>[]) {
      for (const curvature of CURVATURES) {
        const s = tidy({ ...numbered, curvature, ...over })
        const g = buildPhillips(s)
        const f = fitOf(s)
        const [x0, x1, y0, y1] = [f.xFrom, f.xTo, f.yFrom, f.yTo].map(Number)
        const m = g.model
        for (const p of [m.A, m.B, m.C].filter((p) => !!p)) expect([over, curvature, p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1]).toEqual([over, curvature, true])
        // SRPC₁ comes down into the graph a good stretch above and left of A, not just over it.
        const top = y1 - 0.07 * (y1 - y0)
        let u = m.A.x
        while (u > Math.max(x0, m.srpc1.c) + 0.01 && inflationAt(m.srpc1, u) < top) u -= 0.01
        expect(Math.hypot((m.A.x - u) / (x1 - x0), (inflationAt(m.srpc1, u) - m.A.y) / (y1 - y0))).toBeGreaterThan(0.15)
        // No arrow runs through a number written under the x-axis.
        const p = g.figure.panels[0]
        const boxes = p.numbers.map((n) => textBox(n, textWidth(n.text, p.fs), p.fs))
        expect([over, curvature, p.arrows.filter((a) => boxes.some((b) => crosses(a, b))).length]).toEqual([over, curvature, 0])
      }
    }
  })

  it('says when the typed point would make the SRPC slope up, or the natural rate cannot be', () => {
    expect(build({ ...numbered, u2: 3, pi2: 1 }).notes.join(' ')).toMatch(/slopes down/)
    expect(build({ ...numbered, u2: 5 }).notes.join(' ')).toMatch(/slopes down/)
    expect(build({ ...numbered, nru: 0 }).notes.join(' ')).toMatch(/above 0%/)
    expect(build({ ...numbered, movement: 'srpc', expected2: 2 }).notes.join(' ')).toMatch(/different expected inflation/)
    expect(build({ ...numbered, movement: 'along', fit: false, yTo: '5' }).notes.join(' ')).toMatch(/B is off the graph/)
    expect(build({ srpc: false, lrpc: false }).notes.join(' ')).toMatch(/Show the SRPC or the LRPC/)
  })

  it('draws every label as a blank line when asked', () => {
    const blanks = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'blank']))
    const p = panel({ movement: 'along', longRun: true, ...blanks })
    expect(p.labels.every((l) => l.blank || (l.runs && ['Inflation rate', 'Unemployment rate'].includes(l.runs.map((r) => r.text).join(''))))).toBe(true)
  })

  it('never overlaps two labels, in any setup or label size', () => {
    for (const setup of SETUPS) {
      for (const labelSize of ['small', 'medium', 'large'] as const) {
        const s = settingsFor(setup, phillipsSettings.defaults, { ...phillipsSettings.defaults, labelSize })
        expect([setup.id, labelSize, overlaps(buildPhillips(s).figure)]).toEqual([setup.id, labelSize, []])
      }
    }
    for (const movement of ['along', 'srpc', 'lrpc'] as const) {
      for (const look of ['schematic', 'numeric'] as const) {
        for (const curvature of CURVATURES) {
          const f = build({ movement, look, curvature, along: 'down', srpcSide: 'left', lrpcSide: 'right', longRun: true }).figure
          expect([movement, look, curvature, overlaps(f)]).toEqual([movement, look, curvature, []])
        }
      }
    }
  })

  it('moves a schematic SRPC as far up as right, with stagflation that grows with the size of the shock', () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      const m = modelOf(tidy({ movement: 'srpc', cause: 'shock', size }))
      // B is up and right of A on the new curve, by a clear share of each axis.
      expect(m.B!.x - m.A.x).toBeGreaterThan(0.08 * 10)
      expect(m.B!.y - m.A.y).toBeCloseTo(m.B!.x - m.A.x)
      expect(inflationAt(m.srpc2!, m.B!.x)).toBeCloseTo(m.B!.y)
      // Shift arrows all the same length: the curve moved as a whole.
      const lengths = panel({ movement: 'srpc', size }).arrows.filter((a) => a.color === '#2563eb').map((a) => Math.hypot(a.x2 - a.x1, a.y2 - a.y1))
      expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(1)
    }
    const small = modelOf(tidy({ movement: 'srpc', cause: 'shock', size: 'small' }))
    const large = modelOf(tidy({ movement: 'srpc', cause: 'shock', size: 'large' }))
    expect(large.B!.y - large.A.y).toBeGreaterThan(small.B!.y - small.A.y)
    // Expectations: B on the LRPC; the long run: C on the LRPC at B's inflation.
    const e = modelOf(tidy({ movement: 'srpc', cause: 'expectations', srpcSide: 'left' }))
    expect(inflationAt(e.srpc2!, e.A.x)).toBeCloseTo(e.B!.y)
    const lr = modelOf(tidy({ movement: 'along', along: 'down', longRun: true }))
    expect(inflationAt(lr.srpc2!, lr.A.x)).toBeCloseTo(lr.B!.y)
  })

  it('keeps the economy at A when the LRPC shifts without the SRPC, and says only what is drawn', () => {
    const m = modelOf(tidy({ movement: 'lrpc', withSrpc: false }))
    expect(m.B).toBeNull()
    expect(texts({ movement: 'lrpc', withSrpc: false })).not.toContain('B')
    expect(modelOf(tidy({ ...numbered, movement: 'lrpc', nru2: 7, withSrpc: false })).B).toBeNull()
    expect(build({ movement: 'along', longRun: true, lrpc: false }).label).not.toMatch(/long-run curve/)
    expect(build({ movement: 'srpc', srpc: false }).label).not.toMatch(/short-run curve shifts/)
    // No arrow from a point that isn't drawn.
    expect(panel({ movement: 'along', longRun: true, pointA: false }).arrows.filter((a) => a.color === '#111827')).toHaveLength(1)
    expect(build({ ...numbered, movement: 'srpc', uShock: 4 }).notes.join(' ')).toMatch(/above the natural rate/)
  })

  it('keeps the curves and the natural rates off the y-axis, and no SRPC starts at the top of an LRPC', () => {
    for (const nruAt of [0.4, 0.5, 0.7]) {
      for (const size of ['small', 'medium', 'large'] as const) {
        for (const curvature of CURVATURES) {
          for (const over of [
            { movement: 'lrpc', lrpcSide: 'left' }, { movement: 'lrpc', lrpcSide: 'right' },
            { movement: 'srpc', srpcSide: 'left' }, { movement: 'srpc', srpcSide: 'right' },
            { movement: 'along', along: 'down', longRun: true }, { movement: 'along', along: 'up', longRun: true },
          ] as Partial<PhillipsSettings>[]) {
            const s = tidy({ nruAt, size, curvature, ...over })
            const m = modelOf(s)
            const p = buildPhillips(s).figure.panels[0]
            const at = [over, nruAt, size, curvature]
            const left = p.px({ x: 0.6, y: 0 }).x
            for (const c of p.curves) for (const d of c.paths) expect([...at, Math.min(...[...d.matchAll(/[ML]([\d.]+),/g)].map((x) => Number(x[1]))) >= left]).toEqual([...at, true])
            if (m.un2 !== null) expect([...at, m.un2 >= 1.4 && m.un2 <= 8.4]).toEqual([...at, true])
          }
        }
      }
    }
  })

  it('keeps shift arrows off the dashed guides, the point-to-point arrows and each other', () => {
    const cases: Partial<PhillipsSettings>[] = [
      ...SETUPS.map((x) => x.settings),
      { ...numbered, movement: 'along', longRun: true, expected: 6, u2: 8, pi2: 2 },
      { ...numbered, movement: 'along', longRun: true, u2: 8, pi2: -1 },
      { movement: 'along', along: 'down', longRun: true, size: 'large' },
      { movement: 'srpc', cause: 'shock', nruAt: 0.7 },
      { movement: 'lrpc', lrpcSide: 'right', arrows: 3 },
      { movement: 'srpc', arrows: 3 },
    ]
    for (const over of cases) {
      const p = panel(over)
      const shifts = p.arrows.filter((a) => a.color !== '#111827')
      const paths = p.arrows.filter((a) => a.color === '#111827')
      for (const a of shifts) {
        for (const g of p.guides) expect([over, segmentsMeet(a, g)]).toEqual([over, false])
        for (const b of [...paths, ...shifts.filter((b) => b !== a)]) expect([over, gap(a, b) > 8]).toEqual([over, true])
      }
    }
  })

  it('names each LRPC at its own top, clear of the other', () => {
    for (const over of [
      { movement: 'lrpc', lrpcSide: 'left' }, { movement: 'lrpc', lrpcSide: 'right' }, { movement: 'lrpc', lrpcSide: 'left', labelSize: 'large' },
      { movement: 'lrpc', size: 'small' }, { ...numbered, movement: 'lrpc', nru2: 6.5 }, { ...numbered, movement: 'lrpc' },
    ] as Partial<PhillipsSettings>[]) {
      const p = panel(over)
      const lrpcs = p.curves.filter((c) => c.color === '#dc2626').map((c) => c.paths[0].match(/[\d.]+/g)!.map(Number))
      for (const [k, name] of ['LRPC1', 'LRPC2'].entries()) {
        const l = p.labels.find((x) => x.runs?.map((r) => r.text).join('') === name)!
        const box = textBox(l, textWidth(name, p.labelFs), p.labelFs)
        // Off every LRPC, and nearer the top of its own than of the other.
        for (const [x1, y1, x2, y2] of lrpcs) expect([over, name, crosses({ x1, y1, x2, y2 }, box)]).toEqual([over, name, false])
        const own = lrpcs.find(([x]) => Math.abs(x - p.px({ x: k ? modelOf(tidy(over)).un2! : modelOf(tidy(over)).un, y: 0 }).x) < 0.5)!
        const other = lrpcs.find((c) => c !== own)!
        // How far the line's top is from the name.
        const d = ([x1, y1, , y2]: number[]) => {
          const y = Math.min(y1, y2)
          return Math.hypot(Math.max(box.x0 - x1, 0, x1 - box.x1), Math.max(box.y0 - y, 0, y - box.y1))
        }
        expect([over, name, d(own) < d(other)]).toEqual([over, name, true])
      }
    }
  })

  it('runs a numbered graph only a little below 0 for the curves’ tails', () => {
    expect(Number(fitOf(tidy({ ...numbered, movement: 'along', longRun: true, expected: 6, u2: 8, pi2: 2 })).yFrom)).toBeGreaterThanOrEqual(-2)
    expect(Number(fitOf(tidy(numbered)).yFrom)).toBe(-1)
    // Ending on a numbered line.
    const f = fitOf(tidy({ ...numbered, movement: 'along', longRun: true, expected: 6, u2: 8, pi2: 2 }))
    expect((Number(f.xTo) / Number(f.xStep)) % 2).toBe(0)
  })

  it('keeps the defaults out of the address, and reads back what it wrote', () => {
    expect(phillipsSettings.toQuery(phillipsSettings.defaults)).toBe('')
    const s = tidy({ movement: 'srpc', cause: 'expectations', srpcLabel: 'SRPC_{old}', look: 'numeric', nru: 4.5, expected: -1, percent: 'titles' })
    expect(phillipsSettings.fromParams(new URLSearchParams(phillipsSettings.toQuery(s)))).toEqual(s)
  })
})
