import { describe, expect, it } from 'vitest'
import { areaOf } from '$lib/graph/curves'
import { overlaps } from '$lib/graph/testing'
import { buildCostRevenue, demandOf, pricesOf } from './figure'
import {
  afc, atc, avc, costsOf, demandMeetsATC, demandMeetsMC, mc, minATC, minAVC, minMC, mrOn, priceMaker, priceOn, priceTaker, tc,
  type Costs,
} from './model'
import { LABEL_KEYS, costRevenueSettings, type CostRevenueSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const settings = (over: Partial<CostRevenueSettings> = {}) => costRevenueSettings.tidy({ ...costRevenueSettings.defaults, ...over })
const build = (over: Partial<CostRevenueSettings> = {}) => buildCostRevenue(settings(over))
const firm = (over: Partial<CostRevenueSettings> = {}) => build(over).figure.panels.at(-1)!
const texts = (over: Partial<CostRevenueSettings>) => firm(over).labels.map((l) => l.runs?.map((r) => r.text).join('') ?? '')
const costs = (over: Partial<CostRevenueSettings> = {}) => {
  const s = settings(over)
  return costsOf({ q: s.atcQ, cost: s.atcCost, slope: s.mcSlope, fixed: s.fixed })
}
const slopeOf = (f: (q: number) => number, q: number, h = 1e-5) => (f(q + h) - f(q - h)) / (2 * h)
const NATURAL = SETUPS.find((x) => x.id === 'regulated')!.settings

/** A spread of the teacher's cost controls, across their ranges. */
const CONTROLS = [4, 5.5, 7.5].flatMap((q) => [2.5, 4.5, 6.5].flatMap((cost) => [0.6, 1.5, 2.5].flatMap((slope) => [0.2, 0.55, 0.9].map((fixed) => ({ q, cost, slope, fixed })))))

describe('the cost curves, from one total cost', () => {
  it('put ATC lowest where the teacher says, MC rising as steeply as asked', () => {
    const { costs: k, notes } = costsOf({ q: 6, cost: 4.5, slope: 1.5, fixed: 0.7 })
    expect(notes).toEqual([])
    expect(minATC(k).q).toBeCloseTo(6, 6)
    expect(minATC(k).v).toBeCloseTo(4.5, 6)
    expect(slopeOf((q) => mc(k, q), 6)).toBeCloseTo(1.5, 5)
  })

  it('have MC cross AVC and ATC exactly at their lowest points, and ATC − AVC = AFC, for any controls', () => {
    for (const c of CONTROLS) {
      const { costs: k } = costsOf(c)
      const v = minAVC(k)
      const t = minATC(k)
      expect(slopeOf((q) => avc(k, q), v.q)).toBeCloseTo(0, 6)
      expect(slopeOf((q) => atc(k, q), t.q)).toBeCloseTo(0, 6)
      expect(mc(k, v.q)).toBeCloseTo(v.v, 9)
      expect(mc(k, t.q)).toBeCloseTo(t.v, 9)
      // MC is lowest first, then AVC, then ATC; and each average curve is above MC before its lowest point and below it after.
      expect(minMC(k).q).toBeLessThan(v.q)
      expect(v.q).toBeLessThan(t.q)
      expect(mc(k, v.q * 0.8)).toBeLessThan(avc(k, v.q * 0.8))
      expect(mc(k, t.q * 1.2)).toBeGreaterThan(atc(k, t.q * 1.2))
      for (const q of [1, 3, 8]) {
        expect(atc(k, q) - avc(k, q)).toBeCloseTo(afc(k, q), 9)
        expect(tc(k, q)).toBeCloseTo(atc(k, q) * q, 9)
        // MC is the slope of total cost.
        expect(slopeOf((x) => tc(k, x), q)).toBeCloseTo(mc(k, q), 5)
      }
      // AFC shrinks as output grows, so ATC and AVC draw together.
      expect(afc(k, 8)).toBeLessThan(afc(k, 3))
      // MC never reaches zero: b² < 3ac, and its lowest is well above the axis.
      expect(k.b * k.b).toBeLessThan(3 * k.a * k.c)
      expect(minMC(k).v).toBeGreaterThanOrEqual(0.6 - 1e-9)
      expect(Math.min(k.a, k.b, k.c, k.F)).toBeGreaterThan(0)
    }
  })

  it('makes MC less steep, and says so, when it would dip below the axis', () => {
    const { costs: k, slope, notes } = costsOf({ q: 7.5, cost: 2.5, slope: 2.5, fixed: 0.9 })
    expect(slope).toBeLessThan(2.5)
    expect(minMC(k).v).toBeCloseTo(0.6, 6)
    expect(notes[0]).toMatch(/less steep/)
    expect(build({ atcQ: 7.5, atcCost: 2.5, mcSlope: 2.5, fixed: 0.9 }).notes[0]).toMatch(/less steep/)
  })

  it('draws MC, ATC and AVC (and AFC when asked), with dots where MC crosses the averages', () => {
    expect(texts({})).toEqual(expect.arrayContaining(['MC', 'ATC', 'AVC']))
    expect(texts({})).not.toContain('AFC')
    expect(texts({ afc: true })).toContain('AFC')
    expect(firm({}).dots).toHaveLength(2)
    expect(firm({ minimums: false }).dots).toHaveLength(0)
  })
})

describe('a perfectly competitive firm', () => {
  const k: Costs = costs().costs
  const prices = pricesOf(k)

  it('makes the quantity where P = MC on MC rising side, and a profit when the price is above ATC', () => {
    const o = priceTaker(k, prices.profit)
    expect(mc(k, o.q)).toBeCloseTo(prices.profit, 9)
    expect(slopeOf((q) => mc(k, q), o.q)).toBeGreaterThan(0)
    expect(o.profit).toBeCloseTo((prices.profit - atc(k, o.q)) * o.q, 9)
    expect(o.profit).toBeGreaterThan(0)
    expect(o.q).toBeGreaterThan(minATC(k).q)
  })

  it('breaks even at the lowest ATC, and loses exactly its fixed cost at the lowest AVC', () => {
    const even = priceTaker(k, prices.breakeven)
    expect(even.q).toBeCloseTo(minATC(k).q, 6)
    expect(even.profit).toBeCloseTo(0, 6)
    const point = priceTaker(k, prices.shutdownPoint)
    expect(point.q).toBeCloseTo(minAVC(k).q, 5)
    expect(point.profit).toBeCloseTo(-k.F, 5)
  })

  it('keeps producing at a loss smaller than its fixed cost between AVC and ATC, and shuts down below AVC', () => {
    const loss = priceTaker(k, prices.loss)
    expect(loss.shutdown).toBe(false)
    expect(loss.profit).toBeLessThan(0)
    expect(loss.profit).toBeGreaterThan(-k.F)
    const out = priceTaker(k, prices.shutdown)
    expect(out.shutdown).toBe(true)
    expect(out.q).toBe(0)
    expect(out.profit).toBe(-k.F)
  })

  it('shades profit or loss between price and ATC, out to q*, and names it', () => {
    const p = firm({ graph: 'perfect', price: 'profit' })
    expect(p.regions).toHaveLength(1)
    expect(texts({ graph: 'perfect', price: 'profit' })).toEqual(expect.arrayContaining(['Profit', 'D = MR = AR = P', 'Pe', 'q*', 'ATC', 'Break-even point', 'Shutdown point']))
    expect(texts({ graph: 'perfect', price: 'loss' })).toContain('Loss')
    expect(firm({ graph: 'perfect', price: 'breakeven' }).regions).toHaveLength(0)
    expect(firm({ graph: 'perfect', price: 'profit', profit: false }).regions).toHaveLength(0)
    expect(texts({ graph: 'perfect', price: 'profit', eqStyle: 'star' })).toContain('P*')
  })

  it('shuts the firm down below AVC, with no quantity made', () => {
    const g = build({ graph: 'perfect', price: 'shutdown' })
    expect(texts({ graph: 'perfect', price: 'shutdown' })).not.toContain('q*')
    expect(g.figure.panels[0].regions).toHaveLength(0)
  })

  it('takes its price from the market beside it, a dashed line running across from the market to the firm', () => {
    const g = build({ graph: 'perfect', price: 'breakeven', market: true })
    expect(g.figure.panels).toHaveLength(2)
    const [line] = g.figure.connectors
    expect(line.y1).toBeCloseTo(line.y2, 6)
    const [market, firmPanel] = g.figure.panels
    expect(line.x1).toBeCloseTo(market.at.x + market.px({ x: 5, y: 0 }).x, 6)
    expect(line.x2).toBeCloseTo(firmPanel.at.x + firmPanel.px({ x: 0, y: 0 }).x, 6)
    const marketTexts = market.labels.map((l) => l.runs?.map((r) => r.text).join(''))
    expect(marketTexts).toEqual(expect.arrayContaining(['S', 'D', 'Pe', 'Qe', 'Price']))
    expect(market.big.map((l) => l.runs?.map((r) => r.text).join(''))).toEqual(['Market'])
    expect(firmPanel.big.map((l) => l.runs?.map((r) => r.text).join(''))).toEqual(['Firm'])
    // The firm's price is the market's, written once at the market's axis.
    expect(firmPanel.labels.map((l) => l.runs?.map((r) => r.text).join(''))).not.toContain('Pe')
  })
})

describe('a monopoly', () => {
  const k = costs().costs
  const d = { top: 9.4, slope: 9.4 / 12 }

  it('makes the quantity where MR = MC, MR falling twice as fast as demand, and charges the price on demand there', () => {
    expect(slopeOf((q) => mrOn(d, q), 2)).toBeCloseTo(2 * slopeOf((q) => priceOn(d, q), 2), 9)
    expect(mrOn(d, 0)).toBe(priceOn(d, 0))
    const m = priceMaker(k, d)!
    expect(mrOn(d, m.q)).toBeCloseTo(mc(k, m.q), 9)
    expect(m.p).toBeCloseTo(priceOn(d, m.q), 9)
    expect(m.p).toBeGreaterThan(mc(k, m.q))
    expect(m.profit).toBeGreaterThan(0)
  })

  it('shades its profit, consumer surplus and the deadweight loss up to where demand meets MC', () => {
    const p = firm({ graph: 'monopoly', cs: true, dwl: true })
    expect(p.regions).toHaveLength(3)
    for (const r of p.regions) expect(areaOf(r.poly)).toBeGreaterThan(50)
    expect(texts({ graph: 'monopoly', cs: true, dwl: true })).toEqual(expect.arrayContaining(['PM', 'QM', 'ATC', 'Profit', 'CS', 'DWL', 'D = AR', 'MR']))
    const qSO = demandMeetsMC(k, d)!
    expect(priceOn(d, qSO)).toBeCloseTo(mc(k, qSO), 9)
    expect(qSO).toBeGreaterThan(priceMaker(k, d)!.q)
  })

  it('as a natural monopoly, makes less than the fair-return quantity, which is less than the socially optimal one, where it loses money', () => {
    const s = settings({ graph: 'monopoly', ...NATURAL })
    const k2 = costsOf({ q: s.atcQ, cost: s.atcCost, slope: s.mcSlope, fixed: s.fixed }).costs
    const d2 = demandOf(s, k2).d
    const m = priceMaker(k2, d2)!
    const qFR = demandMeetsATC(k2, d2)!
    const qSO = demandMeetsMC(k2, d2)!
    expect(priceOn(d2, qFR)).toBeCloseTo(atc(k2, qFR), 6)
    expect(m.q).toBeLessThan(qFR)
    expect(qFR).toBeLessThan(qSO)
    expect(priceOn(d2, qSO)).toBeLessThan(atc(k2, qSO))
    expect(qSO).toBeLessThan(minATC(k2).q)
    expect(texts({ graph: 'monopoly', ...NATURAL, regulation: 'both' })).toEqual(expect.arrayContaining(['PM', 'QM', 'PSO', 'QSO', 'PFR', 'QFR']))
    // Regulated to P = MC there's a loss to shade and no deadweight loss; at P = ATC, no profit but some deadweight loss.
    const optimal = firm({ graph: 'monopoly', ...NATURAL, regulation: 'optimal', profit: true, dwl: true })
    expect(optimal.labels.map((l) => l.runs?.map((r) => r.text).join(''))).toEqual(expect.arrayContaining(['Loss']))
    expect(optimal.labels.map((l) => l.runs?.map((r) => r.text).join(''))).not.toContain('DWL')
    const fair = firm({ graph: 'monopoly', ...NATURAL, regulation: 'fair', profit: true, dwl: true })
    expect(fair.labels.map((l) => l.runs?.map((r) => r.text).join(''))).toEqual(expect.arrayContaining(['DWL']))
    expect(fair.labels.map((l) => l.runs?.map((r) => r.text).join(''))).not.toContain('Profit')
  })

  it('shades a loss when demand is below ATC, and says when demand is too low to make anything or no price breaks even', () => {
    expect(texts({ graph: 'monopoly', demandTop: 5.5, demandEnd: 10 })).toContain('Loss')
    expect(build({ graph: 'monopoly', demandTop: 5, demandEnd: 6, atcCost: 6.5 }).notes.join(' ')).toMatch(/too low for MR ever to reach MC|shut down/)
    expect(build({ graph: 'monopoly', demandTop: 5, demandEnd: 6, atcCost: 6.5, regulation: 'fair' }).notes.join(' ')).toMatch(/below ATC everywhere/)
  })
})

describe('a monopolistically competitive firm', () => {
  it('in the long run faces demand tangent to ATC, where MR = MC, making zero profit with excess capacity', () => {
    const s = settings({ graph: 'monopolistic', run: 'long' })
    const k = costs().costs
    const { d, tangent } = demandOf(s, k)
    const q = tangent!
    expect(priceOn(d, q)).toBeCloseTo(atc(k, q), 9)
    expect(-d.slope).toBeCloseTo(slopeOf((x) => atc(k, x), q), 5)
    expect(mrOn(d, q)).toBeCloseTo(mc(k, q), 6)
    const m = priceMaker(k, d)!
    expect(m.q).toBeCloseTo(q, 5)
    expect(m.profit).toBeCloseTo(0, 6)
    // Demand touches ATC only there: everywhere else it's below.
    for (let x = 0.5; x < 12; x += 0.25) expect(priceOn(d, x)).toBeLessThanOrEqual(atc(k, x) + 1e-9)
    expect(q).toBeLessThan(minATC(k).q)
    expect(m.p).toBeGreaterThan(mc(k, q))
    expect(texts({ graph: 'monopolistic', run: 'long' })).toEqual(expect.arrayContaining(['Excess capacity', 'q*', 'qmin ATC', 'Pe']))
    expect(firm({ graph: 'monopolistic', run: 'long' }).braces).toHaveLength(1)
  })

  it('in the short run makes a profit with demand above the long run, or a loss below it', () => {
    const k = costs().costs
    expect(priceMaker(k, demandOf(settings({ graph: 'monopolistic', shortRun: 'profit' }), k).d)!.profit).toBeGreaterThan(0)
    expect(priceMaker(k, demandOf(settings({ graph: 'monopolistic', shortRun: 'loss' }), k).d)!.profit).toBeLessThan(0)
    expect(texts({ graph: 'monopolistic', shortRun: 'loss' })).toContain('Loss')
  })
})

describe('the figure', () => {
  it('never overlaps two labels, in any setup', () => {
    for (const setup of SETUPS) {
      const s = settingsFor(setup, costRevenueSettings.defaults, costRevenueSettings.defaults)
      for (const labelSize of ['small', 'medium', 'large'] as const) {
        expect([setup.id, labelSize, overlaps(buildCostRevenue({ ...s, labelSize }).figure)]).toEqual([setup.id, labelSize, []])
      }
    }
  })

  it('never overlaps two labels across the cost controls, for each kind of graph', () => {
    const graphs: Partial<CostRevenueSettings>[] = [
      { graph: 'costs', afc: true }, { graph: 'perfect', price: 'profit' }, { graph: 'perfect', price: 'loss', market: true },
      { graph: 'monopoly', cs: true, dwl: true }, { graph: 'monopolistic', run: 'long' },
    ]
    for (const g of graphs) {
      for (const c of CONTROLS) {
        const over = { ...g, atcQ: c.q, atcCost: c.cost, mcSlope: c.slope, fixed: c.fixed }
        expect([over, overlaps(build(over).figure)]).toEqual([over, []])
      }
    }
  })

  it('keeps every curve and region on the graph', () => {
    for (const setup of SETUPS) {
      const p = buildCostRevenue(settingsFor(setup, costRevenueSettings.defaults, costRevenueSettings.defaults)).figure.panels.at(-1)!
      const g = p.grid
      for (const r of p.regions) {
        expect(areaOf(r.poly)).toBeGreaterThan(0)
        for (const q of r.poly) {
          expect(q.x).toBeGreaterThanOrEqual(g.x - 0.5)
          expect(q.x).toBeLessThanOrEqual(g.x + g.w + 0.5)
          expect(q.y).toBeGreaterThanOrEqual(g.y - 0.5)
          expect(q.y).toBeLessThanOrEqual(g.y + g.h + 0.5)
        }
      }
    }
  })

  it('draws every label as a blank line when asked', () => {
    const blanks = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'blank']))
    const words = ['Price and costs', 'Quantity']
    expect(firm({ graph: 'perfect', ...blanks }).labels.every((l) => l.blank || (l.runs && words.includes(l.runs[0].text)))).toBe(true)
  })

  it('describes itself for screen readers', () => {
    expect(build({ graph: 'perfect', price: 'loss' }).label).toMatch(/Perfectly competitive firm: .*loss/)
    expect(build({ graph: 'monopoly', cs: true }).label).toMatch(/^Monopoly; shaded Profit, CS$/)
    expect(build({ title: 'Firm A', titleMode: 'text' }).label).toBe('Firm A')
  })

  it('keeps the defaults out of the address, and reads back what it wrote', () => {
    expect(costRevenueSettings.toQuery(costRevenueSettings.defaults)).toBe('')
    const s = settings({ graph: 'monopoly', regulation: 'both', atcQ: 7.5, mcSlope: 1.2, dLabel: 'D_{firm}', pmLabelMode: 'blank', market: true })
    expect(costRevenueSettings.fromParams(new URLSearchParams(costRevenueSettings.toQuery(s)))).toEqual(s)
  })
})
