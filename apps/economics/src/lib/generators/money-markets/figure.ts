// Works out a money market, loanable funds or reserves market graph from
// its settings, as a panel for the econ graph library to lay out: the
// curves (an upright money supply or supply of reserves, straight demand
// and supply of loanable funds, and the demand for reserves flat at the
// top, sloping, then flat at the administered rate), a shift and where the
// rate ends up, the arrows showing it, the rates and quantities at the axes
// with dashed lines to them, and every label.

import { clipPath, type Point } from '$shared/graph/grid'
import { besidePoint, type Spot } from '$shared/graph/labels'
import { plainOf } from '$shared/graph/runs'
import { along, crossings as crossingsOf, flatSlopeFlat, intersect, shifted, yAt, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure } from '$lib/graph/figure'
import { inks, type ArrowSpec, type CurveSpec, type GuideSpec, type MarkSpec, type PanelSpec, type PointSpec, type Words } from '$lib/graph/panel'
import { SCHEMATIC, nth, panelBase, wordsOf, type NumberFrom } from '$lib/graph/settings'
import { SHIFT_SHARE } from '$lib/graph/shifts'
import { KEYS, axisWordsOf, type Graph, type MoneyMarketsSettings, type Regime } from './settings'

/** Far enough to run a straight curve off the graph. */
const FAR = 100
/** Where curves are drawn: short of the grid's top and right, leaving room for their names. */
const DRAW: Box = { x0: 0, x1: 9.4, y0: 0, y1: 9.6 }
/**
 * Where an upright curve stops, lower, leaving room over its top for its
 * name clear of the y-axis's words; or higher, short of the grid's top, to
 * reach where the curves cross.
 */
const UPRIGHT_TOP = 9
const BOX: Box = { x0: 0, x1: 10, y0: 0, y1: 10 }
/** How far an upright supply curve may move: it stays on the graph, clear of its edges. */
const UPRIGHT = { min: 0.6, max: 9 }

/**
 * The straight curves, through (5, 5): money demand gently down, so two
 * large shifts that both lower (or raise) the rate still cross on the
 * graph; the supply and demand of loanable funds steeper, so a shift moves
 * the real interest rate far enough to write r₁ and r₂ apart. Each is
 * drawn from `from` across to `to`, and a shifted one is the same piece
 * moved across, as a shift is drawn by hand.
 */
const STRAIGHT = {
  money: { demand: { slope: -0.7, from: 0, to: 9.4 } },
  funds: { supply: { slope: 1.2, from: 5 - 4 / 1.2, to: 5 + 4 / 1.2 }, demand: { slope: -1.2, from: 5 - 4 / 1.2, to: 5 + 4 / 1.2 } },
}
/** How far past where it crosses another curve a straight one is drawn, at least. */
const REACH = 0.5
/** How low a straight curve may run, reaching a crossing near the x-axis. */
const STRAIGHT_BOTTOM = 0.3

/**
 * The demand for reserves: flat at the discount rate (`high`), sloping from
 * `x0` to `x1`, flat at the administered rate (`low`), and where the supply
 * of reserves crosses it (`supply`). With ample reserves the slope is short
 * and the supply far out on the flat bottom, so it stays there however far
 * it moves; with limited reserves the slope is long and the supply halfway
 * down it, so it stays on the slope.
 */
export const RESERVES: Record<Regime, { x0: number; x1: number; high: number; low: number; supply: number }> = {
  ample: { x0: 2.1, x1: 3.38, high: 6.6, low: 3.4, supply: 7 },
  limited: { x0: 0.8, x1: 6, high: 7.2, low: 2.8, supply: 3.4 },
}
/** How round the demand for reserves' corners are with ample reserves, in the graph's units up and down. */
const CORNER = 0.6

/** Where the ample demand for reserves' straight slope, through (`x0`, `high`) and (`x1`, `low`), is at the rate `y`. */
export const slopeX = (R: (typeof RESERVES)[Regime], y: number) => R.x0 + ((R.high - y) * (R.x1 - R.x0)) / (R.high - R.low)

/** The smaller of two values, rounded off within `k` of each other. */
function softMin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - (h * h * k) / 4
}

/**
 * The demand for reserves with ample reserves, its rates `dy` up: one
 * straight slope that never moves, cut off by the discount rate over it
 * and the administered rate under it, with round corners. Raising the
 * rates moves both flat parts up, their corners up the slope, as AP draws it.
 */
function ampleDemand(R: (typeof RESERVES)[Regime], dy: number): Curve {
  const high = R.high + dy
  const low = R.low + dy
  const line = (x: number) => R.high + ((x - R.x0) * (R.low - R.high)) / (R.x1 - R.x0)
  const y = (x: number) => -softMin(-low, -softMin(high, line(x), CORNER), CORNER)
  const xs = [-FAR, ...Array.from({ length: 601 }, (_, k) => -1 + k * 0.02), FAR]
  return xs.map((x) => ({ x, y: x < -1 ? high : x > 11 ? low : y(x) }))
}

/**
 * How far a shift moves a curve, as a share (small, medium or large) of
 * this: the axis on the money market; more on loanable funds, where both
 * curves slope and a shift moves where they cross only part of the way,
 * so the two crossings sit far enough apart to name; less on the market
 * for reserves, so every size stays on the part of the demand for
 * reserves it's meant to.
 */
export const SPAN = { money: 10, funds: 12.5, ample: 8, limited: 6 }
/** How high the demand for reserves' flat top may go: on the graph, its top shift arrow with it. */
export const RESERVES_TOP = 9.2

const upright = (x: number): Curve => [{ x, y: -FAR }, { x, y: FAR }]
const isUpright = (c: Curve) => Math.abs(c[0].x - c.at(-1)!.x) < 1e-9
/** A curve cut to `box`, its longest run. */
const drawn = (c: Curve, box: Box) => clipPath(c, box).sort((a, b) => b.length - a.length)[0] ?? []

/** What each graph's curves and rate are called, in the figure's summary. */
const WORDS: Record<Graph, { rate: string; supply: string; demand: string }> = {
  money: { rate: 'The nominal interest rate', supply: 'Money supply', demand: 'money demand' },
  funds: { rate: 'The real interest rate', supply: 'Supply of loanable funds', demand: 'demand for loanable funds' },
  reserves: { rate: 'The policy rate', supply: 'Supply of reserves', demand: 'demand for reserves' },
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6

/** Whether the demand for reserves moves up and down (with ample reserves, as the administered rates change) rather than across. */
export const demandUpDown = (s: Pick<MoneyMarketsSettings, 'graph' | 'regime'>) => s.graph === 'reserves' && s.regime === 'ample'

/**
 * A curve's name before and after it shifts: MS₁ and MS₂ (or, numbered
 * `from` 0, MS₀ and MS₁), with the number joining a subscript already there
 * (D_R → D_{R1}), or the name alone.
 */
export function curveNamed(w: Words, k: 0 | 1 | 2, from: NumberFrom): Words {
  const t = w.text.trim()
  if (w.mode !== 'text' || !t || !k) return w
  const braced = t.match(/^(.*)_\{([^}]*)\}$/)
  const n = nth(k, from)
  if (braced) return { ...w, text: `${braced[1]}_{${braced[2]}${n}}` }
  const one = t.match(/^(.*)_(.)$/)
  if (one) return { ...w, text: `${one[1]}_{${one[2]}${n}}` }
  return { ...w, text: `${t}_${n}` }
}

/** A value's name at one equilibrium (iₑ or i*), or before and after a shift (i₁, i₂). */
function valueNamed(w: Words, k: 0 | 1 | 2, style: MoneyMarketsSettings['eqStyle'], from: NumberFrom): Words {
  const t = w.text.trim()
  if (w.mode !== 'text' || !t) return w
  return { ...w, text: k ? `${t}_${nth(k, from)}` : style === 'star' ? `${t}*` : `${t}_e` }
}

/** A straight curve: the whole line, for where it crosses others, and the stretch across that's drawn. */
type Straight = { line: Curve; from: number; to: number }
const straight = ({ slope, from, to }: { slope: number; from: number; to: number }, dx = 0): Straight => {
  const at = (x: number) => ({ x, y: 5 + slope * (x - 5 - dx) })
  return { line: [at(-FAR), at(FAR)], from: from + dx, to: to + dx }
}
/** The drawn piece of a straight curve, run on past any of the `crossings` on it. */
function straightPiece(c: Straight, crossings: Point[]): Point[] {
  const on = crossings.filter((e) => Math.abs((yAt(c.line, e.x) ?? Infinity) - e.y) < 1e-6)
  const from = Math.min(c.from, ...on.map((e) => e.x - REACH))
  const to = Math.max(c.to, ...on.map((e) => e.x + REACH))
  const y = (x: number) => yAt(c.line, x)!
  return drawn([{ x: from, y: y(from) }, { x: to, y: y(to) }], { ...DRAW, y0: STRAIGHT_BOTTOM })
}

export function buildMoneyMarkets(s: MoneyMarketsSettings) {
  const ink = inks(s.ink === 'bw')
  const g = s.graph
  const keys = KEYS[g]
  const notes: string[] = []
  const reserves = g === 'reserves'
  const R = RESERVES[s.regime]
  const upDown = demandUpDown(s)

  // Shifts: supply across; demand across, but the demand for reserves with ample reserves up or down with the administered rates.
  const supplyUpright = g !== 'funds'
  const q1 = reserves ? R.supply : 5
  const moving = (kind: 'supply' | 'demand') => s.shift === kind || s.shift === 'both'
  const shiftOf = (kind: 'supply' | 'demand') => {
    if (!moving(kind)) return { dx: 0, dy: 0 }
    const sign = (kind === 'supply' ? s.supplyDir : s.demandDir) === 'increase' ? 1 : -1
    const by = sign * SHIFT_SHARE[kind === 'supply' ? s.supplySize : s.demandSize] * SPAN[reserves ? s.regime : g]
    // The demand for reserves' flat top stays on the graph, however far it's asked to go up.
    if (kind === 'demand' && upDown) return { dx: 0, dy: Math.min(by, RESERVES_TOP - R.high) }
    // An upright supply curve stays on the graph however far it's asked to go.
    if (kind === 'supply' && supplyUpright) return { dx: Math.max(UPRIGHT.min, Math.min(UPRIGHT.max, q1 + by)) - q1, dy: 0 }
    return { dx: by, dy: 0 }
  }
  const sShift = shiftOf('supply')
  const dShift = shiftOf('demand')
  const sMoves = !!(sShift.dx || sShift.dy)
  const dMoves = !!(dShift.dx || dShift.dy)
  const anyShift = sMoves || dMoves

  // The curves before and after anything happens.
  const sStraight = g === 'funds' ? [straight(STRAIGHT.funds.supply), straight(STRAIGHT.funds.supply, sShift.dx)] : null
  const dStraight = g === 'money' ? STRAIGHT.money.demand : g === 'funds' ? STRAIGHT.funds.demand : null
  const dStraights = dStraight ? [straight(dStraight), straight(dStraight, dShift.dx)] : null
  const reservesDemand = upDown ? ampleDemand(R, 0) : flatSlopeFlat(R.x0, R.x1, R.high, R.low, FAR, -FAR)
  const s1: Curve = sStraight ? sStraight[0].line : upright(q1)
  const s2: Curve = sStraight ? sStraight[1].line : upright(q1 + sShift.dx)
  const d1: Curve = dStraights ? dStraights[0].line : reservesDemand
  const d2: Curve = dStraights ? dStraights[1].line : upDown ? ampleDemand(R, dShift.dy) : shifted(reservesDemand, dShift.dx, dShift.dy)

  const e1 = intersect(s1, d1)
  const e2 = anyShift ? intersect(s2, d2) : e1
  const onGraph = (p: Point | null): p is Point => !!p && p.x >= BOX.x0 - 1e-9 && p.x <= BOX.x1 + 1e-9 && p.y >= BOX.y0 - 1e-9 && p.y <= BOX.y1 + 1e-9
  if (!onGraph(e1)) notes.push("The curves don't cross on the graph.")
  else if (anyShift && !onGraph(e2)) notes.push("After the shift the curves don't cross on the graph. Make the shift smaller.")
  const crossings = [e1, e2].filter(onGraph)

  // The curves and their names. Upright curves reach any crossing high on
  // the graph, and straight ones run on to any crossing past their ends.
  const top = Math.min(DRAW.y1, Math.max(UPRIGHT_TOP, ...crossings.map((e) => e.y + 0.4)))
  const supplyBox: Box = { ...DRAW, y1: top }
  const sName = wordsOf(s, keys.supply)
  const dName = wordsOf(s, keys.demand)
  const curves: CurveSpec[] = []
  const tops: PointSpec[] = []
  // The demand for reserves moved across shares its flat parts with the
  // first: the one further right stops where its slope meets the flat
  // bottom, its name by there, leaving the flat bottom's end to the other's.
  const dRuns = dStraights ? dStraights.map((c) => straightPiece(c, crossings)) : [d1, d2].map((c) => drawn(c, DRAW))
  const sideways = reserves && !upDown && dMoves
  const cut = sideways ? (dShift.dx > 0 ? 1 : 0) : -1
  for (const k of dMoves ? [0, 1] : [0]) {
    const name = curveNamed(dName, dMoves ? ((k + 1) as 1 | 2) : 0, s.numberFrom)
    if (k !== cut) {
      curves.push({ pts: dRuns[k], name, color: ink.demand })
      continue
    }
    const kink = { x: R.x1 + (k ? dShift.dx : 0), y: R.low }
    curves.push({ pts: dRuns[k].filter((p) => p.x <= kink.x + 1e-9), color: ink.demand })
    tops.push({ at: kink, name, dot: false, spots: byKink })
  }
  // An upright supply curve's name goes over its top, as a point's name at
  // its top (the library would move it down beside the line), each the same
  // way over its own curve: centered, or with two curves too close for that,
  // leaning away from each other. A sloped one's goes by its end as a curve's
  // does.
  const close = Math.abs(sShift.dx) < CLOSE_PAIR
  const supplyCurve = (pts: Point[], name: Words, side: Side) => {
    if (supplyUpright && pts.length) {
      curves.push({ pts, color: ink.supply })
      tops.push({ at: pts.reduce((a, b) => (b.y > a.y ? b : a)), name, dot: false, spots: overTop(side, close) })
    } else curves.push({ pts, name, color: ink.supply })
  }
  const sRun = (k: 0 | 1) => (sStraight ? straightPiece(sStraight[k], crossings) : drawn(k ? s2 : s1, supplyBox))
  supplyCurve(sRun(0), curveNamed(sName, sMoves ? 1 : 0, s.numberFrom), !sMoves ? 'alone' : sShift.dx > 0 ? 'left' : 'right')
  if (sMoves) supplyCurve(sRun(1), curveNamed(sName, 2, s.numberFrom), sShift.dx > 0 ? 'right' : 'left')
  // The left one's name first, so by the y-axis it can lean right before the other's takes the room.
  tops.sort((a, b) => a.at.x - b.at.x)

  // The dashed guides from where the curves cross: across to the rate, and
  // down to the quantity unless an upright supply curve is its own line.
  // Where both crossings share a rate (or a quantity), one guide runs to
  // it, from the crossing further out, so two dashed lines never lie on
  // each other out of step.
  const across = (e: Point) => !crossings.some((o) => o !== e && near(o.y, e.y) && o.x > e.x + 1e-6)
  const down = (e: Point) => !supplyUpright && !crossings.some((o) => o !== e && near(o.x, e.x) && o.y > e.y + 1e-6)
  const guideLines: Segment[] = s.guides
    ? crossings.flatMap((e) => [
        ...(across(e) ? [{ a: { x: 0, y: e.y }, b: e }] : []),
        ...(down(e) ? [{ a: { x: e.x, y: 0 }, b: e }] : []),
      ])
    : []

  // Shift arrows: across from a curve, or for the demand for reserves with
  // ample reserves up or down on its flat parts (its slope stays put), as AP draws them. Arrows
  // across keep off the other curves, the guides, the other arrows, and
  // clear of where the curves cross, which have names by them.
  const arrows: ArrowSpec[] = []
  const room: Room = { crossings, nameRoom: s.points ? NAME_ROOM : CROSSING_ROOM, guides: guideLines, taken: arrows }
  if (sMoves) arrows.push(...clearArrows(sRun(0), sShift.dx, s.arrows, [d1, d2], room, ink.supply))
  if (dMoves) {
    if (upDown) arrows.push(...reserveArrows(R, dShift.dy, s.arrows, [q1, q1 + sShift.dx], room, ink.demand))
    else {
      // The demand for reserves moved across has its arrows on its slope, clear of the flat parts it shares.
      const run = sideways ? drawn(d1.filter((p) => p.x >= R.x0 && p.x <= R.x1), { ...DRAW, y0: R.low + SLOPE_ROOM / 2, y1: R.high - SLOPE_ROOM }) : dRuns[0]
      arrows.push(...clearArrows(run, dShift.dx, s.arrows, [s1, s2], room, ink.demand))
    }
  }

  // The rates and quantities at the axes, dashed lines to them, and the points where the curves cross.
  const marks: MarkSpec[] = []
  const guides: GuideSpec[] = []
  const points: PointSpec[] = [...tops]
  const rateName = wordsOf(s, keys.rate)
  const qName = wordsOf(s, 'qLabel')
  const eName = wordsOf(s, 'eLabel')
  /** A value written once at an axis: where both equilibria share it, it keeps the first one's name. */
  const mark = (axis: 'x' | 'y', at: number, name: Words) => {
    if (!marks.some((m) => m.axis === axis && near(m.at, at))) marks.push({ axis, at, name })
  }
  const equilibrium = (e: Point | null, k: 0 | 1 | 2) => {
    if (!onGraph(e)) return
    if (s.points) points.push({ at: e, name: curveNamed(eName, k, s.numberFrom), spots: supplyUpright ? besideUpright : overCrossing })
    if (!s.guides) return
    if (across(e) || down(e)) guides.push({ from: e, x: down(e), y: across(e) })
    mark('y', e.y, valueNamed(rateName, k, s.eqStyle, s.numberFrom))
    mark('x', e.x, valueNamed(qName, k, s.eqStyle, s.numberFrom))
  }
  equilibrium(e1, anyShift ? 1 : 0)
  if (anyShift) equilibrium(e2, 2)
  // The demand for reserves with ample reserves is named at the y-axis too, by its flat top.
  if (upDown) for (const k of dMoves ? [0, 1] : [0]) mark('y', R.high + (k ? dShift.dy : 0), curveNamed(dName, dMoves ? ((k + 1) as 1 | 2) : 0, s.numberFrom))

  const spec: PanelSpec = {
    ...panelBase({ ...s, ...axisWordsOf(s), look: 'schematic' }),
    axes: SCHEMATIC,
    curves,
    points,
    marks,
    guides,
    arrows,
  }

  return {
    figure: buildFigure([spec]),
    /** where the curves cross, before and after any shift */
    before: e1,
    after: e2,
    notes,
    label: labelOf(s, summaryOf(s, e1, e2, anyShift, sMoves, dMoves)),
  }
}

export type MoneyMarketsFigure = ReturnType<typeof buildMoneyMarkets>

/**
 * Places for the name of a point where sloped supply and demand cross: over
 * it, between the two curves, higher up where the curves are further apart
 * for a wide one (a blank); then right of it, between the curves there;
 * then under it, the same; then under it either side of the guide down,
 * deeper for a wide one; then beside it. Any of these the guides from the
 * other crossing run through is passed over.
 */
const overCrossing = (p: Point, fs: number): Spot[] => [
  ...[9, 15, 21, 27, 35, 43].map((gap): Spot => ({ x: p.x, y: p.y - gap - fs * 0.3, anchor: 'middle' })),
  ...[14, 20, 28].map((gap): Spot => ({ x: p.x + gap, y: p.y + fs * 0.35, anchor: 'start' })),
  ...[9, 15, 21, 27].map((gap): Spot => ({ x: p.x, y: p.y + gap + fs * 0.78, anchor: 'middle' })),
  ...[2, 2.6, 3.3, 4, 4.8].flatMap((deep): Spot[] => [
    { x: p.x + 5, y: p.y + fs * deep + 12, anchor: 'start' },
    { x: p.x - 5, y: p.y + fs * deep + 12, anchor: 'end' },
  ]),
  ...besidePoint(p, fs, 9),
]

/**
 * Places for the name of a point where an upright supply curve crosses
 * demand: over it on the right, in the wide gap between supply going up
 * and demand going down; then under it on the left, under the guide
 * across; then the rest of the way round it, further out if need be.
 */
const besideUpright = (p: Point, fs: number): Spot[] =>
  [9, 15, 22].flatMap((gap) => {
    const [lowerRight, upperRight, upperLeft, right, left, lowerLeft] = besidePoint(p, fs, gap)
    return [upperRight, lowerLeft, right, upperLeft, lowerRight, left]
  })

/** Places for the name of the demand for reserves stopped where its slope meets the flat bottom: just over the flat bottom, to the right. */
const byKink = (p: Point, fs: number): Spot[] => [
  { x: p.x + 6, y: p.y - fs * 0.3 - 8, anchor: 'start' },
  { x: p.x + 14, y: p.y - fs * 0.3 - 8, anchor: 'start' },
  { x: p.x + 6, y: p.y + fs + 4, anchor: 'start' },
  { x: p.x - 6, y: p.y + fs + 4, anchor: 'end' },
]

/** Which of two upright supply curves one is, or the only one. */
type Side = 'left' | 'right' | 'alone'

/** How far apart (in the graph's units) two upright curves are too close for both names to be centered over them. */
const CLOSE_PAIR = 1.1

/**
 * Places for an upright curve's name over its top, just clear of it:
 * centered on it, then leaning away from the other upright curve (first,
 * when the two are `close`), then toward it (by the y-axis), then beside
 * its top, outer side first. A lone one tries the left first.
 */
const overTop = (side: Side, close: boolean) => (top: Point, fs: number): Spot[] => {
  const y = top.y - fs * 0.3 - 7
  const beside = top.y + fs * 0.8
  const out = side === 'right' ? 1 : -1
  const centered: Spot = { x: top.x, y, anchor: 'middle' }
  const lean = (way: number): Spot => ({ x: top.x - way * 8, y, anchor: way > 0 ? 'start' : 'end' })
  const by = (way: number): Spot => ({ x: top.x + way * 6, y: beside, anchor: way > 0 ? 'start' : 'end' })
  return [...(close && side !== 'alone' ? [lean(out), centered] : [centered, lean(out)]), lean(-out), by(out), by(-out)]
}

/** A straight piece of line, in the graph's units. */
type Segment = { a: Point; b: Point }
/** What arrows keep clear of: where the curves cross (by `nameRoom`), the guides, and the arrows already drawn. */
type Room = { crossings: Point[]; nameRoom: number; guides: Segment[]; taken: ArrowSpec[] }

/** How far `p` is from the segment from `a` to `b`. */
function distTo(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}
/** Whether two segments run the same way. */
const parallel = (a: Segment, b: Segment) => Math.abs((a.b.x - a.a.x) * (b.b.y - b.a.y) - (a.b.y - a.a.y) * (b.b.x - b.a.x)) < 1e-9
/** How far apart two segments come, 0 where they cross. */
function gapBetween(a: Segment, b: Segment) {
  if (crossingsOf([a.a, a.b], [b.a, b.b]).length) return 0
  return Math.min(distTo(a.a, b.a, b.b), distTo(a.b, b.a, b.b), distTo(b.a, a.a, a.b), distTo(b.b, a.a, a.b))
}

/** Where along a curve its arrows go, by how many there are, as shares of its length (as $lib/graph/shifts'). */
const ARROWS_AT: Record<number, number[]> = { 0: [], 1: [0.2], 2: [0.2, 0.8], 3: [0.15, 0.5, 0.85] }
/** How far an arrow keeps from a curve it would otherwise run along or cut. */
const CLEAR = 0.6
/** How far an arrow keeps from where the curves cross, leaving room for their names. */
const NAME_ROOM = 1.2
/** How far an arrow keeps from where the curves cross, with no names there. */
const CROSSING_ROOM = 0.75
/** How far an arrow keeps from a guide, and from another curve's arrow. */
const GUIDE_ROOM = 0.5
/** How far apart one curve's arrows start, so they spread out rather than bunch up. */
const APART = 1.2
/** How far an arrow starts from the y-axis. */
const EDGE = 0.8
/** How far a sideways arrow on the demand for reserves keeps from its flat top (from its flat bottom, half this). */
const SLOPE_ROOM = 0.5

/**
 * Whether an arrow from `from` to `to` keeps clear of the crossings, the
 * guides and the arrows already drawn; or, `lenient`, of only the guides
 * it would run along, crossing the others square on.
 */
const roomFor = (from: Point, to: Point, room: Room, lenient = false, crowded = false) =>
  room.crossings.every((e) => distTo(e, from, to) >= room.nameRoom * (crowded ? 0.75 : 1)) &&
  room.guides.every((l) => (lenient && !parallel(l, { a: from, b: to })) || gapBetween({ a: from, b: to }, l) >= GUIDE_ROOM) &&
  room.taken.every((a) => gapBetween({ a: from, b: to }, { a: a.from, b: a.to }) >= GUIDE_ROOM * (crowded ? 0.6 : 1))

/**
 * Arrows from the demand for reserves to where its flat parts move, `dy`
 * up: one on its flat bottom (clear of the supply curves at `avoid`), then
 * one on its flat top by the y-axis, then one more on the flat bottom, past
 * both curves' corners, leaving out any a supply curve runs too close to
 * or that would cut a guide. Its slope doesn't move, so has none.
 */
function reserveArrows(R: (typeof RESERVES)[Regime], dy: number, count: number, avoid: number[], room: Room, color: string): ArrowSpec[] {
  const { high, low } = R
  // Where both curves' flat parts are flat, clear of their round corners.
  const top = Math.min(slopeX(R, high), slopeX(R, high + dy)) - CORNER / 2
  const bottom = Math.max(slopeX(R, low), slopeX(R, low + dy)) + CORNER / 2
  // The stretches of the bottom with no supply curve in them, widest first.
  const cuts = [bottom, ...avoid.filter((x) => x > bottom && x < DRAW.x1).sort((a, b) => a - b), DRAW.x1]
  const stretches = cuts.slice(1).map((b, k) => ({ a: cuts[k], b })).sort((p, q) => q.b - q.a - (p.b - p.a))
  const at: Point[] = [
    ...stretches.slice(0, 1).map((t) => ({ x: (t.a + t.b) / 2, y: low })),
    { x: top / 2, y: high },
    ...stretches.slice(1, 2).filter((t) => t.b - t.a >= 2 * CLEAR).map((t) => ({ x: (t.a + t.b) / 2, y: low })),
  ]
  // A guide runs under a flat part, so only one cutting across the arrow's middle counts.
  const cutsGuide = (p: Point) => room.guides.some((l) => near(l.a.y, l.b.y) && Math.min(l.a.x, l.b.x) < p.x && Math.max(l.a.x, l.b.x) > p.x && l.a.y > Math.min(p.y, p.y + dy) + 0.3 && l.a.y < Math.max(p.y, p.y + dy) - 0.3)
  return at
    .filter((p) => avoid.every((x) => Math.abs(p.x - x) >= CLEAR) && !cutsGuide(p) && room.taken.every((a) => gapBetween({ a: p, b: { x: p.x, y: p.y + dy } }, { a: a.from, b: a.to }) >= GUIDE_ROOM))
    .slice(0, Math.max(0, Math.min(3, Math.round(count))))
    .map((from) => ({ from, to: { x: from.x, y: from.y + dy }, color }))
}

/**
 * `count` arrows across from a curve drawn as `run` to where it moves, `dx`
 * across: at the usual places along it, or the nearest ones where they
 * cross none of the curves in `others`, keep clear of the `room`, start off
 * the y-axis, end on the graph, and spread out from each other.
 */
function clearArrows(run: Point[], dx: number, count: number, others: Curve[], room: Room, color: string): ArrowSpec[] {
  if (run.length < 2 || !dx) return []
  const clear = (p: Point, pass: number) => {
    const to = { x: p.x + dx, y: p.y }
    const lo = Math.min(p.x, to.x)
    const hi = Math.max(p.x, to.x)
    if (hi > DRAW.x1 - CLEAR / 2 || lo < DRAW.x0 + EDGE) return false
    if (!roomFor(p, to, room, pass > 0, pass > 1)) return false
    for (const o of others) {
      // An upright curve in the way, or a sloped one too near the arrow anywhere along it.
      if (isUpright(o)) {
        if (o[0].x > lo - CLEAR / 2 && o[0].x < hi + CLEAR / 2) return false
        continue
      }
      if (pass > 1) continue
      for (let k = 0; k <= 12; k++) if (Math.abs((yAt(o, p.x + (dx * k) / 12) ?? Infinity) - p.y) < CLEAR) return false
    }
    return true
  }
  // Each place along the curve, and how much it has to give way to fit
  // there: clear of every guide and curve (0); crossing guides square on
  // (1); or, on a crowded graph (both curves shifting far), crossing the
  // other sloped curves too, a little closer to the crossings and the other
  // arrows (2).
  const places = Array.from({ length: 19 }, (_, k) => 0.05 + k * 0.05)
    .map((f) => ({ f, at: along(run, f).at }))
    .map((c) => ({ ...c, pass: [0, 1, 2].find((pass) => clear(c.at, pass)) ?? Infinity }))
    .filter((c) => c.pass < Infinity)
  // As many arrows as asked for, or as fit, spread apart: those giving way
  // least, nearest the usual places along it.
  const wants = ARROWS_AT[Math.max(0, Math.min(3, Math.round(count)))] ?? []
  let chosen: Point[] = []
  for (let n = wants.length; n > 0 && !chosen.length; n--) {
    let best = Infinity
    const pick = (from: number, set: typeof places) => {
      if (set.length === n) {
        const at = n === wants.length ? wants : wants.length === 3 && n === 2 ? [wants[0], wants[2]] : wants.slice(0, n)
        const cost = set.reduce((sum, c, k) => sum + c.pass * 10 + Math.abs(c.f - at[k]), 0)
        if (cost < best) {
          best = cost
          chosen = set.map((c) => c.at)
        }
        return
      }
      for (let k = from; k < places.length; k++) {
        if (set.every((c) => Math.hypot(c.at.x - places[k].at.x, c.at.y - places[k].at.y) >= APART)) pick(k + 1, [...set, places[k]])
      }
    }
    pick(0, [])
  }
  return chosen.sort((a, b) => b.y - a.y).map((from) => ({ from, to: { x: from.x + dx, y: from.y }, color }))
}

/** What happens, in words, for the figure's summary for screen readers. */
function summaryOf(s: MoneyMarketsSettings, e1: Point | null, e2: Point | null, anyShift: boolean, sMoves: boolean, dMoves: boolean) {
  const w = WORDS[s.graph]
  const summary: string[] = []
  const dir = (d: string, up: string, down: string) => (d === 'increase' ? up : down)
  if (sMoves) summary.push(`${w.supply.toLowerCase()} ${dir(s.supplyDir, 'increases', 'decreases')}`)
  if (dMoves) summary.push(demandUpDown(s) ? `${w.demand} shifts ${dir(s.demandDir, 'up', 'down')}` : `${w.demand} ${dir(s.demandDir, 'increases', 'decreases')}`)
  if (e1 && e2 && anyShift) summary.push(`${w.rate.toLowerCase()} ${near(e1.y, e2.y) ? 'stays the same' : e2.y > e1.y ? 'rises' : 'falls'}`)
  return summary
}

/** The figure in words, for screen readers. */
function labelOf(s: MoneyMarketsSettings, summary: string[]) {
  if (s.titleMode === 'text' && s.title.trim()) return plainOf(s.title.trim())
  const what = s.graph === 'money' ? 'Money market graph' : s.graph === 'funds' ? 'Loanable funds market graph' : `Market for reserves graph, ${s.regime} reserves`
  return `${what}${summary.length ? `: ${summary.join(', ')}` : ''}`
}
