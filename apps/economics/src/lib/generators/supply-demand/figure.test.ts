import { describe, expect, it } from 'vitest'
import { overlaps } from '$lib/graph/testing'
import { buildSupplyDemand } from './figure'
import { LABEL_KEYS, SHAPES, supplyDemandSettings, type SupplyDemandSettings } from './settings'
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
