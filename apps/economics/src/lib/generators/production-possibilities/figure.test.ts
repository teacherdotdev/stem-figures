import { describe, expect, it } from 'vitest'
import { overlaps } from '$lib/graph/testing'
import { buildPpc, curvesOf, onCurve, placesOf } from './figure'
import { SHAPES, pointsOf, pointsText, ppcSettings, type PpcSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const tidy = (over: Partial<PpcSettings> = {}) => ppcSettings.tidy({ ...ppcSettings.defaults, ...over })
const build = (over: Partial<PpcSettings> = {}) => buildPpc(tidy(over))
const panel = (over: Partial<PpcSettings> = {}, k = 0) => build(over).figure.panels[k]
const texts = (over: Partial<PpcSettings>, k = 0) => panel(over, k).labels.map((l) => l.runs?.map((r) => r.text).join('') ?? '')

describe('production possibilities curve', () => {
  it('puts points on the curve, inside it and outside it', () => {
    const s = tidy({ look: 'numeric', points: 'A,on,0.5;B,inside,0.5;C,outside,0.5' })
    const [a, b, c] = placesOf(s)
    // Bowed out as a quarter circle: x² + y² = 100², so at x = 50, y = √7500.
    expect(a.x).toBeCloseTo(50)
    expect(a.y).toBeCloseTo(Math.sqrt(7500))
    expect(Math.hypot(b.x, b.y)).toBeLessThan(100)
    expect(Math.hypot(c.x, c.y)).toBeGreaterThan(100)
    // Straight, every point on the curve adds to the same total.
    const line = placesOf(tidy({ look: 'numeric', shape: 'straight', points: 'A,on,0.2;B,on,0.7' }))
    for (const p of line) expect(p.x + p.y).toBeCloseTo(100)
    // Bowed in, the middle of the curve sags under the straight line.
    expect(onCurve(100, 100, 0.5, 0.5).y).toBeLessThan(50)
  })

  it('shifts out, in, or pivots on one axis only', () => {
    const out = curvesOf(tidy({ shift: 'both', shiftDir: 'out' }))
    expect(out.X2).toBeGreaterThan(out.X1)
    expect(out.Y2).toBeGreaterThan(out.Y1)
    expect(out.X2).toBeLessThanOrEqual(10)
    const inward = curvesOf(tidy({ shift: 'both', shiftDir: 'in' }))
    expect(inward.X2).toBeLessThan(inward.X1)
    const pivot = curvesOf(tidy({ shift: 'x', shiftDir: 'out' }))
    expect(pivot.X2).toBeGreaterThan(pivot.X1)
    expect(pivot.Y2).toBe(pivot.Y1)
    const n = curvesOf(tidy({ look: 'numeric', shift: 'y', yMax2: 150 }))
    expect([n.X1, n.Y1, n.X2, n.Y2]).toEqual([100, 100, 100, 150])
    expect(texts({ shift: 'both' })).toEqual(expect.arrayContaining(['PPC1', 'PPC2']))
    expect(panel({ shift: 'both', arrows: 3 }).arrows).toHaveLength(3)
    expect(panel({ shift: 'both', arrows: 0 }).arrows).toHaveLength(0)
    expect(build({ look: 'numeric', shift: 'both', xMax2: 100, yMax2: 100 }).notes[0]).toMatch(/no shift/)
  })

  it('steps down the curve, giving up more of one good for each step of the other when it bows out', () => {
    const g = build({ look: 'numeric', steps: true, points: 'A,on,0;B,on,0.25;C,on,0.5;D,on,0.75;E,on,1' })
    expect(g.figure.panels[0].levels).toHaveLength(4)
    const given = g.readout.map((l) => Number(l.match(/: ([\d.]+) capital goods given up/)?.[1]))
    expect(given).toHaveLength(4)
    for (let k = 1; k < given.length; k++) expect(given[k]).toBeGreaterThan(given[k - 1])
    expect(g.readout[0]).toMatch(/^A to B: 3.18 capital goods given up for 25 consumer goods/)
    expect(texts({ look: 'numeric', steps: true, points: 'A,on,0;B,on,0.5' })).toEqual(expect.arrayContaining(['−13.4', '+50']))
    // Straight, every step costs the same.
    const flat = build({ look: 'numeric', shape: 'straight', steps: true, points: 'A,on,0;B,on,0.5;C,on,1' })
    expect(flat.readout[0]).toMatch(/each unit of consumer goods costs 1 capital goods/)
    expect(build({ steps: true, points: 'A,on,0.5' }).notes[0]).toMatch(/at least two points/)
  })

  it('says which country has the comparative and the absolute advantage', () => {
    const g = build({ countries: 'side', xTitle: 'Wheat', yTitle: 'Cloth' })
    expect(g.figure.panels).toHaveLength(2)
    expect(g.readout).toEqual([
      'Country A: each unit of wheat costs 0.5 cloth; each unit of cloth, 2 wheat',
      'Country B: each unit of wheat costs 1 cloth; each unit of cloth, 1 wheat',
      'Comparative advantage: Country A in wheat, Country B in cloth',
      'Absolute advantage: Country A in wheat, Country B in cloth',
    ])
    // Each panel captioned with its country, with where its curve meets the axes written there.
    expect(g.figure.panels[0].big.map((l) => l.runs?.map((r) => r.text).join(''))).toContain('Country A')
    expect(texts({ countries: 'side' }, 1)).toEqual(expect.arrayContaining(['30', 'PPC']))
    expect(texts({ countries: 'side' }, 1)).not.toContain('40')
    expect(texts({ countries: 'together' })).toEqual(expect.arrayContaining(['Country A', 'Country B', '40', '20', '30']))
    // B meets both axes at 30: written once on each, not twice on either.
    expect(texts({ countries: 'together' }).filter((t) => t === '30')).toHaveLength(2)
    expect(texts({ countries: 'together', bX: 40 }).filter((t) => t === '40')).toHaveLength(1)
    expect(build({ countries: 'together', bX: 20, bY: 10 }).notes[0]).toMatch(/neither has a comparative advantage/)
    expect(build({ countries: 'together', aX: 0 }).notes[0]).toMatch(/above 0/)
  })

  it('lines the two countries up on the same axes', () => {
    const [a, b] = build({ countries: 'side' }).figure.panels
    expect(a.grid.y + a.at.y).toBe(b.grid.y + b.at.y)
    expect(a.grid.h).toBe(b.grid.h)
    expect(a.px({ x: 40, y: 0 }).x - a.px({ x: 0, y: 0 }).x).toBe(b.px({ x: 40, y: 0 }).x - b.px({ x: 0, y: 0 }).x)
  })

  it('says when a point or the curve has nothing to show', () => {
    expect(build({ look: 'numeric', points: 'Z,at,500,20' }).notes).toEqual([])
    expect(build({ look: 'numeric', fit: false, points: 'Z,at,500,20' }).notes[0]).toMatch(/Point Z is off the graph/)
    expect(build({ look: 'numeric', xMax: 0 }).notes[0]).toMatch(/above 0/)
  })

  it('captions points with arrows, or blank lines for students', () => {
    const p = panel({ points: 'A,on,0.35,,Efficient;B,inside,0.55,,Inefficient' })
    expect(p.leaders).toHaveLength(2)
    const blank = panel({ points: 'A,on,0.35,,Efficient', captionMode: 'blank', curveLabelMode: 'blank' })
    expect(blank.labels.filter((l) => l.blank)).toHaveLength(2)
    expect(panel({ points: 'A,on,0.35,,Efficient', captionMode: 'none' }).leaders).toHaveLength(0)
  })

  it('never overlaps two labels, in any setup or curve shape', () => {
    for (const setup of SETUPS) {
      for (const look of ['schematic', 'numeric'] as const) {
        const s = { ...settingsFor(setup, ppcSettings.defaults, ppcSettings.defaults), look }
        expect([setup.id, look, overlaps(buildPpc(s).figure)]).toEqual([setup.id, look, []])
      }
    }
    for (const shape of SHAPES) {
      for (const shift of ['none', 'both', 'x', 'y'] as const) {
        const f = build({ shape, shift, steps: true }).figure
        expect([shape, shift, overlaps(f)]).toEqual([shape, shift, []])
      }
    }
    // Two countries whose lines cross, where one is outside the other, and where they share an intercept.
    for (const [aX, aY, bX, bY] of [[40, 20, 30, 30], [40, 30, 20, 15], [40, 20, 40, 35], [30, 20, 45, 20]]) {
      for (const countries of ['together', 'side'] as const) {
        const f = build({ countries, aX, aY, bX, bY }).figure
        expect([countries, aX, aY, bX, bY, overlaps(f)]).toEqual([countries, aX, aY, bX, bY, []])
      }
    }
  })

  it('reads and writes point rows', () => {
    const rows = pointsOf('A,on,0.5;B,at,30,40,Inefficient;C,nowhere,x')
    expect(rows).toEqual([
      { name: 'A', place: 'on', a: 0.5, b: 0, caption: '' },
      { name: 'B', place: 'at', a: 30, b: 40, caption: 'Inefficient' },
      { name: 'C', place: 'on', a: 0.5, b: 0, caption: '' },
    ])
    expect(pointsText(rows.slice(0, 2))).toBe('A,on,0.5;B,at,30,40,Inefficient')
    expect(pointsText([{ name: 'A,;', place: 'inside', a: 0.25, b: 0, caption: 'Idle; workers' }])).toBe('A,inside,0.25,,Idle workers')
  })

  it('keeps the defaults out of the address, and reads back what it wrote', () => {
    expect(ppcSettings.toQuery(ppcSettings.defaults)).toBe('')
    const s = tidy({ countries: 'side', shift: 'x', points: 'A,on,0.3,,Efficient', aName: 'Country_{1}', look: 'numeric', xTitle: 'Guns' })
    expect(ppcSettings.fromParams(new URLSearchParams(ppcSettings.toQuery(s)))).toEqual(s)
  })
})
