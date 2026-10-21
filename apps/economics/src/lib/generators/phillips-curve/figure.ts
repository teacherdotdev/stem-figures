// Works out a Phillips curve graph from its settings, as a panel for the
// econ graph library to lay out: the short-run Phillips curve (convex,
// sloping down) crossing the vertical long-run one at the natural rate of
// unemployment, a movement along the short-run curve or either curve
// shifting, the long run after a movement, the points A, B and C with
// dashed guides to the inflation and unemployment rates at the axes, and
// every label. Numbered, the axes can run below 0 for deflation, crossing
// at 0, and the numbers are written with percent signs.

import { clipPath, type Point } from '$shared/graph/grid'
import { crosses, textBox, textWidth, type Spot } from '$shared/graph/labels'
import { plainOf, runsOf, runsWidth } from '$shared/graph/runs'
import { along, graphOf, intersect, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure } from '$lib/graph/figure'
import { niceAxis, rangesOf } from '$lib/graph/fit'
import { buildPanel, inks, shows, type ArrowSpec, type CurveSpec, type GuideSpec, type MarkSpec, type PanelSpec, type PointSpec, type Words } from '$lib/graph/panel'
import { SCHEMATIC, nth, panelBase, wordsOf, type NumberFrom } from '$lib/graph/settings'
import { SHIFT_SHARE } from '$lib/graph/shifts'
import { readAxes, axisEnd } from '$shared/graph/axes'
import type { Curvature, PhillipsSettings } from './settings'

/**
 * A short-run Phillips curve: inflation at unemployment u is
 * pe + k(1/(u − c) − 1/(un − c)), passing through (un, pe) and rising
 * toward the unemployment rate c as it goes left. The first one crosses
 * the long-run curve there, at the natural rate un and expected inflation pe.
 */
export type Srpc = { un: number; pe: number; c: number; k: number }

/** The short-run curve's inflation rate at unemployment `u`. */
export const inflationAt = (p: Srpc, u: number) => p.pe + p.k * (1 / (u - p.c) - 1 / (p.un - p.c))

/** The same short-run curve moved `dx` across and `dy` up. */
const movedBy = (p: Srpc, dx: number, dy: number): Srpc => ({ un: p.un + dx, pe: p.pe + dy, c: p.c + dx, k: p.k })

/**
 * The short-run curve `p` moved as far up as right (or down as left), as
 * AP graphs draw a shift, till it's at inflation `y` at unemployment `u`.
 */
function movedThrough(p: Srpc, u: number, y: number): Srpc {
  // Moved t each way, its height at u rises with t: halved in on.
  let lo = -50
  let hi = u - p.c - 1e-9
  for (let i = 0; i < 80; i++) {
    const t = (lo + hi) / 2
    if (inflationAt(p, u - t) + t < y) lo = t
    else hi = t
  }
  return movedBy(p, lo, lo)
}

/** How far left of the natural rate the short-run curve rises without end: schematic, in the hidden grid's units; numbered, times the natural rate. */
const BEND: Record<Curvature, number> = { gentle: 1.6, normal: 1, strong: 0.6 }
/** On a schematic graph: the natural rate's 5 is halfway, and A is a little below the middle, or at it for a movement down, leaving room under it. */
const SCHEMATIC_PE = { up: 3.5, down: 5 }
/** Where a schematic graph's short-run curves are drawn: clear of the y-axis, and short of the top, where the LRPC stands over them with its name. */
const SCHEMATIC_DRAW: Box = { x0: 0.7, x1: 9.4, y0: 0.4, y1: 9.2 }
const SCHEMATIC_LRPC_TOP = 9.6
/** How far in a schematic graph's points and natural rates stay: clear of the y-axis, and of the curves' right ends. */
const SCHEMATIC_ROOM = { x0: 1.4, x1: 8.4 }
/** How much smaller a schematic movement is drawn, in turn, when it doesn't fit as asked. */
const SCALES = [1, 0.85, 0.7, 0.55, 0.4, 0.25]

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

/**
 * A schematic movement, `scale` times its size: B and C, the short-run
 * curve shifted (as far up as right) and the natural rate moved.
 */
function schematicMove(s: PhillipsSettings, srpc1: Srpc, A: Point, scale: number) {
  const share = SHIFT_SHARE[s.size] * 10
  let B: Point | null = null
  let C: Point | null = null
  let srpc2: Srpc | null = null
  let un2: number | null = null
  if (s.movement === 'along') {
    const u = A.x + (s.along === 'up' ? -1 : 1) * (0.7 * share + 0.5) * scale
    B = { x: u, y: inflationAt(srpc1, u) }
    if (s.longRun) {
      // Expected inflation catches up with inflation at B: the SRPC shifts until it crosses the LRPC there.
      srpc2 = movedThrough(srpc1, A.x, B.y)
      C = { x: A.x, y: B.y }
    }
  } else if (s.movement === 'srpc') {
    const t = (s.srpcSide === 'right' ? 1 : -1) * (0.5 * share + 0.3) * scale
    srpc2 = movedBy(srpc1, t, t)
    // After a supply shock, unemployment and inflation both rise (or both fall) from A, onto the new curve.
    B = s.cause === 'expectations' ? { x: A.x, y: inflationAt(srpc2, A.x) } : { x: A.x + t, y: A.y + t }
  } else if (s.movement === 'lrpc') {
    un2 = A.x + (s.lrpcSide === 'right' ? 1 : -1) * share * scale
    if (s.withSrpc) {
      srpc2 = movedBy(srpc1, un2 - A.x, 0)
      B = { x: un2, y: A.y }
    }
  }
  return { B, C, srpc2, un2 }
}

/** Where a short-run curve comes down through height `y`, or null if it's always under it. */
function topOf(c: Srpc, y: number) {
  // 1/(u − c) = (y − pe)/k + 1/(un − c).
  const r = (y - c.pe) / c.k + 1 / (c.un - c.c)
  return r > 0 ? c.c + 1 / r : null
}

/**
 * Whether a schematic movement fits: its points and natural rate clear of
 * the y-axis and the curves' ends, a shifted short-run curve coming down
 * from high on the graph and staying above the x-axis, and neither
 * short-run curve starting at the top of an LRPC, as if it came out of it.
 */
function fits(m: ReturnType<typeof schematicMove>, A: Point, srpc1: Srpc) {
  const { x0, x1, y0, y1 } = SCHEMATIC_DRAW
  const xs = [m.B?.x, m.C?.x, m.un2 ?? undefined].filter((x): x is number => x !== undefined)
  if (xs.some((x) => x < SCHEMATIC_ROOM.x0 - 1e-9 || x > SCHEMATIC_ROOM.x1 + 1e-9)) return false
  const lrpcs = [A.x, ...(m.un2 !== null ? [m.un2] : [])]
  const tops = [srpc1, m.srpc2].map((c) => (c ? topOf(c, y1) : null)).filter((x): x is number => x !== null)
  if (tops.some((t) => lrpcs.some((u) => Math.abs(t - u) < 0.5))) return false
  const c = m.srpc2
  if (!c) return true
  return (c.c >= x0 || inflationAt(c, x0) >= Math.min(y1, A.y + 0.5 * (y1 - A.y))) && inflationAt(c, x1) >= y0 + 0.1
}

/** Where the economy is and goes, in percent: the curves and the points A, B and C. */
export function modelOf(s: PhillipsSettings) {
  const numeric = s.look === 'numeric'
  const notes: string[] = []
  const un = numeric ? s.nru : s.nruAt * 10
  const down = (s.movement === 'along' && s.along === 'down') || (s.movement === 'srpc' && s.srpcSide === 'left')
  const pe = numeric ? s.expected : SCHEMATIC_PE[down ? 'down' : 'up']

  const A: Point = { x: un, y: pe }

  // Schematic: the short-run curve slopes down at 1 where it crosses the LRPC, and the movement is as big as asked, or smaller till it fits.
  if (!numeric) {
    const d = BEND[s.curvature] * 5
    const srpc1: Srpc = { un, pe, c: un - d, k: d * d }
    let move = schematicMove(s, srpc1, A, SCALES[0])
    for (const scale of SCALES.slice(1)) {
      if (fits(move, A, srpc1)) break
      move = schematicMove(s, srpc1, A, scale)
    }
    return { numeric, un, pe, srpc1, srpc2: move.srpc2, un2: move.un2, A, B: move.B, C: move.C, notes }
  }

  // Numbered: the short-run curve goes through A and the second point typed.
  let c = un - BEND[s.curvature] * un
  if (s.u2 < un) c = Math.min(c, s.u2 - 0.25 * (un - s.u2))
  const k = (s.pi2 - pe) / (1 / (s.u2 - c) - 1 / (un - c))
  if (un <= 0) notes.push('The natural rate of unemployment has to be above 0%.')
  else if (near(s.u2, un) || !(k > 0) || !Number.isFinite(k)) {
    notes.push("The SRPC's second point needs lower unemployment and higher inflation than A, or higher unemployment and lower inflation: the SRPC slopes down.")
  }
  const d = un - c
  const srpc1: Srpc = k > 0 && Number.isFinite(k) ? { un, pe, c, k } : { un, pe, c, k: d * d * 0.2 }

  let B: Point | null = null
  let C: Point | null = null
  let srpc2: Srpc | null = null
  let un2: number | null = null

  // Numbered, the SRPC shifts straight up or down by the change in expected inflation.
  if (s.movement === 'along') {
    B = { x: s.u2, y: inflationAt(srpc1, s.u2) }
    if (s.longRun) {
      // Expected inflation catches up with inflation at B: the SRPC shifts until it crosses the LRPC there.
      srpc2 = { ...srpc1, pe: B.y }
      C = { x: un, y: B.y }
    }
  } else if (s.movement === 'srpc') {
    const pe2 = s.expected2
    if (near(pe2, pe)) notes.push('Type a different expected inflation rate for the SRPC to shift to.')
    srpc2 = { ...srpc1, pe: pe2 }
    if (s.cause === 'expectations') B = { x: un, y: pe2 }
    else {
      B = { x: s.uShock, y: inflationAt(srpc2, s.uShock) }
      if (pe2 > pe && s.uShock <= un) notes.push('For stagflation, type an unemployment rate at B above the natural rate.')
      if (pe2 < pe && s.uShock >= un) notes.push('For a positive supply shock, type an unemployment rate at B below the natural rate.')
    }
  } else if (s.movement === 'lrpc') {
    un2 = s.nru2
    if (near(un2, un)) notes.push('Type a different natural rate for the LRPC to shift to.')
    if (un2 <= 0) notes.push('The new natural rate of unemployment has to be above 0%.')
    // With the SRPC left where it is, the economy stays at A: only the LRPC moves.
    if (s.withSrpc) {
      srpc2 = movedBy(srpc1, un2 - un, 0)
      B = { x: un2, y: pe }
    }
  }
  return { numeric, un, pe, srpc1, srpc2, un2, A, B, C, notes }
}

export type PhillipsModel = ReturnType<typeof modelOf>

/** How long a stretch of each short-run curve a fitted graph shows above and left of its leftmost point, in shares of the axes. */
const SRPC_ROOM = 0.18
/** How far short of the grid's right, top and bottom the curves stop, leaving room for their names, as shares of the axes. */
const NAME_ROOM = { x: 0.06, y: 0.07, bottom: 0.06 }
/** How deep a fitted graph runs under 0 (or its lowest point) for the curves' tails, at most, as a share of the way up to its highest point. */
const DEFLATION = 0.3

/**
 * How high the inflation axis has to run, with the axes from `lo` to
 * `hi` so far, for short-run curve `c` to come down into the graph a
 * stretch above and left of point `p` on it, rather than starting just
 * over it. Never past where the curve meets the inflation axis.
 */
function topFor(c: Srpc, p: Point, xSpan: number, lo: number, hi: number) {
  let top = hi
  // A taller axis makes the same stretch shorter in shares of it, so it's worked out again till it settles.
  for (let i = 0; i < 6; i++) {
    const ySpan = top - lo
    const du = xSpan / 400
    let at = p
    let len = 0
    while (len < SRPC_ROOM && at.x - du > Math.max(0, c.c + du)) {
      const next = { x: at.x - du, y: inflationAt(c, at.x - du) }
      len += Math.hypot(du / xSpan, (next.y - at.y) / ySpan)
      at = next
    }
    const want = (at.y - NAME_ROOM.y * lo) / (1 - NAME_ROOM.y)
    if (want <= top + 1e-9) break
    top = want
  }
  return top
}

/**
 * The ranges a numbered graph fits to: unemployment from 0, inflation from
 * 0 or below it where the curves or points fall under 0, with room over
 * the highest point and for each short-run curve to come down into the
 * graph from well above its points, deflation or not.
 */
export function fitOf(s: PhillipsSettings) {
  const m = modelOf({ ...s, look: 'numeric' })
  const typed = { x: s.u2, y: s.pi2 }
  const pts = [m.A, m.B, m.C, typed].filter((p): p is Point => !!p)
  const x = niceAxis(0, Math.max(10, 1.6 * Math.max(m.un, m.un2 ?? 0, ...pts.map((p) => p.x))), 10)
  // Ending on a numbered line, when it's numbered every other line (or third…).
  const lines = Math.round(Number(x.to) / Number(x.step))
  const every = Math.max(1, Math.round(s.xEvery))
  if (lines % every) x.to = String(Number((Math.ceil(lines / every) * every * Number(x.step)).toPrecision(12)))
  const xEnd = Number(x.to) * (1 - NAME_ROOM.x)
  const srpcs = [m.srpc1, m.srpc2].filter((c): c is Srpc => !!c)
  const ys = pts.map((p) => p.y)
  const hi = Math.max(...ys)
  // Down to where the curves end on the right, but no deeper under 0 (or the lowest point) than
  // DEFLATION of the way up to the highest point: further down, a curve runs out through the bottom.
  const floor = Math.min(0, ...ys)
  const lows = srpcs.map((c) => inflationAt(c, xEnd)).filter(Number.isFinite)
  let lo = Math.min(floor, Math.max(floor - DEFLATION * (hi - floor), Math.min(...lows)))
  if (Math.min(...ys) < 0) lo = Math.min(lo, Math.min(...ys) - 0.05 * (hi - lo))
  let top = Math.max(1, hi + 0.4 * (hi - Math.min(0, ...ys)))
  for (const c of srpcs) {
    const on = pts.filter((p) => p.x > c.c && Math.abs(inflationAt(c, p.x) - p.y) < 1e-6 * Math.max(1, Math.abs(p.y)))
    if (on.length) top = topFor(c, on.reduce((a, b) => (b.x < a.x ? b : a)), Number(x.to), lo, top)
  }
  const y = niceAxis(lo, top, 10)
  return { xFrom: x.from, xTo: x.to, xStep: x.step, yFrom: y.from, yTo: y.to, yStep: y.step }
}

/** The axes drawn, and anything typed into their ranges to fix. */
export function axesOf(s: PhillipsSettings) {
  if (s.look !== 'numeric') return { ...SCHEMATIC, problems: {} as Record<string, string | null> }
  return readAxes(rangesOf(s, fitOf(s)))
}

/** The curve drawn for a short-run curve, from where it comes down through the top of `box` to its right edge. */
function curveOf(p: Srpc, box: Box): Curve {
  const top = topOf(p, box.y1) ?? p.c
  const x0 = Math.max(box.x0, p.c + (top - p.c) * 0.98)
  if (x0 >= box.x1) return []
  return clipPath(graphOf((u) => (u > p.c ? inflationAt(p, u) : NaN), x0, box.x1, 200), box).sort((a, b) => b.length - a.length)[0] ?? []
}

/** Where along a curve its arrows would best go, by how many there are. */
const ARROWS_AT: Record<number, number[]> = { 0: [], 1: [0.8], 2: [0.2, 0.8], 3: [0.12, 0.5, 0.88] }

type Line = { from: Point; to: Point }

/** A line drawn from `a` to `b`, and `by` (in shares of the axes, `span`) past both its ends. */
function reachOf(a: Point, b: Point, span: { x: number; y: number }, by: number): Curve {
  const len = Math.hypot((b.x - a.x) / span.x, (b.y - a.y) / span.y) || 1
  return [-by / len, 1 + by / len].map((k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }))
}

/**
 * `count` shift arrows, each from a point `t` of the way along a curve to
 * where `aim` says it goes, spread as AP graphs spread them but each moved
 * along till it's long enough to read and clear of the lines in `avoid`
 * (the other curves and the dashed guides), the arrows already `taken`,
 * the points and the x-axis (at `axis`), all in shares of the axes, and of
 * the numbers written on the grid (`onNumbers`).
 */
function clearArrows(
  aim: (t: number) => Line | null, count: number, color: string,
  avoid: Curve[], taken: Line[], points: Point[], span: { x: number; y: number }, axis: number,
  onNumbers: (from: Point, to: Point) => boolean,
): ArrowSpec[] {
  const unit = (p: Point) => ({ x: p.x / span.x, y: p.y / span.y })
  const ok = (a: Line) => {
    const f = unit(a.from)
    const g = unit(a.to)
    const len = Math.hypot(g.x - f.x, g.y - f.y)
    if (len < 0.08) return false
    if ((Math.min(a.from.y, a.to.y) - axis) / span.y < 0.03 && (Math.max(a.from.y, a.to.y) - axis) / span.y > -0.03) return false
    // The arrow, a little past both its ends and a little to either side, crosses nothing, and keeps clear of the other arrows' lines and heads.
    const reach = reachOf(a.from, a.to, span, Math.max(0.02, 0.08 * len))
    const side = { x: (-(g.y - f.y) / len) * 0.012 * span.x, y: ((g.x - f.x) / len) * 0.012 * span.y }
    const band = [-1, 0, 1].map((k) => reach.map((p) => ({ x: p.x + k * side.x, y: p.y + k * side.y })))
    if (avoid.some((c) => band.some((l) => intersect(l, c))) || onNumbers(a.from, a.to)) return false
    const [r0, r1] = reach.map(unit)
    if (taken.some((o) => gapBetween(r0, r1, unit(o.from), unit(o.to)) < 0.035)) return false
    return points.every((p) => distanceTo(unit(p), f, g) > 0.05)
  }
  const options: { t: number; from: Point; to: Point }[] = []
  for (let t = 0.04; t <= 0.96 + 1e-9; t += 0.02) {
    const a = aim(t)
    if (a && ok(a)) options.push({ t, ...a })
  }
  const out: { t: number; from: Point; to: Point }[] = []
  for (const want of ARROWS_AT[Math.max(0, Math.min(3, Math.round(count)))] ?? []) {
    const best = options.filter((o) => out.every((p) => Math.abs(p.t - o.t) > 0.14)).sort((a, b) => Math.abs(a.t - want) - Math.abs(b.t - want))[0]
    if (best) out.push(best)
  }
  return out.map(({ from, to }) => ({ from, to, color }))
}

/** How far point `p` is from the segment `a`–`b`. */
function distanceTo(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

/** How far apart the segments `a`–`b` and `c`–`d` come: 0 if they cross. */
function gapBetween(a: Point, b: Point, c: Point, d: Point) {
  if (intersect([a, b], [c, d])) return 0
  return Math.min(distanceTo(a, c, d), distanceTo(b, c, d), distanceTo(c, a, b), distanceTo(d, a, b))
}

/** A label with a number lowered after it: SRPC and 2 make SRPC₂ (SRPC₁, numbered `from` 0); u_n and 1 make u_{n1}. */
function numbered(w: Words, k: number | null, from: NumberFrom): Words {
  if (w.mode !== 'text' || !w.text.trim() || k === null) return w
  const t = w.text.trim()
  const n = nth(k, from)
  const m = t.match(/^(.*)_\{([^}]*)\}$/) ?? t.match(/^(.*)_(.)$/)
  return { ...w, text: m ? `${m[1]}_{${m[2]}${n}}` : `${t}_${n}` }
}

/** How wide the graph library draws a label left as a blank line. */
const BLANK_W = 46

/** An axis word with (%) after it, for a numbered graph with its percent signs in the titles. */
const withPercent = (w: Words): Words => (w.mode === 'text' && w.text.trim() && !w.text.includes('%') ? { ...w, text: `${w.text.trim()} (%)` } : w)

export function buildPhillips(s: PhillipsSettings) {
  const m = modelOf(s)
  const { numeric, un, srpc1, srpc2, un2, A, B, C } = m
  const notes = [...m.notes]
  const ink = inks(s.ink === 'bw')
  const { problems, ...axes } = axesOf(s)
  const box: Box = { x0: axes.x.start, x1: axisEnd(axes.x), y0: axes.y.start, y1: axisEnd(axes.y) }
  const span = { x: box.x1 - box.x0, y: box.y1 - box.y0 }
  // Curves stop a little short of the grid's top, right and bottom, leaving room for their names.
  const drawBox: Box = numeric ? { x0: box.x0, x1: box.x1 - span.x * NAME_ROOM.x, y0: box.y0 + span.y * NAME_ROOM.bottom, y1: box.y1 - span.y * NAME_ROOM.y } : SCHEMATIC_DRAW
  const lrpcTop = numeric ? drawBox.y1 : SCHEMATIC_LRPC_TOP
  // Where the x-axis is, for shift arrows to keep off.
  const axisAt = box.y0 < 0 && box.y1 > 0 && numeric ? 0 : box.y0
  const onGraph = (p: Point | null): p is Point => !!p && p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9

  if (!s.srpc && !s.lrpc) notes.push('Show the SRPC or the LRPC to draw a Phillips curve.')

  // The curves: the short-run curve (and where it shifts to), the long-run one (and where it shifts to).
  const curves: CurveSpec[] = []
  const srpcName = wordsOf(s, 'srpcLabel')
  const lrpcName = wordsOf(s, 'lrpcLabel')
  const c1 = curveOf(srpc1, drawBox)
  const c2 = srpc2 ? curveOf(srpc2, drawBox) : []
  // Each SRPC's name by its lower right end, so both are named alike.
  if (s.srpc) {
    curves.push({ pts: c1, name: numbered(srpcName, srpc2 ? 1 : null, s.numberFrom), color: ink.demand, nameHugsEnd: true })
    if (srpc2) curves.push({ pts: c2, name: numbered(srpcName, 2, s.numberFrom), color: ink.demand, nameHugsEnd: true })
  }
  // The LRPCs, named once the graph is laid out (below).
  const lrpcOf = (u: number): Curve => [{ x: u, y: box.y0 }, { x: u, y: lrpcTop }]
  const lrpcLines: { u: number; name: Words; pts: Curve }[] = []
  if (s.lrpc) {
    if (un > box.x0 && un < box.x1) lrpcLines.push({ u: un, name: numbered(lrpcName, un2 !== null ? 1 : null, s.numberFrom), pts: lrpcOf(un) })
    if (un2 !== null && un2 > box.x0 && un2 < box.x1) lrpcLines.push({ u: un2, name: numbered(lrpcName, 2, s.numberFrom), pts: lrpcOf(un2) })
  }
  for (const l of lrpcLines) curves.push({ pts: l.pts, color: ink.supply })

  // Points A, B and C, as many as the movement has and the teacher shows.
  const shown: { at: Point; key: 'aLabel' | 'bLabel' | 'cLabel' }[] = []
  if (s.pointA) shown.push({ at: A, key: 'aLabel' })
  if (B && s.pointB) shown.push({ at: B, key: 'bLabel' })
  if (C && s.pointC) shown.push({ at: C, key: 'cLabel' })
  const off = shown.filter((p) => !onGraph(p.at))
  if (off.length) notes.push(`${off.map((p) => wordsOf(s, p.key).text.trim() || 'A point').join(' and ')} ${off.length > 1 ? 'are' : 'is'} off the graph. Widen the axes${numeric ? '' : ' or make the movement smaller'}.`)
  const points: PointSpec[] = shown.filter((p) => onGraph(p.at)).map((p) => ({ at: p.at, name: wordsOf(s, p.key) }))

  // Dashed guides from the points to the axes, with the inflation and unemployment rates written there.
  const guides: GuideSpec[] = []
  const marks: MarkSpec[] = []
  const atAxes = points.map((p) => p.at)
  // One guide across for each inflation rate, from the point farthest right, and one down for each
  // unemployment rate, from the point farthest from the x-axis, so two guides never run over each
  // other (their dashes would run together). A point on the x-axis (0% inflation) has none across.
  if (s.guides) {
    for (const p of atAxes) {
      const across = !near(p.y, axisAt) && atAxes.every((q) => !near(q.y, p.y) || q.x <= p.x) && atAxes.findIndex((q) => near(q.y, p.y) && near(q.x, p.x)) === atAxes.indexOf(p)
      const down = atAxes.every((q) => !near(q.x, p.x) || Math.abs(q.y - axisAt) <= Math.abs(p.y - axisAt)) && atAxes.findIndex((q) => near(q.x, p.x) && near(q.y, p.y)) === atAxes.indexOf(p)
      if (across || down) guides.push({ from: p, x: down, y: across })
    }
  }
  const naturals = [un, ...(un2 !== null ? [un2] : [])]
  const natural = (u: number) => naturals.findIndex((v) => near(v, u))
  const nruName = wordsOf(s, 'nruLabel')
  const nruMark = (k: number) => numbered(nruName, naturals.length > 1 ? k + 1 : null, s.numberFrom)
  // The natural rate under the LRPC, whether or not a point is on it.
  if (s.lrpc) naturals.forEach((u, k) => u > box.x0 && u < box.x1 && marks.push({ axis: 'x', at: u, name: nruMark(k) }))
  if (s.guides && s.values) {
    const distinct = (vs: number[]) => vs.filter((v, k) => vs.findIndex((w) => near(w, v)) === k)
    const pis = distinct(atAxes.map((p) => p.y))
    const piName = wordsOf(s, 'piLabel')
    for (const [k, y] of pis.entries()) marks.push({ axis: 'y', at: y, name: numbered(piName, pis.length > 1 ? k + 1 : null, s.numberFrom) })
    const us = distinct(atAxes.map((p) => p.x).filter((u) => natural(u) < 0))
    const uName = wordsOf(s, 'uLabel')
    for (const [k, x] of us.entries()) marks.push({ axis: 'x', at: x, name: numbered(uName, k + 1, s.numberFrom) })
    if (!s.lrpc) {
      for (const u of distinct(atAxes.map((p) => p.x).filter((u) => natural(u) >= 0))) marks.push({ axis: 'x', at: u, name: nruMark(natural(u)) })
    }
  }

  const base = panelBase(s)
  const percent = numeric ? s.percent : 'none'
  const spec: PanelSpec = {
    ...base,
    axes,
    cross: numeric && axes.x.start >= 0,
    units: percent === 'numbers' ? { x: '%', y: '%' } : undefined,
    axisWords: percent === 'titles' ? { x: withPercent(base.axisWords.x), y: withPercent(base.axisWords.y) } : base.axisWords,
    curves,
    points,
    marks,
    guides,
    arrows: [],
  }

  // Laid out once without arrows: where things land on the drawing, for the LRPCs' names and the arrows.
  const laid = buildPanel(spec)
  // An x-axis crossing the grid (deflation) has its numbers under the grid, past the lines running
  // down to them: where they are, for arrows to keep off.
  const crossing = numeric && spec.cross && box.y0 < 0 && box.y1 > 0
  const numberBoxes = crossing ? laid.numbers.map((n) => textBox(n, textWidth(n.text, laid.fs), laid.fs)) : []
  const onNumbers = (from: Point, to: Point) => {
    const a = laid.px(from)
    const b = laid.px(to)
    return numberBoxes.some((n) => crosses({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, { x0: n.x0 - 3, y0: n.y0 - 3, x1: n.x1 + 3, y1: n.y1 + 3 }))
  }

  // Each LRPC's name over its top, or beside it, its outside first (away from the other LRPC); on a
  // numbered graph the name stays inside the grid, clear of its top line. With the two LRPCs close
  // enough that their names would run into each other or the other line, the right one stops
  // short, under the left one's name, so each is named at its own top (the right one, if need be,
  // beside it on the right, clear of the SRPCs rising on the left).
  const nameW = (w: Words) => (w.mode === 'blank' ? BLANK_W : runsWidth(runsOf(w.text.trim(), laid.labelFs), laid.labelFs) * 1.04 + 2)
  if (lrpcLines.length === 2 && lrpcLines.every((l) => shows(l.name))) {
    const [a, b] = lrpcLines.map((l) => laid.px({ x: l.u, y: lrpcTop }))
    if (Math.abs(a.x - b.x) < Math.max(...lrpcLines.map((l) => nameW(l.name))) + 14) {
      const drop = laid.labelFs * 1.1 + 12
      const right = lrpcLines.reduce((p, q) => (q.u > p.u ? q : p))
      right.pts[1] = { x: right.u, y: lrpcTop - (drop * span.y) / laid.grid.h }
    }
  }
  // Named left to right, the left one first, as it has the less room.
  const lrpcNames: PointSpec[] = lrpcLines.filter((l) => shows(l.name)).sort((p, q) => p.u - q.u).map((l) => {
    const out = lrpcLines.length === 2 && l.u < Math.max(...lrpcLines.map((o) => o.u)) ? -1 : 1
    return {
      at: l.pts[1],
      name: l.name,
      dot: false,
      spots: (q, fs) => {
        // Far enough over the top not to count as on its own line.
        // Or over it but leaning to its outside, ending just past it.
        const over: Spot[] = [{ x: q.x, y: q.y - 10, anchor: 'middle' }, { x: q.x - out * 8, y: q.y - 10, anchor: out > 0 ? 'start' : 'end' }]
        const beside = [0, 1.6, 3.2].flatMap((down) => [out, -out].map((side): Spot => ({ x: q.x + side * 6, y: q.y + fs * (0.8 + down), anchor: side > 0 ? 'start' : 'end' })))
        const room = !numeric || q.y - 10 - fs * 0.78 >= laid.grid.y + 3
        return room ? [over[0], ...beside.slice(0, 2), over[1], ...beside.slice(2)] : beside
      },
    }
  })

  // An arrow from each point to the next, clear of the curve it moves along.
  const paths: ArrowSpec[] = []
  const shownAt = (p: Point) => points.some((q) => q.at === p)
  const dots = [A, B, C].filter((p) => onGraph(p))
  if (s.pathArrows) {
    const drawn = curves.map((c) => c.pts.map(laid.px)).filter((c) => c.length > 1)
    // Whether an arrow keeps 7 drawn units clear of every curve, sides and ends.
    const clearOfCurves = (o: Line) => {
      const [p, q] = [laid.px(o.from), laid.px(o.to)]
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
      const u = { x: (q.x - p.x) / len, y: (q.y - p.y) / len }
      const band = [-7, 0, 7].map((k) => [
        { x: p.x - u.x * 4 - u.y * k, y: p.y - u.y * 4 + u.x * k },
        { x: q.x + u.x * 4 - u.y * k, y: q.y + u.y * 4 + u.x * k },
      ])
      return !drawn.some((c) => band.some((l) => intersect(l, c)))
    }
    const step = (a: Point, b: Point, lift: number) => {
      const v = { x: (b.x - a.x) / span.x, y: (b.y - a.y) / span.y }
      const len = Math.hypot(v.x, v.y) || 1
      // Lifted to the outside of the bend (up and right), as a share of the axes.
      let n = { x: v.y / len, y: -v.x / len }
      if (n.x + n.y < 0) n = { x: -n.x, y: -n.y }
      const arrow = (side: number, t0: number, t1: number) => {
        const at = (t: number) => ({ x: a.x + (b.x - a.x) * t + side * n.x * lift * span.x, y: a.y + (b.y - a.y) * t + side * n.y * lift * span.y })
        return { from: at(t0), to: at(t1), color: ink.black }
      }
      // Too short a move for an arrow to be more than its head has none.
      const [pa, pb] = [laid.px(a), laid.px(b)]
      if (Math.hypot(pb.x - pa.x, pb.y - pa.y) < 32) return
      // The longest that's clear of every curve (a little past its ends too), the numbers on the grid
      // and the dots, on the outside of the bend if it can be; or else the longest clear of the numbers.
      const spans = [0.12, 0.18, 0.25, 0.32, 0.4].flatMap((t0) => [0.88, 0.82, 0.75, 0.68, 0.6].map((t1) => [t0, t1])).sort((p, q) => q[1] - q[0] - (p[1] - p[0]))
      const options = [1, -1].flatMap((side) => spans.map(([t0, t1]) => arrow(side, t0, t1)))
      const clearOfDots = (o: Line) => [o.from, o.to].every((e) => dots.every((d) => Math.hypot(laid.px(e).x - laid.px(d).x, laid.px(e).y - laid.px(d).y) > 10))
      const clear = options.find((o) => !onNumbers(o.from, o.to) && clearOfDots(o) && clearOfCurves(o))
        ?? options.find((o) => !onNumbers(o.from, o.to) && clearOfDots(o) && !drawn.some((c) => intersect([laid.px(o.from), laid.px(o.to)], c)))
      paths.push(clear ?? options.find((o) => !onNumbers(o.from, o.to) && clearOfDots(o)) ?? options[0])
    }
    if (B && shownAt(A) && shownAt(B) && (s.movement === 'along' || (s.movement === 'srpc' && s.cause === 'shock'))) step(A, B, s.movement === 'along' ? 0.035 : 0)
    if (B && C && shownAt(B) && shownAt(C)) step(B, C, 0.025)
  }

  // Shift arrows, clear of the point-to-point arrows, the dashed guides and each other: across by
  // as much as the curve moves (as far up as right for a schematic SRPC), or on a numbered graph
  // slanting across to a short-run curve that shifts straight up or down.
  const arrows: ArrowSpec[] = []
  const taken: Line[] = [...paths]
  // (A guide down an LRPC is under it, and arrows to the LRPC end on it anyway.)
  const guideLines: Curve[] = guides.flatMap((g) => [
    ...(g.y ? [[{ x: box.x0, y: g.from.y }, g.from]] : []),
    ...(g.x && !lrpcLines.some((l) => near(l.u, g.from.x)) ? [[g.from, { x: g.from.x, y: box.y0 }]] : []),
  ])
  const lrpcs = lrpcLines.map((l) => l.pts)
  const srpcs = s.srpc ? [c1, c2].filter((c) => c.length > 1) : []
  const shift = (aim: (t: number) => Line | null, color: string, avoid: Curve[]) => {
    const out = clearArrows(aim, s.arrows, color, [...avoid, ...guideLines], taken, dots, span, axisAt, onNumbers)
    taken.push(...out)
    arrows.push(...out)
  }
  // From a point along a line to where it moves, if that's still drawn (inside `within`).
  const across = (from: Curve, dx: number, dy: number, within: Box) => (t: number) => {
    const p = along(from, t).at
    const q = { x: p.x + dx, y: p.y + dy }
    return q.x >= within.x0 && q.x <= within.x1 && q.y >= within.y0 && q.y <= within.y1 ? { from: p, to: q } : null
  }
  if (un2 !== null) {
    // Only as high as the new LRPC is drawn.
    if (s.lrpc) shift(across(lrpcOf(un), un2 - un, 0, { ...box, y1: Math.min(...lrpcLines.map((l) => l.pts[1].y)) }), ink.supply, srpcs)
    if (s.srpc && srpc2 && c1.length > 1) shift(across(c1, un2 - un, 0, drawBox), ink.demand, lrpcs)
  } else if (s.srpc && srpc2 && c1.length > 1 && c2.length > 1) {
    if (!numeric) shift(across(c1, srpc2.un - srpc1.un, srpc2.pe - srpc1.pe, drawBox), ink.demand, lrpcs)
    else {
      const up = srpc2.pe > srpc1.pe ? 1 : -1
      shift((t) => {
        const p = along(c1, t).at
        const hit = intersect([p, { x: p.x + up * span.x, y: p.y + up * span.y }], c2)
        return hit ? { from: p, to: hit } : null
      }, ink.demand, lrpcs)
    }
  }

  return {
    figure: buildFigure([{ ...spec, points: [...points, ...lrpcNames], arrows: [...paths, ...arrows] }]),
    model: m,
    problems,
    notes,
    readout: readoutOf(s, m),
    label: labelOf(s, m),
  }
}

export type PhillipsFigure = ReturnType<typeof buildPhillips>

const num = (v: number) => String(Number(v.toPrecision(3))).replace('-', '−')

/** A numbered graph's points, for the settings panel: each one's rates. */
function readoutOf(s: PhillipsSettings, m: PhillipsModel) {
  const out: string[] = []
  if (!m.numeric) return out
  const name = (key: 'aLabel' | 'bLabel' | 'cLabel', fallback: string) => plainOf(s[key].trim()) || fallback
  const at = (p: Point) => `${num(p.x)}% unemployment, ${num(p.y)}% inflation`
  out.push(`${name('aLabel', 'A')}: ${at(m.A)}`)
  if (m.B) out.push(`${name('bLabel', 'B')}: ${at(m.B)}`)
  if (m.C) out.push(`${name('cLabel', 'C')}: ${at(m.C)}`)
  return out
}

/** The figure in words, for screen readers. */
function labelOf(s: PhillipsSettings, m: PhillipsModel) {
  if (s.titleMode === 'text' && s.title.trim()) return plainOf(s.title.trim())
  const curves = [s.srpc && 'short-run', s.lrpc && 'long-run'].filter(Boolean).join(' and ')
  const parts: string[] = []
  // Up or down from where B is: on a numbered graph, B is typed and the hidden direction setting means nothing.
  // Only the curves drawn are said to move.
  if (s.movement === 'along' && m.B) parts.push(s.srpc ? `a movement ${m.B.x < m.A.x ? 'up' : 'down'} the short-run curve from A to B` : 'the economy moves from A to B')
  if (s.movement === 'srpc' && m.srpc2) {
    const why = s.cause === 'shock' ? ' after a supply shock' : ' as expected inflation changes'
    parts.push(s.srpc ? `the short-run curve shifts ${m.srpc2.pe > m.srpc1.pe ? 'right' : 'left'}${why}` : `the economy moves from A to B${why}`)
  }
  if (s.movement === 'lrpc' && m.un2 !== null) {
    const way = m.un2 > m.un ? 'right' : 'left'
    const moves = s.lrpc ? ` and the long-run curve shifts ${way}` : s.srpc && m.srpc2 ? ` and the short-run curve shifts ${way}` : ''
    parts.push(`the natural rate ${m.un2 > m.un ? 'rises' : 'falls'}${moves}`)
  }
  if (m.C) parts.push(`in the long run the economy returns to ${s.lrpc ? 'the long-run curve' : 'the natural rate'} at C`)
  return `Phillips curve graph${curves ? ` with ${curves} curves` : ''}${parts.length ? `: ${parts.join(', ')}` : ''}`
}
