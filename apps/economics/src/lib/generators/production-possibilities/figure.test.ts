import { describe, expect, it } from 'vitest'
import { labelBoxes, overlaps } from '$lib/graph/testing'
import { bendOf, buildPpc, curvesOf, onCurve, placesOf } from './figure'
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
    expect(onCurve(100, 100, bendOf({ shape: 'in', bow: 2 }), 0.5).y).toBeLessThan(50)
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
    // Read off the grid to whole numbers (B is at 96.8, so 97), each step from the last's reading, so they add up.
    expect(g.readout[0]).toBe('A to B: 3 capital goods given up for 25 consumer goods (0.12 each)')
    expect(given.reduce((a, b) => a + b)).toBe(100)
    expect(texts({ look: 'numeric', steps: true, points: 'A,on,0;B,on,0.5' })).toEqual(expect.arrayContaining(['−13', '+50']))
    // Finer when the curve's ends are typed finer.
    expect(build({ look: 'numeric', steps: true, xMax: 37.5, points: 'A,on,0;B,on,1' }).readout[0]).toMatch(/for 37.5 consumer goods/)
    // Straight, every step costs the same.
    const flat = build({ look: 'numeric', shape: 'straight', steps: true, points: 'A,on,0;B,on,0.5;C,on,1' })
    expect(flat.readout[0]).toMatch(/^Each unit of consumer goods costs 1 capital goods/)
    expect(build({ steps: true, points: 'A,on,0.5' }).notes[0]).toMatch(/at least two points/)
  })

  it('makes whole, classroom steps of the increasing opportunity cost setup, each size by its own step', () => {
    const s = settingsFor(SETUPS.find((x) => x.id === 'increasing')!, ppcSettings.defaults, ppcSettings.defaults)
    const g = buildPpc(s)
    expect(g.readout).toEqual([
      'A to B: 10 capital goods given up for 25 consumer goods (0.4 each)',
      'B to C: 20 capital goods given up for 25 consumer goods (0.8 each)',
      'C to D: 30 capital goods given up for 25 consumer goods (1.2 each)',
      'D to E: 60 capital goods given up for 25 consumer goods (2.4 each)',
    ])
    // The points on the curve drawn are within half a unit (a sixth of a millimetre or so) of those whole numbers.
    const ys = placesOf(s).map((p) => p.y)
    ys.forEach((y, k) => expect(Math.abs(y - [120, 110, 90, 60, 0][k])).toBeLessThan(0.5))
    // What each step gives up is right of its upright line, inside the step; what it gains under its level line
    // (or, along the x-axis, over it).
    const p = g.figure.panels[0]
    const at = (t: string) => p.labels.filter((l) => l.runs?.map((r) => r.text).join('') === t)
    const places = placesOf(s)
    for (const [k, t] of ['−10', '−20', '−30', '−60'].entries()) {
      const [l] = at(t)
      expect(l.anchor).toBe('start')
      expect(l.x).toBeGreaterThan(p.px(places[k]).x)
      expect(l.x).toBeLessThan(p.px(places[k + 1]).x)
    }
    const gains = at('+25').sort((a, b) => a.x - b.x)
    expect(gains).toHaveLength(4)
    gains.forEach((l, k) => {
      expect(l.x).toBeGreaterThan(p.px(places[k]).x)
      expect(l.x).toBeLessThan(p.px(places[k + 1]).x)
      if (k < 3) expect(l.y).toBeGreaterThan(p.px(places[k + 1]).y)
    })
  })

  it("gives each country's opportunity costs", () => {
    const g = build({ countries: 'side', xTitle: 'Wheat', yTitle: 'Cloth' })
    expect(g.figure.panels).toHaveLength(2)
    expect(g.readout).toEqual([
      'Country A: each unit of wheat costs 0.5 cloth; each unit of cloth, 2 wheat',
      'Country B: each unit of wheat costs 1 cloth; each unit of cloth, 1 wheat',
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

  it("keeps each caption with its own point, clear of the others' names", () => {
    const cases = [
      'A,on,0.35,,Efficient;B,on,0.7,,Efficient;C,inside,0.5,,Inefficient;D,outside,0.55,,Unattainable',
      'A,on,0.25,,Efficient;B,on,0.75,,Efficient;C,inside,0.35,,Inefficient;D,outside,0.55,,Unattainable',
      'A,on,0.35,,Efficient;B,inside,0.55,,Inefficient;C,outside,0.7,,Unattainable',
    ]
    for (const points of cases) {
      for (const captionMode of ['blank', 'text'] as const) {
        const p = panel({ points, captionMode, curveLabelMode: 'blank' })
        const boxes = labelBoxes({ ...build({ points }).figure, panels: [{ ...p, at: { x: 0, y: 0 } }] })
        const names = boxes.filter((b) => /^[A-D]$/.test(b.text))
        const gap = (b: (typeof boxes)[number], q: { x: number; y: number }) => Math.hypot(Math.max(b.x0 - q.x, 0, q.x - b.x1), Math.max(b.y0 - q.y, 0, q.y - b.y1))
        const close: string[] = []
        for (const l of p.leaders) {
          // The caption the arrow comes from, and the point it goes to.
          const from = { x: l.x1, y: l.y1 }
          const caption = boxes.filter((b) => !/^[A-D]$/.test(b.text)).reduce((a, b) => (gap(b, from) < gap(a, from) ? b : a))
          const to = p.dots.reduce((a, b) => (Math.hypot(b.x - l.x2, b.y - l.y2) < Math.hypot(a.x - l.x2, a.y - l.y2) ? b : a))
          const own = gap(caption, to)
          const name = names.find((n) => gap(n, to) < 30)
          // Nearer its own point, by a good way, than any other point or name.
          for (const d of p.dots.filter((d) => d !== to)) if (gap(caption, d) - own < 10) close.push(`${caption.text} by a point`)
          for (const n of names.filter((n) => n !== name)) if (gap(caption, { x: (n.x0 + n.x1) / 2, y: (n.y0 + n.y1) / 2 }) - own < 10) close.push(`${caption.text} by ${n.text}`)
        }
        expect([points, captionMode, close]).toEqual([points, captionMode, []])
      }
    }
  })

  it("names the inner curve inside it and the outer outside, never across the other from a point", () => {
    for (const shiftDir of ['out', 'in'] as const) {
      const s = tidy({ shift: 'both', shiftDir, points: 'A,on,0.55' })
      const p = buildPpc(s).figure.panels[0]
      const { X1, Y1, X2, Y2 } = curvesOf(s)
      const n = s.bow
      const [inner, outer] = (X1 < X2 ? [[X1, Y1, 1], [X2, Y2, 2]] : [[X2, Y2, 2], [X1, Y1, 1]]) as [number, number, number][]
      // Where a label's middle is, in the graph's units, against a curve: below 1 inside it.
      const against = (t: string, X: number, Y: number) => {
        const l = labelBoxes({ ...buildPpc(s).figure, panels: [{ ...p, at: { x: 0, y: 0 } }] }).find((b) => b.text === t)!
        const o = p.px({ x: 0, y: 0 })
        const e = p.px({ x: 1, y: 1 })
        const g = { x: ((l.x0 + l.x1) / 2 - o.x) / (e.x - o.x), y: ((l.y0 + l.y1) / 2 - o.y) / (e.y - o.y) }
        return Math.pow(g.x / X, n) + Math.pow(g.y / Y, n)
      }
      expect(against(`PPC${inner[2]}`, inner[0], inner[1])).toBeLessThan(1)
      expect(against(`PPC${outer[2]}`, outer[0], outer[1])).toBeGreaterThan(1)
      // A, on the inner curve after a shift out, named between it and the outer curve, not past it.
      if (shiftDir === 'out') expect(against('A', outer[0], outer[1])).toBeLessThan(1)
    }
  })

  it('never overlaps two labels, in any setup or curve shape', () => {
    for (const setup of SETUPS) {
      for (const look of ['schematic', 'numeric'] as const) {
        const s = { ...settingsFor(setup, ppcSettings.defaults, ppcSettings.defaults), look }
        const f = buildPpc(s).figure
        expect([setup.id, look, overlaps(f)]).toEqual([setup.id, look, []])
        // (The first of the numbered steps' sizes is a hair's breadth from its lines, and, numbered straight, the
        // last step's loss, over what it gains, from the line.)
        const crowded = look === 'numeric' && (setup.id === 'increasing' || setup.id === 'constant') ? 1 : 0
        expect([setup.id, look, f.panels.reduce((a, q) => a + q.crowded, 0)]).toEqual([setup.id, look, crowded])
      }
    }
    for (const shape of SHAPES) {
      for (const shift of ['none', 'both', 'x', 'y'] as const) {
        const f = build({ shape, shift, steps: true }).figure
        expect([shape, shift, overlaps(f)]).toEqual([shape, shift, []])
        // And every label clear of every line too: with the steps, unless there's a shift, whose old curve's
        // name goes in among them; without, unless it's a bowed-in curve squeezed by a shift.
        if (shift === 'none') expect([shape, shift, f.panels[0].crowded]).toEqual([shape, shift, 0])
        if (shape !== 'in') expect([shape, shift, build({ shape, shift }).figure.panels[0].crowded]).toEqual([shape, shift, 0])
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

  it('puts a point outside the curve past every curve drawn, so it is still unattainable after growth', () => {
    for (const look of ['schematic', 'numeric'] as const) {
      const s = tidy({ look, shift: 'both', points: 'A,outside,0.4,,Unattainable;B,inside,0.4,,Inefficient' })
      const { X1, Y1, X2, Y2 } = curvesOf(s)
      const [a, b] = placesOf(s)
      const past = (p: { x: number; y: number }, X: number, Y: number) => Math.hypot(p.x / X, p.y / Y) > 1
      expect([look, past(a, X2, Y2), past(b, X1, Y1)]).toEqual([look, true, false])
    }
  })

  it('bows in meeting each axis at an angle, not running along it', () => {
    for (const bow of [1.2, 2, 4]) {
      const bend = bendOf({ shape: 'in', bow })
      // Neither upright at the y-axis nor flat at the x-axis.
      expect((1 - bend.height(0.001)) / 0.001).toBeLessThan(10)
      expect(bend.height(0.999) / 0.001).toBeGreaterThan(0.1)
      expect(bend.height(0.5)).toBeLessThan(0.5)
    }
  })

  it('writes each step size by its own step, with commas in thousands, or not at all', () => {
    const cases = [
      { shape: 'in' as const, points: 'A,on,0;B,on,0.25;C,on,0.5;D,on,0.75;E,on,1' },
      { xMax: 37, yMax: 23, points: 'A,on,0;B,on,0.3;C,on,0.6;D,on,0.9' },
      { shape: 'straight' as const, labelSize: 'large' as const, points: 'A,on,0;B,on,0.25;C,on,0.5;D,on,0.75;E,on,1' },
      { labelSize: 'large' as const, bow: 1.5, yMax: 120, points: 'A,on,0;B,on,0.25;C,on,0.5;D,on,0.75;E,on,1' },
    ]
    for (const c of cases) {
      const s = tidy({ look: 'numeric', steps: true, ...c })
      const p = buildPpc(s).figure.panels[0]
      expect(overlaps(buildPpc(s).figure)).toEqual([])
      // What each gives up right of its own upright line, level with it.
      const on = placesOf(s).map((q) => p.px(q))
      for (const l of p.labels.filter((l) => l.runs?.[0]?.text.startsWith('−'))) {
        const k = on.findIndex((q, j) => j > 0 && l.y > on[j - 1].y && l.y - p.labelFs < q.y + 2)
        expect([c, l.x > on[k - 1].x]).toEqual([c, true])
      }
    }
    expect(texts({ look: 'numeric', xMax: 5000, yMax: 2000, steps: true, points: 'A,on,0;B,on,0.4;C,on,0.8' })).toEqual(expect.arrayContaining(['+2,000']))
  })

  it('keeps names inside a numbered grid, and an inner country named toward the origin', () => {
    for (const over of [{ look: 'numeric' as const }, settingsFor(SETUPS.find((x) => x.id === 'increasing')!, ppcSettings.defaults, ppcSettings.defaults)]) {
      const p = panel(over)
      const ppc = labelBoxes({ ...build(over).figure, panels: [{ ...p, at: { x: 0, y: 0 } }] }).find((b) => b.text === 'PPC')!
      expect(ppc.x1).toBeLessThanOrEqual(p.grid.x + p.grid.w)
    }
    const p = panel({ countries: 'together', aX: 40, aY: 20, bX: 20, bY: 10 })
    const b = labelBoxes({ ...build({ countries: 'together', aX: 40, aY: 20, bX: 20, bY: 10 }).figure, panels: [{ ...p, at: { x: 0, y: 0 } }] }).find((l) => l.text === 'Country B')!
    const o = p.px({ x: 0, y: 0 })
    const e = p.px({ x: 1, y: 1 })
    const mid = { x: ((b.x0 + b.x1) / 2 - o.x) / (e.x - o.x), y: ((b.y0 + b.y1) / 2 - o.y) / (e.y - o.y) }
    expect(mid.x / 20 + mid.y / 10).toBeLessThan(1)
  })

  it('draws a straight line shifting with arrows alike, square to it', () => {
    const [a, b] = panel({ shape: 'straight', shift: 'both', points: 'A,on,0.5;B,on2,0.5' }).arrows
    const way = (s: { x1: number; y1: number; x2: number; y2: number }) => Math.atan2(s.y2 - s.y1, s.x2 - s.x1)
    expect(way(a)).toBeCloseTo(way(b), 2)
    expect(way(a)).toBeCloseTo(-Math.PI / 4, 1)
  })

  it('keeps guides from running all but along each other', () => {
    const s = tidy({ guides: true, points: 'A,on,0.35,,Efficient;B,inside,0.55,,Inefficient;C,outside,0.7,,Unattainable' })
    const [a, b] = placesOf(s)
    expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(0.3)
    // Not moved without guides.
    expect(placesOf({ ...s, guides: false })[1].x).toBeCloseTo(onCurve(8, 8, bendOf(s), 0.55).x * 0.6)
  })

  it('says in words only what is drawn, and which way a shift or pivot goes', () => {
    const efficiency = 'A,on,0.35,,Efficient;B,inside,0.55,,Inefficient;C,outside,0.7,,Unattainable'
    expect(build({ points: efficiency }).label).toMatch(/points A \(efficient\), B \(inefficient\) and C \(unattainable\)/)
    const blank = build({ points: efficiency, captionMode: 'blank' }).label
    expect(blank).toMatch(/points A, B and C, each with an arrow from a blank line/)
    expect(blank).not.toMatch(/efficient|unattainable/i)
    expect(build({ points: efficiency, pointMode: 'none', captionMode: 'none' }).label).toMatch(/: 3 points$/)
    expect(build({ shift: 'x', points: '' }).label).toMatch(/the consumer goods intercept moves out; the curve pivots on the capital goods intercept/)
    expect(build({ shift: 'y', shiftDir: 'in', points: '' }).label).toMatch(/the capital goods intercept moves in; the curve pivots on the consumer goods intercept/)
    expect(build({ look: 'numeric', shift: 'both', xMax2: 80, yMax2: 70, points: '' }).label).toMatch(/the curve shifts in/)
    expect(build({ look: 'numeric', shift: 'both', xMax2: 80, yMax2: 120, points: '' }).label).toMatch(/the consumer goods intercept in and the capital goods intercept out/)
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
