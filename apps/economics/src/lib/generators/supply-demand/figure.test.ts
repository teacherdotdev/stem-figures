import { describe, expect, it } from 'vitest'
import { crosses } from '$shared/graph/labels'
import { inks } from '$lib/graph/panel'
import { labelBoxes, overlaps } from '$lib/graph/testing'
import { buildSupplyDemand } from './figure'
import { DIRECTIONS, LABEL_KEYS, SHAPES, supplyDemandSettings, type SupplyDemandSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const build = (over: Partial<SupplyDemandSettings> = {}) => buildSupplyDemand(supplyDemandSettings.tidy({ ...supplyDemandSettings.defaults, ...over }))
const panel = (over: Partial<SupplyDemandSettings> = {}) => build(over).figure.panels[0]
const texts = (over: Partial<SupplyDemandSettings>) => panel(over).labels.map((l) => l.runs?.map((r) => r.text).join('') ?? '')

describe('supply and demand', () => {
  it('meets at equilibrium in the middle of a schematic graph, marked Pₑ and Qₑ', () => {
    const g = build()
    expect(g.equilibrium!.x).toBeCloseTo(5)
    expect(g.equilibrium!.y).toBeCloseTo(5)
    expect(texts({})).toEqual(expect.arrayContaining(['D', 'S', 'E', 'Pe', 'Qe']))
    expect(texts({ eqStyle: 'star' })).toEqual(expect.arrayContaining(['P*', 'Q*']))
  })

  it('moves equilibrium the way a shift does, and names both', () => {
    const up = build({ shift: 'demand', demandDir: 'increase' })
    expect(up.equilibrium!.x).toBeGreaterThan(5)
    expect(up.equilibrium!.y).toBeGreaterThan(5)
    expect(texts({ shift: 'demand' })).toEqual(expect.arrayContaining(['D1', 'D2', 'E1', 'E2', 'P1', 'P2', 'Q1', 'Q2']))
    const less = build({ shift: 'supply', supplyDir: 'decrease' })
    expect(less.equilibrium!.x).toBeLessThan(5)
    expect(less.equilibrium!.y).toBeGreaterThan(5)
    expect(panel({ shift: 'demand', arrows: 3 }).arrows).toHaveLength(3)
    expect(panel({ shift: 'demand', arrows: 0 }).arrows).toHaveLength(0)
  })

  it('writes one price for a shift along a flat supply curve', () => {
    expect(texts({ supplyShape: 'horizontal', shift: 'demand' })).toContain('P1 = P2')
  })

  it('lands every shift arrow on the new curve inside the graph, even one cut off at the y-axis', () => {
    for (const shape of SHAPES) {
      for (const dir of DIRECTIONS) {
        for (const shift of ['demand', 'supply'] as const) {
          const p = panel({ demandShape: shape, supplyShape: shape === 'horizontal' ? 'normal' : shape, shift, demandDir: dir, supplyDir: dir })
          for (const a of p.arrows) {
            // Arrows stop 5 short of each curve, so an end on the curve is well clear of the axes.
            expect([shape, dir, shift, Math.min(a.x1, a.x2) > p.yAxis.x + 6, Math.max(a.y1, a.y2) < p.xAxis.y - 6]).toEqual([shape, dir, shift, true, true])
          }
        }
      }
    }
    // Decreased, supply's arrows start high enough on S₁ that each meets S₂ right of the y-axis.
    const g = build({ shift: 'supply', supplyDir: 'decrease', arrows: 3 }).figure.panels[0]
    expect(g.arrows).toHaveLength(3)
  })

  it('makes a shortage under a binding ceiling and a surplus over a binding floor, but nothing that does not bind', () => {
    expect(texts({ control: 'ceiling', controlAt: 0.3 })).toEqual(expect.arrayContaining(['Price ceiling', 'Shortage', 'Qd', 'Qs']))
    expect(texts({ control: 'floor', controlAt: 0.7 })).toEqual(expect.arrayContaining(['Price floor', 'Surplus']))
    const loose = build({ control: 'ceiling', controlAt: 0.8 })
    expect(loose.notes.join(' ')).toMatch(/doesn't bind/)
    expect(loose.figure.panels[0].braces).toHaveLength(0)
  })

  it('splits a tax between buyers and sellers by exactly the tax', () => {
    const g = build({ tax: 'tax', taxSize: 0.2, revenue: true, dwl: true, cs: true, ps: true })
    const ys = g.figure.panels[0].labels
    expect(ys.map((l) => l.runs?.map((r) => r.text).join(''))).toEqual(expect.arrayContaining(['Pb', 'Ps', 'Qt', 'Tax revenue', 'DWL', 'CS', 'PS']))
    // Numbered, the gap between the prices is the tax typed.
    const n = build({ look: 'numeric', tax: 'tax', taxAmount: 0.5 })
    expect(n.readout.join(' ')).toMatch(/Buyers pay 2.25, sellers keep 1.75, 550 sold/)
  })

  it('names the tax revenue and deadweight loss apart and off every guide, with Pₑ marked at the axis but no guide across to it', () => {
    for (const taxSize of [0.1, 0.15, 0.2, 0.25]) {
      const g = build({ tax: 'tax', taxSize, cs: true, ps: true, dwl: true, revenue: true }).figure
      const p = g.panels[0]
      const boxes = labelBoxes(g)
      // Pₑ is written between Pb and Ps, to show who pays how much of the tax, with only a short dash at the axis.
      const [pb, pe, ps] = ['Pb', 'Pe', 'Ps'].map((t) => boxes.find((b) => b.text === t)!)
      expect([taxSize, pb.y1 <= pe.y0 + 0.5, pe.y1 <= ps.y0 + 0.5]).toEqual([taxSize, true, true])
      const across = p.guides.filter((l) => l.y1 === l.y2)
      expect([taxSize, across.filter((l) => Math.abs(l.x1 - l.x2) < 20)]).toEqual([taxSize, [across.find((l) => Math.abs(l.y1 - (pe.y0 + pe.y1) / 2) < 12)]])
      const revenue = boxes.find((b) => b.text === 'Tax revenue')!
      const dwl = boxes.find((b) => b.text === 'DWL')!
      const apart = Math.max(revenue.x0 - dwl.x1, dwl.x0 - revenue.x1, revenue.y0 - dwl.y1, dwl.y0 - revenue.y1)
      expect([taxSize, apart > 10]).toEqual([taxSize, true])
      for (const b of [revenue, dwl]) expect([taxSize, p.guides.filter((l) => crosses(l, b))]).toEqual([taxSize, []])
      // Too small to hold its name, the deadweight loss has it to its right, with an arrow to it that ends nowhere near the tax revenue's name.
      expect([taxSize, p.leaders.length, dwl.x0 > revenue.x1]).toEqual([taxSize, 1, true])
      expect([taxSize, p.leaders[0].x2 > revenue.x1 + 3]).toEqual([taxSize, true])
    }
    // Big enough, it holds its name, with no arrow.
    const big = panel({ tax: 'tax', taxSize: 0.35, dwl: true })
    expect(big.leaders).toHaveLength(0)
    // Unshaded, the tax keeps its guide across to Pₑ.
    expect(texts({ tax: 'tax' })).toContain('Pe')
  })

  it('keeps the tax revenue\'s name inside its rectangle, or outside it with an arrow when it is too narrow', () => {
    for (const over of [{}, { demandShape: 'steep' }, { supplyShape: 'steep' }, { taxSize: 0.45 }, { labelSize: 'large' }] as Partial<SupplyDemandSettings>[]) {
      const g = build({ tax: 'tax', cs: true, ps: true, dwl: true, revenue: true, ...over })
      const p = g.figure.panels[0]
      const rect = p.regions.find((r) => r.color === inks(false).region.green)!
      const xs = rect.poly.map((q) => q.x)
      const ys = rect.poly.map((q) => q.y)
      const revenue = labelBoxes(g.figure).find((b) => b.text === 'Tax revenue')!
      const within = revenue.x0 >= Math.min(...xs) - 1 && revenue.x1 <= Math.max(...xs) + 1 && revenue.y0 >= Math.min(...ys) - 1 && revenue.y1 <= Math.max(...ys) + 1
      // Outside, an arrow points into it from its name.
      const arrowed = p.leaders.some((l) => l.x2 > Math.min(...xs) && l.x2 < Math.max(...xs) && l.y2 > Math.min(...ys) && l.y2 < Math.max(...ys))
      expect([over, within || arrowed]).toEqual([over, true])
    }
  })

  it('names each equilibrium beside its own point, on no curve', () => {
    const curveSegments = (p: ReturnType<typeof panel>) =>
      p.curves.flatMap((c) =>
        c.paths.flatMap((d) => {
          const pts = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
          return pts.slice(1).map((q, k) => ({ x1: pts[k].x, y1: pts[k].y, x2: q.x, y2: q.y }))
        }),
      )
    const cases: Partial<SupplyDemandSettings>[] = [
      { shift: 'demand' }, { shift: 'demand', demandDir: 'decrease' }, { shift: 'demand', demandSize: 'small', arrows: 1 }, { shift: 'demand', demandSize: 'large', arrows: 3 },
      { shift: 'supply', supplyDir: 'decrease' }, { shift: 'both', supplyDir: 'decrease', labelSize: 'large' }, { shift: 'demand', eqStyle: 'star' },
      { tax: 'tax', cs: true, ps: true, dwl: true, revenue: true }, { tax: 'tax', dwl: true }, { control: 'ceiling', shift: 'demand' },
    ]
    for (const over of cases) {
      const g = build(over).figure
      const p = g.panels[0]
      const segs = curveSegments(p)
      for (const b of labelBoxes(g).filter((x) => /^E/.test(x.text))) {
        expect([over, b.text, segs.filter((l) => crosses(l, b)).length]).toEqual([over, b.text, 0])
        // Nearer its own point than any other.
        const mid = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }
        const dist = (d: { x: number; y: number }) => Math.hypot(d.x - mid.x, d.y - mid.y)
        const nearest = [...p.dots].sort((a, c) => dist(a) - dist(c))[0]
        const own = b.text === 'E2' ? p.dots[1] : p.dots[0]
        expect([over, b.text, nearest]).toEqual([over, b.text, own])
      }
    }
  })

  it('writes the shortage clear of the guides down from the brace', () => {
    for (const over of [{ control: 'ceiling' }, { control: 'ceiling', dwl: true }, { control: 'ceiling', cs: true, ps: true, dwl: true }, { control: 'floor', controlAt: 0.7 }] as Partial<SupplyDemandSettings>[]) {
      const g = build(over).figure
      const word = labelBoxes(g).find((b) => b.text === 'Shortage' || b.text === 'Surplus')!
      expect([over, g.panels[0].guides.filter((l) => crosses(l, word))]).toEqual([over, []])
    }
  })

  it('keeps a ceiling or floor where both curves meet it on the drawing', () => {
    for (const over of [{ control: 'floor', controlAt: 0.88 }, { control: 'ceiling', controlAt: 0.12 }, { control: 'ceiling', demandShape: 'flat' }, { control: 'ceiling', controlAt: 0.05, shift: 'demand' }] as Partial<SupplyDemandSettings>[]) {
      const p = panel(over)
      const right = Math.max(...p.curves.flatMap((c) => [...c.paths.join(' ').matchAll(/(-?[\d.]+),/g)].map((m) => Number(m[1]))))
      // The dots where it meets the curves, on the curves as drawn.
      for (const d of p.dots) expect([over, d.x <= right + 0.5]).toEqual([over, true])
      expect([over, p.braces.length]).toEqual([over, 1])
    }
  })

  it('draws an upright curve from the quantity axis up', () => {
    for (const over of [{ supplyShape: 'vertical' }, { demandShape: 'vertical' }, { demandShape: 'vertical', tax: 'tax', revenue: true }] as Partial<SupplyDemandSettings>[]) {
      const p = panel(over)
      const lowest = Math.max(...p.curves.flatMap((c) => [...c.paths.join(' ').matchAll(/,(-?[\d.]+)/g)].map((m) => Number(m[1]))))
      expect([over, Math.abs(lowest - p.xAxis.y) < 0.5]).toEqual([over, true])
    }
  })

  it('shades a subsidy\'s surplus and cost without stacking tints, and names its quantity Q_sub', () => {
    const p = panel({ tax: 'subsidy', cs: true, ps: true, dwl: true, revenue: true })
    // Consumer surplus, producer surplus and deadweight loss shaded; the cost is the rectangle the guides bound, named in it.
    expect(p.regions.map((r) => r.color)).toEqual([inks(false).region.blue, inks(false).region.red, inks(false).region.orange])
    expect(texts({ tax: 'subsidy', revenue: true })).toEqual(expect.arrayContaining(['Qsub', 'Subsidy cost']))
    expect(texts({ tax: 'subsidy', revenue: true })).not.toContain('Qt')
    // Shaded alone, the cost goes round its deadweight loss, not under it.
    const alone = panel({ tax: 'subsidy', dwl: true, revenue: true })
    expect(alone.regions).toHaveLength(2)
  })

  it('shades a numbered graph\'s surplus from a quantity of 0, the curves run on to the axes', () => {
    const g = build({ look: 'numeric', cs: true, ps: true })
    const p = g.figure.panels[0]
    for (const r of p.regions) expect(Math.min(...r.poly.map((q) => q.x))).toBeCloseTo(p.yAxis.x, 0)
    // Without surplus, the curves stop at the schedule's rows.
    expect(build({ look: 'numeric' }).figure.panels[0].curves[0].paths[0]).not.toMatch(new RegExp(`^M${p.yAxis.x.toFixed(2)}`))
  })

  it('shifts a numbered curve by whole steps of its axis, so the new equilibrium is on round numbers', () => {
    expect(build({ look: 'numeric', shift: 'demand' }).readout[1]).toBe('After the shift: price 2.5, quantity 700')
  })

  it('says only what is shaded', () => {
    expect(build({ dwl: true }).label).toBe('Supply and demand graph')
    expect(build({ control: 'ceiling', dwl: true }).label).toMatch(/shaded deadweight loss/)
  })

  it('writes a price ceiling or floor\'s name just past the end of its line', () => {
    for (const [control, controlAt] of [['ceiling', 0.3], ['floor', 0.7]] as const) {
      const p = panel({ control, controlAt })
      const name = p.labels.find((l) => l.runs?.map((r) => r.text).join('') === (control === 'ceiling' ? 'Price ceiling' : 'Price floor'))!
      const end = Math.max(...p.levels[0].paths[0].match(/[\d.]+(?=,)/g)!.map(Number))
      expect([control, name.anchor, name.x > end]).toEqual([control, 'start', true])
    }
  })

  it('shades every region it is asked to, each with some area', () => {
    for (const control of ['none', 'ceiling', 'floor'] as const) {
      const p = panel({ control, controlAt: control === 'ceiling' ? 0.3 : 0.7, cs: true, ps: true, dwl: control !== 'none' })
      expect(p.regions).toHaveLength(control === 'none' ? 2 : 3)
    }
  })

  it('solves a numbered schedule, and says when it is too short to draw', () => {
    const g = build({ look: 'numeric' })
    expect(g.equilibrium).toEqual({ x: 600, y: 2 })
    expect(g.readout[0]).toBe('Equilibrium: price 2, quantity 600')
    expect(build({ look: 'numeric', schedule: '1,5,3' }).notes[0]).toMatch(/at least two rows/)
  })

  it('says when two upright curves never cross', () => {
    expect(build({ demandShape: 'vertical', supplyShape: 'vertical' }).notes[0]).toMatch(/never cross/)
  })

  it('draws every label as a blank line when asked', () => {
    const blanks = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'blank']))
    expect(panel({ shift: 'demand', ...blanks }).labels.every((l) => l.blank || (l.runs && ['Price', 'Quantity'].includes(l.runs[0].text)))).toBe(true)
  })

  it('never overlaps two labels, in any setup or curve shape', () => {
    for (const setup of SETUPS) {
      const s = settingsFor(setup, supplyDemandSettings.defaults, supplyDemandSettings.defaults)
      expect([setup.id, overlaps(buildSupplyDemand(s).figure)]).toEqual([setup.id, []])
    }
    for (const demandShape of SHAPES) {
      for (const supplyShape of SHAPES) {
        const f = build({ demandShape, supplyShape, shift: 'both', cs: true, ps: true }).figure
        expect([demandShape, supplyShape, overlaps(f)]).toEqual([demandShape, supplyShape, []])
      }
    }
  })

  it('keeps the defaults out of the address, and reads back what it wrote', () => {
    expect(supplyDemandSettings.toQuery(supplyDemandSettings.defaults)).toBe('')
    const s = supplyDemandSettings.tidy({ ...supplyDemandSettings.defaults, shift: 'both', control: 'floor', dLabel: 'D_{gas}', look: 'numeric' })
    expect(supplyDemandSettings.fromParams(new URLSearchParams(supplyDemandSettings.toQuery(s)))).toEqual(s)
  })
})
