// Works out a supply and demand graph from its settings, as a panel for the
// econ graph library to lay out: the curves (straight lines on a schematic
// graph, through the schedule's rows on a numbered one), where they cross,
// a shift and where the market ends up, a price ceiling or floor and the
// shortage or surplus it makes, a per-unit tax or subsidy and who pays it,
// the shaded surplus, deadweight loss and tax revenue, and every label.

import { clipPath, type Point } from '$shared/graph/grid'
import { besidePoint, type Spot } from '$shared/graph/labels'
import { plainOf } from '$shared/graph/runs'
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

/** The ranges a numbered graph fits to: from 0 to a little past the schedule's largest quantity and price. */
export function fitOf(s: SupplyDemandSettings) {
  const rows = rowsOf(s.schedule)
  const q = Math.max(1, ...rows.flatMap((r) => [r.qd, r.qs]))
  const p = Math.max(1, ...rows.map((r) => r.p))
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
    if (rows.length < 2) notes.push('Type at least two rows of the schedule to draw the curves.')
  } else {
    d1 = schematicCurve('demand', s.demandShape)
    s1 = schematicCurve('supply', s.supplyShape)
  }
  const demandFlat = !numeric && s.demandShape === 'horizontal'
  const supplyFlat = !numeric && s.supplyShape === 'horizontal'

  // Shifts: across by a share of the quantity axis, or, for a flat curve, up or down the price axis.
  const shiftOf = (kind: 'demand' | 'supply') => {
    const moving = s.shift === kind || s.shift === 'both'
    if (!moving) return { dx: 0, dy: 0 }
    const up = (kind === 'demand' ? s.demandDir : s.supplyDir) === 'increase' ? 1 : -1
    const size = SHIFT_SHARE[kind === 'demand' ? s.demandSize : s.supplySize]
    const flat = kind === 'demand' ? demandFlat : supplyFlat
    // More supplied at every price lowers a flat supply curve; more demanded raises a flat demand curve.
    if (flat) return { dx: 0, dy: (kind === 'demand' ? up : -up) * size * spanY }
    return { dx: up * size * spanX, dy: 0 }
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
  const controlP = numeric ? s.controlPrice : box.y0 + s.controlAt * spanY
  const control = s.tax === 'none' ? s.control : 'none'
  const binding = !!eF && control !== 'none' && (control === 'ceiling' ? controlP < eF.y - spanY * 1e-6 : controlP > eF.y + spanY * 1e-6)
  if (control !== 'none' && eF && !binding) notes.push(`A price ${control} ${control === 'ceiling' ? 'at or above' : 'at or below'} the equilibrium price doesn't bind: the market stays at equilibrium.`)
  const qd = binding ? xAt(dF, controlP) : null
  const qs = binding ? xAt(sF, controlP) : null

  const taxed = s.tax !== 'none' && !!eF
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

  // Drawing the curves, cut to the graph (schematic ones short of its edges).
  const drawn = (c: Curve) => clipPath(c, drawBox).sort((a, b) => b.length - a.length)[0] ?? []
  const curves: CurveSpec[] = []
  const dName = wordsOf(s, 'dLabel')
  const sName = wordsOf(s, 'sLabel')
  curves.push({ pts: drawn(d1), name: curveNamed(dName, dMoves ? 1 : 0), color: ink.demand })
  if (dMoves) curves.push({ pts: drawn(d2), name: curveNamed(dName, 2), color: ink.demand })
  curves.push({ pts: drawn(s1), name: curveNamed(sName, sMoves ? 1 : 0), color: ink.supply })
  if (sMoves) curves.push({ pts: drawn(s2), name: curveNamed(sName, 2), color: ink.supply })
  if (sT) curves.push({ pts: drawn(sT), name: wordsOf(s, s.tax === 'tax' ? 'taxLabel' : 'subsidyLabel'), color: ink.supply, dash: '10 6' })

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
  // With a tax or subsidy's revenue or deadweight loss shaded, the market's
  // untaxed equilibrium keeps only its quantity guide, as textbooks draw it:
  // a guide across to Pₑ would run through the middle of both regions and
  // leave their names no clear place. Pb and Ps still show who pays the tax.
  const noPrice = (e: Point | null) => !!eT && e === eF && (s.revenue || s.dwl)
  /**
   * Places for an equilibrium's name: beside it, then further out in the
   * gaps right of it and over it between the curves crossing there, so it
   * sits clear of both rather than on one.
   */
  const eSpots = (at: Point, fs: number): Spot[] => [
    ...besidePoint(at, fs, 9),
    ...[1.1, 1.6, 2.2, 3].flatMap((k) => [
      { x: at.x + fs * k, y: at.y + fs * 0.35, anchor: 'start' as const },
      { x: at.x, y: at.y - fs * (k + 0.3), anchor: 'middle' as const },
    ]),
  ]
  const equilibrium = (e: Point | null, k: 0 | 1 | 2) => {
    if (!onGraph(e)) return
    points.push({ at: e, name: k ? { ...eName, text: eName.mode === 'text' && eName.text.trim() ? `${eName.text.trim()}_${k}` : eName.text } : eName, spots: eSpots })
    if (!s.guides) return
    if (noPrice(e)) guides.push({ from: e, y: false })
    else {
      guides.push({ from: e })
      mark('y', e.y, named(pName, k, s.eqStyle))
    }
    mark('x', e.x, named(qName, k, s.eqStyle))
  }
  equilibrium(e1, shifted ? 1 : 0)
  if (shifted) equilibrium(e2, 2)

  // A price ceiling or floor: its line, and the quantities demanded and supplied at it.
  const levels: LevelSpec[] = []
  const braces: BraceSpec[] = []
  if (control !== 'none' && controlP > box.y0 && controlP < box.y1) {
    // Schematic, the line stops a little past the curves, its name just past its end as textbooks write it.
    const past = Math.max(...[xAt(dF, controlP), xAt(sF, controlP)].filter((x): x is number => x !== null), box.x0) + spanX * 0.05
    const x1 = numeric ? box.x1 : Math.min(drawBox.x1, Math.max(past, box.x0 + spanX * 0.5))
    levels.push({ pts: [{ x: box.x0, y: controlP }, { x: x1, y: controlP }], name: wordsOf(s, control === 'ceiling' ? 'ceilingLabel' : 'floorLabel'), color: ink.black })
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
        braces.push({
          from: { x: a, y: controlP },
          to: { x: b, y: controlP },
          side: control === 'ceiling' ? 'below' : 'above',
          name: wordsOf(s, qd > qs ? 'shortageLabel' : 'surplusLabel'),
        })
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
      mark('x', traded, wordsOf(s, 'qtLabel'))
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
    /** What an arrow at `t` along the curve touches: other lines most, then points, then guides it would run along. */
    const cost = (t: number) => {
      const a = unit(along(run, t).at)
      const b = { x: a.x + m.dx / spanX, y: a.y + m.dy / spanY }
      let c = 10 * blocks.filter(([p, q]) => segmentsCross(a, b, p, q) || Math.min(distanceTo(p, a, b), distanceTo(q, a, b), distanceTo(a, p, q), distanceTo(b, p, q)) < 0.045).length
      c += 5 * points.filter((p) => distanceTo(unit(p.at), a, b) < 0.08).length
      // Along a guide or a line across, the two would read as one.
      const lo = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) }
      const hi = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) }
      for (const [p, q] of lines) {
        const [u, v] = [unit(p), unit(q)]
        if (!m.dy && u.y === v.y && Math.abs(a.y - u.y) < 0.05 && Math.min(u.x, v.x) < hi.x && Math.max(u.x, v.x) > lo.x) c += 3
        if (!m.dx && u.x === v.x && Math.abs(a.x - u.x) < 0.05 && Math.min(u.y, v.y) < hi.y && Math.max(u.y, v.y) > lo.y) c += 3
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
  if (dMoves) arrows.push(...shiftArrowsOf(d1, dShift, ink.demand, [drawn(s1), drawn(s2), ...(sT ? [drawn(sT)] : [])]))
  if (sMoves) arrows.push(...shiftArrowsOf(s1, sShift, ink.supply, [drawn(d1), drawn(d2), ...(sT ? [drawn(sT)] : [])]))

  // The shaded regions, as the market ends up.
  const regions: RegionSpec[] = []
  const callouts: CalloutSpec[] = []
  // Clamped to where the curves are drawn, so no shading runs up past a curve cut off at the top.
  const clampY = (poly: Point[]) => poly.map((p) => ({ x: p.x, y: Math.max(box.y0, Math.min(drawBox.y1, p.y)) }))
  const startX = (c: Curve) => (numeric ? Math.max(box.x0, Math.min(...c.map((p) => p.x))) : box.x0)
  /** The region between a curve and a price, from where the curve starts to `q`. */
  const toPrice = (c: Curve, price: number, q: number) => {
    const x0 = startX(c)
    if (q <= x0) return []
    const pts: Point[] = [{ x: x0, y: price }]
    const n = 48
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((q - x0) * k) / n
      const y = yAt(c, x)
      if (y !== null) pts.push({ x, y })
    }
    pts.push({ x: q, y: price })
    return clampY(pts)
  }
  // A deadweight loss too small to hold its name has it outside, with an arrow to it.
  const add = (on: boolean, poly: Point[], color: string, hatch: number, key: (typeof LABEL_KEYS)[number], named = true) => {
    if (on && poly.length > 2 && areaOf(poly) > spanX * spanY * 1e-4) regions.push({ poly, color, hatch, name: named ? wordsOf(s, key) : undefined, leader: key === 'dwlLabel' })
  }
  if (eF && traded !== null && buyers !== null && sellers !== null && onGraph(eF)) {
    const flatD = demandFlat
    const uprightS = !numeric && s.supplyShape === 'vertical'
    // Consumer surplus: under demand, over the price buyers pay. A flat demand curve leaves none.
    if (s.cs && !flatD && !(!numeric && s.demandShape === 'vertical')) add(true, toPrice(dF, buyers, traded), ink.region.blue, 45, 'csLabel')
    // Producer surplus: over supply, under the price sellers keep; all of the revenue when supply is upright.
    const ps = uprightS ? [{ x: box.x0, y: box.y0 }, { x: box.x0, y: sellers }, { x: traded, y: sellers }, { x: traded, y: box.y0 }] : toPrice(sF, sellers, traded)
    if (s.ps && !supplyFlat) add(true, ps, ink.region.red, -45, 'psLabel')
    // Tax revenue (or what a subsidy costs): the gap between the two prices, on every unit sold.
    if (s.revenue && eT) {
      const lo = Math.min(buyers, sellers)
      const hi = Math.max(buyers, sellers)
      add(true, [{ x: box.x0, y: lo }, { x: box.x0, y: hi }, { x: traded, y: hi }, { x: traded, y: lo }], ink.region.green, 90, s.tax === 'tax' ? 'revenueLabel' : 'costLabel')
    }
    // Deadweight loss: between the curves, from what's traded to equilibrium.
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
      const poly = clampY([...top, ...bottom.reverse()])
      const name = wordsOf(s, 'dwlLabel')
      if (eT && s.tax === 'tax' && shows(name)) {
        // A tax's is seldom big enough to hold its name. Then the name goes
        // to its right with an arrow to it, rather than out over the tax
        // revenue beside it, where it would read as that region's.
        add(true, poly, ink.region.orange, 0, 'dwlLabel', false)
        if (regions.at(-1)?.poly === poly) callouts.push({ at: centroidOf(poly), name, spots: inOrRightOf })
      } else add(true, poly, ink.region.orange, 0, 'dwlLabel')
    }
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
    label: labelOf(s, shifted, control, binding),
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
function labelOf(s: SupplyDemandSettings, shifted: boolean, control: string, binding: boolean) {
  if (s.titleMode === 'text' && s.title.trim()) return plainOf(s.title.trim())
  const parts: string[] = []
  const dir = (d: string) => (d === 'increase' ? 'increases' : 'decreases')
  if (shifted && (s.shift === 'demand' || s.shift === 'both')) parts.push(`demand ${dir(s.demandDir)}`)
  if (shifted && (s.shift === 'supply' || s.shift === 'both')) parts.push(`supply ${dir(s.supplyDir)}`)
  if (control !== 'none') parts.push(`a price ${control}${binding ? '' : ' that does not bind'}`)
  if (s.tax !== 'none') parts.push(`a per-unit ${s.tax}`)
  const shaded = [s.cs && 'consumer surplus', s.ps && 'producer surplus', s.dwl && 'deadweight loss', s.revenue && (s.tax === 'subsidy' ? 'subsidy cost' : 'tax revenue')].filter(Boolean)
  if (shaded.length) parts.push(`shaded ${shaded.join(', ')}`)
  return `Supply and demand graph${parts.length ? `: ${parts.join(', ')}` : ''}`
}
