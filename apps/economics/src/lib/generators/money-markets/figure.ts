// Works out a money market, loanable funds or reserves market graph from
// its settings, as a panel for the econ graph library to lay out: the
// curves (an upright money supply or supply of reserves, straight demand
// and supply of loanable funds, and the demand for reserves flat at the
// top, sloping, then flat at the administered rate), a shift and where the
// rate ends up, the arrows showing it, the rates and quantities at the axes
// with dashed lines to them, and every label.

import { clipPath, type Point } from '$shared/graph/grid'
import { plainOf } from '$shared/graph/runs'
import { along, flatSlopeFlat, intersect, lineThrough, shifted, yAt, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure } from '$lib/graph/figure'
import { inks, type ArrowSpec, type CurveSpec, type GuideSpec, type MarkSpec, type PanelSpec, type PointSpec, type Words } from '$lib/graph/panel'
import { SCHEMATIC, panelBase, wordsOf } from '$lib/graph/settings'
import { SHIFT_SHARE, shiftArrows } from '$lib/graph/shifts'
import { KEYS, axisWordsOf, type Graph, type MoneyMarketsSettings } from './settings'

/** Far enough to run a straight curve off the graph. */
const FAR = 100
/** Where curves are drawn: short of the grid's top and right, leaving room for their names. */
const DRAW: Box = { x0: 0, x1: 9.4, y0: 0, y1: 9.6 }
const BOX: Box = { x0: 0, x1: 10, y0: 0, y1: 10 }
/** How far an upright supply curve may move: it stays on the graph, clear of its edges. */
const UPRIGHT = { min: 0.6, max: 9 }

/** The demand for reserves: flat at the discount rate, sloping from `x0` to `x1`, flat at the administered rate. */
export const RESERVES = { x0: 1, x1: 5, high: 7.2, low: 3.4 }
/** Where the supply of reserves is: on demand's flat bottom (ample) or on its slope (limited). */
export const SUPPLY_AT = { ample: 7, limited: 2.2 }

const line = (at: number, slope: number) => lineThrough({ x: 0, y: at }, { x: 1, y: at + slope }, { x0: -FAR, x1: FAR, y0: -FAR, y1: FAR })
const upright = (x: number): Curve => [{ x, y: -FAR }, { x, y: FAR }]

/** What each graph's rate and quantity are called, in the readout. */
const WORDS: Record<Graph, { rate: string; quantity: string; supply: string; demand: string }> = {
  money: { rate: 'The nominal interest rate', quantity: 'the quantity of money', supply: 'Money supply', demand: 'money demand' },
  funds: { rate: 'The real interest rate', quantity: 'the quantity of loanable funds', supply: 'Supply of loanable funds', demand: 'demand for loanable funds' },
  reserves: { rate: 'The policy rate', quantity: 'the quantity of reserves', supply: 'Supply of reserves', demand: 'demand for reserves' },
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6

/**
 * A curve's name before and after it shifts: MS₁ and MS₂, with the number
 * joining a subscript already there (D_R → D_{R1}), or the name alone.
 */
export function curveNamed(w: Words, k: 0 | 1 | 2): Words {
  const t = w.text.trim()
  if (w.mode !== 'text' || !t || !k) return w
  const braced = t.match(/^(.*)_\{([^}]*)\}$/)
  if (braced) return { ...w, text: `${braced[1]}_{${braced[2]}${k}}` }
  const one = t.match(/^(.*)_(.)$/)
  if (one) return { ...w, text: `${one[1]}_{${one[2]}${k}}` }
  return { ...w, text: `${t}_${k}` }
}

/** A value's name at one equilibrium (iₑ or i*), or before and after a shift (i₁, i₂). */
function valueNamed(w: Words, k: 0 | 1 | 2, style: MoneyMarketsSettings['eqStyle']): Words {
  const t = w.text.trim()
  if (w.mode !== 'text' || !t) return w
  return { ...w, text: k ? `${t}_${k}` : style === 'star' ? `${t}*` : `${t}_e` }
}

export function buildMoneyMarkets(s: MoneyMarketsSettings) {
  const ink = inks(s.ink === 'bw')
  const g = s.graph
  const keys = KEYS[g]
  const notes: string[] = []
  const reserves = g === 'reserves'

  // The curves before anything happens.
  const supplyUpright = g !== 'funds'
  const q1 = reserves ? SUPPLY_AT[s.regime] : 5
  const s1: Curve = supplyUpright ? upright(q1) : line(1, 0.8)
  const d1: Curve = reserves ? flatSlopeFlat(RESERVES.x0, RESERVES.x1, RESERVES.high, RESERVES.low, FAR) : line(9, -0.8)

  // Shifts: supply across; demand across, but the demand for reserves up or down with the administered rates.
  const moving = (kind: 'supply' | 'demand') => s.shift === kind || s.shift === 'both'
  const shiftOf = (kind: 'supply' | 'demand') => {
    if (!moving(kind)) return { dx: 0, dy: 0 }
    const sign = (kind === 'supply' ? s.supplyDir : s.demandDir) === 'increase' ? 1 : -1
    const share = SHIFT_SHARE[kind === 'supply' ? s.supplySize : s.demandSize]
    if (kind === 'demand' && reserves) return { dx: 0, dy: sign * share * 10 }
    let dx = sign * share * 10
    // An upright supply curve stays on the graph however far it's asked to go.
    if (kind === 'supply' && supplyUpright) dx = Math.max(UPRIGHT.min, Math.min(UPRIGHT.max, q1 + dx)) - q1
    return { dx, dy: 0 }
  }
  const sShift = shiftOf('supply')
  const dShift = shiftOf('demand')
  const sMoves = !!(sShift.dx || sShift.dy)
  const dMoves = !!(dShift.dx || dShift.dy)
  const anyShift = sMoves || dMoves
  const s2 = shifted(s1, sShift.dx, sShift.dy)
  const d2 = shifted(d1, dShift.dx, dShift.dy)

  const e1 = intersect(s1, d1)
  const e2 = anyShift ? intersect(s2, d2) : e1
  const onGraph = (p: Point | null): p is Point => !!p && p.x >= BOX.x0 - 1e-9 && p.x <= BOX.x1 + 1e-9 && p.y >= BOX.y0 - 1e-9 && p.y <= BOX.y1 + 1e-9
  if (!onGraph(e1)) notes.push("The curves don't cross on the graph.")
  else if (anyShift && !onGraph(e2)) notes.push("After the shift the curves don't cross on the graph. Make the shift smaller.")

  // The curves, cut to the graph.
  const drawn = (c: Curve) => clipPath(c, DRAW).sort((a, b) => b.length - a.length)[0] ?? []
  const sName = wordsOf(s, keys.supply)
  const dName = wordsOf(s, keys.demand)
  const curves: CurveSpec[] = [
    { pts: drawn(d1), name: curveNamed(dName, dMoves ? 1 : 0), color: ink.demand },
    ...(dMoves ? [{ pts: drawn(d2), name: curveNamed(dName, 2), color: ink.demand }] : []),
    { pts: drawn(s1), name: curveNamed(sName, sMoves ? 1 : 0), color: ink.supply },
    ...(sMoves ? [{ pts: drawn(s2), name: curveNamed(sName, 2), color: ink.supply }] : []),
  ]

  // Shift arrows: along a curve, or for the demand for reserves on its flat parts, as AP draws them.
  const arrows: ArrowSpec[] = []
  // An upright curve's arrows, and any crossing one, keep off the other curves.
  if (sMoves) arrows.push(...(supplyUpright ? clearArrows(s1, sShift.dx, s.arrows, [d1, d2], ink.supply) : shiftArrows(s1, sShift.dx, sShift.dy, s.arrows, ink.supply, DRAW)))
  if (dMoves) {
    if (reserves) arrows.push(...reserveArrows(dShift.dy, s.arrows, [q1, q1 + sShift.dx], ink.demand))
    else if (supplyUpright) arrows.push(...clearArrows(d1, dShift.dx, s.arrows, [s1, s2], ink.demand))
    else arrows.push(...shiftArrows(d1, dShift.dx, dShift.dy, s.arrows, ink.demand, DRAW))
  }

  // The rates and quantities at the axes, dashed lines to them, and the points where the curves cross.
  const marks: MarkSpec[] = []
  const guides: GuideSpec[] = []
  const points: PointSpec[] = []
  const rateName = wordsOf(s, keys.rate)
  const qName = wordsOf(s, 'qLabel')
  const eName = wordsOf(s, 'eLabel')
  /** A value written once at an axis: where both equilibria share it, it keeps the first one's name. */
  const mark = (axis: 'x' | 'y', at: number, name: Words) => {
    if (!marks.some((m) => m.axis === axis && near(m.at, at))) marks.push({ axis, at, name })
  }
  const equilibrium = (e: Point | null, k: 0 | 1 | 2) => {
    if (!onGraph(e)) return
    if (s.points) points.push({ at: e, name: curveNamed(eName, k) })
    if (!s.guides) return
    // An upright supply curve is its own line down to the quantity.
    guides.push({ from: e, x: !supplyUpright })
    mark('y', e.y, valueNamed(rateName, k, s.eqStyle))
    mark('x', e.x, valueNamed(qName, k, s.eqStyle))
  }
  equilibrium(e1, anyShift ? 1 : 0)
  if (anyShift) equilibrium(e2, 2)

  const spec: PanelSpec = {
    ...panelBase({ ...s, ...axisWordsOf(s), look: 'schematic' }),
    axes: SCHEMATIC,
    curves,
    points,
    marks,
    guides,
    arrows,
  }

  const result = resultOf(s, e1, e2, anyShift, sMoves, dMoves, d2)
  return {
    figure: buildFigure([spec]),
    /** where the curves cross, before and after any shift */
    before: e1,
    after: e2,
    notes,
    readout: onGraph(e1) && (!anyShift || onGraph(e2)) ? result.readout : [],
    label: labelOf(s, result.summary),
  }
}

export type MoneyMarketsFigure = ReturnType<typeof buildMoneyMarkets>

/**
 * Arrows from the demand for reserves to where it moves, `dy` up: one on its
 * flat bottom (clear of the supply curves at `avoid`), then one on its flat
 * top by the y-axis, then one halfway down its slope.
 */
function reserveArrows(dy: number, count: number, avoid: number[], color: string): ArrowSpec[] {
  const { x0, x1, high, low } = RESERVES
  // The widest stretch of the bottom with no supply curve in it.
  const cuts = [x1, ...avoid.filter((x) => x > x1 && x < DRAW.x1).sort((a, b) => a - b), DRAW.x1]
  let best = { a: cuts[0], b: cuts[1] }
  for (let k = 2; k < cuts.length; k++) if (cuts[k] - cuts[k - 1] > best.b - best.a) best = { a: cuts[k - 1], b: cuts[k] }
  const mid = (x0 + x1) / 2
  const at: Point[] = [
    { x: (best.a + best.b) / 2, y: low },
    { x: x0 / 2, y: high },
    { x: mid, y: (high + low) / 2 },
  ].slice(0, Math.max(0, Math.min(3, Math.round(count))))
  return at.map((from) => ({ from, to: { x: from.x, y: from.y + dy }, color }))
}

/** Where along a curve its arrows go, by how many there are, as shares of its length (as $lib/graph/shifts'). */
const ARROWS_AT: Record<number, number[]> = { 0: [], 1: [0.2], 2: [0.2, 0.8], 3: [0.15, 0.5, 0.85] }
/** How far an arrow keeps from a curve it would otherwise run along or cut. */
const CLEAR = 0.6

/**
 * `count` arrows across from a curve to where it moves, `dx` across: at the
 * usual places along it, or the nearest ones where they cross none of the
 * curves in `others` and end on the graph.
 */
function clearArrows(c: Curve, dx: number, count: number, others: Curve[], color: string): ArrowSpec[] {
  const run = clipPath(c, DRAW).sort((a, b) => b.length - a.length)[0]
  if (!run || !dx) return []
  const clear = (p: Point) => {
    if (p.x + dx > DRAW.x1 - CLEAR / 2 || p.x + dx < DRAW.x0 + CLEAR / 2) return false
    const lo = Math.min(p.x, p.x + dx) - CLEAR / 2
    const hi = Math.max(p.x, p.x + dx) + CLEAR / 2
    for (const o of others) {
      // An upright curve in the way, or a sloped one too near the arrow anywhere along it.
      if (Math.abs(o[0].x - o.at(-1)!.x) < 1e-9) {
        if (o[0].x > lo && o[0].x < hi) return false
        continue
      }
      for (let k = 0; k <= 12; k++) if (Math.abs((yAt(o, p.x + (dx * k) / 12) ?? Infinity) - p.y) < CLEAR) return false
    }
    return true
  }
  const shares = Array.from({ length: 19 }, (_, k) => 0.05 + k * 0.05)
  const chosen: number[] = []
  for (const want of ARROWS_AT[Math.max(0, Math.min(3, Math.round(count)))] ?? []) {
    const best = shares
      .filter((f) => clear(along(run, f).at) && chosen.every((c) => Math.abs(c - f) > 0.15))
      .sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0]
    if (best !== undefined) chosen.push(best)
  }
  return chosen.sort((a, b) => a - b).map((f) => {
    const from = along(run, f).at
    return { from, to: { x: from.x + dx, y: from.y }, color }
  })
}

/** What happens, in words: for the readout, and the figure's summary for screen readers. */
function resultOf(s: MoneyMarketsSettings, e1: Point | null, e2: Point | null, anyShift: boolean, sMoves: boolean, dMoves: boolean, d2: Curve) {
  const w = WORDS[s.graph]
  const readout: string[] = []
  const summary: string[] = []
  const dir = (d: string, up: string, down: string) => (d === 'increase' ? up : down)
  if (sMoves) summary.push(`${w.supply.toLowerCase()} ${dir(s.supplyDir, 'increases', 'decreases')}`)
  if (dMoves) summary.push(s.graph === 'reserves' ? `${w.demand} shifts ${dir(s.demandDir, 'up', 'down')}` : `${w.demand} ${dir(s.demandDir, 'increases', 'decreases')}`)
  if (!e1 || !e2 || !anyShift) return { readout, summary }

  const way = (a: number, b: number, up: string, down: string) => (near(a, b) ? 'stays the same' : b > a ? up : down)
  const rateWay = way(e1.y, e2.y, 'rises', 'falls')
  const qWay = way(e1.x, e2.x, 'rises', 'falls')
  const names = (key: 'qLabel' | (typeof KEYS)[Graph]['rate']) => {
    const n = wordsOf(s, key)
    return n.mode === 'text' && n.text.trim() ? ` from ${plainOf(`${n.text.trim()}_1`)} to ${plainOf(`${n.text.trim()}_2`)}` : ''
  }
  readout.push(`${w.rate} ${rateWay}${near(e1.y, e2.y) ? '' : names(KEYS[s.graph].rate)}; ${w.quantity} ${qWay}${near(e1.x, e2.x) ? '' : names('qLabel')}`)
  summary.push(`${w.rate.toLowerCase()} ${rateWay}`)

  // The market for reserves: why the rate did or didn't move.
  if (s.graph === 'reserves') {
    // How far demand moved, and whether supply now crosses its flat bottom.
    const onFloor = near(e2.y, RESERVES.low + d2[0].y - RESERVES.high)
    if (sMoves && !dMoves && near(e1.y, e2.y)) readout.push('With ample reserves, the supply of reserves crosses the flat part of demand, so changing the quantity of reserves leaves the policy rate where it is.')
    else if (sMoves && s.regime === 'ample' && !onFloor) readout.push('The supply of reserves now crosses the sloped part of demand: reserves are no longer ample.')
    else if (sMoves && s.regime === 'limited' && onFloor) readout.push('The supply of reserves now crosses the flat part of demand: reserves have become ample.')
    else if (dMoves && !sMoves && s.regime === 'ample') readout.push('With ample reserves, the Fed moves the policy rate by changing its administered rates, which shifts demand for reserves.')
  }
  return { readout, summary }
}

/** The figure in words, for screen readers. */
function labelOf(s: MoneyMarketsSettings, summary: string[]) {
  if (s.titleMode === 'text' && s.title.trim()) return plainOf(s.title.trim())
  const what = s.graph === 'money' ? 'Money market graph' : s.graph === 'funds' ? 'Loanable funds market graph' : `Market for reserves graph, ${s.regime} reserves`
  return `${what}${summary.length ? `: ${summary.join(', ')}` : ''}`
}
