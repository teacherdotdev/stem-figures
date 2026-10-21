// Works out a Phillips curve graph from its settings, as a panel for the
// econ graph library to lay out: the short-run Phillips curve (convex,
// sloping down) crossing the vertical long-run one at the natural rate of
// unemployment, a movement along the short-run curve or either curve
// shifting, the long run after a movement, the points A, B and C with
// dashed guides to the inflation and unemployment rates at the axes, and
// every label. Numbered, the axes can run below 0 for deflation, crossing
// at 0, and the numbers are written with percent signs.

import { clipPath, type Point } from '$shared/graph/grid'
import { crosses, textBox, textWidth } from '$shared/graph/labels'
import { plainOf } from '$shared/graph/runs'
import { along, graphOf, intersect, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure } from '$lib/graph/figure'
import { niceAxis, rangesOf } from '$lib/graph/fit'
import { buildPanel, inks, type ArrowSpec, type CurveSpec, type GuideSpec, type MarkSpec, type PanelSpec, type PointSpec, type Words } from '$lib/graph/panel'
import { SCHEMATIC, panelBase, wordsOf } from '$lib/graph/settings'
import { SHIFT_SHARE } from '$lib/graph/shifts'
import { readAxes, axisEnd } from '$shared/graph/axes'
import type { Curvature, PhillipsSettings } from './settings'

/**
 * A short-run Phillips curve: inflation at unemployment u is
 * pe + k(1/(u − c) − 1/(un − c)), crossing the long-run curve (at the
 * natural rate un) at expected inflation pe, and rising toward the
 * unemployment rate c as it goes left.
 */
export type Srpc = { un: number; pe: number; c: number; k: number }

/** The short-run curve's inflation rate at unemployment `u`. */
export const inflationAt = (p: Srpc, u: number) => p.pe + p.k * (1 / (u - p.c) - 1 / (p.un - p.c))

/** How far left of the natural rate the short-run curve rises without end: schematic, in the hidden grid's units; numbered, times the natural rate. */
const BEND: Record<Curvature, number> = { gentle: 1.6, normal: 1, strong: 0.6 }
/** On a schematic graph: the natural rate's 5 is halfway, and A is a little below the middle. */
const SCHEMATIC_PE = 3.5
/** How far a supply shock moves unemployment on a schematic graph. */
const SHOCK_U = 1.2

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

/** Where the economy is and goes, in percent: the curves and the points A, B and C. */
export function modelOf(s: PhillipsSettings) {
  const numeric = s.look === 'numeric'
  const notes: string[] = []
  const un = numeric ? s.nru : s.nruAt * 10
  const pe = numeric ? s.expected : SCHEMATIC_PE

  // The short-run curve: schematic, sloping down at 1 where it crosses the LRPC; numbered, through A and the second point typed.
  let srpc1: Srpc
  if (!numeric) {
    const d = BEND[s.curvature] * 5
    srpc1 = { un, pe, c: un - d, k: d * d }
  } else {
    let c = un - BEND[s.curvature] * un
    if (s.u2 < un) c = Math.min(c, s.u2 - 0.25 * (un - s.u2))
    const k = (s.pi2 - pe) / (1 / (s.u2 - c) - 1 / (un - c))
    if (un <= 0) notes.push('The natural rate of unemployment has to be above 0%.')
    else if (near(s.u2, un) || !(k > 0) || !Number.isFinite(k)) {
      notes.push("The SRPC's second point needs lower unemployment and higher inflation than A, or higher unemployment and lower inflation: the SRPC slopes down.")
    }
    const d = un - c
    srpc1 = k > 0 && Number.isFinite(k) ? { un, pe, c, k } : { un, pe, c, k: d * d * 0.2 }
  }

  const A: Point = { x: un, y: pe }
  let B: Point | null = null
  let C: Point | null = null
  let srpc2: Srpc | null = null
  let un2: number | null = null
  const share = SHIFT_SHARE[s.size] * 10

  if (s.movement === 'along') {
    const u = numeric ? s.u2 : un + (s.along === 'up' ? -0.75 : 0.75) * share
    B = { x: u, y: inflationAt(srpc1, u) }
    if (s.longRun) {
      // Expected inflation catches up with inflation at B: the SRPC shifts until it crosses the LRPC there.
      srpc2 = { ...srpc1, pe: B.y }
      C = { x: un, y: B.y }
    }
  } else if (s.movement === 'srpc') {
    const pe2 = numeric ? s.expected2 : pe + (s.srpcSide === 'right' ? share : -share)
    if (numeric && near(pe2, pe)) notes.push('Type a different expected inflation rate for the SRPC to shift to.')
    srpc2 = { ...srpc1, pe: pe2 }
    if (s.cause === 'expectations') B = { x: un, y: pe2 }
    else {
      const u = numeric ? s.uShock : un + (pe2 >= pe ? SHOCK_U : -SHOCK_U)
      B = { x: u, y: inflationAt(srpc2, u) }
    }
  } else if (s.movement === 'lrpc') {
    un2 = numeric ? s.nru2 : un + (s.lrpcSide === 'right' ? share : -share)
    if (numeric && near(un2, un)) notes.push('Type a different natural rate for the LRPC to shift to.')
    if (numeric && un2 <= 0) notes.push('The new natural rate of unemployment has to be above 0%.')
    if (s.withSrpc) srpc2 = { ...srpc1, un: un2, c: srpc1.c + (un2 - un) }
    B = { x: un2, y: pe }
  }
  return { numeric, un, pe, srpc1, srpc2, un2, A, B, C, notes }
}

export type PhillipsModel = ReturnType<typeof modelOf>

/** How long a stretch of each short-run curve a fitted graph shows above and left of its leftmost point, in shares of the axes. */
const SRPC_ROOM = 0.18
/** How far short of the grid's top and right the curves stop, leaving room for their names, as shares of the axes. */
const NAME_ROOM = { x: 0.06, y: 0.07 }

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
  const xEnd = Number(x.to) * (1 - NAME_ROOM.x)
  const srpcs = [m.srpc1, m.srpc2].filter((c): c is Srpc => !!c)
  const ys = pts.map((p) => p.y)
  const hi = Math.max(...ys)
  // Down to where the curves end on the right, and a little under the lowest point.
  const lows = srpcs.map((c) => inflationAt(c, xEnd)).filter(Number.isFinite)
  let lo = Math.min(0, ...lows, ...ys)
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
  // Where it's at the top: 1/(u − c) = (top − pe)/k + 1/(un − c).
  const r = (box.y1 - p.pe) / p.k + 1 / (p.un - p.c)
  const top = r > 0 ? p.c + 1 / r : p.c
  const x0 = Math.max(box.x0, p.c + (top - p.c) * 0.98)
  if (x0 >= box.x1) return []
  return clipPath(graphOf((u) => (u > p.c ? inflationAt(p, u) : NaN), x0, box.x1, 200), box).sort((a, b) => b.length - a.length)[0] ?? []
}

/** Where along a curve its arrows would best go, by how many there are. */
const ARROWS_AT: Record<number, number[]> = { 0: [], 1: [0.8], 2: [0.2, 0.8], 3: [0.12, 0.5, 0.88] }

/**
 * `count` shift arrows, each from a point `t` of the way along a curve to
 * where `aim` says it goes, spread as AP graphs spread them but each moved
 * along till it's long enough to read and clear of the other curves, the
 * points and the x-axis (at `axis`), all in shares of the axes, and of the
 * numbers written on the grid (`onNumbers`).
 */
function clearArrows(
  aim: (t: number) => { from: Point; to: Point } | null, count: number, color: string,
  avoid: Curve[], points: Point[], span: { x: number; y: number }, axis: number,
  onNumbers: (from: Point, to: Point) => boolean,
): ArrowSpec[] {
  const unit = (p: Point) => ({ x: p.x / span.x, y: p.y / span.y })
  const ok = (a: { from: Point; to: Point }) => {
    const f = unit(a.from)
    const g = unit(a.to)
    if (Math.hypot(g.x - f.x, g.y - f.y) < 0.065) return false
    if ((Math.min(a.from.y, a.to.y) - axis) / span.y < 0.03 && (Math.max(a.from.y, a.to.y) - axis) / span.y > -0.03) return false
    // The arrow, and a little past both its ends, crosses nothing.
    const reach: Curve = [-0.08, 1.08].map((k) => ({ x: a.from.x + (a.to.x - a.from.x) * k, y: a.from.y + (a.to.y - a.from.y) * k }))
    if (avoid.some((c) => intersect(reach, c)) || onNumbers(a.from, a.to)) return false
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

/** A label with a number lowered after it: SRPC and 2 make SRPC₂; u_n and 1 make u_{n1}. */
function numbered(w: Words, k: number | null): Words {
  if (w.mode !== 'text' || !w.text.trim() || k === null) return w
  const t = w.text.trim()
  const m = t.match(/^(.*)_\{([^}]*)\}$/) ?? t.match(/^(.*)_(.)$/)
  return { ...w, text: m ? `${m[1]}_{${m[2]}${k}}` : `${t}_${k}` }
}

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
  // Curves stop a little short of the grid's top and right, leaving room for their names.
  const drawBox: Box = numeric ? { ...box, x1: box.x1 - span.x * NAME_ROOM.x, y1: box.y1 - span.y * NAME_ROOM.y } : { x0: 0, x1: 9.4, y0: 0.4, y1: 9.6 }
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
  if (s.srpc) {
    curves.push({ pts: c1, name: numbered(srpcName, srpc2 ? 1 : null), color: ink.demand })
    if (srpc2) curves.push({ pts: c2, name: numbered(srpcName, 2), color: ink.demand })
  }
  const lrpcOf = (u: number): Curve => [{ x: u, y: box.y0 }, { x: u, y: drawBox.y1 }]
  if (s.lrpc) {
    if (un > box.x0 && un < box.x1) curves.push({ pts: lrpcOf(un), name: numbered(lrpcName, un2 !== null ? 1 : null), color: ink.supply })
    if (un2 !== null && un2 > box.x0 && un2 < box.x1) curves.push({ pts: lrpcOf(un2), name: numbered(lrpcName, 2), color: ink.supply })
  }

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
  const nruMark = (k: number) => numbered(nruName, naturals.length > 1 ? k + 1 : null)
  // The natural rate under the LRPC, whether or not a point is on it.
  if (s.lrpc) naturals.forEach((u, k) => u > box.x0 && u < box.x1 && marks.push({ axis: 'x', at: u, name: nruMark(k) }))
  if (s.guides && s.values) {
    const distinct = (vs: number[]) => vs.filter((v, k) => vs.findIndex((w) => near(w, v)) === k)
    const pis = distinct(atAxes.map((p) => p.y))
    const piName = wordsOf(s, 'piLabel')
    for (const [k, y] of pis.entries()) marks.push({ axis: 'y', at: y, name: numbered(piName, pis.length > 1 ? k + 1 : null) })
    const us = distinct(atAxes.map((p) => p.x).filter((u) => natural(u) < 0))
    const uName = wordsOf(s, 'uLabel')
    for (const [k, x] of us.entries()) marks.push({ axis: 'x', at: x, name: numbered(uName, k + 1) })
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

  // An x-axis crossing the grid (deflation) has its numbers under it, on the grid, written over
  // whatever runs through them: where they are, laid out once without arrows, for arrows to keep off.
  const laid = numeric && spec.cross && box.y0 < 0 && box.y1 > 0 ? buildPanel(spec) : null
  const numberBoxes = (laid?.numbers ?? []).map((n) => textBox(n, textWidth(n.text, laid!.fs), laid!.fs))
  const onNumbers = (from: Point, to: Point) => {
    if (!laid) return false
    const a = laid.px(from)
    const b = laid.px(to)
    return numberBoxes.some((n) => crosses({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, { x0: n.x0 - 3, y0: n.y0 - 3, x1: n.x1 + 3, y1: n.y1 + 3 }))
  }

  // Shift arrows: slanting across to a short-run curve that shifts up or down, straight across for the natural rate moving.
  const arrows: ArrowSpec[] = []
  const lrpcs = curves.filter((c) => c.color === ink.supply && c.pts.length === 2 && c.pts[0].x === c.pts[1].x).map((c) => c.pts)
  const srpcs = s.srpc ? [c1, c2].filter((c) => c.length > 1) : []
  const dots = [A, B, C].filter((p) => onGraph(p))
  const inside = (p: Point) => p.x >= drawBox.x0 && p.x <= drawBox.x1 && p.y >= drawBox.y0 && p.y <= drawBox.y1
  if (un2 !== null) {
    const dx = un2 - un
    const line = lrpcOf(un)
    if (s.lrpc) {
      arrows.push(...clearArrows((t) => {
        const p = along(line, t).at
        return { from: p, to: { x: p.x + dx, y: p.y } }
      }, s.arrows, ink.supply, srpcs, dots, span, axisAt, onNumbers))
    }
    if (s.srpc && srpc2 && c1.length > 1) {
      arrows.push(...clearArrows((t) => {
        const p = along(c1, t).at
        const q = { x: p.x + dx, y: p.y }
        return inside(q) ? { from: p, to: q } : null
      }, s.arrows, ink.demand, lrpcs, dots, span, axisAt, onNumbers))
    }
  } else if (s.srpc && srpc2 && c1.length > 1 && c2.length > 1) {
    const up = srpc2.pe > srpc1.pe ? 1 : -1
    arrows.push(...clearArrows((t) => {
      const p = along(c1, t).at
      const hit = intersect([p, { x: p.x + up * span.x, y: p.y + up * span.y }], c2)
      return hit ? { from: p, to: hit } : null
    }, s.arrows, ink.demand, lrpcs, dots, span, axisAt, onNumbers))
  }

  // An arrow from each point to the next, clear of the curve it moves along.
  if (s.pathArrows) {
    const drawn = curves.map((c) => c.pts).filter((c) => c.length > 1)
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
      // Through a number on the grid, it's shortened, or moved to the other side if that crosses no curve.
      const options = [1, -1].flatMap((side) => [[0.18, 0.82], [0.18, 0.68], [0.32, 0.82], [0.25, 0.62], [0.38, 0.75]].map(([t0, t1]) => arrow(side, t0, t1)))
      const clear = options.find((o) => !onNumbers(o.from, o.to) && !drawn.some((c) => intersect([o.from, o.to], c)))
      arrows.push(onNumbers(options[0].from, options[0].to) && clear ? clear : options[0])
    }
    if (B && onGraph(A) && onGraph(B) && (s.movement === 'along' || (s.movement === 'srpc' && s.cause === 'shock'))) step(A, B, s.movement === 'along' ? 0.035 : 0)
    if (B && C && onGraph(B) && onGraph(C)) step(B, C, 0.025)
  }

  return {
    figure: buildFigure([{ ...spec, arrows }]),
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
  if (s.movement === 'along' && m.B) parts.push(`a movement ${m.B.x < m.A.x ? 'up' : 'down'} the short-run curve from A to B`)
  if (s.movement === 'srpc' && m.srpc2) parts.push(`the short-run curve shifts ${m.srpc2.pe > m.srpc1.pe ? 'right' : 'left'}${s.cause === 'shock' ? ' after a supply shock' : ' as expected inflation changes'}`)
  if (s.movement === 'lrpc' && m.un2 !== null) parts.push(`the natural rate ${m.un2 > m.un ? 'rises' : 'falls'} and the long-run curve shifts ${m.un2 > m.un ? 'right' : 'left'}`)
  if (m.C) parts.push('in the long run the economy returns to the long-run curve at C')
  return `Phillips curve graph${curves ? ` with ${curves} curves` : ''}${parts.length ? `: ${parts.join(', ')}` : ''}`
}
