// Works out a production possibilities graph from its settings, as panels
// for the econ graph library to lay out: the curve between where it meets
// the axes (bowed out, straight or bowed in), the points on, inside and
// outside it with their captions, a shift out or in (or a pivot, when only
// one good can be made more of) with its arrows, the opportunity cost steps
// between the points on the curve, and, for comparative advantage, two
// countries' straight-line curves on one graph or side by side with where
// each meets the axes written there.

import { CELL, type Point } from '$shared/graph/grid'
import { crosses, textBox, type Spot } from '$shared/graph/labels'
import { plainOf, runsOf, runsWidth } from '$shared/graph/runs'
import { axisEnd, readAxes, type Axes } from '$shared/graph/axes'
import { LABEL_SCALE } from '$shared/labelSize'
import { bowed, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure } from '$lib/graph/figure'
import { fitted, rangesOf } from '$lib/graph/fit'
import {
  inks, shows, words, type ArrowSpec, type CalloutSpec, type CurveSpec, type GuideSpec, type LevelSpec, type MarkSpec, type PanelSpec, type PointSpec, type Words,
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
/** The far edges of the hidden grid. */
const EDGE = 10
/** Where along a curve its shift arrows go (as a share of the quarter turn from the y-axis), by which ends move and how many. */
const ARROWS_AT: Record<'both' | 'x' | 'y', number[][]> = {
  both: [[], [0.5], [0.3, 0.7], [0.2, 0.5, 0.8]],
  x: [[], [0.72], [0.6, 0.85], [0.5, 0.68, 0.86]],
  y: [[], [0.28], [0.15, 0.4], [0.14, 0.32, 0.5]],
}

const num = (v: number) => String(Number(v.toPrecision(3)))
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
/** A number with commas in its thousands, as the axes write it. */
const withCommas = (text: string) => text.replace(/^([−+-]?)(\d{4,})/, (_, sign: string, digits: string) => sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ','))

/**
 * A curve's shape, in shares of where it meets each axis (u across, v up), the same either side of
 * u = v: from the y-axis round to the x-axis.
 */
export type Bend = {
  /** the point a share `f` of the way round from the y-axis */
  round: (f: number) => Point
  /** its height `u` of the way across (and, the same either side of u = v, how far across it is `u` of the way up) */
  height: (u: number) => number
  /** the way out from it, away from the origin (not to length), `u` of the way across */
  normal: (u: number) => Point
  /** the curve as drawn, meeting the axes at `X` and `Y` */
  draw: (X: number, Y: number) => Curve
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Bowed out (`n` above 1) or straight (1): a quarter of a superellipse, u^n + v^n = 1. */
function superellipse(n: number): Bend {
  const height = (u: number) => Math.pow(Math.max(0, 1 - Math.pow(clamp01(u), n)), 1 / n)
  return {
    round: (f) => ({ x: Math.pow(Math.sin((Math.PI / 2) * f), 2 / n), y: Math.pow(Math.cos((Math.PI / 2) * f), 2 / n) }),
    height,
    normal: (u) => ({ x: Math.pow(Math.max(clamp01(u), 1e-9), n - 1), y: Math.pow(Math.max(height(u), 1e-9), n - 1) }),
    draw: (X, Y) => bowed(X, Y, n),
  }
}

/**
 * Bowed in: a quadratic Bézier from the y-axis to the x-axis pulled in toward the origin by its middle
 * point (`c`, `c`), `c` below a half, so that, as a textbook's decreasing cost curve does, it meets each
 * axis at an angle rather than running along it (as a superellipse bowed in does, its ends unreadable).
 */
function pulledIn(c: number): Bend {
  const a = 1 - 2 * c
  const at = (t: number): Point => ({ x: 2 * c * t * (1 - t) + t * t, y: (1 - t) * (1 - t) + 2 * c * t * (1 - t) })
  // How far along it (t) it's `u` across: the root of a t² + 2c t = u.
  const tOf = (u: number) => (-c + Math.sqrt(c * c + a * clamp01(u))) / a
  return {
    round: (f) => at(clamp01(f)),
    height: (u) => at(tOf(u)).y,
    normal: (u) => {
      const t = tOf(u)
      return { x: 2 * (1 - t) - 2 * c * (1 - 2 * t), y: 2 * c * (1 - 2 * t) + 2 * t }
    },
    draw: (X, Y) => Array.from({ length: 161 }, (_, k) => {
      const p = at(k / 160)
      return { x: p.x * X, y: p.y * Y }
    }),
  }
}

/**
 * How the curve bows: bowed out, a superellipse whose power is `bow`; bowed in, a curve whose middle is
 * pulled in from the straight line toward the origin, a little at the least bow and by a fifth or so of
 * the way at the most (any more and its ends would run along the axes).
 */
export const bendOf = (s: Pick<PpcSettings, 'shape' | 'bow'>): Bend =>
  s.shape === 'out' ? superellipse(s.bow) : s.shape === 'in' ? pulledIn(0.5 - 0.3 * (1 - 1 / Math.max(1, s.bow))) : superellipse(1)

const STRAIGHT = superellipse(1)

/** The point on a curve meeting the axes at `X` and `Y` with `t` of `X` made of the x-axis good. */
export function onCurve(X: number, Y: number, bend: Bend, t: number): Point {
  const u = clamp01(t)
  return { x: u * X, y: Y * bend.height(u) }
}

/** The point a share `f` of the way round a curve from the y-axis, as it's drawn. */
const turned = (X: number, Y: number, bend: Bend, f: number): Point => {
  const p = bend.round(f)
  return { x: X * p.x, y: Y * p.y }
}

/** Whether a point is past a curve meeting the axes at `X` and `Y`, away from the origin. */
const beyondOf = (p: Point, X: number, Y: number, bend: Bend) => p.x > X * (1 + 1e-9) || p.y > Y * bend.height(p.x / X) * (1 + 1e-9) + 1e-12

/** How many times `p` out from the origin a curve meeting the axes at `X` and `Y` is, along the way to `p`. */
function reach(p: Point, X: number, Y: number, bend: Bend) {
  if (!(p.x > 0 || p.y > 0)) return 1
  let hi = 1
  while (!beyondOf({ x: p.x * hi, y: p.y * hi }, X, Y, bend) && hi < 1e6) hi *= 2
  let lo = 0
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2
    if (beyondOf({ x: p.x * mid, y: p.y * mid }, X, Y, bend)) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}

/** Where the curve meets the axes before and after any shift. */
export function curvesOf(s: PpcSettings, numeric = s.look === 'numeric') {
  const bend = bendOf(s)
  const movesX = s.shift === 'both' || s.shift === 'x'
  const movesY = s.shift === 'both' || s.shift === 'y'
  if (numeric) return { bend, X1: s.xMax, Y1: s.yMax, X2: movesX ? s.xMax2 : s.xMax, Y2: movesY ? s.yMax2 : s.yMax }
  const d = SHIFT_SHARE[s.shiftSize] * 10
  const inner = Math.min(BASE, OUTER - d)
  // Outward, the old curve is drawn in a little so the new one fits; inward, the new one is inside the usual curve.
  const ends = (moves: boolean) => (!moves ? (s.shift !== 'none' && s.shiftDir === 'out' ? [inner, inner] : [BASE, BASE]) : s.shiftDir === 'out' ? [inner, inner + d] : [BASE, BASE - d])
  const [X1, X2] = ends(movesX)
  const [Y1, Y2] = ends(movesY)
  return { bend, X1, Y1, X2, Y2 }
}

/**
 * Where each point is, in the graph's units. One inside or outside the curve is inside or outside every
 * curve drawn, after a shift too (so a point outside after growth is still unattainable): a share of the
 * way in from the innermost, or past the outermost, along the way out from the origin to its place on
 * the first curve; on a schematic graph, never more than halfway from there to the graph's edge.
 */
export function placesOf(s: PpcSettings, rows: PointRow[] = pointsOf(s.points), numeric = s.look === 'numeric') {
  const { bend, X1, Y1, X2, Y2 } = curvesOf(s, numeric)
  const shifted = (!near(X1, X2) || !near(Y1, Y2)) && X2 > 0 && Y2 > 0
  const curves = shifted ? [[X1, Y1], [X2, Y2]] : [[X1, Y1]]
  const places = rows.map((r) => {
    if (r.place === 'at') {
      if (numeric) return { x: r.a, y: r.b }
      // Typed numbers on a schematic graph, in proportion to the numbered curve.
      return { x: s.xMax > 0 ? (r.a / s.xMax) * X1 : 0, y: s.yMax > 0 ? (r.b / s.yMax) * Y1 : 0 }
    }
    const p = r.place === 'on2' && shifted ? onCurve(X2, Y2, bend, r.a) : onCurve(X1, Y1, bend, r.a)
    if (r.place !== 'inside' && r.place !== 'outside') return p
    const reaches = curves.map(([X, Y]) => reach(p, X, Y, bend))
    let k = r.place === 'inside' ? INSIDE * Math.min(...reaches) : OUTSIDE * Math.max(...reaches)
    if (r.place === 'outside' && !numeric) k = Math.min(k, (Math.max(...reaches) + Math.min(EDGE / Math.max(p.x, 1e-9), EDGE / Math.max(p.y, 1e-9))) / 2)
    const q = { x: p.x * k, y: p.y * k }
    // Inside a schematic curve bowed in, which runs close by the axes, kept a little off them too, for
    // its name and caption.
    if (r.place === 'inside' && !numeric && s.shape === 'in') return { x: Math.max(q.x, 1 + q.x / 2), y: Math.max(q.y, 1 + q.y / 2) }
    return q
  })
  if (!s.guides) return places
  // With guides drawn to the axes, a point inside or outside the curve moved a little in or out where its
  // guides would run all but along another point's, reading as one doubled line.
  const [gx, gy] = [Math.max(X1, X2) * 0.04, Math.max(Y1, Y2) * 0.04]
  const apart = (q: Point, k: number) => places.every((o, j) => j === k || (Math.abs(o.x - q.x) >= gx && Math.abs(o.y - q.y) >= gy))
  rows.forEach((r, k) => {
    if (r.place !== 'inside' && r.place !== 'outside') return
    const p = places[k]
    const by = r.place === 'inside' ? [0.9, 1.1, 0.8, 1.2, 0.7] : [1.06, 0.97, 1.12]
    const f = [1, ...by].find((f) => apart({ x: p.x * f, y: p.y * f }, k)) ?? 1
    places[k] = { x: p.x * f, y: p.y * f }
  })
  return places
}

/**
 * The ranges a numbered graph fits to: from 0 to a little past the farthest curve or point, in about 10
 * blocks, or 12 with the opportunity cost steps drawn, to give each step's size room beside it.
 */
export function fitOf(s: PpcSettings) {
  if (s.countries !== 'one') return fitted(0, Math.max(1, s.aX, s.bX) * 1.1, 0, Math.max(1, s.aY, s.bY) * 1.1, 10)
  const c = curvesOf(s, true)
  const pts = placesOf(s, undefined, true)
  const x = Math.max(1e-9, c.X1, c.X2, ...pts.map((p) => p.x))
  const y = Math.max(1e-9, c.Y1, c.Y2, ...pts.map((p) => p.y))
  return fitted(0, x * 1.1, 0, y * 1.1, s.steps ? 12 : 10)
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

/**
 * Places for a label all round a point as drawn, at each distance in `radii`: those on the side `dir`
 * goes first, nearest first and the nearer `dir` the sooner, then (unless `sides` leaves them out) those
 * on the other side.
 */
function around(dir: Point, radii: number[], sides = [true, false]) {
  const ways = Array.from({ length: 16 }, (_, k) => ({ x: Math.cos((k * Math.PI) / 8), y: Math.sin((k * Math.PI) / 8) }))
  ways.sort((a, b) => b.x * dir.x + b.y * dir.y - (a.x * dir.x + a.y * dir.y))
  const half = (side: boolean) => ways.filter((d) => d.x * dir.x + d.y * dir.y > -1e-9 === side)
  return (p: Point, fs: number): Spot[] => sides.flatMap((side) => radii.flatMap((r) => half(side).map((d) => spotOut(p, d, r, fs))))
}

/**
 * Places for a step's size, on its own side of the step's dashed lines: an upright step's (what's given
 * up) right of it, inside the step, from halfway down its `half` length toward the corner, then above
 * halfway, then, when the step has no room for it, at the `past` places (out past the curve, level with
 * the step), never left of it, under the step before. A level step's (what's gained) goes under it, or
 * over it, inside the step, when there's no room under it (it's the x-axis).
 */
const besideStep = (upright: boolean, half: number, past: (p: Point) => Spot[] = () => [], lines = 1) => (p: Point, fs: number): Spot[] => {
  if (!upright) {
    return [
      ...[3, 10].map((g) => ({ x: p.x, y: p.y + fs * 0.78 + g, anchor: 'middle' as const })),
      ...[3, 10].flatMap((g) => [0, 0.3, -0.3].map((f) => ({ x: p.x + f * half, y: p.y - fs * 0.3 - g, anchor: 'middle' as const }))),
    ]
  }
  // How far the words can move down from halfway and still be clear of the level step under them (and
  // of what it gains, on `lines` - 1 lines over it, when that's inside the step).
  const room = Math.max(0, half - fs * 0.65 - 4 - (lines - 1) * (fs * 1.08 + 3))
  const at = (f: number, g: number) => ({ x: p.x + g, y: p.y + fs * 0.35 + f * room, anchor: 'start' as const })
  return [...[0, 0.25, 0.5, 0.75, 1, -0.25, -0.5].flatMap((f) => [4, 10, 18, 28].map((g) => at(f, g))), ...past(p)]
}

/** A label's width on the drawing, near enough: a blank's write-on line (the graph library's), or its words. */
const widthOf = (w: Words, fs: number) => (w.mode === 'blank' ? 46 : Math.min(fs * 10, runsWidth(runsOf(w.text.trim(), fs), fs) * 1.04 + 2))

/** How far a point is from a box, on the drawing. */
const gap = (b: { x0: number; y0: number; x1: number; y1: number }, p: Point) => Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.y0 - p.y, 0, p.y - b.y1))

/** Whether the segments from `a` to `b` and from `c` to `d` cross. */
function cross(a: Point, b: Point, c: Point, d: Point) {
  const side = (p: Point, q: Point, r: Point) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0
}

/** What a label is kept with and away from: see `clearOf`. */
type Keep = { own: Point[]; others: { at: Point; r: number }[]; margin: number; walls?: Point[][]; lines?: Point[][]; axes?: Point }

/**
 * Of `spots` by what's drawn at `own` (a point, or a curve's points), those where a label `width` wide
 * sits plainly with it: nearer it, by `margin` at least, than to any of `others` (other points and their
 * names, each a circle round where it's drawn, or another curve's points), and not across any of `walls`
 * (other curves, as drawn) from the first of `own`, nor past the `axes` (where they cross, as drawn); those
 * clear of `lines` (the curves, as drawn) first, otherwise in the order given. When none is, those across a
 * wall, then all of them, the plainest first, those past the axes last.
 */
function clearOf(spots: Spot[], width: number, fs: number, { own, others, margin, walls = [], lines = [], axes }: Keep): Spot[] {
  const rated = spots.map((spot) => {
    const box = textBox(spot, width, fs)
    const mid = { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }
    const grown = { x0: box.x0 - 3, y0: box.y0 - 3, x1: box.x1 + 3, y1: box.y1 + 3 }
    const along = (l: Point[], hit: (a: Point, b: Point) => boolean) => l.some((p, k) => k > 0 && hit(l[k - 1], p))
    return {
      spot,
      slack: Math.min(Infinity, ...others.map((o) => gap(box, o.at) - o.r)) - Math.min(...own.map((q) => gap(box, q))),
      across: walls.some((w) => along(w, (a, b) => cross(own[0], mid, a, b))),
      touches: lines.some((l) => along(l, (a, b) => crosses({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, grown))),
      out: !!axes && (box.x0 < axes.x || box.y1 > axes.y),
    }
  })
  const plain = rated.filter((r) => r.slack >= margin && !r.out)
  const kept = plain.filter((r) => !r.across)
  if (kept.length) return [...kept.filter((r) => !r.touches), ...kept.filter((r) => r.touches)].map((r) => r.spot)
  return (plain.length ? plain : rated.sort((a, b) => Number(a.out) - Number(b.out) || Number(a.across) - Number(b.across) || b.slack - a.slack)).map((r) => r.spot)
}

/**
 * How finely a numbered axis counted by `step` is read off it, for the steps' sizes: to a power of ten
 * a fifth of a step or less (whole numbers on a grid counted by 5, 10 or 20), never coarser than whole
 * numbers, and as finely as `typed`, where the curve meets the axis, is written.
 */
function unitOf(step: number, typed: number) {
  let places = 0
  while (places < 6 && Math.abs(Math.round(typed * 10 ** places) - typed * 10 ** places) > 1e-6) places++
  return Math.min(1, 10 ** Math.floor(Math.log10(step / 5) + 1e-9), 10 ** -places)
}

/** `v` to the nearest `unit`, written without stray digits. */
const toUnit = (v: number, unit: number) => Number((Math.round(v / unit) * unit).toFixed(Math.max(0, Math.round(-Math.log10(unit)))))

/** The way out from a curve meeting the axes at `X` and `Y` at its point `p`, on a drawing `span` units across and up (y down). */
function outFrom(p: Point, X: number, Y: number, bend: Bend, span: Point): Point {
  const w = bend.normal(p.x / X)
  const gx = w.x / X
  const gy = w.y / Y
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
  const { bend, X1, Y1, X2, Y2 } = curvesOf(s)
  const drawable = X1 > 0 && Y1 > 0
  if (!drawable) notes.push('Type where the curve meets each axis, both above 0.')
  const shiftable = s.shift !== 'none' && drawable && X2 > 0 && Y2 > 0
  if (s.shift !== 'none' && drawable && !shiftable) notes.push('Type where the new curve meets each axis, both above 0.')
  const shifted = shiftable && (!near(X1, X2) || !near(Y1, Y2))
  if (shiftable && !shifted) notes.push("The new curve meets the axes where the old one does: there's no shift to draw.")

  const c1: Curve = drawable ? bend.draw(X1, Y1) : []
  const c2: Curve = shifted ? bend.draw(X2, Y2) : []
  const curves: CurveSpec[] = []
  if (drawable) curves.push({ pts: c1, color: ink.demand })
  if (shifted) curves.push({ pts: c2, color: ink.demand })

  // Arrows from the old curve to the new, each from a point round it to the same point round the other;
  // or, a straight line shifting, square to it, all alike, as a line moving parallel to itself does.
  const arrows: ArrowSpec[] = []
  if (shifted) {
    const way = s.shift === 'none' ? 'both' : s.shift
    const square = s.shape === 'straight' && way === 'both'
    const arrowAt = (f: number) => {
      const from = turned(X1, Y1, bend, f)
      if (!square) return { from, to: turned(X2, Y2, bend, f) }
      // Square to the old line as drawn, on to the new one.
      const d = { x: (Y1 * axes.x.step) / axes.y.step, y: (X1 * axes.y.step) / axes.x.step }
      const t = (1 - from.x / X2 - from.y / Y2) / (d.x / X2 + d.y / Y2)
      return { from, to: { x: from.x + t * d.x, y: from.y + t * d.y } }
    }
    // Each moved a little along the curves when it would start, end or pass on a point.
    const spots = drawable ? placesOf(s) : []
    const [W, H] = [Math.max(X1, X2), Math.max(Y1, Y2)]
    const onPoint = (f: number) => {
      const { from: a, to: b } = arrowAt(f)
      const d = { x: (b.x - a.x) / W, y: (b.y - a.y) / H }
      const len2 = d.x * d.x + d.y * d.y || 1
      return spots.some((p) => {
        const q = { x: (p.x - a.x) / W, y: (p.y - a.y) / H }
        const t = Math.max(0, Math.min(1, (q.x * d.x + q.y * d.y) / len2))
        return Math.hypot(q.x - t * d.x, q.y - t * d.y) < 0.06
      })
    }
    for (const f0 of ARROWS_AT[way][Math.max(0, Math.min(3, Math.round(s.arrows)))] ?? []) {
      const f = [f0, f0 + 0.06, f0 - 0.06, f0 + 0.12, f0 - 0.12].find((g) => g > 0.03 && g < 0.97 && !onPoint(g)) ?? f0
      arrows.push({ ...arrowAt(f), color: ink.demand })
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
  // Every point and curve name on the drawing, each with the way its name goes from it, so that each
  // point's name and caption keep clear of the others' and sit plainly with their own.
  const marked: { at: Point; way: Point; dot: boolean; named: boolean }[] = []
  /** How far from the point at `from` the one at `to` is drawn (y down). */
  const drawnOff = (from: Point, to: Point): Point => ({ x: ((to.x - from.x) * CELL) / axes.x.step, y: (-(to.y - from.y) * CELL) / axes.y.step })
  /** Every other point and name, as circles round where each is drawn, for the point `m` drawn at `q`. */
  const othersOf = (m: number, q: Point, fs: number, names = true) =>
    marked.flatMap((o, k) => {
      if (k === m) return []
      const d = drawnOff(marked[m].at, o.at)
      const at = { x: q.x + d.x, y: q.y + d.y }
      const r = NAME_AT[0] + fs * 0.4
      return [...(o.dot ? [{ at, r: 5 }] : []), ...(names && o.named ? [{ at: { x: at.x + o.way.x * r, y: at.y + o.way.y * r }, r: fs * 0.6 }] : [])]
    })
  /** Where the axes cross, as drawn, for the point `from` drawn at `q`. */
  const axesFrom = (from: Point, q: Point) => ({ x: q.x + drawnOff(from, { x: box.x0, y: box.y0 }).x, y: q.y + drawnOff(from, { x: box.x0, y: box.y0 }).y })
  /** Points along a curve meeting the axes at `X` and `Y`, close enough together to stand for it. */
  const traced = (X: number, Y: number) => Array.from({ length: 41 }, (_, k) => turned(X, Y, bend, k / 40))
  // On a numbered graph, the grid's right and top edges too (a name across one pokes out of the grid), and the shift arrows.
  const edges = numeric ? [[{ x: box.x1, y: box.y0 }, { x: box.x1, y: box.y1 }, { x: box.x0, y: box.y1 }]] : []
  const curveLines = [drawable ? traced(X1, Y1) : [], shifted ? traced(X2, Y2) : [], ...edges, ...arrows.map((a) => [a.from, a.to])]
  /** The points along `pts` as drawn, for the point `from` drawn at `q`, as circles of nothing round each. */
  const drawnAlong = (from: Point, q: Point, pts: Point[]) => pts.map((o) => ({ at: { x: q.x + drawnOff(from, o).x, y: q.y + drawnOff(from, o).y }, r: 0 }))
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
    const out = onIt ? outFrom(p, X, Y, bend, span) : outward(p, span)
    const beyond = r.place === 'outside' || (r.place === 'at' && beyondOf(p, X1, Y1, bend))
    const captioned = !!r.caption && s.captionMode !== 'none'
    const nameWay = captioned && beyond ? { x: -out.x, y: -out.y } : out
    const name = r.name ? words(r.name, s.pointMode) : undefined
    const named = !!name && shows(name)
    const m = marked.push({ at: p, way: nameWay, dot: true, named }) - 1
    // A name stays on its point's side of every curve but its own: never across one from it.
    const walls = [drawable && !(onIt && near(X, X1) && near(Y, Y1)) ? traced(X1, Y1) : [], shifted && !(onIt && near(X, X2) && near(Y, Y2)) ? traced(X2, Y2) : []]
    points.push({
      at: p,
      name,
      spots: (q, fs) => {
        const drawn = (w: Point[]) => drawnAlong(p, q, w).map((o) => o.at)
        // (A curve the point is all but on too, where the two meet, is no wall between it and its name.)
        const away = walls.map(drawn).filter((w) => w.every((o) => Math.hypot(o.x - q.x, o.y - q.y) > fs * 0.6))
        const keep = { own: [q], others: othersOf(m, q, fs, false), margin: fs * 0.5, walls: away, lines: curveLines.map(drawn), axes: axesFrom(p, q) }
        return clearOf(around(nameWay, [...NAME_AT, 32])(q, fs), name ? widthOf(name, fs) : 0, fs, keep)
      },
    })
    if (captioned) {
      const caption = words(r.caption, s.captionMode)
      callouts.push({
        at: p,
        name: caption,
        spots: (q, fs) => {
          // (Closer, too, under a curve bowed in, where there's little room inside it.)
          const radii = s.shape === 'in' ? [...CAPTION_AT, 28] : CAPTION_AT
          return clearOf(around({ x: -nameWay.x, y: -nameWay.y }, radii)(q, fs), widthOf(caption, fs), fs, { own: [q], others: othersOf(m, q, fs), margin: fs, axes: axesFrom(p, q) })
        },
      })
    }
    if (s.guides) guides.push({ from: p })
  })

  // The opportunity cost steps: from each point on the curve down to the next one's level, then across to it,
  // what each gives up and gains read off the graph as finely as its grid is counted, so they add up.
  const levels: LevelSpec[] = []
  const gains: PointSpec[] = []
  const losses: PointSpec[] = []
  const steps: { from: string; to: string; dx: number; dy: number }[] = []
  if (s.steps && drawable) {
    const on = rows
      .map((r, k) => ({ r, p: places[k] }))
      .filter(({ r, p }) => r.place === 'on' && p && onGraph(p))
      .sort((a, b) => a.p.x - b.p.x || b.p.y - a.p.y)
    if (on.length < 2) notes.push('Put at least two points on the curve to draw the opportunity cost steps.')
    const ux = unitOf(axes.x.step, X1)
    const uy = unitOf(axes.y.step, Y1)
    const perX = CELL / axes.x.step
    const perY = CELL / axes.y.step
    /** The size the graph library writes labels at. */
    const lfs = 14 * 1.1 * LABEL_SCALE[s.labelSize]
    for (let k = 1; k < on.length; k++) {
      const a = on[k - 1].p
      const b = on[k].p
      if (near(a.x, b.x) && near(a.y, b.y)) continue
      const corner = { x: a.x, y: b.y }
      levels.push({ pts: [a, corner, b], color: ink.black, dash: '6 4' })
      const dx = toUnit(toUnit(b.x, ux) - toUnit(a.x, ux), ux)
      const dy = toUnit(toUnit(a.y, uy) - toUnit(b.y, uy), uy)
      steps.push({ from: on[k - 1].r.name, to: on[k].r.name, dx, dy })
      // Each step's size beside it, where the step is big enough to write it by: what each gains placed
      // first, as it has fewer places to go.
      if (numeric && s.deltas) {
        if (a.y - b.y > span.y * 0.03 && dy > 0) {
          const mid = (a.y + b.y) / 2
          const half = ((a.y - b.y) / 2) * perY
          const name = words(`−${withCommas(String(dy))}`)
          // Room for the words inside the step: across from the step to the curve at the top of the words
          // sat just over its corner (and over what it gains, too, when that's inside it, over the x-axis).
          const lines = b.y <= box.y0 + 1e-9 ? 2 : 1
          const top = b.y + ((lfs * 1.08 + 3) * lines) / perY
          const across = top < a.y ? X1 * bend.height(Math.max(0, top) / Y1) - a.x : 0
          const inside = across * perX >= widthOf(name, lfs) + 8
          // With no room inside the step, level with it out past the curve, clear of where the curve is
          // under the words' foot (it's farther out lower down) and well clear of every point and so its
          // name, or, with no such place (or the step too short to write its size level with), left off:
          // written anywhere else, it would be read as another step's, or a point's.
          const room = Math.max(0, half - lfs * 0.65 - 4)
          const width = widthOf(name, lfs)
          const dots = places.filter(onGraph).map((p) => drawnOff({ x: a.x, y: mid }, p))
          const past = inside || 2 * half < lfs * 1.3
            ? []
            : [0, 0.5, -0.5, 1, -1].flatMap((f) => {
                const y = lfs * 0.35 + f * room
                const foot = Math.max(0, mid - (y + lfs * 0.3) / perY)
                const x = (X1 * bend.height(foot / Y1) - a.x) * perX
                return [8, 14, 22].map((g) => ({ x: x + g, y, anchor: 'start' as const }))
              }).filter((o) => dots.every((d) => gap(textBox(o, width, lfs), d) > lfs * 1.6))
          if (inside || past.length) {
            const spots = besideStep(true, half, (q) => past.map((o) => ({ ...o, x: q.x + o.x, y: q.y + o.y })), lines)
            losses.push({ at: { x: a.x, y: mid }, dot: false, name, spots })
          }
        }
        if (b.x - a.x > span.x * 0.03 && dx > 0) {
          const half = ((b.x - a.x) / 2) * perX
          gains.push({ at: { x: (a.x + b.x) / 2, y: b.y }, dot: false, name: words(`+${withCommas(String(dx))}`), spots: besideStep(false, half) })
        }
      }
    }
  }

  // The curves' names, out from each (in from the inner one, after a shift, so that it's plainly not the
  // outer one's) a little way up from its foot (or near its top, when only the y-axis good grows), wherever
  // along there no point is close by, or failing that wherever else along it there's room, always nearer
  // its own curve than the other or the ends of the shift arrows, and clear of the steps if it can be.
  const name = wordsOf(s, 'curveLabel')
  const tries = s.shift === 'y' && shifted ? [0.3, 0.2, 0.4, 0.12, 0.5, 0.6, 0.7] : [0.85, 0.93, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15]
  const ends = arrows.flatMap((a) => [a.from, a.to])
  const clear = (at: Point) => Math.min(Infinity, ...places.map((p) => Math.hypot((p.x - at.x) / span.x, (p.y - at.y) / span.y)))
  const curveNames: PointSpec[] = []
  const named: [number, number, 0 | 1 | 2][] = shifted ? [[X1, Y1, 1], [X2, Y2, 2]] : drawable ? [[X1, Y1, 0]] : []
  for (const [X, Y, k] of named) {
    const inner = k > 0 && X <= Math.min(X1, X2) && Y <= Math.min(Y1, Y2)
    const wayAt = (q: Point) => {
      const out = outFrom(q, X, Y, bend, span)
      return inner ? { x: -out.x, y: -out.y } : out
    }
    const along = tries.map((f) => turned(X, Y, bend, f))
    const at = along.find((q) => clear(q) > 0.12) ?? along.reduce((a, b) => (clear(b) > clear(a) ? b : a))
    const order = [at, ...along.filter((q) => q !== at)]
    const m = marked.push({ at, way: wayAt(at), dot: false, named: shows(name) }) - 1
    const spots = (q: Point, fs: number, side: boolean) =>
      order.flatMap((o) => {
        const d = drawnOff(at, o)
        return around(wayAt(o), NAME_AT, [side])({ x: q.x + d.x, y: q.y + d.y }, fs)
      })
    const label = curveNamed(name, k)
    const own = traced(X, Y)
    const other = k === 1 ? traced(X2, Y2) : k === 2 ? traced(X1, Y1) : []
    curveNames.push({
      at,
      dot: false,
      name: label,
      spots: (q, fs) => {
        const all = [...spots(q, fs, true), ...spots(q, fs, false)]
        const drawn = (w: Point[]) => drawnAlong(at, q, w).map((o) => o.at)
        const others = [...drawnAlong(at, q, other), ...drawnAlong(at, q, ends).map((o) => ({ ...o, r: fs * 0.5 })), ...othersOf(m, q, fs)]
        return clearOf(all, widthOf(label, fs), fs, { own: drawn(own), others, margin: fs * 0.5, lines: [...curveLines, ...levels.map((l) => l.pts)].map(drawn), axes: axesFrom(at, q) })
      },
    })
  }

  const spec: PanelSpec = { ...panelBase(s), axes, levels, curves, points: [...points, ...gains, ...losses, ...curveNames], guides, arrows, callouts }
  const x = goodOf(s.xTitle, 'the x-axis good')
  const y = goodOf(s.yTitle, 'the y-axis good')
  return {
    figure: buildFigure([spec]),
    problems,
    notes,
    readout: readoutOne(s, { numeric, X1, Y1, X2, Y2, shifted, steps, x, y }),
    label: labelOne(s, { X1, Y1, X2, Y2, shifted }, rows),
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
  /** How far from the point at `from` the one at `to` is drawn (y down). */
  const drawnOff = (from: Point, to: Point): Point => ({ x: ((to.x - from.x) * CELL) / axes.x.step, y: (-(to.y - from.y) * CELL) / axes.y.step })
  /** Points along a country's line, close enough together to stand for it. */
  const traced = (c: (typeof countries)[number]) => (drawable(c) ? Array.from({ length: 21 }, (_, k) => ({ x: (c.X * k) / 20, y: c.Y * (1 - k / 20) })) : [])
  // On a numbered graph, the grid's right and top edges too: a name across one pokes out of the grid.
  const edges = numeric ? [[{ x: axisEnd(axes.x), y: axes.y.start }, { x: axisEnd(axes.x), y: axisEnd(axes.y) }, { x: axes.x.start, y: axisEnd(axes.y) }]] : []
  /**
   * A name for a country's line, the first of `fs` of the way down it from the y-axis (or the next, where
   * it has no room there), out from it (or, `inward`, toward the origin), nearer it than `other`'s line.
   */
  const nameBy = (c: (typeof countries)[number], w: Words, fs: number[], inward = false, other?: (typeof countries)[number]): PointSpec => {
    const ats = fs.map((f) => ({ x: c.X * f, y: c.Y * (1 - f) }))
    const at = ats[0]
    const out = outFrom(at, c.X, c.Y, STRAIGHT, span)
    const way = inward ? { x: -out.x, y: -out.y } : out
    const own = traced(c)
    const others = other ? traced(other) : []
    return {
      at,
      dot: false,
      name: w,
      spots: (q, size) => {
        const drawn = (pts: Point[]) => pts.map((o) => ({ x: q.x + drawnOff(at, o).x, y: q.y + drawnOff(at, o).y }))
        const spots = [true, false].flatMap((side) => drawn(ats).flatMap((p) => around(way, NAME_AT, [side])(p, size)))
        const keep = { own: drawn(own), others: drawn(others).map((o) => ({ at: o, r: 0 })), margin: size * 0.5, lines: [own, others, ...edges].map(drawn) }
        return clearOf(spots, widthOf(w, size), size, keep)
      },
    }
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
      .map((c, k) => {
        const other = countries[1 - k]
        if (outerAtY !== outerAtX) return nameBy(c, c.name, k === outerAtY ? [0.15, 0.25, 0.1] : [0.85, 0.75, 0.9], false, other)
        // The inner one's toward the origin, wherever along it there's room for it there.
        return nameBy(c, c.name, [0.5, 0.65, 0.35, 0.75, 0.25], k !== outerAtY, other)
      })
      .filter((_, k) => drawable(countries[k]))
    specs = [{ ...base, axes, curves, points: names, marks: marked ? marksOf(countries) : [] }]
  } else {
    const name = wordsOf(s, 'curveLabel')
    specs = countries.map((c) => ({
      ...base,
      axes,
      title: undefined,
      curves: drawable(c) ? [{ pts: lineOf(c), color: c.color, dash: c.dash }] : [],
      points: drawable(c) ? [nameBy(c, name, [0.85, 0.75, 0.65])] : [],
      marks: marked ? marksOf([c]) : [],
      caption: c.name,
    }))
    // One chart title over both graphs: buildFigure centres it over them.
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
  const big = (v: number) => withCommas(num(v))
  if (s.shape === 'straight' && r.X1 > 0) out.push(`Each unit of ${r.x} costs ${num(r.Y1 / r.X1)} ${r.y}`)
  for (const st of r.steps) {
    const between = st.from && st.to ? `${st.from} to ${st.to}: ` : ''
    out.push(`${between}${withCommas(String(st.dy))} ${r.y} given up for ${withCommas(String(st.dx))} ${r.x}${st.dx > 0 ? ` (${num(st.dy / st.dx)} each)` : ''}`)
  }
  if (r.shifted) {
    const moves = [!near(r.X1, r.X2) && `${big(r.X1)} to ${big(r.X2)} ${r.x}`, !near(r.Y1, r.Y2) && `${big(r.Y1)} to ${big(r.Y2)} ${r.y}`].filter(Boolean)
    if (moves.length) out.push(`Intercepts: ${moves.join(', ')}`)
  }
  return out
}

/** `items` written as a list: "A", "A and B", "A, B and C". */
const listed = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? ''))

/**
 * The figure in words, for screen readers: only the words drawn, so that a worksheet's blank or missing
 * names and captions aren't given away, and which way a shift or pivot goes.
 */
function labelOne(s: PpcSettings, c: { X1: number; Y1: number; X2: number; Y2: number; shifted: boolean }, rows: PointRow[]) {
  if (s.titleMode === 'text' && s.title.trim()) return plainOf(s.title.trim())
  const x = goodOf(s.xTitle, 'one good')
  const y = goodOf(s.yTitle, 'another')
  const shape = { out: 'bowed out', straight: 'straight', in: 'bowed in' }[s.shape]
  const parts: string[] = []
  if (rows.length) {
    const named = s.pointMode === 'text' ? rows.filter((r) => r.name) : []
    const captioned = rows.filter((r) => r.caption)
    const caption = (r: PointRow) => (s.captionMode === 'text' && r.caption ? ` (${r.caption.toLowerCase()})` : '')
    let said = named.length
      ? `point${named.length > 1 ? 's' : ''} ${listed(named.map((r) => `${plainOf(r.name)}${caption(r)}`))}`
      : `${rows.length === 1 ? 'a point' : `${rows.length} points`}${s.pointMode === 'blank' ? ' named on blank lines' : ''}`
    if (!named.length && s.captionMode === 'text' && captioned.length) said += `, captioned ${listed(captioned.map((r) => r.caption.toLowerCase()))}`
    if (s.captionMode === 'blank' && captioned.length) {
      said += captioned.length < rows.length ? `, ${captioned.length} with an arrow from a blank line` : `, ${rows.length > 1 ? 'each ' : ''}with an arrow from a blank line`
    }
    parts.push(said)
  }
  if (c.shifted) {
    // Which way each intercept moves: as asked, on a schematic graph, or as typed, on a numbered one.
    const numeric = s.look === 'numeric'
    const way = (a: number, b: number) => (numeric ? (b > a ? 'out' : 'in') : s.shiftDir)
    const xi = `${goodOf(s.xTitle, 'x-axis')} intercept`
    const yi = `${goodOf(s.yTitle, 'y-axis')} intercept`
    if (s.shift === 'x') parts.push(`the ${xi} moves ${way(c.X1, c.X2)}; the curve pivots on the ${yi}`)
    else if (s.shift === 'y') parts.push(`the ${yi} moves ${way(c.Y1, c.Y2)}; the curve pivots on the ${xi}`)
    else if (!numeric || (near(c.X1, c.X2) || way(c.X1, c.X2) === way(c.Y1, c.Y2))) parts.push(`the curve shifts ${near(c.X1, c.X2) ? way(c.Y1, c.Y2) : way(c.X1, c.X2)}`)
    else parts.push(`the curve shifts, the ${xi} ${way(c.X1, c.X2)} and the ${yi} ${way(c.Y1, c.Y2)}`)
  }
  if (s.steps) parts.push('opportunity cost steps')
  return `Production possibilities curve, ${shape}, between ${x} and ${y}${parts.length ? `: ${parts.join('; ')}` : ''}`
}
