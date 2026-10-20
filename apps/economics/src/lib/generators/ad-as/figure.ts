// Works out an AD–AS graph from its settings, as a panel for the econ graph
// library to lay out: aggregate demand, short-run aggregate supply (a
// straight line, or flat, curving up, then nearly vertical) and the
// vertical long-run aggregate supply at full-employment output, where the
// economy starts (at full employment, or with a recessionary or inflationary
// gap), shifts of each curve and where the economy ends up, the output gap
// braced under the axis, a callout giving the equilibrium, and every label.

import { clipPath, type Point } from '$shared/graph/grid'
import { plainOf } from '$shared/graph/runs'
import { along, crossings, intersect, lineThrough, vertical, xAt, yAt, type Box, type Curve } from '$lib/graph/curves'
import { buildFigure } from '$lib/graph/figure'
import { niceAxis, rangesOf } from '$lib/graph/fit'
import { inks, type ArrowSpec, type BraceSpec, type CalloutSpec, type CurveSpec, type GuideSpec, type MarkSpec, type PanelSpec, type PointSpec, type Words } from '$lib/graph/panel'
import { SCHEMATIC, panelBase, wordsOf } from '$lib/graph/settings'
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

/**
 * The three-range aggregate supply curve on a schematic graph: flat at a low
 * price level (the Keynesian range), bending up (the intermediate range) to
 * nearly vertical just past full employment `yf` (the classical range). It
 * crosses `yf` about halfway up.
 */
export function threeRange(yf: number): Curve {
  const P0 = 2 // the flat range's price level
  const TOP = 9.6 // where the bend has turned vertical
  const x0 = yf - 3.2 // where the bend starts
  const xv = yf + 0.8 // where it's vertical
  const n = 2.8 // squarer than a quarter ellipse, so each range reads as its own
  const out: Curve = [{ x: -FAR, y: P0 }]
  const N = 120
  for (let k = 0; k <= N; k++) {
    const t = ((Math.PI / 2) * k) / N
    out.push({ x: x0 + (xv - x0) * Math.pow(Math.sin(t), 2 / n), y: TOP - (TOP - P0) * Math.pow(Math.cos(t), 2 / n) })
  }
  out.push({ x: xv, y: FAR })
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

/** A label's words with a number lowered after it: Y_f becomes Y_{f1}, AD becomes AD_1. */
function numbered(w: Words, k: 1 | 2): Words {
  if (w.mode !== 'text' || !w.text.trim()) return w
  const t = w.text.trim()
  const braced = t.match(/^(.*)_\{([^}]*)\}$/)
  if (braced) return { ...w, text: `${braced[1]}_{${braced[2]}${k}}` }
  const one = t.match(/^(.*)_(.)$/u)
  if (one) return { ...w, text: `${one[1]}_{${one[2]}${k}}` }
  return { ...w, text: `${t}_${k}` }
}
/** A value's name before and after a change (PL₁, PL₂), or at the one equilibrium (PLₑ or PL*). */
function named(w: Words, k: 0 | 1 | 2, style: AdAsSettings['eqStyle']): Words {
  if (w.mode !== 'text' || !w.text.trim()) return w
  if (k) return numbered(w, k)
  return { ...w, text: style === 'star' ? `${w.text.trim()}*` : `${w.text.trim()}_e` }
}
/** A curve's or point's name, numbered only when there's a before and an after. */
const maybe = (w: Words, k: 0 | 1 | 2): Words => (k ? numbered(w, k) : w)

/** A number as written in a callout or the readout: 8,800 and 90. */
export const fmt = (v: number) => Number(v.toPrecision(4)).toLocaleString('en-US', { maximumFractionDigits: 6 })

/** Where shift arrows go along a curve, best first by how many arrows there are (as $lib/graph/shifts spreads them). */
const ARROWS_AT: Record<number, number[]> = { 1: [0.2], 2: [0.15, 0.85], 3: [0.12, 0.5, 0.88] }

/**
 * `count` arrows from curve `c` to where it shifts, `dx` across, from the
 * part of it in `b`: spread along it, each kept off the `avoid` curves and
 * clear of the `at` points where curves cross.
 */
function arrowsAlong(c: Curve, dx: number, count: number, color: string, b: Box, avoid: Curve[], at: Point[]): ArrowSpec[] {
  const run = clipPath(c, b).sort((p, q) => q.length - p.length)[0]
  const n = Math.max(0, Math.min(3, Math.round(count)))
  if (!run || run.length < 2 || !dx || !n) return []
  const near = Math.abs(dx) * 0.35
  const options: { t: number; from: Point; to: Point; cost: number }[] = []
  for (let t = 0.06; t <= 0.945; t += 0.02) {
    const from = along(run, t).at
    const to = { x: from.x + dx, y: from.y }
    let cost = 0
    for (const a of avoid) cost += crossings([from, to], a).length * 10
    for (const p of at) {
      // How close the arrow comes to a point.
      const u = Math.max(0, Math.min(1, (p.x - from.x) / dx))
      const d = Math.hypot(from.x + u * dx - p.x, from.y - p.y)
      if (d < near) cost += (near - d) * 20
    }
    options.push({ t, from, to, cost })
  }
  const picked: typeof options = []
  for (const ideal of ARROWS_AT[n]) {
    const free = options.filter((o) => picked.every((p) => Math.abs(p.t - o.t) > 0.22))
    const best = free.sort((a, z) => a.cost + Math.abs(a.t - ideal) * 3 - (z.cost + Math.abs(z.t - ideal) * 3))[0]
    if (best) picked.push(best)
  }
  return picked.sort((a, z) => a.t - z.t).map((o) => ({ from: o.from, to: o.to, color }))
}

export function buildAdAs(s: AdAsSettings) {
  const numeric = s.look === 'numeric'
  const ink = inks(s.ink === 'bw')
  const { problems, ...axes } = axesOf(s)
  const box: Box = { x0: axes.x.start, x1: axisEnd(axes.x), y0: axes.y.start, y1: axisEnd(axes.y) }
  const spanX = box.x1 - box.x0
  const spanY = box.y1 - box.y0
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
      // AD crosses aggregate supply at full employment, short of it, or (where the curve is all but vertical) a little past it.
      const y1 = yf1 + (s.start === 'recession' ? -g : s.start === 'inflation' ? g / 3 : 0)
      const e = { x: y1, y: yAt(as1, y1) ?? 5 }
      ad1 = lineThrough(e, { x: e.x + 1, y: e.y - SLOPE }, far)
    } else {
      // AD and SRAS cross in the middle; full employment is there, or to its right (a recessionary gap) or left (an inflationary one).
      yf1 = 5 + (s.start === 'recession' ? g : s.start === 'inflation' ? -g : 0)
      as1 = lineThrough({ x: 5, y: 5 }, { x: 6, y: 5 + SLOPE }, far)
      ad1 = lineThrough({ x: 5, y: 5 }, { x: 6, y: 5 - SLOPE }, far)
    }
  }

  // Shifts: across by a share of the real GDP axis, or as far as it takes to bring output to full employment.
  const sizeOf = (shift: Shift | 'none', size: ShiftSize) => (shift === 'left' ? -1 : shift === 'right' ? 1 : 0) * SHIFT_SHARE[size] * spanX
  const lrasDx = sizeOf(s.lrasShift, s.lrasSize)
  const yf2 = yf1 + lrasDx
  let adDx = sizeOf(s.adShift, s.adSize)
  let asDx = sizeOf(s.srasShift, s.srasSize)
  const cannot = (what: string) => notes.push(`${what} can't shift far enough to bring output to full employment on this graph.`)
  if (s.adShift === 'full') {
    // AD moves to cross aggregate supply (shifted by its own size, if it shifts) at full employment.
    const y = yAt(as1.map((p) => ({ x: p.x + asDx, y: p.y })), yf2)
    const x = y === null ? null : xAt(ad1, y)
    if (x === null) cannot('AD')
    else adDx = yf2 - x
  }
  if (s.srasShift === 'full' && s.adShift !== 'full') {
    const y = yAt(ad1.map((p) => ({ x: p.x + adDx, y: p.y })), yf2)
    const x = y === null ? null : xAt(as1, y)
    if (x === null) cannot('SRAS')
    else asDx = yf2 - x
  }
  const ad2 = ad1.map((p) => ({ x: p.x + adDx, y: p.y }))
  const as2 = as1.map((p) => ({ x: p.x + asDx, y: p.y }))
  const adMoves = Math.abs(adDx) > tol
  const asMoves = Math.abs(asDx) > tol
  const lrasMoves = Math.abs(lrasDx) > tol
  const shifted = adMoves || asMoves

  const e1 = intersect(ad1, as1)
  const e2 = shifted ? intersect(ad2, as2) : e1
  const onGraph = (p: Point | null): p is Point => !!p && p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9
  if (rows.length >= 2 || !numeric) {
    if (!e1) notes.push("AD and aggregate supply don't cross: there is no equilibrium on the graph.")
    else if (!onGraph(e1)) notes.push('AD and aggregate supply cross off the graph. Widen the axes to show the equilibrium.')
    if (shifted && e1 && !e2) notes.push("After the shift AD and aggregate supply don't cross.")
    else if (shifted && e2 && !onGraph(e2)) notes.push('After the shift the curves cross off the graph. Make the shift smaller or widen the axes.')
  }
  const yfOn = (x: number) => x >= box.x0 && x <= box.x1
  if (numeric && (!yfOn(yf1) || !yfOn(yf2))) notes.push('Potential GDP is off the real GDP axis. Widen the axis to show LRAS.')

  // The output gap: at the final equilibrium if it's off full employment, or else where the economy started.
  const gapAt = (e: Point | null, yf: number) => (onGraph(e) && Math.abs(e.x - yf) > tol ? { y: e.x, yf, e } : null)
  const gap = gapAt(e2, yf2) ?? (shifted ? gapAt(e1, yf1) : null)
  const gapKind = gap ? (gap.y < gap.yf ? 'recession' : 'inflation') : null
  if (gap && s.brace && !s.lras) notes.push('LRAS is hidden, so the gap is braced to full-employment output on the axis.')

  // Drawing the curves, cut to the graph (schematic ones short of its edges).
  const drawn = (c: Curve, b = drawBox) => clipPath(c, b).sort((a, b) => b.length - a.length)[0] ?? []
  const lrasBox = { ...drawBox, y0: box.y0 }
  const lras1 = s.lras && yfOn(yf1) ? drawn(vertical(yf1, -FAR * spanY, FAR * spanY), lrasBox) : []
  const lras2 = s.lras && lrasMoves && yfOn(yf2) ? drawn(vertical(yf2, -FAR * spanY, FAR * spanY), lrasBox) : []
  const [as1Drawn, as2Drawn, ad1Drawn, ad2Drawn] = [drawn(as1), asMoves ? drawn(as2) : [], drawn(ad1), adMoves ? drawn(ad2) : []]
  const curves: CurveSpec[] = []
  const lrasName = wordsOf(s, 'lrasLabel')
  const adName = wordsOf(s, 'adLabel')
  const asName = wordsOf(s, 'asLabel')
  if (lras1.length) curves.push({ pts: lras1, name: maybe(lrasName, lrasMoves ? 1 : 0), color: ink.third })
  if (lras2.length) curves.push({ pts: lras2, name: maybe(lrasName, 2), color: ink.third })
  curves.push({ pts: as1Drawn, name: maybe(asName, asMoves ? 1 : 0), color: ink.supply })
  if (asMoves) curves.push({ pts: as2Drawn, name: maybe(asName, 2), color: ink.supply })
  curves.push({ pts: ad1Drawn, name: maybe(adName, adMoves ? 1 : 0), color: ink.demand })
  if (adMoves) curves.push({ pts: ad2Drawn, name: maybe(adName, 2), color: ink.demand })

  // Shift arrows, each ending on the graph and crossing no other curve if it can help it.
  const arrows: ArrowSpec[] = []
  const others = (...not: Curve[]) => curves.map((c) => c.pts).filter((c) => !not.includes(c))
  const at = [e1, e2].filter(onGraph)
  const within = (b: Box, dx: number): Box => ({ ...b, x0: Math.max(b.x0, b.x0 - dx), x1: Math.min(b.x1, b.x1 - dx) })
  if (adMoves) arrows.push(...arrowsAlong(ad1, adDx, s.arrows, ink.demand, within(drawBox, adDx), others(ad1Drawn, ad2Drawn), at))
  if (asMoves) arrows.push(...arrowsAlong(as1, asDx, s.arrows, ink.supply, within(drawBox, asDx), others(as1Drawn, as2Drawn), at))
  if (lras1.length && lras2.length) arrows.push(...arrowsAlong(lras1, lrasDx, s.arrows, ink.third, { ...lrasBox, y0: box.y0 + spanY * 0.06 }, others(lras1, lras2), at))

  // Equilibrium points, their guides to the axes, and the price levels and outputs written there.
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
  // Full-employment output where LRAS stands (or where the gap is braced to).
  if (s.lras || (gap && s.brace)) {
    yfs.forEach((yf, k) => {
      if (yfOn(yf)) mark('x', yf, maybe(yfName, lrasMoves ? ((k + 1) as 1 | 2) : 0))
    })
  }
  const equilibrium = (e: Point | null, k: 0 | 1 | 2) => {
    if (!onGraph(e)) return
    points.push({ at: e, name: maybe(eName, k) })
    if (!s.guides) return
    guides.push({ from: e })
    mark('y', e.y, named(plName, k, s.eqStyle))
    // Output at full employment is Y_f, already written.
    const atYf = yfs.some((yf) => Math.abs(e.x - yf) < tol) && (s.lras || (gap && s.brace))
    if (!atYf) mark('x', e.x, named(gdpName, k, s.eqStyle))
  }
  equilibrium(e1, shifted ? 1 : 0)
  if (shifted) equilibrium(e2, 2)

  // The gap braced under the axis, from output to full employment.
  const braces: BraceSpec[] = []
  if (gap && s.brace && yfOn(gap.yf)) {
    braces.push({
      from: { x: Math.min(gap.y, gap.yf), y: box.y0 },
      to: { x: Math.max(gap.y, gap.yf), y: box.y0 },
      side: 'below',
      under: true,
      name: wordsOf(s, gapKind === 'recession' ? 'recessionLabel' : 'inflationLabel'),
    })
  }

  // A callout at where the economy ends up: the words typed, or its price level and real GDP.
  const eF = shifted ? e2 : e1
  const callouts: CalloutSpec[] = []
  const calloutText = calloutOf(s, eF, yf2, tol)
  if (s.callout && onGraph(eF)) callouts.push({ at: eF, name: calloutText })

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
  // On a numbered graph, a dot at each row of the schedule.
  if (numeric && s.dots) {
    for (const r of rows) spec.points!.push({ at: { x: r.ad, y: r.pl } }, { at: { x: r.as, y: r.pl } })
  }

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
    readout: readoutOf({ e1, e2, shifted, numeric, gap, gapKind, yf1, yf2, lrasMoves, closed: !!gap && shifted && gap.e === e1 }),
    label: labelOf(s, { adDx, asDx, lrasDx, gapKind }),
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

/** What the graph shows, in words, for the settings panel. */
function readoutOf(r: {
  e1: Point | null; e2: Point | null; shifted: boolean; numeric: boolean; gap: { y: number; yf: number } | null; gapKind: string | null
  yf1: number; yf2: number; lrasMoves: boolean
  /** the gap braced is where the economy started, closed by the shift */
  closed: boolean
}) {
  const out: string[] = []
  const way = (a: number, b: number, up: string, down: string) => (Math.abs(a - b) < 1e-6 * (Math.abs(a) + 1) ? 'stays the same' : b > a ? up : down)
  if (r.numeric && r.e1) out.push(`Equilibrium: price level ${fmt(r.e1.y)}, real GDP ${fmt(r.e1.x)}`)
  if (r.shifted && r.e1 && r.e2) {
    out.push(
      `Price level ${way(r.e1.y, r.e2.y, 'rises', 'falls')}${r.numeric ? ` (${fmt(r.e1.y)} to ${fmt(r.e2.y)})` : ''}; ` +
        `real GDP ${way(r.e1.x, r.e2.x, 'rises', 'falls')}${r.numeric ? ` (${fmt(r.e1.x)} to ${fmt(r.e2.x)})` : ''}`,
    )
  }
  if (r.lrasMoves) out.push(`Full-employment output ${r.yf2 > r.yf1 ? 'grows' : 'shrinks'}${r.numeric ? ` (${fmt(r.yf1)} to ${fmt(r.yf2)})` : ''}`)
  if (r.gap) {
    const name = r.gapKind === 'recession' ? 'Recessionary gap' : 'Inflationary gap'
    const size = r.numeric ? ` of ${fmt(Math.abs(r.gap.yf - r.gap.y))}` : ''
    if (r.closed) out.push(`${name}${size} closed: output back to full employment`)
    else out.push(r.numeric ? `${name}${size}: real GDP ${fmt(r.gap.y)}, potential ${fmt(r.gap.yf)}` : `${name}: output ${r.gapKind === 'recession' ? 'below' : 'above'} full employment`)
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
  const what = s.look !== 'numeric' && s.asShape === 'three' ? 'AD–AS graph with a three-range aggregate supply curve' : 'AD–AS graph'
  return `${what}${parts.length ? `: ${parts.join(', ')}` : ''}`
}
