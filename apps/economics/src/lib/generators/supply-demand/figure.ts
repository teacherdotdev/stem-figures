// Works out a supply and demand graph from its settings, as a panel for the
// econ graph library to lay out: the curves (straight lines on a schematic
// graph, through the schedule's rows on a numbered one), where they cross,
// a shift and where the market ends up, a price ceiling or floor and the
// shortage or surplus it makes, a per-unit tax or subsidy and who pays it,
// the shaded surplus, deadweight loss and tax revenue, and every label.

import { CELL, clipPath, type Point } from '$shared/graph/grid'
import { besidePoint, crosses, textBox, type Segment, type Spot } from '$shared/graph/labels'
import { plainOf, runsOf, runsWidth } from '$shared/graph/runs'
import { LABEL_SCALE } from '$shared/labelSize'
import { along, areaOf, centroidOf, intersect, lineThrough, xAt, yAt, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure } from '$lib/graph/figure'
import { fitted, rangesOf } from '$lib/graph/fit'
import { inks, shows, type ArrowSpec, type BraceSpec, type CalloutSpec, type CurveSpec, type GuideSpec, type LevelSpec, type MarkSpec, type PanelSpec, type PointSpec, type RegionSpec, type Words } from '$lib/graph/panel'
import { SCHEMATIC, panelBase, wordsOf } from '$lib/graph/settings'
import { SHIFT_SHARE } from '$lib/graph/shifts'
import { readAxes, axisEnd } from '$shared/graph/axes'
import { rowsOf, type LABEL_KEYS, type Shape, type SupplyDemandSettings } from './settings'

/** Far enough to run a straight curve off any schematic graph. */
const FAR = 100

/** Each schematic shape as a straight line: where it meets the y-axis, and how steep it is. */
const DEMAND: Record<Exclude<Shape, 'vertical' | 'horizontal'>, { at: number; slope: number }> = {
  normal: { at: 9, slope: -0.8 },
  steep: { at: 9.6, slope: -1.6 },
  flat: { at: 7, slope: -0.4 },
}
const SUPPLY: Record<Exclude<Shape, 'vertical' | 'horizontal'>, { at: number; slope: number }> = {
  normal: { at: 1, slope: 0.8 },
  steep: { at: 0.4, slope: 1.6 },
  flat: { at: 3, slope: 0.4 },
}

// The library's measures ($lib/graph/panel), for working out where labels are clear before it lays them out.
const BLANK_W = 46 // a write-on line for a label left blank
const ROOM_RIGHT = 56 // past the grid, for curve names at their ends, at medium labels
const BASE_LFS = 14 * 1.1 // the label size that room is measured for
const ROOM_TOP = 18 // over the grid, for names at the tops of curves
const BRACE_GAP = 6 // between a brace and its line
const BRACE_DEPTH = 7
const DOT_R = 4.5

/**
 * A numbered curve run on straight from its first row to the axes, as its
 * first two rows head: demand up to the price axis, supply down to either
 * axis. Consumer and producer surplus run from a quantity of 0, so the curve
 * bounding them has to reach it.
 */
function toAxes(c: Curve, kind: 'demand' | 'supply'): Curve {
  if (c.length < 2 || c[0].x <= 0) return c
  const [a, b] = c
  if (b.x === a.x) return c
  const m = (b.y - a.y) / (b.x - a.x)
  if (kind === 'demand' ? m >= 0 : m <= 0) return c
  const at0 = a.y - m * a.x
  if (kind === 'demand' || at0 >= 0) return [{ x: 0, y: at0 }, ...c]
  return [{ x: a.x - a.y / m, y: 0 }, ...c]
}

/** The ranges a numbered graph fits to: from 0 to a little past the schedule's largest quantity and price (and where demand meets the price axis, when surplus is shaded). */
export function fitOf(s: SupplyDemandSettings) {
  const rows = rowsOf(s.schedule)
  const q = Math.max(1, ...rows.flatMap((r) => [r.qd, r.qs]))
  let p = Math.max(1, ...rows.map((r) => r.p))
  if (s.cs || s.ps) {
    const d = toAxes(rows.map((r) => ({ x: r.qd, y: r.p })).sort((a, b) => a.x - b.x), 'demand')
    // Not so far up a nearly upright demand curve that the rest is squashed flat.
    if (d[0]?.x === 0) p = Math.max(p, Math.min(d[0].y, p * 2))
  }
  return fitted(0, q * 1.1, 0, p * 1.15, 10)
}

/** The axes drawn, and anything typed into their ranges to fix. */
export function axesOf(s: SupplyDemandSettings) {
  if (s.look !== 'numeric') return { ...SCHEMATIC, problems: {} as Record<string, string | null> }
  return readAxes(rangesOf(s, fitOf(s)))
}

/** A schematic curve: a straight line through the graph, upright or flat for the perfect extremes. */
function schematicCurve(kind: 'demand' | 'supply', shape: Shape): Curve {
  if (shape === 'vertical') return [{ x: 5, y: -FAR }, { x: 5, y: FAR }]
  if (shape === 'horizontal') return [{ x: -FAR, y: 5 }, { x: FAR, y: 5 }]
  const { at, slope } = (kind === 'demand' ? DEMAND : SUPPLY)[shape]
  return lineThrough({ x: 0, y: at }, { x: 1, y: at + slope }, { x0: -FAR, x1: FAR, y0: -FAR, y1: FAR })
}

const near = (a: number, b: number, span: number) => Math.abs(a - b) < span * 1e-6

/** Where along a curve its shift arrows would go, by how many there are (as $lib/graph/shifts places them). */
const ARROWS_AT: Record<number, number[]> = { 0: [], 1: [0.2], 2: [0.2, 0.8], 3: [0.15, 0.5, 0.85] }

/**
 * Places for a name with an arrow to a tax's deadweight loss (as drawn,
 * from its middle): in the middle itself, needing no arrow, then out to its
 * right, below it or over it, nearest first; never level with it, where the
 * arrow would run through the equilibrium at its point.
 */
function inOrRightOf(at: Point, fs: number): Spot[] {
  const spots: Spot[] = [{ x: at.x, y: at.y + fs * 0.35, anchor: 'middle' }]
  for (const r of [34, 48, 64, 84, 110, 140]) {
    spots.push(
      { x: at.x + r * 0.6, y: at.y + r * 0.8 + fs * 0.8, anchor: 'start' },
      { x: at.x + r * 0.3, y: at.y + r + fs * 0.8, anchor: 'start' },
      { x: at.x + r * 0.6, y: at.y - r * 0.8, anchor: 'start' },
    )
  }
  return spots
}

/** Whether segment a–b crosses segment p–q. */
function segmentsCross(a: Point, b: Point, p: Point, q: Point) {
  const side = (s: Point, e: Point, x: Point) => Math.sign((e.x - s.x) * (x.y - s.y) - (e.y - s.y) * (x.x - s.x))
  return side(a, b, p) * side(a, b, q) < 0 && side(p, q, a) * side(p, q, b) < 0
}

/** How far a point is from segment a–b. */
function distanceTo(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = dx || dy ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))) : 0
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

/** Whether two segments cross. */
function segmentsMeet(a: Segment, b: Segment) {
  return segmentsCross({ x: a.x1, y: a.y1 }, { x: a.x2, y: a.y2 }, { x: b.x1, y: b.y1 }, { x: b.x2, y: b.y2 })
}

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

type PxBox = { x0: number; y0: number; x1: number; y1: number }
const grow = (b: PxBox, by: number): PxBox => ({ x0: b.x0 - by, y0: b.y0 - by, x1: b.x1 + by, y1: b.y1 + by })
const meets = (a: PxBox, b: PxBox) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
/** A place for a label, how much it touches, and how much less it's wanted than the best place (nearer, or the side textbooks write it). */
type Option = { spot: Spot; box: PxBox; pref: number; out?: boolean }

/**
 * The drawing as the library will lay it out (in its units, from the grid's
 * top left corner), with every line and dot on it, for working out where a
 * label is clearest before it's placed: a dashed guide costs less to cross
 * than a curve, and a place outside the shape it names costs more than
 * either. The library then places each label among the best places found.
 */
function drawingOf(bounds: PxBox) {
  const lines: { s: Segment; cost: number }[] = []
  const boxes: { b: PxBox; cost: number }[] = []
  const cost = (b: PxBox) => {
    if (b.x0 < bounds.x0 || b.x1 > bounds.x1 || b.y0 < bounds.y0 || b.y1 > bounds.y1) return 1e6
    const pad = grow(b, 3)
    const close = grow(b, 7)
    let c = 0
    for (const o of boxes) if (meets(pad, o.b)) c += o.cost
    for (const l of lines) c += crosses(l.s, pad) ? l.cost : crosses(l.s, close) ? 0.5 : 0
    return c
  }
  return {
    line(pts: Point[], c = 10) {
      for (let k = 1; k < pts.length; k++) lines.push({ s: { x1: pts[k - 1].x, y1: pts[k - 1].y, x2: pts[k].x, y2: pts[k].y }, cost: c })
    },
    box(b: PxBox, c = 100) {
      boxes.push({ b, cost: c })
    },
    cost,
    /** The best of `options` and those nearly as good, best first; the best is then in the way of later labels. */
    /** How much a callout's leader crosses: lines, as their labels would, and labels already placed. */
    crossing(l: Segment) {
      return lines.reduce((c, x) => c + (segmentsMeet(l, x.s) ? x.cost : 0), 0) + boxes.reduce((c, o) => c + (crosses(l, o.b) ? Math.min(o.cost, 10) : 0), 0)
    },
    /** The best of `options` and those nearly as good, best first; unless `keep` is false, the best is then in the way of later labels. */
    choose(options: Option[], keep = true): { spots: Spot[]; score: number; out: boolean; box: PxBox | null } {
      const scored = options.map((o) => ({ ...o, score: cost(o.box) + o.pref })).sort((a, b) => a.score - b.score)
      if (!scored.length) return { spots: [], score: Infinity, out: true, box: null }
      const best = scored[0]
      if (keep) boxes.push({ b: best.box, cost: 100 })
      return { spots: scored.filter((o) => o.score < best.score + 5).slice(0, 12).map((o) => o.spot), score: best.score, out: !!best.out, box: best.box }
    },
  }
}

/** The name of a value before and after a shift (P₁, P₂), or at the one equilibrium (Pₑ or P*). */
function named(w: Words, k: 0 | 1 | 2, style: SupplyDemandSettings['eqStyle']): Words {
  if (w.mode !== 'text' || !w.text.trim()) return w
  const t = w.text.trim()
  return { ...w, text: k ? `${t}_${k}` : style === 'star' ? `${t}*` : `${t}_e` }
}
/** A curve's name before and after it shifts: D₁ and D₂, or D. */
const curveNamed = (w: Words, k: 0 | 1 | 2): Words => (w.mode === 'text' && w.text.trim() && k ? { ...w, text: `${w.text.trim()}_${k}` } : w)

export function buildSupplyDemand(s: SupplyDemandSettings) {
  const numeric = s.look === 'numeric'
  const ink = inks(s.ink === 'bw')
  const { problems, ...axes } = axesOf(s)
  const box: Box = { x0: axes.x.start, x1: axisEnd(axes.x), y0: axes.y.start, y1: axisEnd(axes.y) }
  const spanX = box.x1 - box.x0
  const spanY = box.y1 - box.y0
  // Schematic curves stop a little short of the grid's top and right, leaving room for their names.
  const drawBox: Box = numeric ? box : { x0: 0, x1: 9.4, y0: 0.4, y1: 9.6 }
  const notes: string[] = []

  // The curves before anything happens.
  const rows = rowsOf(s.schedule)
  let d1: Curve
  let s1: Curve
  if (numeric) {
    // Left to right, so each curve's name goes by its right end.
    d1 = rows.map((r) => ({ x: r.qd, y: r.p })).sort((a, b) => a.x - b.x)
    s1 = rows.map((r) => ({ x: r.qs, y: r.p })).sort((a, b) => a.x - b.x)
    // Surplus runs from a quantity of 0, so the curves run on to the axes to bound it.
    if (s.cs || s.ps) {
      d1 = toAxes(d1, 'demand')
      s1 = toAxes(s1, 'supply')
    }
    if (rows.length < 2) notes.push('Type at least two rows of the schedule to draw the curves.')
  } else {
    d1 = schematicCurve('demand', s.demandShape)
    s1 = schematicCurve('supply', s.supplyShape)
  }
  const demandFlat = !numeric && s.demandShape === 'horizontal'
  const supplyFlat = !numeric && s.supplyShape === 'horizontal'

  // Shifts: across by a share of the quantity axis, or, for a flat curve, up
  // or down the price axis. Numbered, by whole steps of the axis, so the new
  // equilibrium lands on round numbers.
  const shiftOf = (kind: 'demand' | 'supply') => {
    const moving = s.shift === kind || s.shift === 'both'
    if (!moving) return { dx: 0, dy: 0 }
    const up = (kind === 'demand' ? s.demandDir : s.supplyDir) === 'increase' ? 1 : -1
    const size = SHIFT_SHARE[kind === 'demand' ? s.demandSize : s.supplySize]
    const flat = kind === 'demand' ? demandFlat : supplyFlat
    // More supplied at every price lowers a flat supply curve; more demanded raises a flat demand curve.
    if (flat) return { dx: 0, dy: (kind === 'demand' ? up : -up) * size * spanY }
    const step = axes.x.step
    return { dx: up * (numeric ? Math.max(1, Math.round((size * spanX) / step)) * step : size * spanX), dy: 0 }
  }
  const dShift = shiftOf('demand')
  const sShift = shiftOf('supply')
  const move = (c: Curve, m: { dx: number; dy: number }) => c.map((p) => ({ x: p.x + m.dx, y: p.y + m.dy }))
  const d2 = move(d1, dShift)
  const s2 = move(s1, sShift)
  const dMoves = !!(dShift.dx || dShift.dy)
  const sMoves = !!(sShift.dx || sShift.dy)
  const shifted = dMoves || sMoves

  const e1 = intersect(d1, s1)
  const e2 = shifted ? intersect(d2, s2) : e1
  const onGraph = (p: Point | null): p is Point => !!p && p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9
  if (rows.length >= 2 || !numeric) {
    if (!e1) notes.push(s.demandShape === s.supplyShape && (s.demandShape === 'vertical' || s.demandShape === 'horizontal') && !numeric ? 'Two upright or two flat curves never cross: there is no single equilibrium.' : "The curves don't cross: there is no equilibrium on the graph.")
    else if (!onGraph(e1)) notes.push('The curves cross off the graph. Widen the axes to show the equilibrium.')
    if (shifted && e1 && !e2) notes.push("After the shift the curves don't cross.")
    else if (shifted && e2 && !onGraph(e2)) notes.push('After the shift the curves cross off the graph. Make the shift smaller or widen the axes.')
  }

  // The market as it ends up: the final curves, and the price and quantity traded.
  const dF = d2
  const sF = s2
  const eF = e2
  const control = s.tax === 'none' ? s.control : 'none'
  let controlP = numeric ? s.controlPrice : box.y0 + s.controlAt * spanY
  if (!numeric && control !== 'none') {
    // Schematic, a ceiling goes no lower (and a floor no higher) than where
    // both curves still meet it on the drawing, so the quantities demanded
    // and supplied are on the curves as drawn. A flat curve meets it nowhere
    // but at its own price, so sets no limit.
    const at = (c: Curve, x: number, flat: boolean) => (flat ? null : yAt(c, x))
    const limits = (control === 'ceiling'
      ? [at(dF, drawBox.x1, demandFlat), at(sF, drawBox.x0, supplyFlat), drawBox.y0]
      : [at(sF, drawBox.x1, supplyFlat), at(dF, drawBox.x0, demandFlat), drawBox.y1]
    ).filter((v): v is number => v !== null)
    controlP = control === 'ceiling' ? Math.max(controlP, ...limits) : Math.min(controlP, ...limits)
  }
  const binding = !!eF && control !== 'none' && (control === 'ceiling' ? controlP < eF.y - spanY * 1e-6 : controlP > eF.y + spanY * 1e-6)
  if (control !== 'none' && eF && !binding) notes.push(`A price ${control} ${control === 'ceiling' ? 'at or above' : 'at or below'} the equilibrium price doesn't bind: the market stays at equilibrium.`)
  const qd = binding ? xAt(dF, controlP) : null
  const qs = binding ? xAt(sF, controlP) : null

  const taxed = s.tax !== 'none' && !!eF
  const subsidy = s.tax === 'subsidy'
  const t = (s.tax === 'tax' ? 1 : -1) * (numeric ? s.taxAmount : s.taxSize * spanY)
  const sT = taxed ? move(sF, { dx: 0, dy: t }) : null
  const eT = sT ? intersect(dF, sT) : null
  if (taxed && !eT) notes.push(`With the ${s.tax} the curves don't cross on the graph.`)

  // Who pays what, and how much is bought and sold.
  let buyers = eF?.y ?? null
  let sellers = eF?.y ?? null
  let traded = eF?.x ?? null
  if (binding && qd !== null && qs !== null) {
    buyers = sellers = controlP
    traded = Math.min(qd, qs)
  } else if (eT) {
    buyers = eT.y
    sellers = eT.y - t
    traded = eT.x
  }

  // Drawing the curves, cut to the graph (schematic ones short of its edges,
  // but an upright one from the quantity axis up). A curve and where it
  // shifts to end at the same distance across, so their names sit one over
  // the other rather than side by side.
  const uprightD = !numeric && s.demandShape === 'vertical'
  const uprightS = !numeric && s.supplyShape === 'vertical'
  const drawn = (c: Curve, upright: boolean, x1 = drawBox.x1) =>
    clipPath(c, { ...drawBox, x1, y0: upright ? box.y0 : drawBox.y0 }).sort((a, b) => b.length - a.length)[0] ?? []
  const pair = (a: Curve, b: Curve | null, upright: boolean): [Point[], Point[]] => {
    const ra = drawn(a, upright)
    if (!b) return [ra, []]
    const rb = drawn(b, upright)
    if (numeric || !ra.length || !rb.length) return [ra, rb]
    const x1 = Math.min(ra.at(-1)!.x, rb.at(-1)!.x)
    return [drawn(a, upright, x1), drawn(b, upright, x1)]
  }
  const [dRun1, dRun2] = pair(d1, dMoves ? d2 : null, uprightD)
  const [sRun1, sRun2] = pair(s1, sMoves ? s2 : null, uprightS)
  const tRun = sT ? drawn(sT, uprightS) : []
  const curves: CurveSpec[] = []
  const dName = wordsOf(s, 'dLabel')
  const sName = wordsOf(s, 'sLabel')
  curves.push({ pts: dRun1, name: curveNamed(dName, dMoves ? 1 : 0), color: ink.demand })
  if (dMoves) curves.push({ pts: dRun2, name: curveNamed(dName, 2), color: ink.demand })
  curves.push({ pts: sRun1, name: curveNamed(sName, sMoves ? 1 : 0), color: ink.supply })
  if (sMoves) curves.push({ pts: sRun2, name: curveNamed(sName, 2), color: ink.supply })
  // S + tax and S − subsidy are long: each goes just past its curve's end, with room made for it, not back over S.
  if (sT) curves.push({ pts: tRun, name: wordsOf(s, s.tax === 'tax' ? 'taxLabel' : 'subsidyLabel'), color: ink.supply, dash: '10 6', namePast: true })

  // Equilibrium points, their guides to the axes, and the prices and quantities written there.
  const points: PointSpec[] = []
  const guides: GuideSpec[] = []
  const marks: MarkSpec[] = []
  const eName = wordsOf(s, 'eLabel')
  const pName = wordsOf(s, 'pLabel')
  const qName = wordsOf(s, 'qLabel')
  /** A value written once at an axis, its names joined where two land on the same spot (P₁ = P₂). */
  const mark = (axis: 'x' | 'y', at: number, name: Words) => {
    const span = axis === 'x' ? spanX : spanY
    const same = marks.find((m) => m.axis === axis && near(m.at, at, span))
    if (!same) marks.push({ axis, at, name })
    else if (same.name.mode === 'text' && name.mode === 'text' && same.name.text !== name.text) same.name = { ...same.name, text: `${same.name.text} = ${name.text}` }
  }
  // How far one of the graph's units is across and up, as drawn.
  const sx = CELL / axes.x.step
  const sy = CELL / axes.y.step
  // With a tax or subsidy's revenue or deadweight loss shaded, the market's
  // untaxed equilibrium has only a short dash at the price axis, as
  // textbooks draw it: a guide across to Pₑ would run through the middle of
  // both regions. Pₑ is still written there, between Pb and Ps, to show who
  // pays how much of the tax.
  const noPrice = (e: Point | null) => !!eT && e === eF && (s.revenue || s.dwl)
  /** Each equilibrium point's name, with the places worked out for it once every line is known. */
  const eLabels: { at: Point; name: Words; spots: Spot[] }[] = []
  const equilibrium = (e: Point | null, k: 0 | 1 | 2) => {
    if (!onGraph(e)) return
    const name = k ? { ...eName, text: eName.mode === 'text' && eName.text.trim() ? `${eName.text.trim()}_${k}` : eName.text } : eName
    const label = { at: e, name, spots: [] as Spot[] }
    eLabels.push(label)
    points.push({ at: e, name, spots: (at) => (label.spots.length ? shifted_(label.spots, at, e) : besidePoint(at, LFS, 9)) })
    if (!s.guides) return
    if (noPrice(e)) {
      guides.push({ from: e, y: false }, { from: { x: box.x0 + 12 / sx, y: e.y }, x: false })
      mark('y', e.y, named(pName, k, s.eqStyle))
    } else {
      guides.push({ from: e })
      mark('y', e.y, named(pName, k, s.eqStyle))
    }
    mark('x', e.x, named(qName, k, s.eqStyle))
  }
  // Labels' places are worked out from the grid's top left corner; the library's drawing is moved from there.
  const P = (p: Point): Point => ({ x: (p.x - box.x0) * sx, y: (box.y1 - p.y) * sy })
  const shifted_ = (spots: Spot[], at: Point, p: Point): Spot[] => {
    const q = P(p)
    return spots.map((sp) => ({ ...sp, x: sp.x + at.x - q.x, y: sp.y + at.y - q.y }))
  }
  const LFS = 14 * LABEL_SCALE[s.labelSize] * 1.1
  equilibrium(e1, shifted ? 1 : 0)
  if (shifted) equilibrium(e2, 2)

  // A price ceiling or floor: its line, and the quantities demanded and supplied at it.
  const levels: LevelSpec[] = []
  const braces: BraceSpec[] = []
  /** Names written by a line or a brace, placed once every line is known. */
  const loose: { at: Point; name: Words; options: () => Option[] }[] = []
  if (control !== 'none' && controlP > box.y0 && controlP < box.y1) {
    // Schematic, the line stops a little past the curves, its name just past its end as textbooks write it.
    const past = Math.max(...[xAt(dF, controlP), xAt(sF, controlP)].filter((x): x is number => x !== null), box.x0) + spanX * 0.05
    const x1 = numeric ? box.x1 : Math.min(drawBox.x1, Math.max(past, box.x0 + spanX * 0.5))
    const ends = [{ x: box.x0, y: controlP }, { x: x1, y: controlP }]
    levels.push({ pts: ends, color: ink.black })
    loose.push({ at: ends[1], name: wordsOf(s, control === 'ceiling' ? 'ceilingLabel' : 'floorLabel'), options: () => levelOptions(ends, wordsOf(s, control === 'ceiling' ? 'ceilingLabel' : 'floorLabel')) })
    if (binding && qd !== null && qs !== null) {
      for (const [q, key] of [[qd, 'qdLabel'], [qs, 'qsLabel']] as const) {
        points.push({ at: { x: q, y: controlP }, dot: true })
        if (s.guides) {
          guides.push({ from: { x: q, y: controlP }, y: false })
          mark('x', q, wordsOf(s, key))
        }
      }
      if (s.brace) {
        const [a, b] = qs < qd ? [qs, qd] : [qd, qs]
        const side = control === 'ceiling' ? 'below' : 'above'
        braces.push({ from: { x: a, y: controlP }, to: { x: b, y: controlP }, side })
        // Its word is placed here rather than by the brace, so it can move along it off the guides down from it.
        const word = wordsOf(s, qd > qs ? 'shortageLabel' : 'surplusLabel')
        loose.push({ at: { x: (a + b) / 2, y: controlP }, name: word, options: () => braceOptions(a, b, side, word) })
      }
    }
  }

  // A tax or subsidy: the price buyers pay and sellers keep, at the quantity sold.
  if (eT && traded !== null && buyers !== null && sellers !== null) {
    const top = Math.max(buyers, sellers)
    points.push({ at: { x: traded, y: buyers } }, { at: { x: traded, y: sellers } })
    if (s.guides) {
      guides.push({ from: { x: traded, y: top } }, { from: { x: traded, y: Math.min(buyers, sellers) }, x: false })
      mark('y', buyers, wordsOf(s, 'buyerLabel'))
      mark('y', sellers, wordsOf(s, 'sellerLabel'))
      // Q_t is the quantity with a tax; with a subsidy it's its own.
      mark('x', traded, wordsOf(s, subsidy ? 'qsubLabel' : 'qtLabel'))
    }
  }

  // Shift arrows, from the old curve to the new, where both are drawn (a
  // supply curve shifted left is cut off at the y-axis, so an arrow from low
  // on the old one would end on the axis, not the curve), each moved along
  // the curve from where it would go until it's clear of the points, the
  // guides and the other curves.
  const arrows: ArrowSpec[] = []
  const unit = (p: Point) => ({ x: (p.x - box.x0) / spanX, y: (p.y - box.y0) / spanY })
  const lines: [Point, Point][] = []
  for (const g of guides) {
    if (g.y !== false) lines.push([{ x: box.x0, y: g.from.y }, g.from])
    if (g.x !== false) lines.push([{ x: g.from.x, y: box.y0 }, g.from])
  }
  for (const l of levels) lines.push([l.pts[0], l.pts.at(-1)!])
  const segmentsOf = (c: Point[]) => c.slice(1).map((q, k): [Point, Point] => [c[k], q])
  const shiftArrowsOf = (old: Curve, m: { dx: number; dy: number }, color: string, others: Point[][]) => {
    const from: Box = {
      x0: drawBox.x0 + Math.max(0, -m.dx),
      x1: drawBox.x1 - Math.max(0, m.dx),
      y0: drawBox.y0 + Math.max(0, -m.dy),
      y1: drawBox.y1 - Math.max(0, m.dy),
    }
    const run = clipPath(old, from).sort((a, b) => b.length - a.length)[0]
    if (!run || run.length < 2) return []
    // The other curves and the arrows already drawn, each a line an arrow mustn't cross or run along.
    const blocks = [...others.flatMap(segmentsOf), ...arrows.map((x): [Point, Point] => [x.from, x.to])].map(([p, q]) => [unit(p), unit(q)])
    /** What an arrow at `t` along the curve touches: other lines most, then points, then guides it would run along or start or end on. */
    const cost = (t: number) => {
      const a = unit(along(run, t).at)
      const b = { x: a.x + m.dx / spanX, y: a.y + m.dy / spanY }
      let c = 10 * blocks.filter(([p, q]) => segmentsCross(a, b, p, q) || Math.min(distanceTo(p, a, b), distanceTo(q, a, b), distanceTo(a, p, q), distanceTo(b, p, q)) < 0.045).length
      c += 5 * points.filter((p) => distanceTo(unit(p.at), a, b) < 0.08).length
      // Along a guide or a line across, the two would read as one; from or to one, the arrow seems to start or end there.
      const lo = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) }
      const hi = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) }
      for (const [p, q] of lines) {
        const [u, v] = [unit(p), unit(q)]
        if (!m.dy && u.y === v.y && Math.abs(a.y - u.y) < 0.05 && Math.min(u.x, v.x) < hi.x && Math.max(u.x, v.x) > lo.x) c += 3
        if (!m.dx && u.x === v.x && Math.abs(a.x - u.x) < 0.05 && Math.min(u.y, v.y) < hi.y && Math.max(u.y, v.y) > lo.y) c += 3
        if (Math.min(distanceTo(a, u, v), distanceTo(b, u, v)) < 0.025) c += 3
      }
      return c
    }
    const wants = ARROWS_AT[Math.max(0, Math.min(3, Math.round(s.arrows)))] ?? []
    // Kept well apart along the curve, so two don't bunch up on one side of where the curves cross.
    const gap = wants.length > 2 ? 0.25 : 0.35
    // The places that touch least between them, each as near where it would go as it can be,
    // and none at the curve's far end, where its name goes.
    const ts = Array.from({ length: 34 }, (_, k) => 0.05 + k * 0.025)
    const costs = ts.map(cost)
    let best = { at: [] as number[], score: Infinity }
    const pick = (k: number, from: number, at: number[], score: number) => {
      if (score >= best.score) return
      if (k === wants.length) {
        best = { at, score }
        return
      }
      for (let i = from; i < ts.length; i++) {
        if (at.length && ts[i] - at.at(-1)! < gap - 1e-9) continue
        pick(k + 1, i + 1, [...at, ts[i]], score + costs[i] + 4 * Math.abs(ts[i] - wants[k]))
      }
    }
    pick(0, 0, [], 0)
    return best.at.map((t) => {
      const at = along(run, t).at
      return { from: at, to: { x: at.x + m.dx, y: at.y + m.dy }, color }
    })
  }
  if (dMoves) arrows.push(...shiftArrowsOf(d1, dShift, ink.demand, [sRun1, sRun2, tRun]))
  if (sMoves) arrows.push(...shiftArrowsOf(s1, sShift, ink.supply, [dRun1, dRun2, tRun]))

  // The shaded regions, as the market ends up.
  const regions: RegionSpec[] = []
  const callouts: CalloutSpec[] = []
  // Clamped to where the curves are drawn, so no shading runs up past a curve cut off at the top.
  const clampY = (poly: Point[]) => poly.map((p) => ({ x: p.x, y: Math.max(box.y0, Math.min(drawBox.y1, p.y)) }))
  /** The region between a curve and a price, from the price axis to `q` (along the quantity axis where a numbered supply curve starts out along it). */
  const toPrice = (c: Curve, price: number, q: number) => {
    const x0 = box.x0
    if (q <= x0) return []
    const pts: Point[] = [{ x: x0, y: price }]
    const n = 48
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((q - x0) * k) / n
      const y = yAt(c, x) ?? (c.length && x < c[0].x ? c[0].y : null)
      if (y !== null) pts.push({ x, y })
    }
    pts.push({ x: q, y: price })
    return clampY(pts)
  }
  /** Each shaded region's name, placed once every line is known: inside it, or for a deadweight loss or the tax revenue, with an arrow to it when it can't fit. */
  const regionNames: { poly: Point[]; name: Words; key: (typeof LABEL_KEYS)[number]; avoid?: Point[] }[] = []
  const add = (poly: Point[], color: string, hatch: number, key: (typeof LABEL_KEYS)[number], filled = true, avoid?: Point[]) => {
    if (poly.length <= 2 || areaOf(poly) <= spanX * spanY * 1e-4) return false
    if (filled) regions.push({ poly, color, hatch })
    if (shows(wordsOf(s, key))) regionNames.push({ poly, name: wordsOf(s, key), key, avoid })
    return true
  }
  const shaded = new Set<string>()
  /** The deadweight loss as shaded, which a point's name keeps out of, leaving it room for its own. */
  let lossShaded: Point[] | null = null
  if (eF && traded !== null && buyers !== null && sellers !== null && onGraph(eF)) {
    const lo = Math.min(buyers, sellers)
    const hi = Math.max(buyers, sellers)
    // A subsidy's cost is the rectangle between the two prices, which the
    // consumer and producer surplus overlap; with either shaded it's left
    // unshaded, bounded by the guides, so the tints don't mix there, and
    // each surplus is named where it's alone.
    const costRect = eT ? [{ x: box.x0, y: lo }, { x: box.x0, y: hi }, { x: traded, y: hi }, { x: traded, y: lo }] : null
    const apart = subsidy && costRect && s.revenue && (s.cs || s.ps) ? costRect : undefined
    // Consumer surplus: under demand, over the price buyers pay. A flat demand curve leaves none.
    if (s.cs && !demandFlat && !uprightD && add(toPrice(dF, buyers, traded), ink.region.blue, 45, 'csLabel', true, apart)) shaded.add('cs')
    // Producer surplus: over supply, under the price sellers keep; all of the revenue when supply is upright.
    const ps = uprightS ? [{ x: box.x0, y: box.y0 }, { x: box.x0, y: sellers }, { x: traded, y: sellers }, { x: traded, y: box.y0 }] : toPrice(sF, sellers, traded)
    if (s.ps && !supplyFlat && add(ps, ink.region.red, -45, 'psLabel', true, apart)) shaded.add('ps')
    // Deadweight loss: between the curves, from what's traded to equilibrium.
    let dwl: Point[] | null = null
    // Its edge along demand, and along supply back to equilibrium, for a subsidy's cost to be shaded round it.
    let dwlEdges: { demand: Point[]; supply: Point[] } | null = null
    if (s.dwl && Math.abs(traded - eF.x) > spanX * 1e-4) {
      const [a, b] = traded < eF.x ? [traded, eF.x] : [eF.x, traded]
      const top: Point[] = []
      const bottom: Point[] = []
      const n = 32
      for (let k = 0; k <= n; k++) {
        const x = a + ((b - a) * k) / n
        const yd = yAt(dF, x)
        const ys = uprightS ? null : yAt(sF, x)
        if (yd !== null) top.push({ x, y: yd })
        if (ys !== null) bottom.push({ x, y: ys })
      }
      if (uprightS) bottom.push({ x: b, y: box.y0 }, { x: a, y: box.y0 })
      dwl = clampY([...top, ...bottom.reverse()])
      dwlEdges = { demand: top, supply: bottom }
    }
    // Tax revenue (or what a subsidy costs): the gap between the two prices, on every unit sold.
    if (s.revenue && costRect) {
      const key = s.tax === 'tax' ? 'revenueLabel' : 'costLabel'
      if (apart) {
        if (add(costRect, ink.region.green, 90, key, false)) shaded.add('revenue')
      } else if (subsidy && dwlEdges) {
        // A subsidy's deadweight loss is inside its cost: the cost is shaded round it, not under it.
        const notch: Point[] = [{ x: box.x0, y: hi }, ...dwlEdges.supply, ...dwlEdges.demand, { x: box.x0, y: lo }]
        if (add(clampY(notch), ink.region.green, 90, key)) shaded.add('revenue')
      } else if (add(costRect, ink.region.green, 90, key)) shaded.add('revenue')
    }
    if (dwl && add(dwl, ink.region.orange, 0, 'dwlLabel')) {
      shaded.add('dwl')
      lossShaded = dwl
    }
  }

  // Where every label goes that's placed here, now every line is known: the
  // equilibrium points' names, the price control's name and its brace's
  // word, and the regions' names.
  const W = spanX * sx
  const H = spanY * sy
  const dw = drawingOf({ x0: (numeric ? 0 : -4) + 2, y0: -ROOM_TOP + 2, x1: W + (ROOM_RIGHT * LFS) / BASE_LFS - 2, y1: H - 2 })
  const widthOf = (w: Words) => (w.mode === 'blank' ? BLANK_W : runsWidth(runsOf(w.text.trim(), LFS), LFS) * 1.04 + 2)
  dw.line([{ x: 0, y: 0 }, { x: 0, y: H }, { x: W, y: H }])
  for (const c of curves) {
    const run = c.pts.map(P)
    dw.line(run)
    // Roughly where the library writes its name, by its end.
    if (!shows(c.name) || run.length < 2) continue
    const end = run.at(-1)!
    const prev = run[Math.max(0, run.length - 6)]
    const spot: Spot = c.namePast ? { x: end.x + 6, y: end.y + LFS * 0.35, anchor: 'start' } : { x: end.x + 5, y: end.y + (end.y < prev.y - 0.5 ? 0 : LFS * 0.6), anchor: 'start' }
    dw.box(textBox(spot, widthOf(c.name), LFS), 30)
  }
  for (const l of levels) dw.line(l.pts.map(P))
  for (const g of guides) {
    const p = P(g.from)
    if (g.y !== false) dw.line([p, { x: 0, y: p.y }], 6)
    if (g.x !== false) dw.line([p, { x: p.x, y: H }], 6)
  }
  for (const a of arrows) dw.line([P(a.from), P(a.to)])
  const dots = points.filter((p) => p.dot !== false).map((p) => P(p.at))
  for (const d of dots) dw.box({ x0: d.x - DOT_R, y0: d.y - DOT_R, x1: d.x + DOT_R, y1: d.y + DOT_R })
  // Braces, as boxes over the space they take.
  const braceAt = (a: number, b: number, side: 'below' | 'above') => {
    const [pa, pb] = [P({ x: a, y: controlP }), P({ x: b, y: controlP })]
    const q = Math.min(BRACE_DEPTH, (pb.x - pa.x) / 4)
    const sign = side === 'below' ? 1 : -1
    const y0 = pa.y + sign * BRACE_GAP
    return { pa, pb, y0, tip: { x: (pa.x + pb.x) / 2, y: y0 + sign * (2 * q + 2) }, q, sign }
  }
  for (const b of braces) {
    const { pa, pb, y0, tip, q, sign } = braceAt(b.from.x, b.to.x, b.side as 'below' | 'above')
    dw.box({ x0: pa.x, x1: pb.x, y0: Math.min(y0, y0 + sign * q), y1: Math.max(y0, y0 + sign * q) })
    dw.box({ x0: tip.x - 3, x1: tip.x + 3, y0: Math.min(y0, tip.y), y1: Math.max(y0, tip.y) })
  }

  /** Places for a point's name around it as drawn, nearest first, between the curves crossing there rather than on one, and nearer it than any other point. */
  const aroundOptions = (p: Point, w: Words): Option[] => {
    const c = P(p)
    const width = widthOf(w)
    const h = LFS * 1.08
    const others = dots.filter((d) => Math.hypot(d.x - c.x, d.y - c.y) > 1)
    const loss = lossShaded?.map(P)
    const out: Option[] = []
    for (const r of [8, 12, 17, 23, 30, 38, 48, 60]) {
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8
        const d = { x: Math.cos(a), y: -Math.sin(a) }
        const m = r + (Math.abs(d.x) * width) / 2 + (Math.abs(d.y) * h) / 2
        const mid = { x: c.x + d.x * m, y: c.y + d.y * m }
        const spot: Spot = { x: mid.x, y: mid.y + LFS * 0.24, anchor: 'middle' }
        // Right of it as textbooks write it, then over or under it, then left.
        let pref = r * 0.04 + (d.x > 0.3 ? 0 : d.x > -0.3 ? 0.5 : 1.5)
        const own = Math.hypot(mid.x - c.x, mid.y - c.y)
        if (others.some((o) => Math.hypot(mid.x - o.x, mid.y - o.y) < own)) pref += 4
        if (loss && inside(loss, mid)) pref += 3
        out.push({ spot, box: textBox(spot, width, LFS), pref })
      }
    }
    return out
  }
  /** Places for a region's name inside it, nearest its middle first; a place running out of it costs more than a line crossed. */
  const insideOptions = (poly: Point[], w: Words, avoid?: Point[]): Option[] => {
    const px = poly.map(P)
    const away = avoid?.map(P)
    const mid = P(centroidOf(poly))
    const width = widthOf(w)
    const xs = px.map((p) => p.x)
    const ys = px.map((p) => p.y)
    const out: Option[] = []
    for (let y = Math.min(...ys) + LFS * 0.5; y <= Math.max(...ys) + LFS * 0.5; y += 4) {
      for (let x = Math.min(...xs); x <= Math.max(...xs); x += 4) {
        const spot: Spot = { x, y, anchor: 'middle' }
        const b = textBox(spot, width, LFS)
        // Its words inside, if not quite all of the white round them.
        const g = grow(b, -1)
        const corners = [{ x: g.x0, y: g.y0 }, { x: g.x1, y: g.y0 }, { x: g.x0, y: g.y1 }, { x: g.x1, y: g.y1 }]
        let pref = Math.hypot(x - mid.x, y - LFS * 0.24 - mid.y) * 0.01
        const out_ = !corners.every((q) => inside(px, q))
        if (out_) pref += 20
        if (away && corners.some((q) => inside(away, q))) pref += 15
        out.push({ spot, box: b, pref, out: out_ })
      }
    }
    return out
  }
  /**
   * Places for a region's name with an arrow to it, around its middle,
   * nearest first: clear of every line, its arrow crossing as little as can
   * be, and not over another shaded region, where it would read as that
   * one's.
   */
  const calloutOptions = (poly: Point[], w: Words): Option[] => {
    const c = P(centroidOf(poly))
    const width = widthOf(w)
    const h = LFS * 1.08
    const shades = regions.filter((r) => r.poly !== poly).map((r) => r.poly.map(P))
    const out: Option[] = []
    for (const r of [24, 36, 50, 70, 95, 125]) {
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8
        const d = { x: Math.cos(a), y: -Math.sin(a) }
        const m = r + (Math.abs(d.x) * width) / 2 + (Math.abs(d.y) * h) / 2
        const mid = { x: c.x + d.x * m, y: c.y + d.y * m }
        const spot: Spot = { x: mid.x, y: mid.y + LFS * 0.24, anchor: 'middle' }
        const b = textBox(spot, width, LFS)
        // The arrow, from the words' nearest edge to the middle.
        const from = { x: Math.min(b.x1 + 3, Math.max(b.x0 - 3, c.x)), y: Math.min(b.y1 + 3, Math.max(b.y0 - 3, c.y)) }
        let pref = r * 0.03 + dw.crossing({ x1: from.x, y1: from.y, x2: c.x, y2: c.y })
        if (shades.some((sh) => inside(sh, mid))) pref += 8
        out.push({ spot, box: b, pref })
      }
    }
    return out
  }
  /** Places for a price control's name: just past its line's end, then over or under the line back along it. */
  const levelOptions = (ends: Point[], w: Words): Option[] => {
    const [st, e] = ends.map(P)
    const width = widthOf(w)
    const above = e.y - LFS * 0.3 - 5
    const below = e.y + LFS * 0.78 + 5
    const opts: { spot: Spot; pref: number }[] = [
      { spot: { x: e.x + 6, y: e.y + LFS * 0.35, anchor: 'start' }, pref: 0 },
      { spot: { x: e.x + 4, y: above, anchor: 'start' }, pref: 0.2 },
      { spot: { x: e.x + 4, y: below, anchor: 'start' }, pref: 0.2 },
    ]
    for (let f = 0; f <= 0.9; f += 0.05) {
      const x = e.x - 4 - (e.x - st.x) * f
      opts.push({ spot: { x, y: above, anchor: 'end' }, pref: 0.4 + f * 2 }, { spot: { x, y: below, anchor: 'end' }, pref: 0.4 + f * 2 })
    }
    return opts.map((o) => ({ ...o, box: textBox(o.spot, width, LFS) }))
  }
  /** Places for a brace's word: past its point, then along it either way, then further off. */
  const braceOptions = (a: number, b: number, side: 'below' | 'above', w: Words): Option[] => {
    const { pa, pb, tip, sign } = braceAt(a, b, side)
    const width = widthOf(w)
    const y = side === 'below' ? tip.y + LFS + 2 : tip.y - 5
    const out: Option[] = []
    for (let row = 0; row < 3; row++) {
      // Out past either end of the brace if it's too short to hold the word between the guides down from it.
      for (let dx = 0; dx <= (pb.x - pa.x) / 2 + width / 2 + 12; dx += 4) {
        for (const x of dx ? [tip.x + dx, tip.x - dx] : [tip.x]) {
          const spot: Spot = { x, y: y + sign * row * LFS * 0.8, anchor: 'middle' }
          const off = Math.max(0, Math.abs(x - tip.x) - (pb.x - pa.x) / 2)
          out.push({ spot, box: textBox(spot, width, LFS), pref: dx * 0.02 + row * 1.5 + off * 0.3 })
        }
      }
    }
    return out
  }

  for (const l of eLabels) {
    if (shows(l.name)) l.spots = dw.choose(aroundOptions(l.at, l.name)).spots
  }
  for (const l of loose) {
    if (!shows(l.name)) continue
    const spots = dw.choose(l.options()).spots
    points.push({ at: l.at, name: l.name, dot: false, spots: (at) => shifted_(spots, at, l.at) })
  }
  for (const r of regionNames) {
    const at = centroidOf(r.poly)
    const best = dw.choose(insideOptions(r.poly, r.name, r.avoid), false)
    // A deadweight loss that can't hold its name clear of every line and guide, and tax
    // revenue too narrow to hold its name at all, have it outside, with an
    // arrow to it. Tax revenue's name stays inside it across the dashed
    // S + tax, which runs through it on every graph.
    const outside = r.key === 'dwlLabel' ? best.score >= 5 : (r.key === 'revenueLabel' || r.key === 'costLabel') && best.out
    if (outside) {
      if (r.key === 'dwlLabel' && eT && !subsidy) callouts.push({ at, name: r.name, spots: inOrRightOf })
      else {
        const spots = dw.choose(calloutOptions(r.poly, r.name)).spots
        callouts.push({ at, name: r.name, spots: (p) => shifted_(spots, p, at) })
      }
      continue
    }
    if (best.box) dw.box(best.box)
    points.push({ at, name: r.name, dot: false, spots: (p) => shifted_(best.spots, p, at) })
  }

  const spec: PanelSpec = {
    ...panelBase(s),
    axes,
    regions,
    levels,
    curves,
    points,
    marks,
    guides,
    arrows,
    braces,
    callouts,
  }
  // On a numbered graph, a dot at each row of the schedule.
  if (numeric && s.dots) {
    for (const r of rows) {
      spec.points!.push({ at: { x: r.qd, y: r.p } }, { at: { x: r.qs, y: r.p } })
    }
  }

  return {
    figure: buildFigure([spec]),
    /** where the market settles after any shift, before a control or tax */
    equilibrium: eF,
    problems,
    notes,
    readout: readoutOf(s, { e1, e2, shifted, numeric, binding, qd, qs, controlP, eT, buyers, sellers, traded }),
    /** the regions shaded, of consumer and producer surplus, deadweight loss, and tax revenue or a subsidy's cost */
    shaded,
    label: labelOf(s, shifted, control, binding, shaded),
  }
}

export type SupplyDemandFigure = ReturnType<typeof buildSupplyDemand>

const num = (v: number) => String(Number(v.toPrecision(3)))

/** A numbered graph's values, for the settings panel: the equilibrium and what changes it. */
function readoutOf(
  s: SupplyDemandSettings,
  r: {
    e1: Point | null; e2: Point | null; shifted: boolean; numeric: boolean; binding: boolean; qd: number | null; qs: number | null
    controlP: number; eT: Point | null; buyers: number | null; sellers: number | null; traded: number | null
  },
) {
  const out: string[] = []
  if (!r.numeric) return out
  if (r.e1) out.push(`Equilibrium: price ${num(r.e1.y)}, quantity ${num(r.e1.x)}`)
  if (r.shifted && r.e2) out.push(`After the shift: price ${num(r.e2.y)}, quantity ${num(r.e2.x)}`)
  if (r.binding && r.qd !== null && r.qs !== null) {
    const gap = r.qd - r.qs
    out.push(`${gap > 0 ? 'Shortage' : 'Surplus'} of ${num(Math.abs(gap))}: ${num(r.qd)} demanded, ${num(r.qs)} supplied`)
  }
  if (r.eT && r.buyers !== null && r.sellers !== null && r.traded !== null) {
    out.push(`Buyers pay ${num(r.buyers)}, sellers keep ${num(r.sellers)}, ${num(r.traded)} sold`)
  }
  return out
}

/** The figure in words, for screen readers. */
function labelOf(s: SupplyDemandSettings, shifted: boolean, control: string, binding: boolean, shaded: Set<string>) {
  if (s.titleMode === 'text' && s.title.trim()) return plainOf(s.title.trim())
  const parts: string[] = []
  const dir = (d: string) => (d === 'increase' ? 'increases' : 'decreases')
  if (shifted && (s.shift === 'demand' || s.shift === 'both')) parts.push(`demand ${dir(s.demandDir)}`)
  if (shifted && (s.shift === 'supply' || s.shift === 'both')) parts.push(`supply ${dir(s.supplyDir)}`)
  if (control !== 'none') parts.push(`a price ${control}${binding ? '' : ' that does not bind'}`)
  if (s.tax !== 'none') parts.push(`a per-unit ${s.tax}`)
  const names: Record<string, string> = { cs: 'consumer surplus', ps: 'producer surplus', dwl: 'deadweight loss', revenue: s.tax === 'subsidy' ? 'subsidy cost' : 'tax revenue' }
  const list = ['cs', 'ps', 'dwl', 'revenue'].filter((k) => shaded.has(k)).map((k) => names[k])
  if (list.length) parts.push(`shaded ${list.join(', ')}`)
  return `Supply and demand graph${parts.length ? `: ${parts.join(', ')}` : ''}`
}
