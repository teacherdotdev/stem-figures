import { describe, expect, it } from 'vitest'
import { overlaps } from '$lib/graph/testing'
import { buildPhillips, fitOf, inflationAt, modelOf } from './figure'
import { CURVATURES, LABEL_KEYS, phillipsSettings, type PhillipsSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const tidy = (over: Partial<PhillipsSettings> = {}) => phillipsSettings.tidy({ ...phillipsSettings.defaults, ...over })
const build = (over: Partial<PhillipsSettings> = {}) => buildPhillips(tidy(over))
const panel = (over: Partial<PhillipsSettings> = {}) => build(over).figure.panels[0]
const texts = (over: Partial<PhillipsSettings>) => panel(over).labels.map((l) => l.runs?.map((r) => r.text).join('') ?? '')
const numbered = { look: 'numeric' } as const

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

  it('keeps the defaults out of the address, and reads back what it wrote', () => {
    expect(phillipsSettings.toQuery(phillipsSettings.defaults)).toBe('')
    const s = tidy({ movement: 'srpc', cause: 'expectations', srpcLabel: 'SRPC_{old}', look: 'numeric', nru: 4.5, expected: -1, percent: 'titles' })
    expect(phillipsSettings.fromParams(new URLSearchParams(phillipsSettings.toQuery(s)))).toEqual(s)
  })
})
