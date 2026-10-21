import { describe, expect, it } from 'vitest'
import { overlaps } from '$lib/graph/testing'
import { SHIFT_SIZES } from '$lib/graph/shifts'
import { RESERVES, SUPPLY_AT, buildMoneyMarkets, curveNamed } from './figure'
import { DIRECTIONS, GRAPHS, LABEL_KEYS, REGIMES, SHIFTS, labelKeysOf, moneyMarketsSettings, type MoneyMarketsSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const build = (over: Partial<MoneyMarketsSettings> = {}) => buildMoneyMarkets(moneyMarketsSettings.tidy({ ...moneyMarketsSettings.defaults, ...over }))
const panel = (over: Partial<MoneyMarketsSettings> = {}) => build(over).figure.panels[0]
const texts = (over: Partial<MoneyMarketsSettings>) => panel(over).labels.map((l) => l.runs?.map((r) => r.text).join('') ?? '')

describe('money markets', () => {
  it('draws the money market with an upright money supply, marked iₑ and Qₑ', () => {
    const g = build()
    expect(g.before!.x).toBeCloseTo(5)
    expect(g.before!.y).toBeCloseTo(5)
    expect(texts({})).toEqual(expect.arrayContaining(['MS', 'MD', 'ie', 'Qe', 'Quantity of money', 'Nominal interest rate']))
    expect(texts({ eqStyle: 'star' })).toEqual(expect.arrayContaining(['i*', 'Q*']))
    // No dashed line down an upright supply curve: it is its own.
    expect(panel().guides).toHaveLength(1)
  })

  it('lowers the interest rate when the money supply increases, and raises it when money demand does', () => {
    const buy = build({ shift: 'supply', supplyDir: 'increase' })
    expect(buy.after!.x).toBeGreaterThan(buy.before!.x)
    expect(buy.after!.y).toBeLessThan(buy.before!.y)
    expect(texts({ shift: 'supply' })).toEqual(expect.arrayContaining(['MS1', 'MS2', 'MD', 'i1', 'i2', 'Q1', 'Q2']))
    const more = build({ shift: 'demand', demandDir: 'increase' })
    expect(more.after!.y).toBeGreaterThan(more.before!.y)
    expect(more.after!.x).toBeCloseTo(more.before!.x)
    // The quantity doesn't move, so it's written once.
    expect(texts({ shift: 'demand' })).toEqual(expect.arrayContaining(['MD1', 'MD2', 'Q1']))
    expect(texts({ shift: 'demand' })).not.toContain('Q2')
  })

  it('shows crowding out: more government borrowing raises the real interest rate', () => {
    const g = build({ graph: 'funds', shift: 'demand', demandDir: 'increase' })
    expect(g.after!.y).toBeGreaterThan(g.before!.y)
    expect(g.after!.x).toBeGreaterThan(g.before!.x)
    expect(texts({ graph: 'funds', shift: 'demand' })).toEqual(expect.arrayContaining(['SLF', 'DLF1', 'DLF2', 'r1', 'r2', 'Real interest rate']))
    // Supply of loanable funds slopes, so both guides are drawn.
    expect(panel({ graph: 'funds' }).guides).toHaveLength(2)
  })

  it('draws the AP 2024 reserves market: S_R on the flat bottom, D_R shifting down lowers the policy rate', () => {
    const g = build({ graph: 'reserves', shift: 'demand', demandDir: 'decrease' })
    expect(g.before!.x).toBeCloseTo(SUPPLY_AT.ample)
    expect(g.before!.y).toBeCloseTo(RESERVES.low)
    expect(g.after!.x).toBeCloseTo(SUPPLY_AT.ample)
    expect(g.after!.y).toBeCloseTo(RESERVES.low - 2)
    const t = texts({ graph: 'reserves', shift: 'demand', demandDir: 'decrease' })
    expect(t).toEqual(expect.arrayContaining(['SR', 'DR1', 'DR2', 'PR1', 'PR2', 'Q1', 'Policy rate', 'Quantity of reserves']))
    expect(t).not.toContain('Q2')
    // Arrows point straight down, one on each flat part.
    const p = panel({ graph: 'reserves', shift: 'demand', demandDir: 'decrease', arrows: 2 })
    expect(p.arrows).toHaveLength(2)
    for (const a of p.arrows) {
      expect(a.x1).toBe(a.x2)
      expect(a.y2).toBeGreaterThan(a.y1)
    }
    // Two dashed guides across to PR₁ and PR₂, none down S_R.
    expect(p.guides).toHaveLength(2)
    for (const l of p.guides) expect(l.y1).toBe(l.y2)
  })

  it("keeps the policy rate where it is when the supply of reserves shifts with ample reserves", () => {
    for (const supplyDir of DIRECTIONS) {
      const g = build({ graph: 'reserves', shift: 'supply', supplyDir })
      expect(g.after!.y).toBeCloseTo(g.before!.y)
      expect(texts({ graph: 'reserves', shift: 'supply', supplyDir })).not.toContain('PR2')
    }
    // Far enough left, supply reaches the slope: reserves are no longer ample.
    const scarce = build({ graph: 'reserves', shift: 'supply', supplyDir: 'decrease', supplySize: 'large' })
    expect(scarce.after!.y).toBeGreaterThan(scarce.before!.y)
  })

  it('moves the policy rate along the slope with limited reserves', () => {
    const g = build({ graph: 'reserves', regime: 'limited', shift: 'supply', supplyDir: 'increase' })
    expect(g.before!.y).toBeGreaterThan(RESERVES.low + 1)
    expect(g.after!.y).toBeLessThan(g.before!.y)
    expect(g.after!.y).toBeGreaterThan(RESERVES.low)
    // Lowering the administered rates moves the whole curve, and the rate with it.
    const lower = build({ graph: 'reserves', regime: 'limited', shift: 'demand', demandDir: 'decrease' })
    expect(lower.after!.y).toBeLessThan(lower.before!.y)
  })

  it('keeps an upright supply curve on the graph however far it shifts', () => {
    for (const supplySize of SHIFT_SIZES) {
      for (const supplyDir of DIRECTIONS) {
        for (const graph of ['money', 'reserves'] as const) {
          const g = build({ graph, shift: 'supply', supplyDir, supplySize })
          expect(g.notes).toEqual([])
          expect(g.after!.x).toBeGreaterThan(0)
          expect(g.after!.x).toBeLessThan(9.4)
        }
      }
    }
  })

  it('joins a shift number to a subscript already there', () => {
    expect(curveNamed({ text: 'D_R', mode: 'text' }, 1).text).toBe('D_{R1}')
    expect(curveNamed({ text: 'S_{LF}', mode: 'text' }, 2).text).toBe('S_{LF2}')
    expect(curveNamed({ text: 'MS', mode: 'text' }, 2).text).toBe('MS_2')
    expect(curveNamed({ text: 'MS', mode: 'text' }, 0).text).toBe('MS')
  })

  it('draws every label as a blank line when asked', () => {
    for (const graph of GRAPHS) {
      const blanks = Object.fromEntries(labelKeysOf(graph).map((k) => [`${k}Mode`, 'blank']))
      const p = panel({ graph, shift: 'both', points: true, ...blanks })
      const words = ['Quantity of money', 'Nominal interest rate', 'Quantity of loanable funds', 'Real interest rate', 'Quantity of reserves', 'Policy rate']
      expect(p.labels.every((l) => l.blank || (l.runs && words.includes(l.runs.map((r) => r.text).join(''))))).toBe(true)
    }
  })

  it('never overlaps two labels, in any setup, graph or shift', () => {
    for (const setup of SETUPS) {
      const s = settingsFor(setup, moneyMarketsSettings.defaults, moneyMarketsSettings.defaults)
      expect([setup.id, overlaps(buildMoneyMarkets(s).figure)]).toEqual([setup.id, []])
    }
    for (const graph of GRAPHS) {
      for (const regime of REGIMES) {
        for (const shift of SHIFTS) {
          for (const dir of DIRECTIONS) {
            for (const size of SHIFT_SIZES) {
              for (const labelSize of ['small', 'medium', 'large'] as const) {
                const f = build({ graph, regime, shift, supplyDir: dir, demandDir: dir, supplySize: size, demandSize: size, points: true, labelSize }).figure
                expect([graph, regime, shift, dir, size, labelSize, overlaps(f)]).toEqual([graph, regime, shift, dir, size, labelSize, []])
              }
            }
          }
        }
      }
    }
  })

  it('keeps the defaults out of the address, and reads back what it wrote', () => {
    expect(moneyMarketsSettings.toQuery(moneyMarketsSettings.defaults)).toBe('')
    const s = moneyMarketsSettings.tidy({
      ...moneyMarketsSettings.defaults, graph: 'reserves', regime: 'limited', shift: 'both', demandDir: 'decrease', drLabel: 'D_{res}',
      reservesY: 'Federal funds rate', prLabel: 'FFR', points: true,
    })
    expect(moneyMarketsSettings.fromParams(new URLSearchParams(moneyMarketsSettings.toQuery(s)))).toEqual(s)
    expect(LABEL_KEYS.every((k) => k in moneyMarketsSettings.defaults)).toBe(true)
  })
})
