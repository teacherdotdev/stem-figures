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
import { crosses, textBox, type Segment, type Spot } from '$shared/graph/labels'
import { plainOf, runsOf, runsWidth } from '$shared/graph/runs'
import { areaOf, graphOf, lineThrough, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure, type Connector } from '$lib/graph/figure'
import {
  buildPanel, inks, type BraceSpec, type CalloutSpec, type CurveSpec, type GuideSpec, type MarkSpec, type PanelSpec, type PointSpec, type RegionSpec, type Words,
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
      mark('x', o.q, w('qFirmLabel'))
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
    const qName = monopoly ? w('qmLabel') : w('qFirmLabel')
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
      add(s.cs, betweenFns((q) => priceOn(d, q), () => at!.p, 0, at.q), ink.region.blue, 90, 'csLabel')
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
  const firm: PanelSpec = {
    ...panelBase(s, SCHEMATIC),
    regions,
    curves,
    points,
    marks,
    guides,
    braces,
    callouts,
    caption: market ? w('firmLabel') : undefined,
  }
  firm.callouts = untangled(firm)
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

/**
 * A panel laid out, with the lines on it an arrow could cross (the dashed
 * guides, and the curves in steps about as long as a dash: close enough,
 * and quick to check); how many of them the arrows cross, with how many
 * labels found no clear place; and how many each callout's own arrow
 * crosses. An arrow may cross the curves through its point near it, and
 * counts the labels it runs through as lines.
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
  // Every label's box, a little bigger; an arrow's own words are where it starts.
  const fs = p.labelFs
  const boxes = p.labels.map((l) => grow(textBox(l, l.runs ? runsWidth(l.runs, fs) : Math.abs((l.blank?.x2 ?? 0) - (l.blank?.x1 ?? 0)), fs), 3))
  const crossed = (l: Segment, skip: Box[] = []) =>
    guides.filter((d) => cross(l, d)).length +
    curves.filter((d) => cross(cut(l, NEAR_POINT), d)).length +
    boxes.filter((b) => !skip.includes(b) && !holds(grow(b, 4), l.x1, l.y1) && crosses(cut(l, NEAR_POINT), b)).length
  const leaderOf = (c: CalloutSpec) => {
    const at = p.px(c.at)
    return p.leaders.find((l) => Math.hypot(l.x2 - at.x, l.y2 - at.y) < STOP + 2)
  }
  const each = (spec.callouts ?? []).map((c) => {
    const l = leaderOf(c)
    return l ? crossed(l) : 0
  })
  return { n: p.crowded + p.leaders.reduce((n, l) => n + crossed(l), 0), each, p, guides, curves, boxes, crossed, leaderOf }
}

/**
 * The places round a callout's point where its words would touch no line
 * and no other label, and its arrow would cross fewest lines and labels
 * (fewer than `now`), nearest first (those well clear of other labels
 * before those close by them), on a panel as laid out.
 */
function betterSpots(c: CalloutSpec, t: ReturnType<typeof tangles>, now: number): Spot[] {
  const { p, crossed } = t
  const lines = [...t.guides, ...t.curves]
  const fs = p.labelFs
  const at = p.px(c.at)
  const width = c.name.mode === 'text' ? runsWidth(runsOf(c.name.text.trim(), fs), fs) * 1.04 + 2 : BLANK_W
  // Every other label as it's laid out now (the callout's own is where its arrow starts), and the dots.
  const own = t.leaderOf(c)
  const mine = t.boxes.filter((b) => own && holds(grow(b, 4), own.x1, own.y1))
  const dots = p.dots.map((d) => grow({ x0: d.x, y0: d.y, x1: d.x, y1: d.y }, 8))
  const others = [...t.boxes.filter((b) => !mine.includes(b)), ...dots]
  let least = now
  let out: Spot[] = []
  let tight: Spot[] = []
  for (const r of REACH) {
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
        if (lines.some((l) => crosses(l, grow(box, 3))) || others.some((o) => overlap(box, o))) continue
        // The arrow, from the words' nearest edge to just short of the point.
        const from = { x: Math.min(box.x1 + 3, Math.max(box.x0 - 3, at.x)), y: Math.min(box.y1 + 3, Math.max(box.y0 - 3, at.y)) }
        const arrow = cut({ x1: from.x, y1: from.y, x2: at.x, y2: at.y }, STOP)
        const n = Math.hypot(at.x - from.x, at.y - from.y) < STOP + 6 ? 0 : crossed(arrow, mine) + dots.filter((d) => crosses(cut(arrow, NEAR_POINT), d)).length
        if (n < least) [least, out, tight] = [n, [], []]
        // Words well clear of the other labels first, so two callouts' words don't read as one.
        const room = grow(box, fs * 0.8)
        if (n === least && least < now) (others.some((o) => overlap(room, o)) ? tight : out).push(spot)
      }
    }
  }
  return [...out, ...tight]
}

/**
 * The callouts (the break-even and shutdown points'), each kept to the
 * places where its arrow crosses fewest lines when it would cross a dashed
 * guide or a curve, if that leaves the figure less tangled: the graph
 * library keeps arrows off curves but not off guides, so a crowded graph
 * can send one across a guide.
 */
function untangled(spec: PanelSpec): CalloutSpec[] {
  let best = spec.callouts ?? []
  if (!best.length) return best
  let now = tangles(spec)
  for (const i of best.keys()) {
    if (!now.each[i]) continue
    const spots = betterSpots(best[i], now, now.each[i])
    if (!spots.length) continue
    const from = now.p.px(best[i].at)
    const tried = best.map((c, j) => (j === i ? { ...c, spots: (at: Point) => spots.map((s) => ({ ...s, x: s.x - from.x + at.x, y: s.y - from.y + at.y })) } : c))
    const next = tangles({ ...spec, callouts: tried })
    if (next.n < now.n) [best, now] = [tried, next]
  }
  return best
}

/** The market a perfectly competitive firm takes its price from: supply and demand crossing at that price. */
function marketPanel(s: CostRevenueSettings, price: number): PanelSpec {
  const ink = inks(s.ink === 'bw')
  const e = { x: 5, y: price }
  const far: Box = { x0: -100, x1: 100, y0: -100, y1: 100 }
  const cut = (c: Curve) => clipPath(c, DRAW).sort((a, b) => b.length - a.length)[0] ?? []
  const base = panelBase(s, SCHEMATIC)
  return {
    ...base,
    title: undefined,
    axisWords: { x: base.axisWords.x, y: wordsOf(s, 'marketYLabel') },
    curves: [
      { pts: cut(lineThrough(e, { x: 6, y: price - 0.8 }, far)), name: wordsOf(s, 'marketDLabel'), color: ink.demand },
      { pts: cut(lineThrough(e, { x: 6, y: price + 0.8 }, far)), name: wordsOf(s, 'marketSLabel'), color: ink.supply },
    ],
    points: [{ at: e }],
    guides: s.guides ? [{ from: e }] : [],
    marks: s.guides ? [{ axis: 'y', at: price, name: named(wordsOf(s, 'pLabel'), s.eqStyle) }, { axis: 'x', at: 5, name: named(wordsOf(s, 'qLabel'), s.eqStyle) }] : [],
    caption: wordsOf(s, 'marketLabel'),
  }
}
