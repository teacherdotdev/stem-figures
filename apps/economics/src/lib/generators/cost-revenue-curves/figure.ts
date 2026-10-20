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
import { plainOf } from '$shared/graph/runs'
import { areaOf, graphOf, lineThrough, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure, type Connector } from '$lib/graph/figure'
import { inks, type BraceSpec, type CalloutSpec, type CurveSpec, type GuideSpec, type MarkSpec, type PanelSpec, type PointSpec, type RegionSpec, type Words } from '$lib/graph/panel'
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
  const readout: string[] = []
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
    readout.push('MC crosses AVC and ATC at their lowest points')
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
    readout.push(
      o.shutdown ? 'The firm shuts down: the price is below the lowest AVC, so it makes nothing and loses its fixed cost'
      : atLowATC ? 'Price equals the lowest ATC: zero economic profit (normal profit), as in the long run'
      : atLowAVC ? 'Price equals the lowest AVC: the firm loses its fixed cost whether it produces or shuts down'
      : o.profit > 0 ? 'Price is above ATC at q*: an economic profit'
      : 'Price is below ATC but above AVC: a loss, but the firm keeps producing because it covers its variable costs',
    )
    if (!o.shutdown) readout.push('The firm produces where MR = MC')

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

    // What each outcome marked comes to.
    /** Profit, zero profit or a loss, at a price and quantity. */
    const verdict = (q: number, p: number) => (Math.abs(p - atc(k, q)) < 0.02 ? 'zero economic profit' : p > atc(k, q) ? 'an economic profit' : 'a loss')
    const pSO = qSO === null ? null : priceOn(d, qSO)
    if (m && !m.shutdown && !longRun) {
      const who = monopoly ? (reg === 'none' ? 'The monopoly' : 'Unregulated, the monopoly') : 'The firm'
      readout.push(`${who} makes the quantity where MR = MC and charges what demand will pay there: ${verdict(m.q, m.p)}`)
      if (qSO !== null && m.q < qSO && (reg === 'none' || reg === 'both')) readout.push('Price is above MC, so it makes less than the efficient quantity: deadweight loss')
    }
    if ((reg === 'optimal' || reg === 'both') && qSO !== null && pSO !== null) {
      const v = verdict(qSO, pSO)
      readout.push(`At P = MC (socially optimal): no deadweight loss, and ${v}${v === 'a loss' ? ', so it would need a subsidy to stay open' : ''}`)
    }
    if ((reg === 'fair' || reg === 'both') && qFR !== null) {
      readout.push(`At P = ATC (fair return): zero economic profit${qSO !== null && qFR < qSO - 0.02 ? ', with less deadweight loss than the monopoly leaves' : ''}`)
    }

    if (longRun && tangent !== undefined) {
      // Excess capacity: from what the firm makes up to where ATC is lowest.
      point({ x: lowATC.q, y: lowATC.v })
      if (s.guides) guides.push({ from: { x: lowATC.q, y: lowATC.v }, y: false })
      mark('x', lowATC.q, w('qMinLabel'))
      braces.push({ from: { x: tangent, y: 0 }, to: { x: lowATC.q, y: 0 }, side: 'below', under: true, name: w('excessLabel') })
      readout.push('Demand is tangent to ATC, where MR = MC: zero economic profit in the long run')
      readout.push('The firm makes less than where ATC is lowest (excess capacity), at a price above MC')
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
  const label = s.titleMode === 'text' && s.title.trim() ? plainOf(s.title.trim()) : `${story}${shaded.length ? `; shaded ${shaded.join(', ')}` : ''}`
  return {
    figure: buildFigure(market ? [market, firm] : [firm], connectors),
    costs: k,
    notes,
    readout,
    label,
  }
}

export type CostRevenueFigure = ReturnType<typeof buildCostRevenue>

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
