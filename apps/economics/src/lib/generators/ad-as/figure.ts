// Works out an AD–AS graph from its settings, as a panel for the econ graph
// library to lay out: aggregate demand, short-run aggregate supply (a
// straight line, or flat, curving up, then vertical at full employment) and
// the vertical long-run aggregate supply at full-employment output, where
// the economy starts (at full employment, or with a recessionary or
// inflationary gap), shifts of each curve and where the economy ends up, the
// output gap braced under the axis, a callout giving the equilibrium, and
// every label.

import { CELL, clipPath, type Point } from '$shared/graph/grid'
import { alongCurve, crosses, type Box as DrawnBox, type Spot } from '$shared/graph/labels'
import { plainOf, runsOf, runsWidth } from '$shared/graph/runs'
import { LABEL_SCALE } from '$shared/labelSize'
import { along, crossings, intersect, lineThrough, shifted, vertical, xAt, yAt, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure } from '$lib/graph/figure'
import { niceAxis, rangesOf } from '$lib/graph/fit'
import { inks, shows, wrapped, type ArrowSpec, type BraceSpec, type CalloutSpec, type CurveSpec, type GuideSpec, type MarkSpec, type PanelSpec, type PointSpec, type Words } from '$lib/graph/panel'
import { SCHEMATIC, nth, panelBase, wordsOf, type NumberFrom } from '$lib/graph/settings'
import { SHIFT_SHARE, type ShiftSize } from '$lib/graph/shifts'
import { smoothThrough } from '$lib/graph/smooth'
import { readAxes, axisEnd } from '$shared/graph/axes'
import { rowsOf, type AdAsSettings, type Shift } from './settings'

/** Far enough to run a straight curve off any schematic graph. */
const FAR = 100
/** How steep the schematic AD and SRAS lines are, down and up. */
const SLOPE = 0.8
/** How far a starting gap puts output from full employment, on the schematic graph. */
const GAP: Record<ShiftSize, number> = { small: 1, medium: 1.5, large: 2 }
/** The three-range curve's flat range, and the price level where it turns vertical, on the schematic graph. */
const FLAT = 3
const CORNER = 6.6
/** How far a cost shock moves the three-range curve up or down, as a share of a shift across. */
const UP_SHARE = 1
/**
 * On the schematic graph, output a shift leaves closer to full employment
 * than this is put on it, and output a little farther off is put this far
 * off, so a gap is never braced too narrow to see or name.
 */
const SNAP = 0.4
const MIN_GAP = 1

/**
 * The three-range aggregate supply curve on a schematic graph: flat at a low
 * price level (the Keynesian range), bending up (the intermediate range) to
 * vertical at full employment `yf` (the classical range).
 */
export function threeRange(yf: number): Curve {
  const x0 = yf - 3.4 // where the bend starts
  const n = 2.8 // squarer than a quarter ellipse, so each range reads as its own
  const out: Curve = [{ x: -FAR, y: FLAT }]
  const N = 120
  for (let k = 0; k <= N; k++) {
    const t = ((Math.PI / 2) * k) / N
    out.push({ x: x0 + (yf - x0) * Math.pow(Math.sin(t), 2 / n), y: CORNER - (CORNER - FLAT) * Math.pow(Math.cos(t), 2 / n) })
  }
  out.push({ x: yf, y: FAR })
  return out
}

/** The ranges a numbered graph fits to: a little past the schedule's real GDP (and potential GDP) and price levels. */
export function fitOf(s: AdAsSettings) {
  const rows = rowsOf(s.schedule)
  const xs = [...rows.flatMap((r) => [r.ad, r.as]), ...(Number.isFinite(s.potential) ? [s.potential] : [])]
  const ys = rows.map((r) => r.pl)
  if (!xs.length || !ys.length) return { xFrom: '0', xTo: '10', xStep: '1', yFrom: '0', yTo: '10', yStep: '1' }
  const pad = (lo: number, hi: number) => {
    const span = hi - lo || Math.abs(hi) || 1
    return [lo - span * 0.06, hi + span * 0.06]
  }
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs))
  const [y0, y1] = pad(Math.min(...ys), Math.max(...ys))
  const x = niceAxis(Math.min(...xs) >= 0 ? Math.max(0, x0) : x0, x1, 10)
  const y = niceAxis(Math.min(...ys) >= 0 ? Math.max(0, y0) : y0, y1, 10)
  return { xFrom: x.from, xTo: x.to, xStep: x.step, yFrom: y.from, yTo: y.to, yStep: y.step }
}

/** The axes drawn, and anything typed into their ranges to fix. */
export function axesOf(s: AdAsSettings) {
  if (s.look !== 'numeric') return { ...SCHEMATIC, problems: {} as Record<string, string | null> }
  return readAxes(rangesOf(s, fitOf(s)))
}

/** A label's words with a number lowered after it: Y_f becomes Y_{f1}, AD becomes AD_1 (or, numbered `from` 0, Y_{f0} and AD_0). */
function numbered(w: Words, k: 1 | 2, from: NumberFrom): Words {
  if (w.mode !== 'text' || !w.text.trim()) return w
  const t = w.text.trim()
  const n = nth(k, from)
  const braced = t.match(/^(.*)_\{([^}]*)\}$/)
  if (braced) return { ...w, text: `${braced[1]}_{${braced[2]}${n}}` }
  const one = t.match(/^(.*)_(.)$/u)
  if (one) return { ...w, text: `${one[1]}_{${one[2]}${n}}` }
  return { ...w, text: `${t}_${n}` }
}
/** A value's name before and after a change (PL₁, PL₂), or at the one equilibrium (PLₑ or PL*). */
function named(w: Words, k: 0 | 1 | 2, style: AdAsSettings['eqStyle'], from: NumberFrom): Words {
  if (w.mode !== 'text' || !w.text.trim()) return w
  if (k) return numbered(w, k, from)
  return { ...w, text: style === 'star' ? `${w.text.trim()}*` : `${w.text.trim()}_e` }
}
/** A curve's or point's name, numbered only when there's a before and an after. */
const maybe = (w: Words, k: 0 | 1 | 2, from: NumberFrom): Words => (k ? numbered(w, k, from) : w)

/** A number as written in a callout or the readout: 8,800 and 90. */
export const fmt = (v: number) => Number(v.toPrecision(4)).toLocaleString('en-US', { maximumFractionDigits: 6 })
/** A number rounded as fmt writes it, so values written side by side add up. */
const rounded = (v: number) => Number(v.toPrecision(4))

/** Where shift arrows go along a curve, best first by how many arrows there are (as $lib/graph/shifts spreads them). */
const ARROWS_AT: Record<number, number[]> = { 1: [0.2], 2: [0.15, 0.85], 3: [0.12, 0.5, 0.88] }

/**
 * `count` arrows from curve `c` to where it shifts, `d` across and up, from
 * the part of it in `b`: spread along it, each crossing none of the `avoid`
 * curves, clear of the `at` points (where curves cross, and dots), and not
 * where the curve, or where it shifts to, runs the arrow's way close by on
 * the drawing (`scale` across and up), where an arrow would lie along it;
 * nor along one of the dashed `guides`, crossing one if it can help it, or
 * alongside an arrow already `placed`, or on one of the `drawnDots`. Where there's room for fewer arrows
 * that cross nothing (SRAS following a shifted LRAS across both LRAS
 * lines), it draws only those; where every place crosses something, only
 * those crossing least.
 */
function arrowsAlong(
  c: Curve, d: Point, count: number, color: string, b: Box, avoid: Curve[], at: Point[], scale: Point, guides: Point[][], placed: ArrowSpec[], drawnDots: Point[],
): ArrowSpec[] {
  const run = clipPath(c, b).sort((p, q) => q.length - p.length)[0]
  const n = Math.max(0, Math.min(3, Math.round(count)))
  // On the drawing (up positive): how long the arrow is, and its way.
  const px = (p: Point) => ({ x: p.x * scale.x, y: p.y * scale.y })
  const len = Math.hypot(d.x * scale.x, d.y * scale.y)
  if (!run || run.length < 2 || len < 1 || !n) return []
  const way = { x: (d.x * scale.x) / len, y: (d.y * scale.y) / len }
  /** How far a direction is from the arrow's way, as the sine of the angle between them. */
  const across = (x: number, y: number) => Math.abs(x * way.y - y * way.x) / (Math.hypot(x, y) || 1)
  const both = [c, shifted(c, d.x, d.y)].map((k) => k.map(px))
  /** Whether a line runs the arrow's way within 8 of `m`. */
  const alongside = (k: Point[], m: Point) => {
    for (let j = 1; j < k.length; j++) if (segGap(k[j - 1], k[j], m) < 8 && across(k[j].x - k[j - 1].x, k[j].y - k[j - 1].y) < 0.4) return true
    return false
  }
  const guided = guides.map((g) => g.map(px))
  const before = placed.map((a) => [px(a.from), px(a.to)])
  const dots = at.map(px)
  const onDots = drawnDots.map(px)
  const near = len * 0.35
  const options: { t: number; from: Point; to: Point; crossed: number; cost: number }[] = []
  for (let t = 0.06; t <= 0.945; t += 0.02) {
    const { at: from, dir } = along(run, t)
    const to = { x: from.x + d.x, y: from.y + d.y }
    const [f, z] = [px(from), px(to)]
    const on = (w: number) => ({ x: f.x + (z.x - f.x) * w, y: f.y + (z.y - f.y) * w })
    // Lying along a curve, where it runs the arrow's way here or partway along (three-range supply's flat range), is worse than crossing one.
    const level = across(dir.x * scale.x, dir.y * scale.y) < 0.4 || [0.2, 0.4, 0.6, 0.8].some((w) => both.some((k) => alongside(k, on(w))))
    const onGuide = guided.some((g) => [0.25, 0.5, 0.75].some((w) => alongside(g, on(w))))
    // A guide crossed or met (not one the arrow starts on, under the curve it starts from), or its head on one.
    const guidesCrossed = guided.reduce((k, g) => k + crossings([f, z], g).filter((p) => Math.hypot(p.x - f.x, p.y - f.y) > 4).length, 0)
      + (guided.some((g) => g.some((p, j) => j > 0 && segGap(g[j - 1], p, z) < 8)) ? 1 : 0)
    // Beside an arrow already drawn, or running on from one, where the two would read as one.
    const byArrow = before.some(([p, q]) => segsGap(f, z, p, q) < 10 || (Math.abs(p.y - f.y) < 14 && Math.min(Math.abs(p.x - z.x), Math.abs(q.x - f.x)) < 48))
    // Starting or ending on a dot drawn, or running through one.
    const onDot = onDots.some((p) => segGap(f, z, p) < 9)
    const crossed = avoid.reduce((k, a) => k + crossings([from, to], a).length, (level ? 5 : 0) + (onGuide ? 1 : 0) + guidesCrossed * 0.5 + (byArrow ? 1 : 0) + (onDot ? 1 : 0))
    let cost = 0
    // How close the arrow comes to each point, on the drawing.
    for (const p of dots) {
      const gap = segGap(f, z, p)
      if (gap < near) cost += ((near - gap) / CELL) * 20
    }
    options.push({ t, from, to, crossed, cost })
  }
  const fewest = Math.min(...options.map((o) => o.crossed))
  // As many as asked for (or as fit) of the places crossing least, spread apart, nearest where they'd best go.
  const free = options.filter((o) => o.crossed === fewest)
  for (let k = n; k > 0; k--) {
    let best: { picked: typeof free; score: number } | null = null
    const ideal = ARROWS_AT[k]
    const pick = (from: number, picked: typeof free, score: number) => {
      if (picked.length === k) {
        if (!best || score < best.score) best = { picked, score }
        return
      }
      for (let i = from; i < free.length; i++) {
        const o = free[i]
        if (picked.length && o.t - picked.at(-1)!.t <= 0.22) continue
        pick(i + 1, [...picked, o], score + o.cost + Math.abs(o.t - ideal[picked.length]) * 3)
      }
    }
    pick(0, [], 0)
    if (best) return (best as { picked: typeof free }).picked.map((o) => ({ from: o.from, to: o.to, color }))
  }
  return []
}

/**
 * How far an equilibrium's name keeps from every line, as drawn: CLEAR if it
 * can, or at least NEAR (just past the 3 the library keeps labels off lines)
 * a little farther round; how far across or up it keeps from every dot (4.5
 * round, which the library keeps 3 clear of); how far from another name;
 * and how far out from its point it looks, in label heights, before taking
 * the place that comes nearest to clear.
 */
const CLEAR = 4
const NEAR = 3.3
const OFF_DOT = 8
const OFF_NAME = 4
const REACH = 3.2
/** How wide the library draws a blank line for a name. */
const BLANK_W = 46
/** How far the library keeps a callout's arrow short of its point. */
const LEADER_STOP = 4

/** How far a box is from a point, as drawn (0 inside it). */
const boxGap = (b: DrawnBox, p: Point) => Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.y0 - p.y, 0, p.y - b.y1))
/** How far a box is from a point (or another box) across or up, whichever is farther, as drawn. */
const boxOff = (b: DrawnBox, p: Point) => Math.max(b.x0 - p.x, p.x - b.x1, b.y0 - p.y, p.y - b.y1)
const boxesOff = (a: DrawnBox, b: DrawnBox) => Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1)
/** How far a segment from `a` to `c` is from a point. */
function segGap(a: Point, c: Point, p: Point) {
  const len = (c.x - a.x) ** 2 + (c.y - a.y) ** 2
  const u = len ? Math.max(0, Math.min(1, ((p.x - a.x) * (c.x - a.x) + (p.y - a.y) * (c.y - a.y)) / len)) : 0
  return Math.hypot(a.x + u * (c.x - a.x) - p.x, a.y + u * (c.y - a.y) - p.y)
}
/** How far apart two segments are (0 where they cross). */
function segsGap(a: Point, b: Point, c: Point, d: Point) {
  if (crossings([a, b], [c, d]).length) return 0
  return Math.min(segGap(a, b, c), segGap(a, b, d), segGap(c, d, a), segGap(c, d, b))
}
/** How far a segment is from a box, as drawn (0 through it). */
function segBoxGap(a: Point, c: Point, b: DrawnBox) {
  if (crosses({ x1: a.x, y1: a.y, x2: c.x, y2: c.y }, b)) return 0
  const corners = [{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x0, y: b.y1 }, { x: b.x1, y: b.y1 }]
  return Math.min(boxGap(b, a), boxGap(b, c), ...corners.map((k) => segGap(a, c, k)))
}
/** A label's width as the library draws it: its words, or a blank line. */
const widthOf = (w: Words, fs: number) => (w.mode === 'text' ? runsWidth(runsOf(w.text.trim(), fs), fs) * 1.04 + 2 : BLANK_W)

/** Lines and dots in the graph's units, as segments and points on the drawing around point `e` drawn at `q`. */
function onDrawing(e: Point, q: Point, scale: Point) {
  const drawn = (p: Point) => ({ x: q.x + (p.x - e.x) * scale.x, y: q.y - (p.y - e.y) * scale.y })
  const segments = (lines: Point[][]) => {
    const out: [Point, Point][] = []
    for (const line of lines) {
      const pts = line.map(drawn)
      for (let j = 1; j < pts.length; j++) out.push([pts[j - 1], pts[j]])
    }
    return out
  }
  return { drawn, segments }
}

/**
 * Where the name of a point where curves cross goes, as drawn: the place
 * all round it nearest the point that's clear of every line and dot, and
 * of the names placed before it (`placed`, by point, this one's `k`), so
 * the name sits in a gap between the curves through the point rather than
 * against one; beside it on the right before the left. Just the one place,
 * so the library takes it rather than one farther off that's a little
 * clearer still. If no place near the point is clear, the places that come
 * nearest follow, nearer ones first, for the library to choose from.
 * `lines` and `dots` are in the graph's units, `scale` how far one of them
 * is across and up on the drawing.
 */
function clearOf(e: Point, name: Words, lines: Point[][], dots: Point[], scale: Point, placed: (DrawnBox | undefined)[], k: number) {
  return (q: Point, fs: number): Spot[] => {
    const width = widthOf(name, fs)
    const { drawn, segments } = onDrawing(e, q, scale)
    const reach = width + fs * (REACH + 1)
    const segs = segments(lines).filter(([a, z]) => segGap(a, z, q) < reach)
    const dotsNear = dots.map(drawn).filter((d) => Math.hypot(d.x - q.x, d.y - q.y) < reach)
    const before = placed.slice(0, k).filter((b): b is DrawnBox => !!b)
    const boxAt = (c: Point): DrawnBox => ({ x0: c.x - width / 2, x1: c.x + width / 2, y0: c.y - fs * 0.54, y1: c.y + fs * 0.54 })
    let best: { c: Point; cost: number } | null = null
    const close: { c: Point; gap: number; d: number }[] = []
    // Every place for its middle within reach of the point, 1.5 apart, nearest first.
    const most = OFF_DOT + fs * REACH
    const tries: { x: number; y: number; c: Point; b: DrawnBox; d: number }[] = []
    for (let x = -most - width / 2; x <= most + width / 2; x += 1.5) {
      for (let y = -most - fs * 0.54; y <= most + fs * 0.54; y += 1.5) {
        const c = { x: q.x + x, y: q.y + y }
        const b = boxAt(c)
        const d = boxGap(b, q)
        if (d <= most) tries.push({ x, y, c, b, d })
      }
    }
    tries.sort((a, z) => a.d - z.d)
    for (const { x, y, c, b, d } of tries) {
      if (best && d > best.cost) break
      if (dotsNear.some((p) => boxOff(b, p) < OFF_DOT) || before.some((o) => boxesOff(b, o) < OFF_NAME)) continue
      let gap = Infinity
      for (const [p, z] of segs) if ((gap = Math.min(gap, segBoxGap(p, z, b))) === 0) break
      // Beside the point on the right before the left; only just clear counts as a little farther than it is.
      const bias = (1 - x / (Math.hypot(x, y) || 1)) * 4
      const cost = gap >= CLEAR ? d + bias : gap >= NEAR ? d + bias + 4 : Infinity
      if (cost < (best?.cost ?? Infinity)) best = { c, cost }
      else if (!best && gap > 0) close.push({ c, gap, d })
    }
    const spotAt = (c: Point): Spot => ({ x: c.x, y: c.y + fs * 0.24, anchor: 'middle' })
    if (best) {
      placed[k] = boxAt(best.c)
      return [spotAt(best.c)]
    }
    placed[k] = undefined
    if (!close.length) return [{ x: q.x + 12, y: q.y + fs * 1.3, anchor: 'start' }]
    // A line a little closer rather than the name drifting off from its point.
    return close.sort((p, z) => p.d + (NEAR - p.gap) * 6 - (z.d + (NEAR - z.gap) * 6)).slice(0, 40).map((o) => spotAt(o.c))
  }
}

/**
 * Where a callout's words go, as drawn, best first: places in the open
 * between the lines, clear of every line and dot, whose arrow to point `e`
 * is long enough to read, crosses nothing and runs along no line on its
 * way, nor over a point's name (`names`, as drawn, once they're placed),
 * nearest first; then, if there are none, those that come nearest, spread
 * round for the library to choose from. Within `plot`, the graph's box;
 * `lines` and `dots` in the graph's units.
 */
function calloutSpots(e: Point, name: Words, lines: Point[][], guides: Point[][], dots: Point[], scale: Point, plot: Box, names: (DrawnBox | undefined)[]) {
  return (q: Point, fs: number): Spot[] => {
    // Written as the library writes it: on two or more lines if it's long.
    const rows = name.mode === 'text' ? wrapped(name.text.trim(), fs, fs * 10) : ['']
    const width = name.mode === 'text' ? Math.max(...rows.map((r) => runsWidth(runsOf(r, fs), fs) * 1.04 + 2)) : BLANK_W
    const height = fs * 1.08 + (rows.length - 1) * fs * 1.2
    const { drawn, segments } = onDrawing(e, q, scale)
    // Each line's segments, with the box round each, to pass over those far off quickly.
    const boxed = (pts: Point[][], guide: boolean) => segments(pts).map(([a, z]) => ({ a, z, guide, x0: Math.min(a.x, z.x), x1: Math.max(a.x, z.x), y0: Math.min(a.y, z.y), y1: Math.max(a.y, z.y) }))
    const segs = [...boxed(lines, false), ...boxed(guides, true)]
    const nearBox = (b: DrawnBox, by: number) => segs.filter((g) => g.x1 > b.x0 - by && g.x0 < b.x1 + by && g.y1 > b.y0 - by && g.y0 < b.y1 + by)
    const dotsAt = dots.map(drawn)
    const tl = drawn({ x: plot.x0, y: plot.y1 })
    // Out past the grid's right edge a little, where curves' names leave room.
    const br = { ...drawn({ x: plot.x1, y: plot.y0 }), x: drawn({ x: plot.x1, y: plot.y0 }).x + 40 }
    const IDEAL = 34
    const options: { spot: Spot; cost: number; clean: boolean }[] = []
    for (let x0 = tl.x + 4; x0 + width <= br.x - 2; x0 += 6) {
      for (let y0 = tl.y + 4; y0 + height <= br.y - 4; y0 += 6) {
        const b: DrawnBox = { x0, y0, x1: x0 + width, y1: y0 + height }
        // The arrow, from the words' nearest edge (3 out) to just short of the point.
        const from = { x: Math.min(b.x1 + 3, Math.max(b.x0 - 3, q.x)), y: Math.min(b.y1 + 3, Math.max(b.y0 - 3, q.y)) }
        const len = Math.hypot(q.x - from.x, q.y - from.y)
        // Not so far off that it reads as somewhere else's.
        if (len < 6 || len > 140) continue
        let gap = 5
        for (const g of nearBox(b, 5)) if ((gap = Math.min(gap, segBoxGap(g.a, g.z, b))) === 0) break
        const dotGap = Math.min(5, ...dotsAt.map((p) => boxGap(b, p) - 4.5))
        // Along the arrow, more than 12 out from the point: how near it comes to a line or a dot (0 crossing one).
        const named = names.filter((n): n is DrawnBox => !!n)
        const nameGap = Math.min(5, ...named.map((n) => Math.max(0, boxesOff(b, n))))
        // Along the arrow, more than 12 out from the point: how near it comes to a line, a dot or a name
        // (0 crossing one), and how many dashed guides it crosses, which matter less.
        let along = 8
        let guidesCrossed = 0
        if (gap >= 5 && dotGap >= 5 && nameGap >= 5) {
          const reach: DrawnBox = { x0: Math.min(q.x, from.x), x1: Math.max(q.x, from.x), y0: Math.min(q.y, from.y), y1: Math.max(q.y, from.y) }
          const by = nearBox(reach, 8)
          const tip = { x: q.x + ((from.x - q.x) * 12) / len, y: q.y + ((from.y - q.y) * 12) / len }
          for (const g of by) if (g.guide && crossings([tip, from], [g.a, g.z]).length) guidesCrossed++
          for (let k = 12; k < len - LEADER_STOP && along > 0; k += 3) {
            const m = { x: q.x + ((from.x - q.x) * k) / len, y: q.y + ((from.y - q.y) * k) / len }
            for (const g of by) if (!g.guide) along = Math.min(along, segGap(g.a, g.z, m))
            for (const p of dotsAt) along = Math.min(along, Math.hypot(p.x - m.x, p.y - m.y) - 4.5)
            for (const n of named) along = Math.min(along, boxGap(n, m))
          }
        }
        // Words on a line are worst; then an arrow across or along a line, or across a guide.
        const faults = (5 - gap) * 100 + (5 - dotGap) * 100 + (5 - nameGap) * 100 + (8 - Math.max(0, along)) * 10 + guidesCrossed * 30 + Math.max(0, 20 - len) * 4
        options.push({ spot: { x: x0, y: y0 + fs * 0.78, anchor: 'start' }, cost: faults * 100 + Math.abs(len - IDEAL), clean: gap >= 5 && dotGap >= 5 && nameGap >= 5 })
      }
    }
    // The best, and others at least 16 from any better one; only places with the words clear of everything, if there are any.
    const out: Spot[] = []
    const clean = options.filter((o) => o.clean)
    for (const o of (clean.length ? clean : options).sort((a, z) => a.cost - z.cost)) {
      if (out.every((k) => Math.hypot(k.x - o.spot.x, k.y - o.spot.y) >= 16)) out.push(o.spot)
      if (out.length >= 40) break
    }
    return out
  }
}

/**
 * Where the name of a vertical line (LRAS) goes, as drawn from its top `q`:
 * over its top, at one height with any other's; pushed apart from the other
 * line's (`other`, across from this one as drawn, and its width) where both
 * centered over their lines would meet; or beside the top.
 */
function overTop(name: Words, other: { dx: number; name: Words } | null) {
  return (q: Point, fs: number): Spot[] => {
    const w = widthOf(name, fs)
    const y = q.y - 8 - fs * 0.3
    let x = q.x
    let anchor: Spot['anchor'] = 'middle'
    if (other) {
      const ow = widthOf(other.name, fs)
      const mid = q.x + other.dx / 2
      // Each name as centered over its line as it can be, 10 apart.
      if (Math.abs(other.dx) < (w + ow) / 2 + 10) {
        if (other.dx > 0) [x, anchor] = [Math.min(q.x + w / 2, mid - 5), 'end']
        else [x, anchor] = [Math.max(q.x - w / 2, mid + 5), 'start']
      }
    }
    return [
      { x, y, anchor },
      { x: q.x + 6, y: q.y + fs * 0.8, anchor: 'start' },
      { x: q.x - 6, y: q.y + fs * 0.8, anchor: 'end' },
      { x: q.x + 6, y: q.y + fs * 2.2, anchor: 'start' },
      { x: q.x - 6, y: q.y + fs * 2.2, anchor: 'end' },
    ]
  }
}

/**
 * Where a curve's name goes on a numbered graph, as drawn from its end `q`
 * (`prev` a little way back along it): past the dot at its end, over it,
 * under it, then along the curve (`run`, as drawn).
 */
function pastDot(run: Point[]) {
  return (q: Point, fs: number): Spot[] => {
    const prev = run[Math.max(0, run.length - 6)]
    const rising = q.y < prev.y - 0.5
    return [
      { x: q.x + 11, y: q.y + (rising ? 0 : fs * 0.6), anchor: 'start' },
      { x: q.x + 11, y: q.y + fs * 0.35, anchor: 'start' },
      { x: q.x + 8, y: q.y - 9, anchor: 'start' },
      { x: q.x + 8, y: q.y + fs + 6, anchor: 'start' },
      { x: q.x, y: q.y - 10 - fs * 0.3, anchor: 'middle' },
      { x: q.x - 8, y: q.y - 9, anchor: 'end' },
      { x: q.x - 8, y: q.y + fs + 6, anchor: 'end' },
      ...alongCurve(run, fs),
    ]
  }
}

export function buildAdAs(s: AdAsSettings) {
  const numeric = s.look === 'numeric'
  const ink = inks(s.ink === 'bw')
  const { problems, ...axes } = axesOf(s)
  const box: Box = { x0: axes.x.start, x1: axisEnd(axes.x), y0: axes.y.start, y1: axisEnd(axes.y) }
  const spanX = box.x1 - box.x0
  const spanY = box.y1 - box.y0
  // How far one of the graph's units is across and up, as drawn, and how big the labels are.
  const scale = { x: CELL / axes.x.step, y: CELL / axes.y.step }
  const lfs = 14 * 1.1 * LABEL_SCALE[s.labelSize]
  // Schematic curves stop a little short of the grid's top and right, leaving room for their names.
  const drawBox: Box = numeric ? box : { x0: 0, x1: 9.4, y0: 0.4, y1: 9.6 }
  const tol = spanX * 0.004
  const notes: string[] = []
  const three = !numeric && s.asShape === 'three'

  // The curves where the economy starts.
  const rows = rowsOf(s.schedule)
  let ad1: Curve
  let as1: Curve
  let yf1: number
  if (numeric) {
    yf1 = s.potential
    // Left to right, so each curve's name goes by its right end.
    const byX = (pts: Point[]) => [...pts].sort((a, b) => a.x - b.x)
    const through = (pts: Point[]) => (s.smooth ? byX(smoothThrough(pts, 'y')) : byX(pts))
    ad1 = through(rows.map((r) => ({ x: r.ad, y: r.pl })))
    as1 = through(rows.map((r) => ({ x: r.as, y: r.pl })))
    if (rows.length < 2) notes.push('Type at least two rows of the schedule to draw the curves.')
  } else {
    const g = GAP[s.gapSize]
    const far = { x0: -FAR, x1: FAR, y0: -FAR, y1: FAR }
    if (three) {
      yf1 = 6
      as1 = threeRange(yf1)
      // AD crosses aggregate supply where it turns vertical at full employment, or short of it on
      // the bend; output can't pass full employment, so past it AD only crosses higher up.
      const e = s.start === 'recession' ? { x: yf1 - g, y: yAt(as1, yf1 - g) ?? FLAT } : { x: yf1, y: CORNER + (s.start === 'inflation' ? g * 0.6 : 0) }
      // Steeper than on the straight graph, so it runs from high on the price level axis down past full employment.
      ad1 = lineThrough(e, { x: e.x + 1, y: e.y - SLOPE * 1.4 }, far)
      if (s.start === 'inflation') notes.push("Three-range aggregate supply is vertical at full employment, so output can't pass it: there's no inflationary gap.")
    } else {
      // AD and SRAS cross in the middle; full employment is there, or to its right (a recessionary gap) or left (an inflationary one).
      yf1 = 5 + (s.start === 'recession' ? g : s.start === 'inflation' ? -g : 0)
      as1 = lineThrough({ x: 5, y: 5 }, { x: 6, y: 5 + SLOPE }, far)
      ad1 = lineThrough({ x: 5, y: 5 }, { x: 6, y: 5 - SLOPE }, far)
    }
  }
  const e1 = intersect(ad1, as1)

  // Shifts: across by a share of the real GDP axis (on a numbered graph, to
  // the next row of the schedule or one or two past it), or as far as it
  // takes to bring output to full employment. The three-range curve moves
  // up or down (higher costs raise its flat range), its vertical range
  // staying at full employment, and across with full employment.
  const sign = (shift: Shift | 'none') => (shift === 'left' ? -1 : shift === 'right' ? 1 : 0)
  const sizeOf = (shift: Shift | 'none', size: ShiftSize) => sign(shift) * SHIFT_SHARE[size] * spanX
  /**
   * On a numbered graph, how far a shift by a size moves a curve: so the new
   * equilibrium is on a row of the schedule past the old one's price level,
   * the row it takes a shift nearest the size's share of the axis to reach,
   * so its price level and real GDP are the schedule's own.
   */
  const byRows = (curve: 'ad' | 'as', shift: Shift, size: ShiftSize): number | null => {
    if (!e1 || (shift !== 'left' && shift !== 'right')) return null
    // AD right and SRAS left raise the price level.
    const up = (curve === 'ad') === (shift === 'right')
    const past = rows.filter((r) => (up ? r.pl > e1.y + spanY * 1e-6 : r.pl < e1.y - spanY * 1e-6)).sort((a, b) => (up ? a.pl - b.pl : b.pl - a.pl))
    const dxOf = (r: (typeof rows)[number]) => (curve === 'ad' ? r.as - r.ad : r.ad - r.as)
    const want = SHIFT_SHARE[size] * spanX
    const r = past.sort((a, b) => Math.abs(Math.abs(dxOf(a)) - want) - Math.abs(Math.abs(dxOf(b)) - want))[0]
    return r ? dxOf(r) : null
  }
  let lrasDx = sizeOf(s.lrasShift, s.lrasSize)
  // LRAS shifting alone to a hair off where output is goes to it, or a little farther off (as AD and SRAS do, below).
  if (!numeric && !three && e1 && lrasDx && s.adShift === 'none' && s.srasShift === 'none') {
    const off = e1.x - (yf1 + lrasDx)
    if (Math.abs(off) < MIN_GAP) lrasDx = Math.abs(off) < SNAP ? e1.x - yf1 : e1.x - yf1 - Math.sign(off || lrasDx) * MIN_GAP
  }
  const yf2 = yf1 + lrasDx
  let adDx = (numeric ? byRows('ad', s.adShift, s.adSize) : null) ?? sizeOf(s.adShift, s.adSize)
  let asDx = three ? lrasDx : (numeric ? byRows('as', s.srasShift, s.srasSize) : null) ?? sizeOf(s.srasShift, s.srasSize)
  let asDy = three ? -sign(s.srasShift) * SHIFT_SHARE[s.srasSize] * spanY * UP_SHARE : 0
  const adAfter = () => shifted(ad1, adDx, 0)
  const asAfter = () => shifted(as1, asDx, asDy)
  /** How far AD moves to cross aggregate supply (as it ends up) at output `x`, or null if it can't. */
  const adTo = (x: number) => {
    const y = yAt(asAfter(), x)
    const from = y === null ? null : xAt(ad1, y)
    return from === null ? null : x - from
  }
  /** How far aggregate supply moves (across, or the three-range curve up or down) to cross AD (as it ends up) at output `x`, or null if it can't. */
  const asTo = (x: number) => {
    const y = yAt(adAfter(), x)
    if (y === null) return null
    if (three) {
      const at = yAt(shifted(as1, asDx, 0), x)
      // Its flat range kept above the axis.
      return at === null || FLAT + y - at < drawBox.y0 ? null : y - at
    }
    const from = xAt(as1, y)
    return from === null ? null : x - from
  }
  const cannot = (what: string) => notes.push(`${what} can't shift far enough to bring output to full employment on this graph.`)
  const already = (what: string) => notes.push(`Output is already at full employment, so ${what} stays where it is.`)
  if (s.adShift === 'full') {
    // AD moves to cross aggregate supply (shifted by its own size, if it shifts) at full employment.
    const dx = adTo(yf2)
    if (dx === null) cannot('AD')
    else if (Math.abs(dx) <= tol) already('AD')
    else adDx = dx
  }
  if (s.srasShift === 'full' && s.adShift !== 'full') {
    const d = asTo(yf2)
    if (d === null) cannot('SRAS')
    else if (Math.abs(d) <= (three ? spanY : spanX) * 0.004) already('SRAS')
    else if (three) asDy = d
    else asDx = d
  }
  // A shift by a size (or the three-range curve following LRAS) that leaves output a hair off full
  // employment puts it on it, or a little farther off.
  const sized = (shift: Shift) => shift === 'left' || shift === 'right'
  const follows = three && s.lrasShift !== 'none' && s.adShift === 'none' && s.srasShift === 'none'
  if (!numeric && e1 && (sized(s.adShift) || sized(s.srasShift) || follows)) {
    const e = intersect(adAfter(), asAfter())
    const off = e ? e.x - yf2 : 0
    if (e && Math.abs(off) > tol && Math.abs(off) < MIN_GAP) {
      // A cost shock moving the three-range curve up or down always moves output, even near full employment.
      const shock = three && sized(s.srasShift) && !sized(s.adShift)
      const x = Math.abs(off) < SNAP && !shock ? yf2 : yf2 + (Math.sign(off) || (s.srasShift === 'left' ? -1 : 1)) * MIN_GAP
      if (sized(s.adShift)) adDx = adTo(x) ?? adDx
      else {
        const d = asTo(x)
        if (d !== null && three) asDy = d
        else if (d !== null) asDx = d
      }
    }
  }
  const ad2 = adAfter()
  const as2 = asAfter()
  const adMoves = Math.abs(adDx) > tol
  const asMoves = Math.abs(asDx) > tol || Math.abs(asDy) > spanY * 0.004
  const lrasMoves = Math.abs(lrasDx) > tol
  const shifted2 = adMoves || asMoves

  const e2 = shifted2 ? intersect(ad2, as2) : e1
  const onGraph = (p: Point | null): p is Point => !!p && p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9
  if (rows.length >= 2 || !numeric) {
    if (!e1) notes.push("AD and aggregate supply don't cross: there is no equilibrium on the graph.")
    else if (!onGraph(e1)) notes.push('AD and aggregate supply cross off the graph. Widen the axes to show the equilibrium.')
    if (shifted2 && e1 && !e2) notes.push("After the shift AD and aggregate supply don't cross.")
    else if (shifted2 && e2 && !onGraph(e2)) notes.push('After the shift the curves cross off the graph. Make the shift smaller or widen the axes.')
  }
  const yfOn = (x: number) => x >= box.x0 && x <= box.x1
  if (numeric && (!yfOn(yf1) || !yfOn(yf2))) notes.push('Potential GDP is off the real GDP axis. Widen the axis to show LRAS.')

  // The output gap: at the final equilibrium if it's off full employment, or else where the economy started.
  const gapAt = (e: Point | null, yf: number) => (onGraph(e) && Math.abs(e.x - yf) > tol ? { y: e.x, yf, e } : null)
  const gap = gapAt(e2, yf2) ?? (shifted2 ? gapAt(e1, yf1) : null)
  const gapKind = gap ? (gap.y < gap.yf ? 'recession' : 'inflation') : null
  // The three-range curve's vertical range stands at full employment, so it has no LRAS line of its own.
  const lrasShown = s.lras && !three
  if (gap && s.brace && !lrasShown && !three) notes.push('LRAS is hidden, so the gap is braced to full-employment output on the axis.')

  // Drawing the curves, cut to the graph (schematic ones short of its edges).
  const drawn = (c: Curve, b = drawBox) => clipPath(c, b).sort((a, b) => b.length - a.length)[0] ?? []
  const lrasName = wordsOf(s, 'lrasLabel')
  // LRAS stops short of the grid's top, with room over it for its name.
  const lrasBox = { ...drawBox, y0: box.y0, y1: shows(lrasName) ? Math.min(drawBox.y1, box.y1 - (lfs * 1.08 - 7) / scale.y) : drawBox.y1 }
  const lras1 = lrasShown && yfOn(yf1) ? drawn(vertical(yf1, -FAR * spanY, FAR * spanY), lrasBox) : []
  const lras2 = lrasShown && lrasMoves && yfOn(yf2) ? drawn(vertical(yf2, -FAR * spanY, FAR * spanY), lrasBox) : []
  // AD stops higher over the schematic axis, so a name at its end has room under it too.
  const adBox = numeric ? drawBox : { ...drawBox, y0: 0.9 }
  const [as1Drawn, as2Drawn, ad1Drawn, ad2Drawn] = [drawn(as1), asMoves ? drawn(as2) : [], drawn(ad1, adBox), adMoves ? drawn(ad2, adBox) : []]
  const curves: CurveSpec[] = []
  const adName = wordsOf(s, 'adLabel')
  const asName = wordsOf(s, 'asLabel')
  // LRAS's names are written over its tops, as points' names (below), rather than by the library at its end.
  if (lras1.length) curves.push({ pts: lras1, color: ink.third })
  if (lras2.length) curves.push({ pts: lras2, color: ink.third })
  const named1 = (c: CurveSpec, w: Words) => (numeric && s.dots ? c : { ...c, name: w })
  curves.push(named1({ pts: as1Drawn, color: ink.supply }, maybe(asName, asMoves ? 1 : 0, s.numberFrom)))
  if (asMoves) curves.push(named1({ pts: as2Drawn, color: ink.supply }, maybe(asName, 2, s.numberFrom)))
  curves.push(named1({ pts: ad1Drawn, color: ink.demand }, maybe(adName, adMoves ? 1 : 0, s.numberFrom)))
  if (adMoves) curves.push(named1({ pts: ad2Drawn, color: ink.demand }, maybe(adName, 2, s.numberFrom)))

  // Equilibrium points, the dots at a numbered graph's rows (left off where
  // one would touch an equilibrium's), and the guides to the axes.
  const ePoints = [e1, ...(shifted2 ? [e2] : [])].filter(onGraph)
  const rowDots = numeric && s.dots
    ? rows.flatMap((r) => [{ x: r.ad, y: r.pl }, { x: r.as, y: r.pl }]).filter((p) => ePoints.every((e) => Math.hypot((p.x - e.x) * scale.x, (p.y - e.y) * scale.y) > 11))
    : []
  // The three-range curve turns vertical at full employment: a guide from there down to Y_f.
  const corners = (three ? [{ x: yf1, y: CORNER }, ...(asMoves ? [{ x: yf1 + asDx, y: CORNER + asDy }] : [])] : [])
    .sort((a, b) => a.y - b.y)
    .filter((c, k, all) => onGraph(c) && all.findIndex((o) => Math.abs(o.x - c.x) <= tol) === k)
  const guideLines = s.guides
    ? [
        ...ePoints.flatMap((e) => [[{ x: box.x0, y: e.y }, e], [e, { x: e.x, y: box.y0 }]]),
        ...corners.map((c) => [c, { x: c.x, y: box.y0 }]),
      ]
    : []

  // Shift arrows, each ending on the graph and crossing no other curve if it can help it.
  const arrows: ArrowSpec[] = []
  const others = (...not: Curve[]) => curves.map((c) => c.pts).filter((c) => !not.includes(c))
  const crossAt = curves.flatMap((c, i) => curves.slice(i + 1).flatMap((k) => crossings(c.pts, k.pts)))
  const at = [...ePoints, ...crossAt, ...rowDots]
  const within = (b: Box, dx: number, dy = 0): Box => ({ x0: Math.max(b.x0, b.x0 - dx), x1: Math.min(b.x1, b.x1 - dx), y0: Math.max(b.y0, b.y0 - dy), y1: Math.min(b.y1, b.y1 - dy) })
  if (adMoves) arrows.push(...arrowsAlong(ad1, { x: adDx, y: 0 }, s.arrows, ink.demand, within(drawBox, adDx), others(ad1Drawn, ad2Drawn), at, scale, guideLines, arrows, [...ePoints, ...rowDots]))
  if (asMoves) arrows.push(...arrowsAlong(as1, { x: asDx, y: asDy }, s.arrows, ink.supply, within(drawBox, asDx, asDy), others(as1Drawn, as2Drawn), at, scale, guideLines, arrows, [...ePoints, ...rowDots]))
  if (lras1.length && lras2.length) {
    // Under the names over LRAS's tops.
    const top = lrasBox.y1 - (shows(lrasName) ? (lfs * 0.6) / scale.y : 0)
    arrows.push(...arrowsAlong(lras1, { x: lrasDx, y: 0 }, s.arrows, ink.third, { ...lrasBox, y0: box.y0 + spanY * 0.06, y1: top }, others(lras1, lras2), at, scale, guideLines, arrows, [...ePoints, ...rowDots]))
  }

  // The equilibria, and the price levels and outputs written at the axes.
  const points: PointSpec[] = []
  const guides: GuideSpec[] = []
  const marks: MarkSpec[] = []
  const eName = wordsOf(s, 'eLabel')
  const plName = wordsOf(s, 'plLabel')
  const gdpName = wordsOf(s, 'gdpLabel')
  const yfName = wordsOf(s, 'yfLabel')
  const yfs = lrasMoves ? [yf1, yf2] : [yf1]
  /** A value written once at an axis, its names joined where two land on the same spot (PL₁ = PL₂). */
  const mark = (axis: 'x' | 'y', at: number, name: Words) => {
    const span = axis === 'x' ? spanX : spanY
    const same = marks.find((m) => m.axis === axis && Math.abs(m.at - at) < span * 1e-4)
    if (!same) marks.push({ axis, at, name })
    else if (same.name.mode === 'text' && name.mode === 'text' && same.name.text !== name.text) same.name = { ...same.name, text: `${same.name.text} = ${name.text}` }
  }
  // Full-employment output where LRAS stands, or the three-range curve turns vertical (or where the gap is braced to).
  const yfMarked = lrasShown || three || (!!gap && s.brace)
  if (yfMarked) {
    yfs.forEach((yf, k) => {
      if (yfOn(yf)) mark('x', yf, maybe(yfName, lrasMoves ? ((k + 1) as 1 | 2) : 0, s.numberFrom))
    })
  }
  // Every line drawn near the points, for their names to keep clear of: the axes, the curves, the arrows and the guides.
  const lines = [
    [{ x: box.x0, y: box.y1 }, { x: box.x0, y: box.y0 }, { x: box.x1, y: box.y0 }],
    ...curves.map((c) => c.pts),
    ...arrows.map((a) => [a.from, a.to]),
    ...guideLines,
  ]
  // Each point's name's box as it's placed, for the next to keep off.
  const nameBoxes: (DrawnBox | undefined)[] = []
  const braced = !!gap && s.brace && yfOn(gap.yf)
  const equilibrium = (e: Point | null, k: 0 | 1 | 2) => {
    if (!onGraph(e)) return
    const name = maybe(eName, k, s.numberFrom)
    points.push({ at: e, name, spots: clearOf(e, name, lines, [...ePoints, ...rowDots], scale, nameBoxes, points.length) })
    if (s.guides) {
      guides.push({ from: e })
      mark('y', e.y, named(plName, k, s.eqStyle, s.numberFrom))
    }
    // Output at full employment is Y_f, already written, unless it's also the output a gap is braced from
    // (LRAS moving away from it): Y_f₁ = Yₑ. Output at the other end of the gap is written there even with
    // no guides, so the brace is named at both ends.
    const atYf = yfs.some((yf) => Math.abs(e.x - yf) < tol) && yfMarked
    const gapEnd = braced && e === gap!.e
    if ((!atYf || (gapEnd && Math.abs(e.x - gap!.yf) > tol)) && (s.guides || gapEnd)) mark('x', e.x, named(gdpName, k, s.eqStyle, s.numberFrom))
  }
  equilibrium(e1, shifted2 ? 1 : 0)
  if (shifted2) equilibrium(e2, 2)
  if (s.guides) for (const c of corners) if (!ePoints.some((e) => Math.hypot(e.x - c.x, e.y - c.y) < tol)) guides.push({ from: c, y: false })

  // LRAS's names over its tops, at one height.
  const topOf = (l: Point[]) => (l.length ? l.reduce((p, z) => (z.y > p.y ? z : p)) : null)
  const tops = [topOf(lras1), topOf(lras2)]
  tops.forEach((top, k) => {
    const name = maybe(lrasName, lrasMoves ? ((k + 1) as 1 | 2) : 0, s.numberFrom)
    if (!top || !shows(name)) return
    const o = tops[1 - k]
    const other = o ? { dx: (o.x - top.x) * scale.x, name: maybe(lrasName, (2 - k) as 1 | 2, s.numberFrom) } : null
    points.push({ at: top, name, dot: false, spots: overTop(name, other) })
  })
  // On a numbered graph with a dot at each row, each curve's name past the dot at its end.
  if (numeric && s.dots) {
    const ends: [Point[], Words][] = [
      [as1Drawn, maybe(asName, asMoves ? 1 : 0, s.numberFrom)], [as2Drawn, maybe(asName, 2, s.numberFrom)], [ad1Drawn, maybe(adName, adMoves ? 1 : 0, s.numberFrom)], [ad2Drawn, maybe(adName, 2, s.numberFrom)],
    ]
    for (const [run, name] of ends) {
      if (run.length < 2 || !shows(name)) continue
      const end = run.at(-1)!
      const runPx = run.map((p) => ({ x: (p.x - end.x) * scale.x, y: -(p.y - end.y) * scale.y }))
      points.push({ at: end, name, dot: false, spots: (q, fs) => pastDot(runPx.map((p) => ({ x: p.x + q.x, y: p.y + q.y })))(q, fs) })
    }
  }

  // The gap braced under the axis, from output to full employment.
  const braces: BraceSpec[] = []
  if (braced) {
    braces.push({
      from: { x: Math.min(gap.y, gap.yf), y: box.y0 },
      to: { x: Math.max(gap.y, gap.yf), y: box.y0 },
      side: 'below',
      under: true,
      name: wordsOf(s, gapKind === 'recession' ? 'recessionLabel' : 'inflationLabel'),
    })
  }

  // A callout at where the economy ends up: the words typed, or its price level and real GDP, in the open between the lines.
  const eF = shifted2 ? e2 : e1
  const callouts: CalloutSpec[] = []
  const calloutText = calloutOf(s, eF, yf2, tol)
  if (s.callout && onGraph(eF)) callouts.push({ at: eF, name: calloutText, spots: calloutSpots(eF, calloutText, lines.slice(0, lines.length - guideLines.length), guideLines, [...ePoints, ...rowDots], scale, box, nameBoxes) })

  const spec: PanelSpec = {
    ...panelBase(s),
    axes,
    curves,
    points,
    marks,
    guides,
    arrows,
    braces,
    callouts,
  }
  for (const p of rowDots) spec.points!.push({ at: p })

  return {
    figure: buildFigure([spec]),
    e1,
    /** where the economy ends up after any shift */
    equilibrium: eF,
    /** full-employment output, before and after LRAS shifts */
    yf: { before: yf1, after: yf2 },
    gap: gap ? { kind: gapKind!, output: gap.y, potential: gap.yf } : null,
    /** what the callout says */
    callout: calloutText,
    problems,
    notes,
    readout: readoutOf({ e1, e2, shifted: shifted2, numeric, gap, gapKind, yf1, yf2, lrasMoves }),
    // The three-range curve moving with LRAS isn't a shift of its own.
    label: labelOf(s, { adDx, asDx: three ? (s.srasShift === 'none' ? 0 : -asDy) : asDx, lrasDx, gapKind }),
  }
}

export type AdAsFigure = ReturnType<typeof buildAdAs>

/** The callout's words: as typed (or a blank line), or the equilibrium's price level and real GDP, or what kind of equilibrium it is. */
function calloutOf(s: AdAsSettings, e: Point | null, yf: number, tol: number): Words {
  const typed = wordsOf(s, 'calloutLabel')
  if (typed.mode !== 'text' || typed.text.trim()) return typed
  if (!e) return typed
  if (s.look === 'numeric') return { text: `price level = ${fmt(e.y)}, real GDP = ${fmt(e.x)}`, mode: 'text' }
  return { text: Math.abs(e.x - yf) < tol ? 'Long-run equilibrium' : 'Short-run equilibrium', mode: 'text' }
}

/** A numbered graph's values, for the settings panel: the equilibrium, what changes it, and the gap braced. */
function readoutOf(r: {
  e1: Point | null; e2: Point | null; shifted: boolean; numeric: boolean; gap: { y: number; yf: number } | null; gapKind: string | null
  yf1: number; yf2: number; lrasMoves: boolean
}) {
  const out: string[] = []
  if (!r.numeric) return out
  if (r.e1) out.push(`Equilibrium: price level ${fmt(r.e1.y)}, real GDP ${fmt(r.e1.x)}`)
  if (r.shifted && r.e2) out.push(`After the shift: price level ${fmt(r.e2.y)}, real GDP ${fmt(r.e2.x)}`)
  if (r.lrasMoves) out.push(`Potential GDP: ${fmt(r.yf1)} to ${fmt(r.yf2)}`)
  if (r.gap) {
    const name = r.gapKind === 'recession' ? 'Recessionary gap' : 'Inflationary gap'
    // The difference of the two values as written, so the line adds up.
    out.push(`${name} of ${fmt(Math.abs(rounded(r.gap.yf) - rounded(r.gap.y)))}: real GDP ${fmt(r.gap.y)}, potential ${fmt(r.gap.yf)}`)
  }
  return out
}

/** The figure in words, for screen readers. */
function labelOf(s: AdAsSettings, r: { adDx: number; asDx: number; lrasDx: number; gapKind: string | null }) {
  if (s.titleMode === 'text' && s.title.trim()) return plainOf(s.title.trim())
  const parts: string[] = []
  const way = (dx: number) => (dx > 0 ? 'increases' : 'decreases')
  if (r.adDx) parts.push(`aggregate demand ${way(r.adDx)}${s.adShift === 'full' ? ' to full employment' : ''}`)
  if (r.asDx) parts.push(`short-run aggregate supply ${way(r.asDx)}${s.srasShift === 'full' ? ' to full employment' : ''}`)
  if (r.lrasDx) parts.push(`long-run aggregate supply ${way(r.lrasDx)}`)
  if (r.gapKind) parts.push(`${r.gapKind === 'recession' ? 'a recessionary' : 'an inflationary'} gap`)
  if (!parts.length) parts.push('long-run equilibrium at full employment')
  const what = s.look !== 'numeric' && s.asShape === 'three' ? 'AD–AS graph with a three-range aggregate supply curve' : 'AD–AS graph'
  return `${what}: ${parts.join(', ')}`
}
