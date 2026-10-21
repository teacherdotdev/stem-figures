// Works out a production possibilities graph from its settings, as panels
// for the econ graph library to lay out: the curve between where it meets
// the axes (bowed out, straight or bowed in), the points on, inside and
// outside it with their captions, a shift out or in (or a pivot, when only
// one good can be made more of) with its arrows, the opportunity cost steps
// between the points on the curve, and, for comparative advantage, two
// countries' straight-line curves on one graph or side by side with where
// each meets the axes written there.

import type { Point } from '$shared/graph/grid'
import type { Spot } from '$shared/graph/labels'
import { plainOf } from '$shared/graph/runs'
import { axisEnd, readAxes, type Axes } from '$shared/graph/axes'
import { bowed, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure } from '$lib/graph/figure'
import { fitted, rangesOf } from '$lib/graph/fit'
import {
  inks, words, type ArrowSpec, type CalloutSpec, type CurveSpec, type GuideSpec, type LevelSpec, type MarkSpec, type PanelSpec, type PointSpec, type Words,
} from '$lib/graph/panel'
import { SCHEMATIC, panelBase, wordsOf } from '$lib/graph/settings'
import { SHIFT_SHARE } from '$lib/graph/shifts'
import { pointsOf, type PointRow, type PpcSettings } from './settings'

/** Where a schematic curve meets each axis, on the hidden 0-to-10 grid. */
const BASE = 8
/** The outer curve, when one shifts out. */
const OUTER = 9.2
/** How far in or out a point inside or outside the curve is, as a share of the way to it. */
const INSIDE = 0.6
const OUTSIDE = 1.2
/** Where along a curve its shift arrows go (as a share of the quarter turn from the y-axis), by which ends move and how many. */
const ARROWS_AT: Record<'both' | 'x' | 'y', number[][]> = {
  both: [[], [0.5], [0.3, 0.7], [0.2, 0.5, 0.8]],
  x: [[], [0.72], [0.6, 0.85], [0.5, 0.68, 0.86]],
  y: [[], [0.28], [0.15, 0.4], [0.14, 0.32, 0.5]],
}

const num = (v: number) => String(Number(v.toPrecision(3)))
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))

/** How the curve bows: the superellipse's power, above 1 bowed out, below it bowed in. */
export const powerOf = (s: Pick<PpcSettings, 'shape' | 'bow'>) => (s.shape === 'out' ? s.bow : s.shape === 'in' ? 2 / (1 + s.bow) : 1)

/** The point on a curve meeting the axes at `X` and `Y` with `t` of `X` made of the x-axis good. */
export function onCurve(X: number, Y: number, n: number, t: number): Point {
  const u = Math.max(0, Math.min(1, t))
  return { x: u * X, y: Y * Math.pow(Math.max(0, 1 - Math.pow(u, n)), 1 / n) }
}

/** The point a share `f` of a quarter turn round a curve from the y-axis, as bowed() draws it. */
const turned = (X: number, Y: number, n: number, f: number): Point => {
  const t = (Math.PI / 2) * f
  return { x: X * Math.pow(Math.sin(t), 2 / n), y: Y * Math.pow(Math.cos(t), 2 / n) }
}

/** Where the curve meets the axes before and after any shift. */
export function curvesOf(s: PpcSettings, numeric = s.look === 'numeric') {
  const n = powerOf(s)
  const movesX = s.shift === 'both' || s.shift === 'x'
  const movesY = s.shift === 'both' || s.shift === 'y'
  if (numeric) return { n, X1: s.xMax, Y1: s.yMax, X2: movesX ? s.xMax2 : s.xMax, Y2: movesY ? s.yMax2 : s.yMax }
  const d = SHIFT_SHARE[s.shiftSize] * 10
  const inner = Math.min(BASE, OUTER - d)
  // Outward, the old curve is drawn in a little so the new one fits; inward, the new one is inside the usual curve.
  const ends = (moves: boolean) => (!moves ? (s.shift !== 'none' && s.shiftDir === 'out' ? [inner, inner] : [BASE, BASE]) : s.shiftDir === 'out' ? [inner, inner + d] : [BASE, BASE - d])
  const [X1, X2] = ends(movesX)
  const [Y1, Y2] = ends(movesY)
  return { n, X1, Y1, X2, Y2 }
}

/** Where each point is, in the graph's units. */
export function placesOf(s: PpcSettings, rows: PointRow[] = pointsOf(s.points), numeric = s.look === 'numeric') {
  const { n, X1, Y1, X2, Y2 } = curvesOf(s, numeric)
  const shifted = !near(X1, X2) || !near(Y1, Y2)
  return rows.map((r) => {
    if (r.place === 'at') {
      if (numeric) return { x: r.a, y: r.b }
      // Typed numbers on a schematic graph, in proportion to the numbered curve.
      return { x: s.xMax > 0 ? (r.a / s.xMax) * X1 : 0, y: s.yMax > 0 ? (r.b / s.yMax) * Y1 : 0 }
    }
    const p = r.place === 'on2' && shifted ? onCurve(X2, Y2, n, r.a) : onCurve(X1, Y1, n, r.a)
    const k = r.place === 'inside' ? INSIDE : r.place === 'outside' ? OUTSIDE : 1
    return { x: p.x * k, y: p.y * k }
  })
}

/** The ranges a numbered graph fits to: from 0 to a little past the farthest curve or point. */
export function fitOf(s: PpcSettings) {
  if (s.countries !== 'one') return fitted(0, Math.max(1, s.aX, s.bX) * 1.1, 0, Math.max(1, s.aY, s.bY) * 1.1, 10)
  const c = curvesOf(s, true)
  const pts = placesOf(s, undefined, true)
  const x = Math.max(1e-9, c.X1, c.X2, ...pts.map((p) => p.x))
  const y = Math.max(1e-9, c.Y1, c.Y2, ...pts.map((p) => p.y))
  return fitted(0, x * 1.1, 0, y * 1.1, 10)
}

/** The axes drawn, and anything typed into their ranges to fix. */
export function axesOf(s: PpcSettings): Axes & { problems: Record<string, string | null> } {
  if (s.look === 'numeric') return readAxes(rangesOf(s, fitOf(s)))
  if (s.countries === 'one') return { ...SCHEMATIC, problems: {} }
  // Two countries on a schematic graph: the farthest a curve reaches is 8 of the hidden grid's 10, the same on both graphs.
  const axis = (v: number) => ({ start: 0, step: Math.max(v, 1e-9) / BASE, blocks: 10, numbering: 'decimal' as const })
  return { x: axis(Math.max(s.aX, s.bX)), y: axis(Math.max(s.aY, s.bY)), problems: {} }
}

/** A label's place `r` out from a point as drawn, the way `d` goes (y down), its nearest corner or edge that far away. */
const spotOut = (p: Point, d: Point, r: number, fs: number): Spot => ({
  x: p.x + d.x * r,
  y: d.y < -0.3 ? p.y + d.y * r - fs * 0.3 : d.y > 0.3 ? p.y + d.y * r + fs * 0.78 : p.y + d.y * r + fs * 0.24,
  anchor: d.x > 0.3 ? 'start' : d.x < -0.3 ? 'end' : 'middle',
})

/** Places for a label all round a point as drawn, at each distance in `radii`, those the way `dir` goes first. */
function around(dir: Point, radii: number[]) {
  const ways = Array.from({ length: 16 }, (_, k) => ({ x: Math.cos((k * Math.PI) / 8), y: Math.sin((k * Math.PI) / 8) }))
  ways.sort((a, b) => b.x * dir.x + b.y * dir.y - (a.x * dir.x + a.y * dir.y))
  return (p: Point, fs: number): Spot[] => radii.flatMap((r) => ways.map((d) => spotOut(p, d, r, fs)))
}

/** Places for a step's size: beside an upright step, or under or over a level one. */
const besideStep = (upright: boolean) => (p: Point, fs: number): Spot[] =>
  upright
    ? [6, 14].flatMap((g) => [{ x: p.x - g, y: p.y + fs * 0.35, anchor: 'end' as const }, { x: p.x + g, y: p.y + fs * 0.35, anchor: 'start' as const }])
    : [3, 10].flatMap((g) => [{ x: p.x, y: p.y + fs * 0.78 + g, anchor: 'middle' as const }, { x: p.x, y: p.y - fs * 0.3 - g, anchor: 'middle' as const }])

/** The way out from a curve meeting the axes at `X` and `Y` at its point `p`, on a drawing `span` units across and up (y down). */
function outFrom(p: Point, X: number, Y: number, n: number, span: Point): Point {
  const gx = Math.pow(Math.max(p.x, 1e-9) / X, n - 1) / X
  const gy = Math.pow(Math.max(p.y, 1e-9) / Y, n - 1) / Y
  const d = Number.isFinite(gx) && Number.isFinite(gy) ? { x: gx * span.x, y: -gy * span.y } : { x: p.x / span.x, y: -p.y / span.y }
  const len = Math.hypot(d.x, d.y) || 1
  return { x: d.x / len, y: d.y / len }
}

/** The way out from the origin to a point, on the drawing. */
function outward(p: Point, span: Point): Point {
  const d = { x: p.x / span.x, y: -p.y / span.y }
  const len = Math.hypot(d.x, d.y)
  return len ? { x: d.x / len, y: d.y / len } : { x: 0.7, y: -0.7 }
}

/** How far from its point a name goes, and a caption. */
const NAME_AT = [12, 22]
const CAPTION_AT = [40, 60, 85]

/** A curve's name before and after it shifts: PPC₁ and PPC₂, or PPC. */
const curveNamed = (w: Words, k: 0 | 1 | 2): Words => (w.mode === 'text' && w.text.trim() && k ? { ...w, text: `${w.text.trim()}_${k}` } : w)

/** A good's name for the readout, from its axis title. */
const goodOf = (title: string, fallback: string) => {
  const t = plainOf(title.trim())
  if (!t) return fallback
  return /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t
}

export function buildPpc(s: PpcSettings) {
  return s.countries === 'one' ? buildOne(s) : buildTwo(s)
}

export type PpcFigure = ReturnType<typeof buildPpc>

/** One country's curve, its points, a shift and the opportunity cost steps. */
function buildOne(s: PpcSettings) {
  const numeric = s.look === 'numeric'
  const ink = inks(s.ink === 'bw')
  const { problems, ...axes } = axesOf(s)
  const box: Box = { x0: axes.x.start, x1: axisEnd(axes.x), y0: axes.y.start, y1: axisEnd(axes.y) }
  const notes: string[] = []
  const { n, X1, Y1, X2, Y2 } = curvesOf(s)
  const drawable = X1 > 0 && Y1 > 0
  if (!drawable) notes.push('Type where the curve meets each axis, both above 0.')
  const shiftable = s.shift !== 'none' && drawable && X2 > 0 && Y2 > 0
  if (s.shift !== 'none' && drawable && !shiftable) notes.push('Type where the new curve meets each axis, both above 0.')
  const shifted = shiftable && (!near(X1, X2) || !near(Y1, Y2))
  if (shiftable && !shifted) notes.push("The new curve meets the axes where the old one does: there's no shift to draw.")

  const c1: Curve = drawable ? bowed(X1, Y1, n) : []
  const c2: Curve = shifted ? bowed(X2, Y2, n) : []
  const curves: CurveSpec[] = []
  if (drawable) curves.push({ pts: c1, color: ink.demand })
  if (shifted) curves.push({ pts: c2, color: ink.demand })

  // Arrows from the old curve to the new, each from a point round it to the same point round the other.
  const arrows: ArrowSpec[] = []
  if (shifted) {
    const way = s.shift === 'none' ? 'both' : s.shift
    // Each moved a little along the curves when it would start or end on a point.
    const spots = drawable ? placesOf(s) : []
    const [W, H] = [Math.max(X1, X2), Math.max(Y1, Y2)]
    const onPoint = (f: number) => [turned(X1, Y1, n, f), turned(X2, Y2, n, f)].some((q) => spots.some((p) => Math.hypot((p.x - q.x) / W, (p.y - q.y) / H) < 0.06))
    for (const f0 of ARROWS_AT[way][Math.max(0, Math.min(3, Math.round(s.arrows)))] ?? []) {
      const f = [f0, f0 + 0.06, f0 - 0.06, f0 + 0.12, f0 - 0.12].find((g) => g > 0.03 && g < 0.97 && !onPoint(g)) ?? f0
      arrows.push({ from: turned(X1, Y1, n, f), to: turned(X2, Y2, n, f), color: ink.demand })
    }
  }

  // The points, each named beside it (on or outside the curve, away from the origin) with any caption pointing to it.
  const rows = pointsOf(s.points)
  const places = drawable ? placesOf(s, rows) : []
  const onGraph = (p: Point) => p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9
  const points: PointSpec[] = []
  const callouts: CalloutSpec[] = []
  const guides: GuideSpec[] = []
  const span = { x: box.x1 - box.x0, y: box.y1 - box.y0 }
  rows.forEach((r, k) => {
    const p = places[k]
    if (!p) return
    if (!onGraph(p)) {
      notes.push(`Point ${r.name || k + 1} is off the graph.`)
      return
    }
    // A name goes out from the curve (square to it, for a point on it); a caption the other way, into the
    // room inside the curve, except from a point outside it, where the two swap.
    const onIt = r.place === 'on' || r.place === 'on2'
    const [X, Y] = r.place === 'on2' && shifted ? [X2, Y2] : [X1, Y1]
    const out = onIt ? outFrom(p, X, Y, n, span) : outward(p, span)
    const beyond = r.place === 'outside' || (r.place === 'at' && Math.pow(p.x / X1, n) + Math.pow(p.y / Y1, n) > 1)
    const captioned = !!r.caption && s.captionMode !== 'none'
    const nameWay = captioned && beyond ? { x: -out.x, y: -out.y } : out
    points.push({ at: p, name: r.name ? words(r.name, s.pointMode) : undefined, spots: around(nameWay, NAME_AT) })
    if (captioned) callouts.push({ at: p, name: words(r.caption, s.captionMode), spots: around({ x: -nameWay.x, y: -nameWay.y }, CAPTION_AT) })
    if (s.guides) guides.push({ from: p })
  })

  // The curves' names, out from each a little way up from its foot (or near its top, when only the y-axis
  // good grows), wherever along there no point is close by.
  const name = wordsOf(s, 'curveLabel')
  const tries = s.shift === 'y' && shifted ? [0.3, 0.2, 0.4, 0.12] : [0.85, 0.93, 0.75, 0.65, 0.55]
  const clear = (at: Point) => Math.min(Infinity, ...places.map((p) => Math.hypot((p.x - at.x) / span.x, (p.y - at.y) / span.y)))
  const curveNames: PointSpec[] = []
  const named: [number, number, 0 | 1 | 2][] = shifted ? [[X1, Y1, 1], [X2, Y2, 2]] : drawable ? [[X1, Y1, 0]] : []
  for (const [X, Y, k] of named) {
    const spots = tries.map((f) => turned(X, Y, n, f))
    const at = spots.find((q) => clear(q) > 0.12) ?? spots.reduce((a, b) => (clear(b) > clear(a) ? b : a))
    curveNames.push({ at, dot: false, name: curveNamed(name, k), spots: around(outFrom(at, X, Y, n, span), NAME_AT) })
  }

  // The opportunity cost steps: from each point on the curve down to the next one's level, then across to it.
  const levels: LevelSpec[] = []
  const steps: { from: string; to: string; dx: number; dy: number }[] = []
  if (s.steps && drawable) {
    const on = rows
      .map((r, k) => ({ r, p: places[k] }))
      .filter(({ r, p }) => r.place === 'on' && p && onGraph(p))
      .sort((a, b) => a.p.x - b.p.x || b.p.y - a.p.y)
    if (on.length < 2) notes.push('Put at least two points on the curve to draw the opportunity cost steps.')
    for (let k = 1; k < on.length; k++) {
      const a = on[k - 1].p
      const b = on[k].p
      if (near(a.x, b.x) && near(a.y, b.y)) continue
      const corner = { x: a.x, y: b.y }
      levels.push({ pts: [a, corner, b], color: ink.black, dash: '6 4' })
      steps.push({ from: on[k - 1].r.name, to: on[k].r.name, dx: b.x - a.x, dy: a.y - b.y })
      // Each step's size beside it, where the step is big enough to write it by.
      if (numeric && s.deltas) {
        if (a.y - b.y > span.y * 0.03) points.push({ at: { x: a.x, y: (a.y + b.y) / 2 }, dot: false, name: words(`−${num(a.y - b.y)}`), spots: besideStep(true) })
        if (b.x - a.x > span.x * 0.03) points.push({ at: { x: (a.x + b.x) / 2, y: b.y }, dot: false, name: words(`+${num(b.x - a.x)}`), spots: besideStep(false) })
      }
    }
  }

  const spec: PanelSpec = { ...panelBase(s), axes, levels, curves, points: [...points, ...curveNames], guides, arrows, callouts }
  const x = goodOf(s.xTitle, 'the x-axis good')
  const y = goodOf(s.yTitle, 'the y-axis good')
  return {
    figure: buildFigure([spec]),
    problems,
    notes,
    readout: readoutOne(s, { numeric, X1, Y1, X2, Y2, shifted, steps, x, y }),
    label: labelOne(s, shifted, rows),
  }
}

/** Two countries' straight-line curves, on one graph or side by side, with where each meets the axes written there. */
function buildTwo(s: PpcSettings) {
  const numeric = s.look === 'numeric'
  const ink = inks(s.ink === 'bw')
  const { problems, ...axes } = axesOf(s)
  const notes: string[] = []
  const countries = [
    { X: s.aX, Y: s.aY, name: wordsOf(s, 'aName'), color: ink.demand, dash: undefined as string | undefined },
    { X: s.bX, Y: s.bY, name: wordsOf(s, 'bName'), color: ink.supply, dash: s.ink === 'bw' ? '12 7' : undefined },
  ]
  if (countries.some((c) => !(c.X > 0 && c.Y > 0))) notes.push("Type where each country's curve meets both axes, all above 0.")
  const base = panelBase(s)
  const marked = s.intercepts && !numeric
  const lineOf = (c: (typeof countries)[number]): Curve => [{ x: 0, y: c.Y }, { x: c.X, y: 0 }]
  const drawable = (c: (typeof countries)[number]) => c.X > 0 && c.Y > 0
  const span = { x: axisEnd(axes.x) - axes.x.start, y: axisEnd(axes.y) - axes.y.start }
  /** A name for a country's line, `f` of the way down it from the y-axis, out from it (or, `inward`, toward the origin). */
  const nameBy = (c: (typeof countries)[number], w: Words, f: number, inward = false): PointSpec => {
    const at = { x: c.X * f, y: c.Y * (1 - f) }
    const out = outFrom(at, c.X, c.Y, 1, span)
    return { at, dot: false, name: w, spots: around(inward ? { x: -out.x, y: -out.y } : out, NAME_AT) }
  }

  /** Each value at an axis once, however many curves meet it there. */
  const marksOf = (cs: typeof countries) => {
    const out: MarkSpec[] = []
    for (const c of cs.filter(drawable)) {
      for (const [axis, at] of [['x', c.X], ['y', c.Y]] as const) if (!out.some((m) => m.axis === axis && near(m.at, at))) out.push({ axis, at, name: words(num(at)) })
    }
    return out
  }

  let specs: PanelSpec[]
  if (s.countries === 'together') {
    // Each country's name where its line is the outer one, out from it: when the lines cross, one near the
    // y-axis and the other near the x-axis; when one is outside the other all along, both halfway, either side.
    const curves: CurveSpec[] = countries.filter(drawable).map((c) => ({ pts: lineOf(c), color: c.color, dash: c.dash }))
    const [a, b] = countries
    const outerAtY = near(a.Y, b.Y) ? (a.X >= b.X ? 0 : 1) : a.Y > b.Y ? 0 : 1
    const outerAtX = near(a.X, b.X) ? outerAtY : a.X > b.X ? 0 : 1
    const names = countries
      .map((c, k) => (outerAtY !== outerAtX ? nameBy(c, c.name, k === outerAtY ? 0.15 : 0.85) : nameBy(c, c.name, 0.5, k !== outerAtY)))
      .filter((_, k) => drawable(countries[k]))
    specs = [{ ...base, axes, curves, points: names, marks: marked ? marksOf(countries) : [] }]
  } else {
    const name = wordsOf(s, 'curveLabel')
    specs = countries.map((c) => ({
      ...base,
      axes,
      title: undefined,
      curves: drawable(c) ? [{ pts: lineOf(c), color: c.color, dash: c.dash }] : [],
      points: drawable(c) ? [nameBy(c, name, 0.85)] : [],
      marks: marked ? marksOf([c]) : [],
      caption: c.name,
    }))
    // One chart title over both graphs would need its own place: it goes over the first.
    specs[0].title = base.title
  }

  const x = goodOf(s.xTitle, 'the x-axis good')
  const y = goodOf(s.yTitle, 'the y-axis good')
  const named = countries.map((c, k) => (c.name.mode === 'text' && c.name.text.trim() ? plainOf(c.name.text.trim()) : `Country ${'AB'[k]}`))
  const readout: string[] = []
  if (countries.every(drawable)) {
    // Opportunity costs: what one more of each good costs in the other.
    const [a, b] = countries.map((c) => ({ ofX: c.Y / c.X, ofY: c.X / c.Y }))
    countries.forEach((c, k) => readout.push(`${named[k]}: each unit of ${x} costs ${num(c.Y / c.X)} ${y}; each unit of ${y}, ${num(c.X / c.Y)} ${x}`))
    if (near(a.ofX, b.ofX)) notes.push('Both countries have the same opportunity costs, so neither has a comparative advantage.')
  }

  return {
    figure: buildFigure(specs),
    problems,
    notes,
    readout,
    label:
      s.titleMode === 'text' && s.title.trim()
        ? plainOf(s.title.trim())
        : `Production possibilities curves for ${named.join(' and ')}${s.countries === 'side' ? ', side by side' : ''}, making ${x} and ${y}`,
  }
}

/** A numbered graph's values, for the settings panel: the opportunity cost of each step, and where a shifted curve meets the axes. */
function readoutOne(
  s: PpcSettings,
  r: { numeric: boolean; X1: number; Y1: number; X2: number; Y2: number; shifted: boolean; steps: { from: string; to: string; dx: number; dy: number }[]; x: string; y: string },
) {
  const out: string[] = []
  if (!r.numeric) return out
  if (s.shape === 'straight' && r.X1 > 0) out.push(`Each unit of ${r.x} costs ${num(r.Y1 / r.X1)} ${r.y}`)
  for (const st of r.steps) {
    const between = st.from && st.to ? `${st.from} to ${st.to}: ` : ''
    out.push(`${between}${num(st.dy)} ${r.y} given up for ${num(st.dx)} ${r.x}${st.dx > 0 ? ` (${num(st.dy / st.dx)} each)` : ''}`)
  }
  if (r.shifted) {
    const moves = [!near(r.X1, r.X2) && `${num(r.X1)} to ${num(r.X2)} ${r.x}`, !near(r.Y1, r.Y2) && `${num(r.Y1)} to ${num(r.Y2)} ${r.y}`].filter(Boolean)
    if (moves.length) out.push(`Intercepts: ${moves.join(', ')}`)
  }
  return out
}

/** The figure in words, for screen readers. */
function labelOne(s: PpcSettings, shifted: boolean, rows: PointRow[]) {
  if (s.titleMode === 'text' && s.title.trim()) return plainOf(s.title.trim())
  const x = goodOf(s.xTitle, 'one good')
  const y = goodOf(s.yTitle, 'another')
  const shape = { out: 'bowed out', straight: 'straight', in: 'bowed in' }[s.shape]
  const parts: string[] = []
  const named = rows.filter((r) => r.name)
  if (named.length) parts.push(`point${named.length > 1 ? 's' : ''} ${named.map((r) => `${plainOf(r.name)}${r.caption ? ` (${r.caption.toLowerCase()})` : ''}`).join(', ')}`)
  if (shifted) parts.push(s.shift === 'both' ? `the curve shifts ${s.look === 'numeric' ? 'to new intercepts' : s.shiftDir}` : `the curve pivots on the ${s.shift === 'x' ? x : y} axis`)
  if (s.steps) parts.push('opportunity cost steps')
  return `Production possibilities curve, ${shape}, between ${x} and ${y}${parts.length ? `: ${parts.join('; ')}` : ''}`
}
