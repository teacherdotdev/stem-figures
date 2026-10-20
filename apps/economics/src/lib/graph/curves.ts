// Curves on an economics graph, in the graph's own units: each is a line
// through points (a polyline), sampled finely enough to draw. Straight
// supply and demand lines, vertical ones (money supply, LRAS), bowed
// production possibilities curves, convex Phillips curves, the flat, sloped
// and flat demand for reserves, curves of a function, and shifted copies of
// any of them. Where two cross, and where one is at a price or a quantity,
// are read off the points.

import type { Point } from '$shared/graph/grid'

export type { Point }
export type Curve = Point[]

/** The graph's edges, in its own units. */
export type Box = { x0: number; x1: number; y0: number; y1: number }

const SAMPLES = 160

/** A straight line from `a` to `b`. */
export const segment = (a: Point, b: Point): Curve => [a, b]

/** A line through `a` and `b`, run on to the edges of `box`. */
export function lineThrough(a: Point, b: Point, box: Box): Curve {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.abs(dx) < 1e-12) return [{ x: a.x, y: box.y0 }, { x: a.x, y: box.y1 }]
  const m = dy / dx
  const at = (x: number) => ({ x, y: a.y + m * (x - a.x) })
  return [at(box.x0), at(box.x1)]
}

/** A vertical line at `x`, from `y0` up to `y1`. */
export const vertical = (x: number, y0: number, y1: number): Curve => [{ x, y: y0 }, { x, y: y1 }]

/** A horizontal line at `y`, from `x0` across to `x1`. */
export const horizontal = (y: number, x0: number, x1: number): Curve => [{ x: x0, y }, { x: x1, y }]

/** y = f(x) from `x0` to `x1`, leaving out where it isn't a number. */
export function graphOf(f: (x: number) => number, x0: number, x1: number, n = SAMPLES): Curve {
  const out: Curve = []
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n
    const y = f(x)
    if (Number.isFinite(y)) out.push({ x, y })
  }
  return out
}

/**
 * A quarter of a superellipse from (0, `Y`) round to (`X`, 0):
 * (x/X)^n + (y/Y)^n = 1, bowed out from the origin when `n` is above 1,
 * straight at 1 and bowed in below it, as a production possibilities curve is.
 */
export function bowed(X: number, Y: number, n: number, samples = SAMPLES): Curve {
  const out: Curve = []
  for (let k = 0; k <= samples; k++) {
    const t = ((Math.PI / 2) * k) / samples
    // Points spaced by angle, so the curve is as smooth at its ends as in the middle.
    const c = Math.cos(t)
    const s = Math.sin(t)
    out.push({ x: X * Math.pow(s, 2 / n), y: Y * Math.pow(c, 2 / n) })
  }
  return out
}

/**
 * Flat at `high` from `x0`, curving down to flat at `low` by `x1`: the
 * demand for reserves (and, turned on its side, the three-range aggregate
 * supply curve). The middle is a smooth S, steepest halfway.
 */
export function flatSlopeFlat(x0: number, x1: number, high: number, low: number, end: number, start = 0): Curve {
  const out: Curve = []
  if (x0 > start) out.push({ x: start, y: high })
  const n = SAMPLES
  for (let k = 0; k <= n; k++) {
    const t = k / n
    // A cosine ease: level at both ends of the slope, so the joins are round.
    const e = (1 - Math.cos(Math.PI * t)) / 2
    out.push({ x: x0 + (x1 - x0) * t, y: high + (low - high) * e })
  }
  if (end > x1) out.push({ x: end, y: low })
  return out
}

/** A curve moved `dx` right and `dy` up. */
export const shifted = (c: Curve, dx: number, dy: number): Curve => c.map((p) => ({ x: p.x + dx, y: p.y + dy }))

/** Where two segments cross, as how far along the first (0 to 1), or null. */
function crossing(a: Point, b: Point, c: Point, d: Point): number | null {
  const r = { x: b.x - a.x, y: b.y - a.y }
  const s = { x: d.x - c.x, y: d.y - c.y }
  const den = r.x * s.y - r.y * s.x
  if (Math.abs(den) < 1e-12) return null
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? t : null
}

/** Every point where two curves cross, in order along the first. */
export function crossings(a: Curve, b: Curve): Point[] {
  const out: Point[] = []
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      const t = crossing(a[i - 1], a[i], b[j - 1], b[j])
      if (t === null) continue
      const p = { x: a[i - 1].x + (a[i].x - a[i - 1].x) * t, y: a[i - 1].y + (a[i].y - a[i - 1].y) * t }
      const last = out.at(-1)
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-7) out.push(p)
    }
  }
  return out
}

/** Where two curves first cross, or null if they don't. */
export const intersect = (a: Curve, b: Curve): Point | null => crossings(a, b)[0] ?? null

/** The curve's height where it first reaches `x`, or null if it never does. */
export function yAt(c: Curve, x: number): number | null {
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1]
    const b = c[i]
    if ((a.x - x) * (b.x - x) <= 0 && a.x !== b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x)
    if (a.x === x) return a.y
  }
  return c.at(-1)?.x === x ? c.at(-1)!.y : null
}

/** How far across the curve is where it first reaches height `y`, or null if it never does. */
export const xAt = (c: Curve, y: number): number | null => yAt(c.map((p) => ({ x: p.y, y: p.x })), y)

/** How long a curve is. */
export const lengthOf = (c: Curve) => c.reduce((sum, p, k) => (k ? sum + Math.hypot(p.x - c[k - 1].x, p.y - c[k - 1].y) : 0), 0)

/** The point `t` of the way along a curve by its length (0 its start, 1 its end), and the way it's heading there. */
export function along(c: Curve, t: number): { at: Point; dir: Point } {
  const total = lengthOf(c)
  let left = Math.max(0, Math.min(1, t)) * total
  for (let k = 1; k < c.length; k++) {
    const a = c[k - 1]
    const b = c[k]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (left <= len || k === c.length - 1) {
      const f = len ? Math.min(1, left / len) : 0
      return { at: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, dir: len ? { x: (b.x - a.x) / len, y: (b.y - a.y) / len } : { x: 1, y: 0 } }
    }
    left -= len
  }
  return { at: c[0], dir: { x: 1, y: 0 } }
}

/** A polygon's area (positive whichever way round it goes). */
export function areaOf(poly: Point[]) {
  let a = 0
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k]
    const q = poly[(k + 1) % poly.length]
    a += p.x * q.y - q.x * p.y
  }
  return Math.abs(a) / 2
}

/** A polygon's center of area (its first point, if it has none). */
export function centroidOf(poly: Point[]): Point {
  let a = 0
  let cx = 0
  let cy = 0
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k]
    const q = poly[(k + 1) % poly.length]
    const cross = p.x * q.y - q.x * p.y
    a += cross
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  }
  if (Math.abs(a) < 1e-12) return poly[0] ?? { x: 0, y: 0 }
  return { x: cx / (3 * a), y: cy / (3 * a) }
}

/**
 * The region between a curve and a level line from `x0` to `x1`: under a
 * demand curve and above a price (consumer surplus), or the other way
 * round. The curve is read at each x; the line is at `level`.
 */
export function between(c: Curve, level: number, x0: number, x1: number): Point[] {
  const pts: Point[] = [{ x: x0, y: level }]
  const n = 48
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n
    const y = yAt(c, x)
    if (y !== null) pts.push({ x, y })
  }
  pts.push({ x: x1, y: level })
  return pts
}

/** The region between two curves from `x0` to `x1`, each read at every x. */
export function betweenCurves(a: Curve, b: Curve, x0: number, x1: number): Point[] {
  const top: Point[] = []
  const bottom: Point[] = []
  const n = 48
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n
    const ya = yAt(a, x)
    const yb = yAt(b, x)
    if (ya !== null) top.push({ x, y: ya })
    if (yb !== null) bottom.push({ x, y: yb })
  }
  return [...top, ...bottom.reverse()]
}
