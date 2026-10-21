import { describe, expect, it } from 'vitest'
import { crosses } from '$shared/graph/labels'
import { labelBoxes, overlaps } from '$lib/graph/testing'
import { SHIFT_SIZES } from '$lib/graph/shifts'
import { SHIFT_SHARE } from '$lib/graph/shifts'
import { RESERVES, SPAN, buildMoneyMarkets, curveNamed } from './figure'
import { DIRECTIONS, GRAPHS, LABEL_KEYS, REGIMES, SHIFTS, labelKeysOf, moneyMarketsSettings, type MoneyMarketsSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const build = (over: Partial<MoneyMarketsSettings> = {}) => buildMoneyMarkets(moneyMarketsSettings.tidy({ ...moneyMarketsSettings.defaults, ...over }))
const panel = (over: Partial<MoneyMarketsSettings> = {}) => build(over).figure.panels[0]
/** The upright curves on a panel: where each is across, and its top, on the drawing. */
const uprights = (p: { curves: { paths: string[] }[] }) =>
  p.curves.flatMap((c) => {
    const m = c.paths[0]?.match(/^M([\d.]+),([\d.]+)L\1,([\d.]+)$/)
    return m ? [{ x: +m[1], top: Math.min(+m[2], +m[3]) }] : []
  })
/** The straight pieces of drawn paths. */
const segmentsOf = (paths: string[]) =>
  paths.flatMap((d) => {
    const pts = [...d.matchAll(/([\d.]+),([\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2] }))
    return pts.slice(1).map((q, k) => ({ x1: pts[k].x, y1: pts[k].y, x2: q.x, y2: q.y }))
  })
/** How far a point is from a straight piece. */
function toSegment(p: { x: number; y: number }, l: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = l.x2 - l.x1
  const dy = l.y2 - l.y1
  const t = Math.max(0, Math.min(1, ((p.x - l.x1) * dx + (p.y - l.y1) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p.x - l.x1 - t * dx, p.y - l.y1 - t * dy)
}
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

  it('draws the ample reserves market: SR on the flat bottom, DR shifting down lowers the policy rate', () => {
    const g = build({ graph: 'reserves', shift: 'demand', demandDir: 'decrease' })
    expect(g.before!.x).toBeCloseTo(RESERVES.ample.supply)
    expect(g.before!.y).toBeCloseTo(RESERVES.ample.low)
    expect(g.after!.x).toBeCloseTo(RESERVES.ample.supply)
    expect(g.after!.y).toBeCloseTo(RESERVES.ample.low - SHIFT_SHARE.medium * SPAN.ample)
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
    // Two dashed guides across to PR₁ and PR₂, none down SR.
    expect(p.guides).toHaveLength(2)
    for (const l of p.guides) expect(l.y1).toBe(l.y2)
  })

  it('moves only the flat parts of the demand for reserves with ample reserves, the slope staying where it is', () => {
    for (const demandDir of DIRECTIONS) {
      for (const demandSize of SHIFT_SIZES) {
        const p = panel({ graph: 'reserves', shift: 'demand', demandDir, demandSize })
        const [d1, d2] = p.curves.slice(0, 2).map((c) => segmentsOf(c.paths).flatMap((l) => [{ x: l.x1, y: l.y1 }]))
        // The points of each curve on its slope, clear of its round corners.
        const slope = (pts: { x: number; y: number }[]) => {
          const top = Math.min(...pts.map((q) => q.y))
          const bottom = Math.max(...pts.map((q) => q.y))
          const room = (bottom - top) * 0.25
          return pts.filter((q) => q.y > top + room && q.y < bottom - room)
        }
        const [a, b] = [slope(d1), slope(d2)]
        const line = { x1: a[0].x, y1: a[0].y, x2: a.at(-1)!.x, y2: a.at(-1)!.y }
        // Both slopes on the same line, DR₂'s corners further along it.
        for (const q of b) {
          const t = (q.y - line.y1) / (line.y2 - line.y1)
          expect([demandDir, demandSize, Math.abs(line.x1 + t * (line.x2 - line.x1) - q.x) < 0.5]).toEqual([demandDir, demandSize, true])
        }
        expect(Math.abs(b[0].x - a[0].x)).toBeGreaterThan(5)
      }
    }
  })

  it("keeps the policy rate where it is when the supply of reserves shifts with ample reserves, however far, clear of the kink", () => {
    for (const supplyDir of DIRECTIONS) {
      for (const supplySize of SHIFT_SIZES) {
        const g = build({ graph: 'reserves', shift: 'supply', supplyDir, supplySize })
        expect(g.after!.y).toBeCloseTo(g.before!.y)
        expect(g.after!.x).toBeGreaterThan(RESERVES.ample.x1 + 0.4)
        expect(texts({ graph: 'reserves', shift: 'supply', supplyDir, supplySize })).not.toContain('PR2')
      }
    }
  })

  it('moves the policy rate along the slope with limited reserves, short of the discount rate and the floor', () => {
    const { high, low } = RESERVES.limited
    const g = build({ graph: 'reserves', regime: 'limited', shift: 'supply', supplyDir: 'increase' })
    expect(g.before!.y).toBeGreaterThan(low + 1)
    expect(g.after!.y).toBeLessThan(g.before!.y)
    for (const shift of ['supply', 'demand'] as const) {
      for (const dir of DIRECTIONS) {
        for (const size of SHIFT_SIZES) {
          const y = build({ graph: 'reserves', regime: 'limited', shift, supplyDir: dir, demandDir: dir, supplySize: size, demandSize: size }).after!.y
          expect([shift, dir, size, y > low + 0.2 && y < high - 0.2]).toEqual([shift, dir, size, true])
        }
      }
    }
  })

  it('shifts the demand for reserves right or left with limited reserves, the policy rate with it', () => {
    for (const demandDir of DIRECTIONS) {
      const g = build({ graph: 'reserves', regime: 'limited', shift: 'demand', demandDir, arrows: 2 })
      expect(g.after!.x).toBeCloseTo(g.before!.x)
      expect(demandDir === 'increase' ? g.after!.y > g.before!.y : g.after!.y < g.before!.y).toBe(true)
      // Arrows across, on the slope, and both drawn.
      const p = g.figure.panels[0]
      expect(p.arrows).toHaveLength(2)
      for (const a of p.arrows) expect(a.y1).toBe(a.y2)
      expect(g.label).toContain(`demand for reserves ${demandDir}s`)
    }
  })

  it('moves the curves further for a larger shift, every size its own', () => {
    for (const graph of GRAPHS) {
      for (const regime of REGIMES) {
        for (const shift of ['supply', 'demand'] as const) {
          for (const dir of DIRECTIONS) {
            const at = SHIFT_SIZES.map((size) => {
              const g = build({ graph, regime, shift, supplyDir: dir, demandDir: dir, supplySize: size, demandSize: size })
              expect(g.notes).toEqual([])
              // How far the moving curve went: across, or up for the demand for reserves with ample reserves.
              const p = g.figure.panels[0]
              const paths = p.curves.map((c) => c.paths.join(' '))
              return paths.join('|')
            })
            expect([graph, regime, shift, dir, new Set(at).size]).toEqual([graph, regime, shift, dir, 3])
          }
        }
      }
    }
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

  it("names each upright supply curve over its own top, written or blank, however far it moves", () => {
    for (const graph of ['money', 'reserves'] as const) {
      const blanks = Object.fromEntries(labelKeysOf(graph).map((k) => [`${k}Mode`, 'blank']))
      for (const regime of REGIMES) {
        for (const shift of ['supply', 'both'] as const) {
          for (const dir of DIRECTIONS) {
            for (const size of SHIFT_SIZES) {
              for (const labelSize of ['small', 'medium', 'large'] as const) {
                for (const words of [{}, blanks]) {
                  const f = build({ graph, regime, shift, supplyDir: dir, demandDir: dir, supplySize: size, demandSize: size, points: true, labelSize, ...words }).figure
                  const tops = uprights(f.panels[0])
                  expect(tops).toHaveLength(2)
                  const boxes = labelBoxes(f)
                  for (const t of tops) {
                    // Over the top, across its own curve and not the other.
                    const named = boxes.some((b) => b.y1 <= t.top && b.x0 <= t.x && t.x <= b.x1 && tops.every((o) => o === t || o.x < b.x0 || o.x > b.x1))
                    expect([graph, regime, shift, dir, size, labelSize, t.x, named]).toEqual([graph, regime, shift, dir, size, labelSize, t.x, true])
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  it('centers both blank money supply lines over their curves when the money supply decreases', () => {
    const blanks = Object.fromEntries(labelKeysOf('money').map((k) => [`${k}Mode`, 'blank']))
    const p = panel({ shift: 'supply', supplyDir: 'decrease', ...blanks })
    const tops = uprights(p)
    for (const t of tops) expect(p.labels.some((l) => l.blank && l.y < t.top && Math.abs((l.blank.x1 + l.blank.x2) / 2 - t.x) < 0.01)).toBe(true)
  })

  it('puts both SR names the same way over their curves in the limited reserves open-market purchase', () => {
    const setup = SETUPS.find((x) => x.id === 'limited-purchase')!
    const p = buildMoneyMarkets(settingsFor(setup, moneyMarketsSettings.defaults, moneyMarketsSettings.defaults)).figure.panels[0]
    const names = ['SR1', 'SR2'].map((t) => p.labels.find((l) => l.runs?.map((r) => r.text).join('') === t)!)
    const tops = uprights(p)
    expect(names.map((l) => l.anchor)).toEqual(['middle', 'middle'])
    expect(names.map((l) => l.x)).toEqual(tops.map((t) => t.x))
    expect(names[0].y).toBe(names[1].y)
    expect(names[0].y).toBeLessThan(tops[0].top)
  })

  it('draws an upright supply curve up to where the curves cross, however high', () => {
    for (const graph of ['money', 'reserves'] as const) {
      for (const regime of REGIMES) {
        for (const size of SHIFT_SIZES) {
          const p = panel({ graph, regime, shift: 'both', supplyDir: 'decrease', demandDir: 'increase', supplySize: size, demandSize: size, points: true })
          const top = Math.min(...uprights(p).map((t) => t.top))
          expect(p.dots).toHaveLength(2)
          for (const d of p.dots) expect(d.y).toBeGreaterThan(top)
        }
      }
    }
  })

  it('keeps the demand for reserves on the graph, and a sloping demand curve off the x-axis', () => {
    for (const regime of REGIMES) {
      // Shifted up as far as it goes, its flat top is still drawn, from the y-axis.
      const p = panel({ graph: 'reserves', regime, shift: 'demand', demandDir: 'increase', demandSize: 'large' })
      const demand = p.curves.filter((c) => !uprights({ curves: [c] }).length)
      expect(demand).toHaveLength(2)
      for (const c of demand) expect(+c.paths[0].match(/^M([\d.]+)/)![1]).toBeCloseTo(p.grid.x, 0)
    }
    // With limited reserves cut as far as they go and demand up as far as it goes, the policy rate is the discount rate, the flat top.
    expect(build({ graph: 'reserves', regime: 'limited', shift: 'both', supplyDir: 'decrease', demandDir: 'increase', supplySize: 'large', demandSize: 'large' }).after!.y).toBeCloseTo(RESERVES.limited.high)
    for (const graph of ['money', 'funds'] as const) {
      const p = panel({ graph, shift: 'demand', demandDir: 'decrease', demandSize: 'large' })
      const axis = p.xAxis.y
      for (const c of p.curves) {
        const ys = [...c.paths[0].matchAll(/,([\d.]+)/g)].map((m) => +m[1])
        if (c.color === p.curves[0].color) expect(Math.max(...ys)).toBeLessThan(axis - 15)
      }
    }
  })

  it('draws both curves through every crossing, however far both shift', () => {
    for (const graph of GRAPHS) {
      for (const regime of REGIMES) {
        for (const [supplyDir, demandDir] of [['increase', 'increase'], ['increase', 'decrease'], ['decrease', 'increase'], ['decrease', 'decrease']] as const) {
          for (const size of SHIFT_SIZES) {
            const p = panel({ graph, regime, shift: 'both', supplyDir, demandDir, supplySize: size, demandSize: size, points: true })
            for (const d of p.dots) {
              for (const color of new Set(p.curves.map((c) => c.color))) {
                const near = Math.min(...p.curves.filter((c) => c.color === color).flatMap((c) => segmentsOf(c.paths)).map((l) => toSegment(d, l)))
                expect([graph, regime, supplyDir, demandDir, size, near < 1.5]).toEqual([graph, regime, supplyDir, demandDir, size, true])
              }
            }
          }
        }
      }
    }
  })

  it('keeps shift arrows off the guides, and guides out of arrows', () => {
    for (const graph of GRAPHS) {
      for (const regime of REGIMES) {
        for (const shift of ['supply', 'demand', 'both'] as const) {
          for (const dir of DIRECTIONS) {
            for (const size of ['small', 'medium'] as const) {
              for (const labelSize of ['medium', 'large'] as const) {
                const p = panel({ graph, regime, shift, supplyDir: dir, demandDir: dir, supplySize: size, demandSize: size, points: true, labelSize })
                for (const a of p.arrows) {
                  for (const l of p.guides) {
                    const along = a.y1 === a.y2 && l.y1 === l.y2 ? Math.abs(a.y1 - l.y1) < 10 && Math.min(a.x1, a.x2) < Math.max(l.x1, l.x2) && Math.max(a.x1, a.x2) > Math.min(l.x1, l.x2)
                      : a.x1 === a.x2 && l.x1 === l.x2 ? Math.abs(a.x1 - l.x1) < 10 && Math.min(a.y1, a.y2) < Math.max(l.y1, l.y2) && Math.max(a.y1, a.y2) > Math.min(l.y1, l.y2)
                      : false
                    const cut = shift !== 'both' && crosses({ x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 }, { x0: Math.min(a.x1, a.x2), x1: Math.max(a.x1, a.x2), y0: Math.min(a.y1, a.y2), y1: Math.max(a.y1, a.y2) })
                    expect([graph, regime, shift, dir, size, labelSize, along, cut]).toEqual([graph, regime, shift, dir, size, labelSize, false, false])
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  it('draws as many arrows as asked for, spread apart', () => {
    for (const graph of GRAPHS) {
      for (const regime of REGIMES) {
        for (const shift of ['supply', 'demand', 'both'] as const) {
          for (const dir of DIRECTIONS) {
            const p = panel({ graph, regime, shift, supplyDir: dir, demandDir: dir, arrows: 2 })
            // Both curves crossing the slope of the demand for reserves leave room for one arrow on its slope.
            const want = shift === 'both' ? (graph === 'reserves' && regime === 'limited' ? 3 : 4) : 2
            expect([graph, regime, shift, dir, p.arrows.length >= want]).toEqual([graph, regime, shift, dir, true])
            if (shift === 'both') expect(new Set(p.arrows.map((a) => a.color)).size).toBe(2)
            for (const a of p.arrows) for (const b of p.arrows) if (a !== b && a.color === b.color) expect(Math.hypot(a.x1 - b.x1, a.y1 - b.y1)).toBeGreaterThan(30)
          }
        }
      }
    }
  })

  it('runs one guide to each rate and quantity, never two on top of each other', () => {
    for (const graph of GRAPHS) {
      for (const regime of REGIMES) {
        for (const shift of SHIFTS) {
          for (const dir of DIRECTIONS) {
            const p = panel({ graph, regime, shift, supplyDir: dir, demandDir: dir })
            const across = p.guides.filter((l) => l.y1 === l.y2).map((l) => l.y1)
            const down = p.guides.filter((l) => l.x1 === l.x2).map((l) => l.x1)
            expect([graph, regime, shift, dir, new Set(across).size, new Set(down).size]).toEqual([graph, regime, shift, dir, across.length, down.length])
          }
        }
      }
    }
  })

  it('names the crossings clear of every curve, written or blank', () => {
    for (const graph of GRAPHS) {
      const blanks = Object.fromEntries(labelKeysOf(graph).map((k) => [`${k}Mode`, 'blank']))
      for (const regime of REGIMES) {
        for (const shift of SHIFTS) {
          for (const dir of DIRECTIONS) {
            for (const labelSize of ['small', 'medium', 'large'] as const) {
              for (const words of [{}, blanks]) {
                const f = build({ graph, regime, shift, supplyDir: dir, demandDir: dir, points: true, labelSize, ink: 'bw', ...words }).figure
                const p = f.panels[0]
                const lines = p.curves.flatMap((c) => segmentsOf(c.paths))
                // The crossings' names are the labels nearest the dots.
                for (const d of p.dots) {
                  const box = labelBoxes(f).sort((a, b) => Math.hypot((a.x0 + a.x1) / 2 - d.x, (a.y0 + a.y1) / 2 - d.y) - Math.hypot((b.x0 + b.x1) / 2 - d.x, (b.y0 + b.y1) / 2 - d.y))[0]
                  const hit = lines.some((l) => crosses(l, box))
                  expect([graph, regime, shift, dir, labelSize, box.text, hit]).toEqual([graph, regime, shift, dir, labelSize, box.text, false])
                }
              }
            }
          }
        }
      }
    }
  })

  it('writes Q₁ and Q₂ side by side, and r₁ and r₂ apart, after a medium shift in loanable funds', () => {
    for (const shift of ['supply', 'demand'] as const) {
      for (const labelSize of ['small', 'medium', 'large'] as const) {
        const p = panel({ graph: 'funds', shift, points: true, labelSize })
        const at = (t: string) => p.labels.find((l) => l.runs?.map((r) => r.text).join('') === t)!
        expect(at('Q1').y).toBe(at('Q2').y)
        expect(Math.abs(at('r1').y - at('r2').y)).toBeGreaterThan(p.labelFs * 1.2)
      }
    }
  })

  it('ends every shift arrow on the curve it points to, clear of the other curves and the dots', () => {
    for (const graph of GRAPHS) {
      for (const shift of ['supply', 'demand', 'both'] as const) {
        for (const dir of DIRECTIONS) {
          for (const size of SHIFT_SIZES) {
            const g = build({ graph, regime: 'limited', shift, supplyDir: dir, demandDir: dir, supplySize: size, demandSize: size, points: true, arrows: 3 })
            const p = g.figure.panels[0]
            for (const a of p.arrows) {
              // Nothing past the grid's right, where the curves stop.
              expect(Math.max(a.x1, a.x2)).toBeLessThan(p.grid.x + p.grid.w * 0.95)
              for (const d of p.dots) expect(Math.hypot((a.x1 + a.x2) / 2 - d.x, (a.y1 + a.y2) / 2 - d.y)).toBeGreaterThan(8)
            }
            // The demand for reserves' arrows keep off the supply curves.
            if (graph === 'reserves') for (const a of p.arrows.filter((a) => a.x1 === a.x2)) for (const t of uprights(p)) expect(Math.abs(a.x1 - t.x)).toBeGreaterThan(8)
          }
        }
      }
    }
  })

  it('joins a shift number to a subscript already there', () => {
    // The default names write the number alone under the line: DR₁, SLF₂.
    expect(texts({ graph: 'reserves', shift: 'demand' })).toEqual(expect.arrayContaining(['SR', 'DR1', 'DR2']))
    const runs = panel({ graph: 'reserves', shift: 'demand' }).labels.find((l) => l.runs?.map((r) => r.text).join('') === 'DR1')!.runs!
    expect(runs.map((r) => [r.text, !!r.sub])).toEqual([['DR', false], ['1', true]])
    // A name typed with a subscript has the number join it: D_R becomes D_{R1}.
    expect(curveNamed({ text: 'D_R', mode: 'text' }, 1, '1').text).toBe('D_{R1}')
    expect(curveNamed({ text: 'S_{LF}', mode: 'text' }, 2, '1').text).toBe('S_{LF2}')
    expect(curveNamed({ text: 'MS', mode: 'text' }, 2, '1').text).toBe('MS_2')
    expect(curveNamed({ text: 'MS', mode: 'text' }, 0, '1').text).toBe('MS')
    expect(curveNamed({ text: 'D_R', mode: 'text' }, 1, '0').text).toBe('D_{R0}')
    expect(curveNamed({ text: 'MS', mode: 'text' }, 0, '0').text).toBe('MS')
  })

  it('numbers a shift from 0 when asked: before 0, after 1, on the curves, the axes and the y-axis by the demand for reserves', () => {
    expect(texts({ shift: 'supply', numberFrom: '0' })).toEqual(expect.arrayContaining(['MS0', 'MS1', 'MD', 'i0', 'i1', 'Q0', 'Q1']))
    expect(texts({ shift: 'supply', numberFrom: '0' })).not.toContain('MS2')
    const t = texts({ graph: 'reserves', shift: 'demand', numberFrom: '0' })
    expect(t.filter((x) => x === 'DR0')).toHaveLength(2)
    expect(t.filter((x) => x === 'DR1')).toHaveLength(2)
    expect(t).toEqual(expect.arrayContaining(['PR0', 'PR1', 'Q0']))
    // One equilibrium has no number either way.
    expect(texts({ numberFrom: '0' })).toEqual(expect.arrayContaining(['MS', 'MD', 'ie', 'Qe']))
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
