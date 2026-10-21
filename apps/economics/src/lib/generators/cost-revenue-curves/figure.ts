// Works out a cost and revenue graph from its settings, as panels for the
// econ graph library to lay out: the firm's cost curves from one total cost
// (model.ts), and the price or demand it faces. A perfectly competitive
// firm's price line, where it produces, its profit or loss, and its
// break-even and shutdown points, with the market setting the price in a
// panel beside it; a monopoly's demand and marginal revenue, its price and
// quantity, profit, consumer surplus and deadweight loss, and where a
// regulator would put it; a monopolistically competitive firm in the short
// run or the long run, with its excess capacity.

import { clipPath, type Point } from '$shared/graph/grid'
import { alongCurve, crosses, textBox, type Segment, type Spot } from '$shared/graph/labels'
import { plainOf, runsOf, runsWidth } from '$shared/graph/runs'
import { areaOf, graphOf, lineThrough, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure, type Connector } from '$lib/graph/figure'
import {
  buildPanel, inks, shows, type BraceSpec, type CalloutSpec, type CurveSpec, type GuideSpec, type MarkSpec, type PanelSpec, type PointSpec, type RegionSpec, type Words,
} from '$lib/graph/panel'
import { SCHEMATIC, panelBase, wordsOf } from '$lib/graph/settings'
import {
  afc, atc, avc, costsOf, demandMeetsATC, demandMeetsMC, longRunDemand, mc, minATC, minAVC, mrOn, onRisingMC, priceMaker, priceOn,
  priceTaker, type Costs, type Demand,
} from './model'
import type { CostRevenueSettings, LabelKey } from './settings'

/** The hidden grid, and the part of it curves are drawn in: short of its top and right, leaving room for their names. */
const BOX: Box = { x0: 0, x1: 10, y0: 0, y1: 10 }
const DRAW: Box = { x0: 0, x1: 9.4, y0: 0.4, y1: 9.6 }
/** Cost curves start a little right of the price axis, as they're drawn in textbooks. */
const Q0 = 0.25
/** How far apart, on the drawing, the points of a curve labels keep off are: about a third of a block. */
const KEEP_OFF = 10
/** How far a short-run monopolistically competitive firm's demand sits above or below the long-run one. */
const SHORT_RUN_GAP = 1.1
/** Where the long-run monopolistically competitive demand curve meets the price axis: this far from ATC's lowest cost to the top. */
const LONG_RUN_TOP = 0.62

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6
const onGraph = (p: Point) => p.x >= DRAW.x0 - 1e-9 && p.x <= DRAW.x1 + 1e-9 && p.y >= BOX.y0 - 1e-9 && p.y <= DRAW.y1 + 1e-9

/** The name of an equilibrium value: Pₑ or P*. */
function named(w: Words, style: CostRevenueSettings['eqStyle']): Words {
  if (w.mode !== 'text' || !w.text.trim()) return w
  const t = w.text.trim()
  return { ...w, text: style === 'star' ? `${t}*` : `${t}_e` }
}

/** A curve of a function, cut to where it's drawn (the longest stretch on the graph). */
const drawn = (f: (q: number) => number, from = Q0, to = DRAW.x1): Curve =>
  clipPath(graphOf(f, from, to, 320), DRAW).sort((a, b) => b.length - a.length)[0] ?? []

/** The region between two functions from `x0` to `x1`, the higher on top, kept on the graph. */
function betweenFns(top: (q: number) => number, bottom: (q: number) => number, x0: number, x1: number): Point[] {
  const n = 64
  const up: Point[] = []
  const down: Point[] = []
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n
    up.push({ x, y: Math.min(DRAW.y1, Math.max(BOX.y0, top(x))) })
    down.push({ x, y: Math.min(DRAW.y1, Math.max(BOX.y0, bottom(x))) })
  }
  return [...up, ...down.reverse()]
}

/** A rectangle from the price axis to `q`, between two prices. */
const rectangle = (q: number, y0: number, y1: number): Point[] => [{ x: 0, y: y0 }, { x: 0, y: y1 }, { x: q, y: y1 }, { x: q, y: y0 }]

/** The prices a perfectly competitive firm's price choices put it at, given its costs. */
export function pricesOf(k: Costs) {
  const lowATC = minATC(k)
  const lowAVC = minAVC(k)
  // Profit: halfway from ATC's lowest cost to where MC is by the right of the graph.
  const right = Math.min(9, onRisingMC(k, DRAW.y1 - 0.3) ?? 9)
  return {
    profit: lowATC.v + 0.5 * (mc(k, right) - lowATC.v),
    breakeven: lowATC.v,
    loss: (lowAVC.v + lowATC.v) / 2,
    shutdownPoint: lowAVC.v,
    shutdown: Math.max(lowAVC.v * 0.45, lowAVC.v - 1),
  }
}

/** The demand a firm with market power faces: the monopoly's as set, or the monopolistic competitor's tangent to ATC (or above or below it, in the short run). */
export function demandOf(s: CostRevenueSettings, k: Costs): { d: Demand; tangent?: number } {
  if (s.graph === 'monopolistic') {
    const low = minATC(k)
    const lr = longRunDemand(k, low.v + LONG_RUN_TOP * (DRAW.y1 - 0.2 - low.v))
    if (s.run === 'long') return { d: lr.d, tangent: lr.q }
    return { d: { ...lr.d, top: lr.d.top + (s.shortRun === 'profit' ? SHORT_RUN_GAP : -SHORT_RUN_GAP) } }
  }
  return { d: { top: s.demandTop, slope: s.demandTop / s.demandEnd } }
}

/** Whether a monopoly's costs and demand make it a natural monopoly: ATC still falling where demand meets the quantity axis, so it's falling all along demand. */
export function natural(s: CostRevenueSettings) {
  const k = costsOf({ q: s.atcQ, cost: s.atcCost, slope: s.mcSlope, fixed: s.fixed }).costs
  return s.demandEnd < minATC(k).q
}

export function buildCostRevenue(s: CostRevenueSettings) {
  const ink = inks(s.ink === 'bw')
  const { costs: k, notes } = costsOf({ q: s.atcQ, cost: s.atcCost, slope: s.mcSlope, fixed: s.fixed })
  const w = (key: LabelKey) => wordsOf(s, key)
  const lowATC = minATC(k)
  const lowAVC = minAVC(k)
  const showAVC = s.graph === 'costs' || s.graph === 'perfect' ? true : s.avc

  // The cost curves.
  const curves: CurveSpec[] = []
  const regions: RegionSpec[] = []
  const points: PointSpec[] = []
  const guides: GuideSpec[] = []
  const marks: MarkSpec[] = []
  const braces: BraceSpec[] = []
  const curve = (f: (q: number) => number, key: LabelKey, color: string, more: Partial<CurveSpec> = {}, from = Q0) =>
    curves.push({ pts: drawn(f, from), name: w(key), color, nameHugsEnd: true, keepOffEvery: KEEP_OFF, ...more })
  curve((q) => mc(k, q), 'mcLabel', ink.supply)
  curve((q) => atc(k, q), 'atcLabel', ink.third)
  if (showAVC) curve((q) => avc(k, q), 'avcLabel', ink.fourth)
  if (s.afc) curve((q) => afc(k, q), 'afcLabel', s.ink === 'bw' ? ink.black : ink.region.orange, { dash: '10 6' })

  /** A value written once at an axis; one already there keeps its place. */
  const mark = (axis: 'x' | 'y', at: number, name: Words) => {
    if (!s.guides) return
    if (!marks.some((m) => m.axis === axis && near(m.at, at))) marks.push({ axis, at, name })
  }
  /** A point with a dot, its name if any, unless one is already there. */
  const point = (at: Point, name?: Words) => {
    if (!onGraph(at)) return
    const same = points.find((p) => near(p.at.x, at.x) && near(p.at.y, at.y))
    if (same) same.name = same.name ?? name
    else points.push({ at, name })
  }
  const add = (on: boolean, poly: Point[], color: string, hatch: number, key: LabelKey) => {
    if (on && poly.length > 2 && areaOf(poly) > 0.02) regions.push({ poly, color, hatch, name: w(key), leader: true })
  }
  /** Profit or loss: the rectangle between price and ATC, out to the quantity made, and ATC there written at the axis. */
  const profitOrLoss = (q: number, p: number) => {
    const cost = atc(k, q)
    if (!s.profit || Math.abs(p - cost) < 0.02) return
    if (cost > DRAW.y1) {
      notes.push('ATC is off the top of the graph where the firm produces, so its loss is not shaded. Raise demand or lower costs.')
      return
    }
    if (s.guides) guides.push({ from: { x: q, y: cost }, x: false })
    mark('y', cost, w('costLabel'))
    const profit = p > cost
    add(true, rectangle(q, Math.max(BOX.y0, Math.min(p, cost)), Math.min(DRAW.y1, Math.max(p, cost))), profit ? ink.region.green : ink.region.red, profit ? 45 : -45, profit ? 'profitLabel' : 'lossLabel')
  }

  // The cost curves and the perfectly competitive firm mark where MC crosses AVC and ATC; the firm's are named, with arrows to them.
  const callouts: CalloutSpec[] = []
  const minimums = (named: boolean) => {
    if (!s.minimums) return
    point({ x: lowATC.q, y: lowATC.v })
    if (showAVC) point({ x: lowAVC.q, y: lowAVC.v })
    if (!named) return
    // The shutdown point first: it's lower, nearer the axes, with fewer places for its name.
    if (showAVC) callouts.push({ at: { x: lowAVC.q, y: lowAVC.v }, name: w('shutdownLabel') })
    callouts.push({ at: { x: lowATC.q, y: lowATC.v }, name: w('breakEvenLabel') })
  }

  let market: PanelSpec | null = null
  const connectors: Connector[] = []
  let story = ''

  if (s.graph === 'costs') {
    minimums(false)
    story = `Cost curves: ${[w('mcLabel'), w('atcLabel'), w('avcLabel'), ...(s.afc ? [w('afcLabel')] : [])].map((x) => plainOf(x.text) || 'a curve').join(', ')}`
  }

  if (s.graph === 'perfect') {
    const price = s.price === 'custom' ? s.priceAt : pricesOf(k)[s.price]
    const o = priceTaker(k, price)
    const priceName = named(w('pLabel'), s.eqStyle)
    // The price line's name goes past its end, and before the cost curves' names, so nothing else takes its place.
    curves.unshift({ pts: drawn(() => price, 0), name: w('priceLineLabel'), color: ink.demand, nameHugsEnd: true, namePast: true, keepOffEvery: KEEP_OFF })
    if (!s.market) mark('y', price, priceName)
    if (!o.shutdown) {
      point({ x: o.q, y: price })
      if (s.guides) guides.push({ from: { x: o.q, y: price }, y: false })
      mark('x', o.q, named(w('qFirmLabel'), s.eqStyle))
      profitOrLoss(o.q, price)
      if (o.q > DRAW.x1) notes.push('At this price the firm makes more than the graph shows. Lower the price or make MC steeper.')
    }
    minimums(true)
    const atLowATC = Math.abs(price - lowATC.v) < 0.02
    const atLowAVC = Math.abs(price - lowAVC.v) < 0.02
    story =
      o.shutdown ? 'the price is below the lowest AVC, so the firm shuts down'
      : atLowATC ? 'the price is at the lowest ATC, so the firm breaks even'
      : atLowAVC ? 'the price is at the lowest AVC, the shutdown point'
      : o.profit > 0 ? 'the price is above ATC, so the firm makes an economic profit'
      : 'the price is between AVC and ATC, so the firm makes a loss but keeps producing'

    if (s.market) {
      market = marketPanel(s, price)
      connectors.push({ from: { panel: 0, at: { x: 5, y: price } }, to: { panel: 1, at: { x: 0, y: price } } })
    }
    story = `Perfectly competitive firm${s.market ? ' beside its market' : ''}: ${story}`
  }

  if (s.graph === 'monopoly' || s.graph === 'monopolistic') {
    const { d, tangent } = demandOf(s, k)
    const monopoly = s.graph === 'monopoly'
    const longRun = s.graph === 'monopolistic' && s.run === 'long'
    curve((q) => priceOn(d, q), 'dLabel', ink.demand, {}, 0)
    curve((q) => mrOn(d, q), 'mrLabel', ink.demand, { dash: '10 6' }, 0)

    const m = priceMaker(k, d)
    const qSO = demandMeetsMC(k, d)
    const qFR = monopoly ? demandMeetsATC(k, d) : null
    const reg = monopoly ? s.regulation : 'none'
    const pName = monopoly ? w('pmLabel') : named(w('pLabel'), s.eqStyle)
    const qName = monopoly ? w('qmLabel') : named(w('qFirmLabel'), s.eqStyle)
    if (!m) notes.push('Demand is too low for MR ever to reach MC: the firm would make nothing. Raise demand or lower costs.')
    else {
      if (m.shutdown) notes.push('At MR = MC the price is below AVC: in the short run this firm would shut down.')
      if (m.q > DRAW.x1 || m.p > DRAW.y1) notes.push('Where MR = MC is off the graph. Lower demand or raise costs.')
    }

    /** A price and quantity the firm ends up at: a dot on demand, guides and their names at the axes. */
    const outcome = (q: number, p: number, pw: Words, qw: Words) => {
      point({ x: q, y: p })
      if (s.guides) guides.push({ from: { x: q, y: p } })
      mark('y', p, pw)
      mark('x', q, qw)
    }
    // Where the firm ends up, and what's shaded for it: the monopoly's own choice, or the regulated price.
    let at: { q: number; p: number } | null = m && !m.shutdown ? { q: m.q, p: m.p } : null
    if (m && !m.shutdown) outcome(m.q, m.p, pName, qName)
    if ((reg === 'optimal' || reg === 'both') && qSO !== null) {
      outcome(qSO, priceOn(d, qSO), w('psoLabel'), w('qsoLabel'))
      if (reg === 'optimal') at = { q: qSO, p: priceOn(d, qSO) }
    }
    if (reg === 'optimal' || reg === 'both' || reg === 'fair') {
      if (qSO === null) notes.push('Demand never meets MC, so there is no socially optimal price on the graph.')
    }
    if (reg === 'fair' || reg === 'both') {
      if (qFR === null) notes.push('Demand is below ATC everywhere: no price lets this monopoly break even.')
      else {
        outcome(qFR, priceOn(d, qFR), w('pfrLabel'), w('qfrLabel'))
        if (reg === 'fair') at = { q: qFR, p: priceOn(d, qFR) }
        if (qSO !== null && qFR > qSO + 1e-6) notes.push('At P = MC this monopoly already makes a profit, so the fair-return price is below it. Raise its fixed cost or lower demand for the usual picture.')
      }
    }

    if (at) {
      if (!longRun) profitOrLoss(at.q, at.p)
      // Consumer surplus and a loss both sit over the price, one on the other: the loss is shaded, not both.
      const loss = !longRun && s.profit && atc(k, at.q) > at.p + 0.02
      if (s.cs && loss) notes.push('Consumer surplus is not shaded: it would lie over the loss. Turn off Profit or loss to shade it.')
      add(s.cs && !loss, betweenFns((q) => priceOn(d, q), () => at!.p, 0, at.q), ink.region.blue, 90, 'csLabel')
      // Deadweight loss: between demand and MC, from what's made to where demand meets MC.
      if (qSO !== null && Math.abs(qSO - at.q) > 0.02) {
        const [a, b] = [at.q, qSO].sort((x, y) => x - y)
        const over = at.q > qSO
        add(s.dwl, betweenFns(over ? (q) => mc(k, q) : (q) => priceOn(d, q), over ? (q) => priceOn(d, q) : (q) => mc(k, q), a, Math.min(b, DRAW.x1)), ink.region.orange, 0, 'dwlLabel')
      }
    }

    if (longRun && tangent !== undefined) {
      // Excess capacity: from what the firm makes up to where ATC is lowest.
      point({ x: lowATC.q, y: lowATC.v })
      if (s.guides) guides.push({ from: { x: lowATC.q, y: lowATC.v }, y: false })
      mark('x', lowATC.q, w('qMinLabel'))
      braces.push({ from: { x: tangent, y: 0 }, to: { x: lowATC.q, y: 0 }, side: 'below', under: true, name: w('excessLabel') })
    }
    if (monopoly) {
      const regs = { none: '', optimal: ', regulated to the socially optimal price', fair: ', regulated to a fair-return price', both: ', with the socially optimal and fair-return prices marked' }
      story = `Monopoly${regs[reg]}`
    } else story = `Monopolistically competitive firm in the ${longRun ? 'long run, with demand tangent to ATC' : `short run, making a ${s.shortRun}`}`
  }

  const shaded = regions.map((r) => (r.name && r.name.mode === 'text' ? plainOf(r.name.text) : '')).filter(Boolean)
  // The curves' names are written by this figure, not the graph library, so
  // each stays by its own curve's end (see curveNames); all but the price
  // line's, which goes past its end with room made for it.
  const withNames = curves.filter((c) => !c.namePast && shows(c.name))
  const base: PanelSpec = {
    ...panelBase(s, SCHEMATIC),
    regions,
    curves: curves.map((c) => (c.namePast ? c : { ...c, name: undefined })),
    points,
    marks,
    guides,
    braces,
    callouts,
    caption: market ? w('firmLabel') : undefined,
  }
  const firm = untangled({ ...base, points: [...curveNames(withNames, base), ...points] })
  const label = s.titleMode === 'text' && s.title.trim() ? plainOf(s.title.trim()) : `${story}${shaded.length ? `; shaded ${shaded.join(', ')}` : ''}`
  return {
    figure: buildFigure(market ? [market, firm] : [firm], connectors),
    costs: k,
    notes,
    label,
  }
}

export type CostRevenueFigure = ReturnType<typeof buildCostRevenue>

/** How far from its point, on the drawing, a callout's words may go, nearest first, and how many ways round it. */
const REACH = [30, 44, 60, 80, 100, 125]
const TURNS = 16
/** A write-on line's width, as the graph library draws one for a callout left blank. */
const BLANK_W = 46
/** How far short of its point a callout's arrow stops, as the graph library draws it, and how much nearer the point the curves through it may cross it. */
const STOP = 4
const NEAR_POINT = 8
/** How much of a curve, from its end, its name may move along when there's no clear place right by the end. */
const TAIL = 0.35

/** Whether two segments cross, away from their ends. */
function cross(a: Segment, b: Segment) {
  const side = (s: Segment, x: number, y: number) => Math.sign((s.x2 - s.x1) * (y - s.y1) - (s.y2 - s.y1) * (x - s.x1))
  return side(a, b.x1, b.y1) * side(a, b.x2, b.y2) < 0 && side(b, a.x1, a.y1) * side(b, a.x2, a.y2) < 0
}

const grow = (b: Box, by: number): Box => ({ x0: b.x0 - by, y0: b.y0 - by, x1: b.x1 + by, y1: b.y1 + by })
const holds = (b: Box, x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

/** A segment cut `by` short at its second end. */
function cut(l: Segment, by: number): Segment {
  const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1)
  const f = Math.max(0, (len - by) / len)
  return { x1: l.x1, y1: l.y1, x2: l.x1 + (l.x2 - l.x1) * f, y2: l.y1 + (l.y2 - l.y1) * f }
}

/** How far a point is from a segment. */
function distance(p: Point, l: Segment) {
  const dx = l.x2 - l.x1
  const dy = l.y2 - l.y1
  const t = Math.max(0, Math.min(1, ((p.x - l.x1) * dx + (p.y - l.y1) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p.x - (l.x1 + t * dx), p.y - (l.y1 + t * dy))
}

/** A label's words, to tell labels apart by. */
const keyOf = (w: Words) => `${w.text}|${w.mode}`
/** A polygon's edges. */
const edgesOf = (poly: Point[]): Segment[] => poly.map((a, k) => ({ x1: a.x, y1: a.y, x2: poly[(k + 1) % poly.length].x, y2: poly[(k + 1) % poly.length].y }))

/** Whether a point is inside a polygon (even–odd). */
function inside(poly: Point[], p: Point) {
  let ins = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ins = !ins
  }
  return ins
}

/** Segments filed by where they are on the drawing, for asking quickly which of them pass through a box. */
function indexed(segments: Segment[], cell = 24) {
  const cells = new Map<string, Segment[]>()
  const span = (a: number, b: number) => [Math.floor(Math.min(a, b) / cell), Math.floor(Math.max(a, b) / cell)]
  for (const l of segments) {
    const [i0, i1] = span(l.x1, l.x2)
    const [j0, j1] = span(l.y1, l.y2)
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) (cells.get(`${i},${j}`) ?? cells.set(`${i},${j}`, []).get(`${i},${j}`)!).push(l)
  }
  /** The segments near a box: those in the cells it covers. */
  const nearby = (b: Box) => {
    const out = new Set<Segment>()
    const [i0, i1] = span(b.x0, b.x1)
    const [j0, j1] = span(b.y0, b.y1)
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const l of cells.get(`${i},${j}`) ?? []) out.add(l)
    return [...out]
  }
  const around = (l: Segment): Box => ({ x0: Math.min(l.x1, l.x2), y0: Math.min(l.y1, l.y2), x1: Math.max(l.x1, l.x2), y1: Math.max(l.y1, l.y2) })
  return {
    /** Whether any segment passes through `b`. */
    hits: (b: Box) => nearby(b).some((l) => crosses(l, b)),
    /** How many segments a segment crosses (`cross` away from their ends), cut `by` short at its second end. */
    crossing: (l: Segment, by = 0) => {
      const c = by ? cut(l, by) : l
      return nearby(around(c)).filter((d) => cross(c, d)).length
    },
    nearby,
  }
}

/** Places for a curve's name right by the end of a run of it on the drawing, as the graph library has them: past the end, over it, under it. */
function byEnd(run: Point[], fs: number): Spot[] {
  const end = run.at(-1)!
  const prev = run[Math.max(0, run.length - 6)]
  const rising = end.y < prev.y - 0.5
  const upright = Math.abs(end.x - prev.x) < 1
  const flat = Math.abs(end.y - prev.y) < Math.abs(end.x - prev.x) * 0.15
  return upright
    ? [
        { x: end.x, y: end.y - 7, anchor: 'middle' },
        { x: end.x + 6, y: end.y + fs * 0.8, anchor: 'start' },
        { x: end.x - 6, y: end.y + fs * 0.8, anchor: 'end' },
      ]
    : [
        { x: end.x + (flat ? 8 : 5), y: end.y + (flat ? fs * 0.35 : rising ? 0 : fs * 0.6), anchor: 'start' },
        { x: end.x + 4, y: end.y - 6, anchor: 'start' },
        { x: end.x + 4, y: end.y + fs + 2, anchor: 'start' },
        { x: end.x, y: end.y - 8, anchor: 'middle' },
        { x: end.x - 6, y: end.y - 6, anchor: 'end' },
        { x: end.x - 6, y: end.y + fs + 2, anchor: 'end' },
      ]
}

/** The last `share` of a run of points, by its length. */
function tailOf(run: Point[], share: number): Point[] {
  let total = 0
  for (let k = 1; k < run.length; k++) total += Math.hypot(run[k].x - run[k - 1].x, run[k].y - run[k - 1].y)
  let from = run.length - 1
  for (let gone = 0; from > 0 && gone < total * share; from--) gone += Math.hypot(run[from].x - run[from - 1].x, run[from].y - run[from - 1].y)
  return run.slice(from)
}

/**
 * Each named curve's name, as a point at its end with no dot, which the
 * graph library writes before anything else: past the end, level with it,
 * for the curves ending at the graph's right edge, moved apart only as far
 * as they must be, so they keep their curves' order top to bottom (the
 * price line's own name, past its end, stays put); else just by the end;
 * and only failing those along the last stretch of the curve, never out in
 * the middle of the graph where it could name another curve.
 */
function curveNames(named: CurveSpec[], spec: PanelSpec): PointSpec[] {
  if (!named.length) return []
  const p = buildPanel(spec)
  const fs = p.labelFs
  const right = p.px({ x: DRAW.x1, y: 0 }).x
  const runs = named.map((c) => c.pts.map(p.px))
  type Slot = { i: number; y: number; fixed: boolean }
  const slots: Slot[] = [
    ...runs.flatMap((run, i) => (run.length && Math.abs(run.at(-1)!.x - right) < 0.5 ? [{ i, y: run.at(-1)!.y + fs * 0.35, fixed: false }] : [])),
    ...(spec.curves ?? []).filter((c) => c.namePast && shows(c.name) && c.pts.length).map((c) => ({ i: -1, y: p.px(c.pts.at(-1)!).y + fs * 0.35, fixed: true })),
  ].sort((a, b) => a.y - b.y)
  const gap = fs * 1.08 + 4
  const [lo, hi] = [p.top - 12 + fs * 0.78, p.xAxis.y - fs * 0.3 - 4]
  for (let n = 0; n < 80; n++) {
    let moved = false
    for (let k = 1; k < slots.length; k++) {
      const [a, b] = [slots[k - 1], slots[k]]
      const short = a.y + gap - b.y
      if (short < 0.01) continue
      moved = true
      if (a.fixed) b.y += short
      else if (b.fixed) a.y -= short
      else [a.y, b.y] = [a.y - short / 2, b.y + short / 2]
    }
    for (const sl of slots) if (!sl.fixed) sl.y = Math.min(hi, Math.max(lo, sl.y))
    if (!moved) break
  }
  // What's in a name's way: every line drawn, the dots, the price line's name past its end, and the names already found places.
  const widthOf = (w: Words) => (w.mode === 'text' ? runsWidth(runsOf(w.text.trim(), fs), fs) * 1.04 + 2 : BLANK_W)
  const lines: Segment[] = [
    ...p.guides,
    { x1: p.yAxis.x, y1: p.yAxis.y1, x2: p.yAxis.x, y2: p.yAxis.y2 },
    { x1: p.xAxis.x1, y1: p.xAxis.y, x2: p.xAxis.x2, y2: p.xAxis.y },
  ]
  for (const c of spec.curves ?? []) {
    const q = c.pts.map(p.px)
    for (let k = 1; k < q.length; k++) lines.push({ x1: q[k - 1].x, y1: q[k - 1].y, x2: q[k].x, y2: q[k].y })
  }
  const index = indexed(lines)
  const taken: Box[] = p.dots.map((d) => grow({ x0: d.x, y0: d.y, x1: d.x, y1: d.y }, p.r))
  for (const c of spec.curves ?? []) {
    if (!c.namePast || !shows(c.name) || !c.pts.length) continue
    const end = p.px(c.pts.at(-1)!)
    taken.push(textBox({ x: end.x + 6, y: end.y + fs * 0.35, anchor: 'start' }, widthOf(c.name), fs))
  }
  // The room the graph library leaves on the right for names past the curves' ends, at medium labels 56.
  const edge: Box = { x0: p.yAxis.x + 2, y0: p.top - 16, x1: p.grid.x + p.grid.w + (56 * fs) / (14 * 1.1) - 2, y1: p.xAxis.y - 2 }
  const clear = (b: Box) =>
    b.x0 >= edge.x0 && b.x1 <= edge.x1 && b.y0 >= edge.y0 && b.y1 <= edge.y1 && !taken.some((t) => overlap(grow(b, 3), t)) && !index.hits(grow(b, 3))
  return named.map((c, i) => {
    const run = runs[i]
    const end = run.at(-1)!
    const slot = slots.find((sl) => sl.i === i)
    const width = widthOf(c.name!)
    const byTheEnd = byEnd(run, fs)
    // Last, by the end but just past a dashed guide running down through the name there (MR ending between two guides).
    const past = byTheEnd.flatMap((sp) => {
      const box = textBox(sp, width, fs)
      const down = p.guides.filter((g) => g.x1 === g.x2 && g.x1 > box.x0 - 3 && g.x1 < box.x1 + 3 && crosses(g, grow(box, 3)))
      if (down.length !== 1 || sp.anchor === 'middle') return []
      const x = down[0].x1
      return [sp.anchor === 'start' ? { ...sp, x: x + 6 } : { ...sp, x: x - 6 }]
    })
    const spots: Spot[] = [...(slot ? [{ x: end.x + 7, y: slot.y, anchor: 'start' as const }] : []), ...byTheEnd, ...alongCurve(tailOf(run, TAIL), fs), ...past]
    // The first place clear of everything, as the graph library takes a curve's name by its end if all it does there is come close to a line.
    const first = spots.find((sp) => clear(textBox(sp, width, fs)))
    if (first) taken.push(textBox(first, width, fs))
    return { at: c.pts.at(-1)!, name: c.name, dot: false, spots: () => (first ? [first] : spots) }
  })
}

/** A callout on a panel as laid out: the one asked for (`callout`), or a region's name the graph library wrote outside it with an arrow in (`region`). */
type Laid = { kind: 'callout' | 'region'; i: number; key: string; name: Words; tip: Point; box: Box; own: Box; leader: Segment; cost: number }

/**
 * A panel laid out, with the lines on it an arrow could cross (the dashed
 * guides, and the curves in steps about as long as a dash: close enough,
 * and quick to check), its callouts with what's wrong with each, and how
 * tangled it is in all: an arrow crossing a line, a label or a dot costs
 * 10, words on a line 15 (worse: the line runs through them); words close
 * by another label, so the two read as one, or over another region, or a
 * blank's arrow starting well off its line, 3. An arrow may cross the
 * curves through its point near it.
 */
function tangles(spec: PanelSpec) {
  const p = buildPanel(spec)
  const guides = p.guides
  const curves: Segment[] = []
  for (const c of spec.curves ?? []) {
    let from: Point | null = null
    for (const [k, q] of c.pts.map(p.px).entries()) {
      const far = from ? Math.hypot(q.x - from.x, q.y - from.y) >= 4 : true
      if (from && (far || k === c.pts.length - 1)) curves.push({ x1: from.x, y1: from.y, x2: q.x, y2: q.y })
      if (far) from = q
    }
  }
  const lines = [...guides, ...curves]
  const guideIndex = indexed(guides)
  const curveIndex = indexed(curves)
  const lineIndex = indexed(lines)
  const fs = p.labelFs
  const raw = p.labels.map((l) => textBox(l, l.runs ? runsWidth(l.runs, fs) : Math.abs((l.blank?.x2 ?? 0) - (l.blank?.x1 ?? 0)), fs))
  const boxes = raw.map((b) => grow(b, 3))
  const dots = p.dots.map((d) => grow({ x0: d.x, y0: d.y, x1: d.x, y1: d.y }, 8))
  const crossed = (l: Segment, skip: Box[] = []) =>
    guideIndex.crossing(l) +
    curveIndex.crossing(l, NEAR_POINT) +
    boxes.filter((b) => !skip.includes(b) && !holds(grow(b, 4), l.x1, l.y1) && crosses(cut(l, NEAR_POINT), b)).length
  // The regions named, which words of another's would seem to name.
  const shaded = p.regions.filter((r) => shows(r.name)).map((r) => ({ key: keyOf(r.name!), poly: r.poly, edges: edgesOf(r.poly) }))
  const over = (box: Box, key: string) =>
    shaded.some((r) => r.key !== key && (r.edges.some((e) => crosses(e, box)) || inside(r.poly, { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 })))
  /**
   * What's wrong with a callout's words in `box` (a blank's line along its
   * foot) and its arrow, with `mine` its own words' box as laid out, `key`
   * its name's: words over another region read as naming it, so they cost 3.
   */
  const costOf = (box: Box, leader: Segment | null, blank: boolean, mine: Box[], key: string) => {
    const tip = leader ? { x: leader.x2, y: leader.y2 } : null
    let n = 0
    if (leader) {
      n += 10 * (crossed(leader, mine) + dots.filter((d) => !holds(d, tip!.x, tip!.y) && crosses(cut(leader, NEAR_POINT), d)).length)
      if (blank && distance({ x: leader.x1, y: leader.y1 }, { x1: box.x0, y1: box.y1 - fs * 0.3, x2: box.x1, y2: box.y1 - fs * 0.3 }) > 9) n += 3
    }
    if (lineIndex.hits(grow(box, 2))) n += 15
    if (boxes.some((b) => !mine.includes(b) && overlap(grow(box, fs * 0.6), b))) n += 3
    if (over(box, key)) n += 3
    return n
  }
  const tipAt = (at: Point) => p.leaders.find((l) => Math.hypot(l.x2 - at.x, l.y2 - at.y) < STOP + 2)
  const asked = (spec.callouts ?? []).map((c, i) => ({ kind: 'callout' as const, i, name: c.name, tip: p.px(c.at) }))
  const named = p.regions.map((r, i) => ({ kind: 'region' as const, i, name: r.name, tip: r.centroid }))
  const calls: Laid[] = [...asked, ...named].flatMap((c) => {
    const leader = shows(c.name) ? tipAt(c.tip) : undefined
    const k = leader ? boxes.findIndex((b) => holds(grow(b, 4), leader.x1, leader.y1)) : -1
    if (!leader || k < 0) return []
    return [{ ...c, name: c.name!, key: keyOf(c.name!), box: raw[k], own: boxes[k], leader, cost: costOf(raw[k], leader, c.name!.mode === 'blank', [boxes[k]], keyOf(c.name!)) }]
  })
  const n = 10 * p.crowded + calls.reduce((n, c) => n + c.cost, 0)
  return { n, calls, p, lines, lineIndex, boxes, dots, costOf }
}

/**
 * Points inside a region, on the drawing, an arrow could go to: clear of
 * its edges and of every line through it (so the arrow plainly lands in the
 * region, not on a line), nearest its middle first, a little apart.
 */
function targetsIn(poly: Point[], middle: Point, lines: Segment[]): Point[] {
  const xs = poly.map((q) => q.x)
  const ys = poly.map((q) => q.y)
  const edges = edgesOf(poly)
  const box: Box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
  const close = lines.filter((l) => crosses(l, grow(box, 8)))
  const found: (Point & { edge: number; line: number })[] = []
  for (let y = box.y0 + 2; y < box.y1; y += 4) {
    for (let x = box.x0 + 2; x < box.x1; x += 4) {
      const q = { x, y }
      if (!inside(poly, q)) continue
      found.push({ x, y, edge: Math.min(...edges.map((e) => distance(q, e))), line: Math.min(Infinity, ...close.map((l) => distance(q, l))) })
    }
  }
  for (const [edge, line] of [[5, 7], [2.5, 4]]) {
    const ok = found.filter((q) => q.edge >= edge && q.line >= line).sort((a, b) => Math.hypot(a.x - middle.x, a.y - middle.y) - Math.hypot(b.x - middle.x, b.y - middle.y))
    const out: Point[] = []
    for (const q of ok) if (out.length < 12 && out.every((o) => Math.hypot(o.x - q.x, o.y - q.y) >= 12)) out.push({ x: q.x, y: q.y })
    if (out.length) return out
  }
  return [middle]
}

/**
 * A better place for a callout's words, if there is one: round the point
 * its arrow goes to (for a region's name, any of the places in it an arrow
 * could go), where the words touch no line and no other label, and what's
 * wrong (`tangles`) is least and less than now; nearest first.
 */
function betterSpots(c: Laid, t: ReturnType<typeof tangles>): { tip: Point; spots: Spot[] } | null {
  const { p, lines, boxes } = t
  const fs = p.labelFs
  const blank = c.name.mode !== 'text'
  const width = blank ? BLANK_W : runsWidth(runsOf(c.name.text.trim(), fs), fs) * 1.04 + 2
  const mine = [c.own]
  const others = [...boxes.filter((b) => !mine.includes(b)), ...t.dots]
  const region = c.kind === 'region' ? p.regions[c.i] : null
  const tips = region ? targetsIn(region.poly, region.centroid, lines) : [c.tip]
  let least = c.cost
  let best: { tip: Point; spots: Spot[] } | null = null
  for (const r of REACH) {
    for (const at of tips) {
      for (let k = 0; k < TURNS; k++) {
        const dx = Math.cos((2 * Math.PI * k) / TURNS)
        const dy = Math.sin((2 * Math.PI * k) / TURNS)
        // The words out the way they go from the point, or centered there, or back toward it if there's no room.
        const way: Spot['anchor'] = dx > 0.3 ? 'start' : dx < -0.3 ? 'end' : 'middle'
        for (const anchor of [way, ...(['middle', 'start', 'end'] as const).filter((a) => a !== way)]) {
          const spot: Spot = { x: at.x + r * dx, y: at.y + r * dy + (dy > 0.3 ? fs : dy > -0.3 ? fs * 0.35 : 0), anchor }
          const box = textBox(spot, width, fs)
          if (holds(grow(box, 6), at.x, at.y)) continue
          if (box.x0 < p.yAxis.x || box.x1 > p.width || box.y0 < p.top - 16 || box.y1 > p.xAxis.y - 2) continue
          if (others.some((o) => overlap(box, o)) || t.lineIndex.hits(grow(box, 3))) continue
          // The arrow, from the words' nearest edge to just short of the point.
          const from = { x: Math.min(box.x1 + 3, Math.max(box.x0 - 3, at.x)), y: Math.min(box.y1 + 3, Math.max(box.y0 - 3, at.y)) }
          const arrow = Math.hypot(at.x - from.x, at.y - from.y) < STOP + 6 ? null : cut({ x1: from.x, y1: from.y, x2: at.x, y2: at.y }, STOP)
          const n = t.costOf(box, arrow, blank, mine, c.key)
          if (n < least) [least, best] = [n, { tip: at, spots: [] }]
          if (best && n === least && best.tip === at) best.spots.push(spot)
        }
      }
    }
  }
  return best
}

/**
 * The panel with its callouts (the break-even and shutdown points', and
 * regions' names written outside them) moved where their arrows cross
 * fewest lines and labels and their words sit clear, one at a time, each
 * kept only if it leaves the panel less tangled: the graph library keeps
 * arrows off curves but not off guides, and a crowded graph can send one
 * across a guide or leave its words on one.
 */
function untangled(spec: PanelSpec): PanelSpec {
  let now = tangles(spec)
  const tried = new Set<string>()
  for (;;) {
    const c = now.calls.find((x) => x.cost > 0 && !tried.has(x.key))
    if (!c) return spec
    tried.add(c.key)
    const better = betterSpots(c, now)
    if (!better) continue
    const { tip, spots } = better
    const moved = (at: Point) => spots.map((s) => ({ ...s, x: s.x - tip.x + at.x, y: s.y - tip.y + at.y }))
    let next: PanelSpec
    if (c.kind === 'callout') next = { ...spec, callouts: spec.callouts!.map((x, j) => (j === c.i ? { ...x, spots: moved } : x)) }
    else {
      // The region's name becomes a callout of this figure's, its arrow to the place in it found.
      const o = now.p.px({ x: 0, y: 0 })
      const u = now.p.px({ x: 10, y: 10 })
      const at = { x: ((tip.x - o.x) / (u.x - o.x)) * 10, y: ((tip.y - o.y) / (u.y - o.y)) * 10 }
      next = {
        ...spec,
        regions: spec.regions!.map((r, j) => (j === c.i ? { ...r, name: undefined } : r)),
        callouts: [...(spec.callouts ?? []), { at, name: c.name, spots: moved }],
      }
    }
    const t = tangles(next)
    if (t.n < now.n) [spec, now] = [next, t]
  }
}

/** The market a perfectly competitive firm takes its price from: supply and demand crossing at that price. */
function marketPanel(s: CostRevenueSettings, price: number): PanelSpec {
  const ink = inks(s.ink === 'bw')
  const e = { x: 5, y: price }
  // Supply and demand rise and fall less steeply at a low price, so they still reach 2½ blocks either side before the bottom.
  const rise = Math.min(0.8, Math.max(0.3, (price - DRAW.y0) / 2.5))
  const far: Box = { x0: -100, x1: 100, y0: -100, y1: 100 }
  const cut = (c: Curve) => clipPath(c, DRAW).sort((a, b) => b.length - a.length)[0] ?? []
  const base = panelBase(s, SCHEMATIC)
  return {
    ...base,
    title: undefined,
    // The market's price axis is written, a blank or left off as the firm's is.
    axisWords: { x: base.axisWords.x, y: s.yTitleMode === 'text' ? wordsOf(s, 'marketYLabel') : { text: '', mode: s.yTitleMode } },
    curves: [
      { pts: cut(lineThrough(e, { x: 6, y: price - rise }, far)), name: wordsOf(s, 'marketDLabel'), color: ink.demand },
      { pts: cut(lineThrough(e, { x: 6, y: price + rise }, far)), name: wordsOf(s, 'marketSLabel'), color: ink.supply },
    ],
    points: [{ at: e }],
    guides: s.guides ? [{ from: e }] : [],
    marks: s.guides ? [{ axis: 'y', at: price, name: named(wordsOf(s, 'pLabel'), s.eqStyle) }, { axis: 'x', at: 5, name: named(wordsOf(s, 'qLabel'), s.eqStyle) }] : [],
    caption: wordsOf(s, 'marketLabel'),
  }
}
