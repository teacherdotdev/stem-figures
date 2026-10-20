// Lays out one economics graph (a panel) for Panel.svelte to draw, from
// what's on it in the graph's own units: curves and their names, shaded
// regions, points, values written at the axes (P₁, Q₁) with dashed guides
// to them, shift arrows, braces (a shortage, a recessionary gap) and
// callouts with leader arrows. Every label goes where it touches no line
// and no other label ($shared/graph/labels), and any label can be a blank
// line for students instead.
//
// The look is schematic (plain axes with words at their ends and no
// numbers, as AP graphs are drawn) or numeric (numbered axes, gridlines if
// wanted). Either way the axes come from $shared/graph's layoutGrid, with
// the axis words and chart title placed here.

import { spread, rowsUnder, guidesFrom } from '$shared/graph/axisMarks'
import type { Axes } from '$shared/graph/axes'
import type { Cap } from '$shared/graph/caps'
import { COLORS } from '$shared/graph/colors'
import { layoutGrid, pathOf, round, clipPath, type Point } from '$shared/graph/grid'
import { alongCurve, besidePoint, crosses, placer, textBox, textWidth, type Anchor, type Box, type Segment, type Spot } from '$shared/graph/labels'
import { runsOf, runsWidth, type Run } from '$shared/graph/runs'
import type { LabelSize } from '$shared/labelSize'
import { centroidOf } from './curves'

export type Mode = 'text' | 'blank' | 'none'
/** A label: its words (S_1 lowers the 1), or a blank line for students, or nothing. */
export type Words = { text: string; mode: Mode }

export const words = (text: string, mode: Mode = 'text'): Words => ({ text, mode })
/** Whether a label is drawn at all. */
export const shows = (w: Words | undefined): w is Words => !!w && (w.mode === 'blank' || (w.mode === 'text' && !!w.text.trim()))

export type CurveSpec = {
  pts: Point[]
  name?: Words
  color: string
  dash?: string
  width?: number
  /** which end of the curve its name goes by: its last point unless 'start' */
  nameAt?: 'start' | 'end'
}
export type RegionSpec = { poly: Point[]; color: string; hatch: number; name?: Words }
/** A point, its name beside it (or, with `side`, over or under it, as a peak's and a trough's are). */
export type PointSpec = { at: Point; name?: Words; dot?: boolean; side?: 'above' | 'below' }
export type MarkSpec = { axis: 'x' | 'y'; at: number; name: Words }
export type GuideSpec = { from: Point; x?: boolean; y?: boolean }
export type ArrowSpec = { from: Point; to: Point; color: string }
export type BraceSpec = { from: Point; to: Point; side: 'below' | 'above' | 'left' | 'right'; name?: Words }
/**
 * Words with an arrow to a point. `toward` (in the graph's units, up
 * positive) is the way from the point the words would best sit; `or` are
 * other points the arrow could go to instead, tried in turn when the first
 * leaves the words no clean place.
 */
export type CalloutSpec = { at: Point; name: Words; toward?: Point; or?: { at: Point; toward?: Point }[] }
/** A line across the graph, like a price ceiling, drawn as a curve is but thinner. */
export type LevelSpec = { pts: Point[]; name?: Words; color: string; dash?: string }

export type PanelSpec = {
  axes: Axes
  /** numbered every so many lines on each axis (0 for none: schematic) */
  every: { x: number; y: number }
  gridlines: boolean
  minor: number
  ends: { x: Cap; y: Cap }
  /** the axes cross at 0 when it's on the grid, rather than along its edges */
  cross?: boolean
  /** written after every number on each axis, like % */
  units?: { x?: string; y?: string }
  axisWords: { x: Words; y: Words }
  title?: Words
  /** a line under the panel, like a country's name */
  caption?: Words
  labelSize: LabelSize
  /** filled in color, or hatched for black and white */
  bw: boolean
  regions?: RegionSpec[]
  levels?: LevelSpec[]
  curves?: CurveSpec[]
  points?: PointSpec[]
  marks?: MarkSpec[]
  guides?: GuideSpec[]
  arrows?: ArrowSpec[]
  braces?: BraceSpec[]
  callouts?: CalloutSpec[]
}

/** A label on the figure: written text in runs, or a write-on line for students. */
export type Label = { x: number; y: number; anchor: Anchor; runs?: Run[]; blank?: Segment; big?: boolean }

const PAD = 14
const INSET = 2 // how far inside the label area labels stay
const DOT_R = 4.5
const BLANK_W = 46 // a write-on line for a label left blank
const SIDE_BLANK_W = 36 // the same, at an axis
const ARROW_GAP = 5 // how far shift arrows stop short of the curves
const BRACE_DEPTH = 7
const BRACE_GAP = 6 // between a brace and the line it's under or over
const ROOM_RIGHT = 56 // past the grid, for curve names at their ends
const ROOM_TOP = 18 // over the grid, for names at the tops of curves
const EXT = 20 // how far an arrowed axis runs past the grid (as $shared/graph's)
/** How far apart rows of labels under the x-axis are. */
const X_ROW = (fs: number) => fs * 1.35

/** One panel laid out, in its own drawing units, from (0, 0). */
export function buildPanel(spec: PanelSpec) {
  const numbered = spec.every.x > 0 || spec.every.y > 0
  const { px: gridPx, box, ...base } = layoutGrid(
    {
      xEvery: spec.every.x, yEvery: spec.every.y,
      title: '', titleMode: 'none', xTitle: '', xTitleMode: 'none', yTitle: '', yTitleMode: 'none',
      xLabel: '', xLabelMode: 'none', yLabel: '', yLabelMode: 'none',
      xStartCap: 'none', xEndCap: spec.ends.x, yStartCap: 'none', yEndCap: spec.ends.y,
      minor: spec.gridlines ? spec.minor : 0, labelSize: spec.labelSize,
    },
    spec.axes,
    { edges: !spec.cross },
  )
  const fs = base.fs
  const LFS = fs * 1.1
  const text = (w: Words) => (w.mode === 'text' ? w.text.trim() : '')
  const widthOf = (w: Words, blankW = BLANK_W) => (w.mode === 'blank' ? blankW : runsWidth(runsOf(text(w), LFS), LFS) * 1.04 + 2)

  // Room around the grid: on the left for the values at the y-axis (past its
  // numbers, if any) and on top for the chart title and the y-axis's word.
  const marks = (spec.marks ?? []).filter((m) => shows(m.name))
  const yMarksW = Math.max(0, ...marks.filter((m) => m.axis === 'y').map((m) => widthOf(m.name, SIDE_BLANK_W)))
  // Numbers with units after them (5%) are wider at the y-axis.
  const yUnits = spec.every.y && spec.units?.y ? spec.units.y : ''
  const xUnits = spec.every.x && spec.units?.x ? spec.units.x : ''
  const numbersW = base.grid.x - PAD + (yUnits ? textWidth(yUnits, fs) : 0)
  // An x-axis crossing inside the grid (inflation below 0) has its numbers under it, on the grid.
  const xInside = base.xAxis.y < base.grid.y + base.grid.h - 0.5
  const numbersH = xInside ? (spec.every.x ? fs + 8 : 0) : base.height - base.grid.y - base.grid.h - PAD
  const title = spec.title && shows(spec.title) ? spec.title : undefined
  const yWord = shows(spec.axisWords.y) ? spec.axisWords.y : undefined
  const xWord = shows(spec.axisWords.x) ? spec.axisWords.x : undefined
  const titleH = title ? fs * 1.5 + 12 : 0
  const yWordH = yWord ? LFS + 10 : 0
  const left = Math.max(PAD + (yMarksW ? yMarksW + 8 : 0) + numbersW, yWord ? PAD + widthOf(yWord) / 2 : 0)
  const dx = left - base.grid.x
  const top = PAD + titleH + Math.max(ROOM_TOP, yWordH + (spec.ends.y === 'none' ? 0 : EXT) + (spec.every.y ? fs * 0.7 : 0))
  const dy = top - base.grid.y
  const area = { x: base.grid.x + dx, y: base.grid.y + dy, w: base.grid.w, h: base.grid.h }
  const px = (p: Point): Point => {
    const q = gridPx(p)
    return { x: round(q.x + dx), y: round(q.y + dy) }
  }
  const axisX = base.yAxis.x + dx
  const axisY = base.xAxis.y + dy
  const xEnd = base.xAxis.x2 + dx
  const yTop = base.yAxis.y2 + dy

  // A short x-axis word goes past the arrow; a long one under the axis's end.
  const xWordW = xWord ? widthOf(xWord) : 0
  const xWordBeside = !!xWord && xWord.mode === 'text' && xWordW <= 28
  const right = Math.max(ROOM_RIGHT, xWordBeside ? xEnd - (area.x + area.w) + xWordW + 10 : 0)

  const gridBottom = area.y + area.h
  const bounds: Box = { x0: area.x - (numbered ? 0 : 4) + INSET, y0: area.y - ROOM_TOP + INSET, x1: area.x + area.w + right - INSET, y1: (xInside ? gridBottom : axisY) - INSET }
  const place = placer(bounds)
  const labels: Label[] = []
  /** Every label's box on the graph so far, for callouts' leaders to keep out of. */
  const taken: Box[] = []
  /** How many labels found no place clear of every line and label. */
  let crowded = 0
  const put = (spots: Spot[], w: Words) => {
    const width = widthOf(w)
    const spot = place.choose(spots.map((sp) => ({ ...sp, box: textBox(sp, width, LFS) })))
    labels.push(labelAt(spot, w, spot.box))
    taken.push(spot.box)
    if (spot.score >= 10) crowded++
    return spot
  }
  const labelAt = (spot: Spot, w: Words, b: Box): Label =>
    w.mode === 'text'
      ? { x: spot.x, y: spot.y, anchor: spot.anchor, runs: runsOf(text(w), LFS) }
      : { x: spot.x, y: spot.y, anchor: spot.anchor, blank: { x1: b.x0, y1: spot.y, x2: b.x1, y2: spot.y } }

  // Keep labels off the axes too.
  place.line([{ x: axisX, y: axisY }, { x: xEnd, y: axisY }])
  place.line([{ x: axisX, y: axisY }, { x: axisX, y: yTop }])
  // And off the y-axis's word over its top, which a long one runs out over the graph from.
  let yWordSpot: (Spot & { box: Box }) | undefined
  if (yWord) {
    const y = yTop - 8 - (spec.every.y && spec.ends.y === 'none' ? fs * 0.7 : 0)
    const w = widthOf(yWord)
    const spot: Spot = w <= 28 ? { x: axisX, y, anchor: 'middle' } : { x: Math.max(PAD + w / 2, axisX), y, anchor: 'middle' }
    yWordSpot = { ...spot, box: textBox(spot, w, LFS) }
    place.box(yWordSpot.box)
  }

  const gbox = { x0: box.x0, x1: box.x1, y0: box.y0, y1: box.y1 }
  const runsIn = (pts: Point[]) => clipPath(pts, gbox).map((run) => run.map(px))

  // Shaded regions, under everything.
  const regions = (spec.regions ?? []).map((r) => {
    const poly = r.poly.map(px)
    return { d: pathOf(poly) + 'Z', color: r.color, hatch: spec.bw ? r.hatch : null, centroid: centroidOf(poly), poly, name: r.name }
  })

  // Lines across (price controls), curves, and the dashed guides to the axes.
  const levels = (spec.levels ?? []).map((l) => {
    const paths = runsIn(l.pts)
    for (const run of paths) place.line(run)
    return { paths: paths.map(pathOf), color: l.color, dash: l.dash, ends: paths, name: l.name }
  })
  // Every line drawn, for callouts' leaders to keep from crossing.
  const drawn: Segment[] = []
  const drawnLine = (run: Point[]) => {
    for (let k = 1; k < run.length; k++) drawn.push({ x1: run[k - 1].x, y1: run[k - 1].y, x2: run[k].x, y2: run[k].y })
  }
  for (const l of levels) for (const run of l.ends) drawnLine(run)
  const curves = (spec.curves ?? []).map((c) => {
    const paths = runsIn(c.pts)
    for (const run of paths) {
      place.line(run)
      drawnLine(run)
    }
    return { paths: paths.map(pathOf), color: c.color, dash: c.dash, width: c.width ?? 3, ends: paths, name: c.name, nameAt: c.nameAt ?? 'end' }
  })
  const guides: Segment[] = []
  for (const g of spec.guides ?? []) {
    for (const l of guidesFrom(px(g.from), axisX, axisY, { x: g.x, y: g.y })) {
      guides.push(l)
      place.line([{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }])
    }
  }

  // Shift arrows, stopped short of both curves.
  const arrows = (spec.arrows ?? []).map((a) => {
    const p = px(a.from)
    const q = px(a.to)
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
    const ux = (q.x - p.x) / len
    const uy = (q.y - p.y) / len
    const gap = Math.min(ARROW_GAP, len / 4)
    const seg = { x1: round(p.x + ux * gap), y1: round(p.y + uy * gap), x2: round(q.x - ux * gap), y2: round(q.y - uy * gap) }
    place.line([{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }])
    return { ...seg, color: a.color }
  })

  // Braces, their labels just past their middles.
  const braces = (spec.braces ?? []).map((b) => {
    const off = { below: { x: 0, y: BRACE_GAP }, above: { x: 0, y: -BRACE_GAP }, left: { x: -BRACE_GAP, y: 0 }, right: { x: BRACE_GAP, y: 0 } }[b.side]
    const at = (p: Point) => {
      const q = px(p)
      return { x: q.x + off.x, y: q.y + off.y }
    }
    const brace = braceOf(at(b.from), at(b.to), b.side, BRACE_DEPTH)
    place.line(brace.outline)
    return { d: brace.d, tip: brace.tip, side: b.side, name: b.name }
  })

  const dots: Point[] = []
  for (const p of spec.points ?? []) {
    if (p.dot === false) continue
    const q = px(p.at)
    dots.push(q)
    place.box({ x0: q.x - DOT_R, y0: q.y - DOT_R, x1: q.x + DOT_R, y1: q.y + DOT_R })
  }

  // The values at the axes, where numbers would be: at the y-axis moved
  // apart along it, under the x-axis on rows.
  const sideLabels: Label[] = []
  const sideLabel = (x: number, y: number, anchor: Anchor, w: Words) => {
    if (w.mode === 'text') sideLabels.push({ x, y, anchor, runs: runsOf(text(w), LFS) })
    else {
      const x0 = anchor === 'end' ? x - SIDE_BLANK_W : x - SIDE_BLANK_W / 2
      sideLabels.push({ x, y, anchor, blank: { x1: x0, y1: y, x2: x0 + SIDE_BLANK_W, y2: y } })
    }
  }
  const ys = spread(
    marks.filter((m) => m.axis === 'y').map((m) => ({ ...m, at: px({ x: box.x0, y: m.at }).y, half: LFS * 0.6 })),
    2,
  )
  for (const m of ys) sideLabel(axisX - numbersW - 7, m.at + LFS * 0.35, 'end', m.name)
  const xMarks = rowsUnder(marks.filter((m) => m.axis === 'x').map((m) => ({ ...m, x: px({ x: m.at, y: box.y0 }).x, half: widthOf(m.name, SIDE_BLANK_W) / 2 })))
  // Under an x-axis crossing the grid, they go under the grid, clear of the lines running on down to its bottom.
  const marksFrom = xInside ? Math.max(gridBottom, axisY + numbersH) : axisY + numbersH
  for (const m of xMarks.placed) sideLabel(m.x, marksFrom + LFS + 5 + m.row * X_ROW(LFS), 'middle', m.name)
  const xMarksH = marksFrom - axisY + (xMarks.rows ? LFS + 8 + (xMarks.rows - 1) * X_ROW(LFS) : 0)

  // The numbers, with their units; on the grid (under an x-axis crossing it), labels keep off them and the values there.
  const numbers = base.numbers.map((n) => {
    // x-axis numbers are centered under their lines, but for the one where the axes cross, just left of it.
    const corner = Math.abs(n.x - (base.yAxis.x - 8)) < 0.01
    const onX = n.anchor === 'middle' || corner
    // With the x-axis crossing the grid, the 0 there goes with the y-axis's numbers, clear of those under it.
    if (corner && xInside) return { ...n, x: base.yAxis.x - 6 + dx, y: base.xAxis.y + fs * 0.35 + dy, text: n.text + (yUnits || xUnits) }
    return { ...n, x: n.x + dx, y: n.y + dy, text: n.text + (onX ? xUnits : yUnits) }
  })
  if (xInside) {
    for (const n of numbers) place.keep(textBox({ x: n.x, y: n.y, anchor: n.anchor }, textWidth(n.text, fs), fs))
    for (const l of sideLabels) place.keep(textBox(l, l.runs ? runsWidth(l.runs, LFS) : SIDE_BLANK_W, LFS))
  }

  // Labels on the graph, most important first: points, braces, curve names,
  // levels' names, regions' names, then callouts.
  for (const p of spec.points ?? []) {
    if (!shows(p.name)) continue
    const q = px(p.at)
    put(p.side ? [...overSpots(q, LFS, p.side), ...besidePoint(q, LFS, 9)] : besidePoint(q, LFS, 9), p.name)
  }
  for (const b of braces) {
    if (!shows(b.name)) continue
    const w = widthOf(b.name)
    const t = b.tip
    const spot: Spot =
      b.side === 'below' ? { x: t.x, y: t.y + LFS + 2, anchor: 'middle' }
      : b.side === 'above' ? { x: t.x, y: t.y - 5, anchor: 'middle' }
      : b.side === 'left' ? { x: t.x - 5, y: t.y + LFS * 0.35, anchor: 'end' }
      : { x: t.x + 5, y: t.y + LFS * 0.35, anchor: 'start' }
    const bx = textBox(spot, w, LFS)
    place.keep(bx)
    taken.push(bx)
    labels.push(labelAt(spot, b.name, bx))
  }
  for (const c of curves) {
    if (!shows(c.name) || !c.ends.length) continue
    const run = c.nameAt === 'start' ? [...c.ends[0]].reverse() : c.ends.at(-1)!
    put(endSpots(run, LFS), c.name)
  }
  for (const l of levels) {
    if (!shows(l.name) || !l.ends.length) continue
    const run = l.ends.at(-1)!
    const end = run.at(-1)!
    const start = run[0]
    const above = end.y - LFS * 0.3 - 5
    const below = end.y + LFS * 0.78 + 5
    put([
      { x: end.x + 6, y: end.y + LFS * 0.35, anchor: 'start' },
      ...[0, 0.25, 0.5].flatMap((f) => {
        const x = end.x - 4 - (end.x - start.x) * f
        return [{ x, y: above, anchor: 'end' as const }, { x, y: below, anchor: 'end' as const }]
      }),
      ...alongCurve(run, LFS),
    ], l.name)
  }
  for (const r of regions) {
    if (!shows(r.name)) continue
    put(insideSpots(r.poly, r.centroid, LFS), r.name)
  }
  const leaders: Segment[] = []
  const WAYS = [
    { dx: 0.7, dy: -0.6, anchor: 'start' as const, below: 0 },
    { dx: -0.7, dy: -0.6, anchor: 'end' as const, below: 0 },
    { dx: 0.7, dy: 0.6, anchor: 'start' as const, below: LFS },
    { dx: -0.7, dy: 0.6, anchor: 'end' as const, below: LFS },
    { dx: 0, dy: -1, anchor: 'middle' as const, below: 0 },
    { dx: 0, dy: 1, anchor: 'middle' as const, below: LFS * 0.5 },
    { dx: 1, dy: 0, anchor: 'start' as const, below: LFS * 0.35 },
    { dx: -1, dy: 0, anchor: 'end' as const, below: LFS * 0.35 },
  ]
  for (const c of spec.callouts ?? []) {
    if (!shows(c.name)) continue
    const width = widthOf(c.name)
    const stop = 4
    // Each point the arrow could go to (the first unless it leaves no clean place), and the places around it.
    const options = [{ at: c.at, toward: c.toward }, ...(c.or ?? [])].flatMap(({ at, toward }) => {
      const p = px(at)
      const around = [30, 44, 70, 100].flatMap((r) => WAYS.map((w) => ({ p, r, w, spot: { x: p.x + r * w.dx, y: p.y + r * w.dy + w.below, anchor: w.anchor } })))
      // Asked for a way, the places nearest it come first, the nearer the point the sooner.
      if (toward && (toward.x || toward.y)) {
        const len = Math.hypot(toward.x, toward.y)
        const want = { x: toward.x / len, y: -toward.y / len }
        const off = (o: (typeof around)[number]) => Math.acos(Math.max(-1, Math.min(1, (o.w.dx * want.x + o.w.dy * want.y) / Math.hypot(o.w.dx, o.w.dy)))) + ((o.r - 44) / 56) * 0.6
        around.sort((a, b) => off(a) - off(b))
      }
      return around
    })
    // The leader from a label's nearest edge to the point, stopped short of it.
    const leaderOf = (b: Box, p: Point): Segment | null => {
      const from = nearestOnBox(b, p, 3)
      const len = Math.hypot(p.x - from.x, p.y - from.y)
      if (len < stop + 6) return null
      return { x1: round(from.x), y1: round(from.y), x2: round(p.x - ((p.x - from.x) / len) * stop), y2: round(p.y - ((p.y - from.y) / len) * stop) }
    }
    // What a leader crosses (short of the point itself): a line, or a label (or close by one), counts as much as a label on a line.
    const leaderCost = (l: Segment | null) => {
      if (!l) return 0
      const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1)
      const f = Math.max(0, (len - 8) / len)
      const short = { x1: l.x1, y1: l.y1, x2: l.x1 + (l.x2 - l.x1) * f, y2: l.y1 + (l.y2 - l.y1) * f }
      const near = (b: Box) => ({ x0: b.x0 - 3, y0: b.y0 - 3, x1: b.x1 + 3, y1: b.y1 + 3 })
      return 10 * (drawn.filter((d) => segmentsCross(short, d)).length + taken.filter((b) => crosses(short, near(b))).length)
    }
    // The place where the label and its leader touch least, the first of any as good.
    let best: { spot: Spot; box: Box; leader: Segment | null; score: number } | null = null
    for (const { spot, p } of options) {
      const box = textBox(spot, width, LFS)
      const leader = leaderOf(box, p)
      const score = place.choose([{ box }], false).score + leaderCost(leader)
      if (!best || score < best.score) best = { spot, box, leader, score }
      if (score === 0) break
    }
    if (!best) continue
    if (best.score >= 10) crowded++
    place.keep(best.box)
    labels.push(labelAt(best.spot, c.name, best.box))
    taken.push(best.box)
    if (!best.leader) continue
    leaders.push(best.leader)
    place.line([{ x: best.leader.x1, y: best.leader.y1 }, { x: best.leader.x2, y: best.leader.y2 }])
  }

  // The chart title on top, the y-axis's word over its top and the
  // x-axis's past its end or under it.
  const big: Label[] = []
  const blanks: Segment[] = []
  const midX = area.x + area.w / 2
  if (title) {
    const y = PAD + fs * 1.4
    if (title.mode === 'text') big.push({ x: midX, y, anchor: 'middle', runs: runsOf(text(title), fs * 1.4), big: true })
    else blanks.push({ x1: midX - Math.min(110, area.w / 2), y1: y, x2: midX + Math.min(110, area.w / 2), y2: y })
  }
  if (yWord && yWordSpot) labels.push(labelAt(yWordSpot, yWord, yWordSpot.box))
  let bottom = xInside ? Math.max(axisY + xMarksH, gridBottom) : axisY + xMarksH
  if (xWord) {
    if (xWordBeside) labels.push(labelAt({ x: xEnd + 7, y: axisY + LFS * 0.35, anchor: 'start' }, xWord, textBox({ x: xEnd + 7, y: axisY + LFS * 0.35, anchor: 'start' }, xWordW, LFS)))
    else {
      const spot: Spot = { x: area.x + area.w + Math.min(right - 4, xWordW / 2), y: bottom + LFS + 6, anchor: 'end' }
      spot.x = Math.max(spot.x, area.x + xWordW)
      labels.push(labelAt(spot, xWord, textBox(spot, xWordW, LFS)))
      bottom = spot.y + LFS * 0.3
    }
  }
  if (spec.caption && shows(spec.caption)) {
    const y = bottom + fs * 1.3 + 8
    if (spec.caption.mode === 'text') big.push({ x: midX, y, anchor: 'middle', runs: runsOf(text(spec.caption), fs * 1.2), big: true })
    else blanks.push({ x1: midX - Math.min(90, area.w / 2), y1: y, x2: midX + Math.min(90, area.w / 2), y2: y })
    bottom = y + fs * 0.3
  }

  const width = area.x + area.w + right + PAD - 6
  const height = bottom + PAD

  return {
    width: round(width),
    height: round(height),
    fs,
    labelFs: LFS,
    titleFs: fs * 1.4,
    captionFs: fs * 1.2,
    r: DOT_R,
    grid: area,
    /** where the grid starts, for lining panels up */
    top: area.y,
    gridlines: spec.gridlines && numbered,
    vLines: spec.gridlines && numbered ? base.vLines.map((x) => x + dx) : [],
    hLines: spec.gridlines && numbered ? base.hLines.map((y) => y + dy) : [],
    minorV: spec.gridlines && numbered ? base.minorV.map((x) => round(x + dx)) : [],
    minorH: spec.gridlines && numbered ? base.minorH.map((y) => round(y + dy)) : [],
    /** ticks at each numbered line, when there are numbers but no gridlines */
    ticks: numbered && !spec.gridlines ? tickMarks(base, dx, dy, spec.every) : [],
    xAxis: { x1: base.xAxis.x1 + dx, x2: xEnd, y: axisY },
    yAxis: { x: axisX, y1: base.yAxis.y1 + dy, y2: yTop },
    ends: spec.ends,
    numbers,
    regions,
    levels: levels.map(({ paths, color, dash }) => ({ paths, color, dash })),
    curves: curves.map(({ paths, color, dash, width }) => ({ paths, color, dash, width })),
    guides,
    arrows,
    braces: braces.map(({ d }) => d),
    dots,
    leaders,
    labels: [...labels, ...sideLabels],
    big,
    blanks,
    /** how many labels (or callouts' arrows) found no place clear of every line and label */
    crowded,
    px,
  }
}

export type PanelLayout = ReturnType<typeof buildPanel>

/** Ticks across each axis at its numbered lines, for numbered axes without gridlines. */
function tickMarks(base: { vLines: number[]; hLines: number[]; xAxis: { y: number }; yAxis: { x: number } }, dx: number, dy: number, every: { x: number; y: number }): Segment[] {
  const T = 4
  const out: Segment[] = []
  if (every.x) for (const x of base.vLines) out.push({ x1: x + dx, y1: base.xAxis.y + dy - T, x2: x + dx, y2: base.xAxis.y + dy + T })
  if (every.y) for (const y of base.hLines) out.push({ x1: base.yAxis.x + dx - T, y1: y + dy, x2: base.yAxis.x + dx + T, y2: y + dy })
  return out
}

/** Places for a curve's name by the end of a run of it: past the end, over it, under it, then along it. */
function endSpots(run: Point[], fs: number): Spot[] {
  const end = run.at(-1)!
  const prev = run[Math.max(0, run.length - 6)]
  const rising = end.y < prev.y - 0.5
  const upright = Math.abs(end.x - prev.x) < 1
  const spots: Spot[] = upright
    ? [
        { x: end.x, y: end.y - 7, anchor: 'middle' },
        { x: end.x + 6, y: end.y + fs * 0.8, anchor: 'start' },
        { x: end.x - 6, y: end.y + fs * 0.8, anchor: 'end' },
      ]
    : [
        { x: end.x + 5, y: end.y + (rising ? 0 : fs * 0.6), anchor: 'start' },
        { x: end.x + 4, y: end.y - 6, anchor: 'start' },
        { x: end.x + 4, y: end.y + fs + 2, anchor: 'start' },
        { x: end.x, y: end.y - 8, anchor: 'middle' },
        { x: end.x - 6, y: end.y - 6, anchor: 'end' },
        { x: end.x - 6, y: end.y + fs + 2, anchor: 'end' },
      ]
  return [...spots, ...alongCurve(run, fs)]
}

/**
 * Places for a region's name inside it: on a grid across the region,
 * nearest its center first, so a line through the middle doesn't leave it
 * nowhere to go.
 */
function insideSpots(poly: Point[], c: Point, fs: number): Spot[] {
  const xs = poly.map((p) => p.x)
  const ys = poly.map((p) => p.y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const spots: (Spot & { d: number })[] = []
  for (let y = y0 + fs * 0.8; y <= y1 - fs * 0.2; y += 6) {
    for (let x = x0; x <= x1; x += 8) {
      if (!inside(poly, { x, y: y - fs * 0.35 })) continue
      spots.push({ x, y, anchor: 'middle', d: Math.hypot(x - c.x, y - fs * 0.35 - c.y) })
    }
  }
  spots.sort((a, b) => a.d - b.d)
  return [{ x: c.x, y: c.y + fs * 0.35, anchor: 'middle' }, ...spots]
}

/**
 * Places straight over a point (`above`) or under it (`below`), clear of a
 * dot on it, then a little to either side, then further off.
 */
function overSpots(p: Point, fs: number, side: 'above' | 'below'): Spot[] {
  const gap = 9
  const y = side === 'above' ? p.y - gap - fs * 0.3 : p.y + gap + fs * 0.78
  const further = side === 'above' ? y - fs * 0.6 : y + fs * 0.6
  return [
    { x: p.x, y, anchor: 'middle' },
    { x: p.x + 4, y, anchor: 'start' },
    { x: p.x - 4, y, anchor: 'end' },
    { x: p.x, y: further, anchor: 'middle' },
  ]
}

/** Whether two segments cross. */
function segmentsCross(a: Segment, b: Segment) {
  const side = (s: Segment, x: number, y: number) => Math.sign((s.x2 - s.x1) * (y - s.y1) - (s.y2 - s.y1) * (x - s.x1))
  return side(a, b.x1, b.y1) * side(a, b.x2, b.y2) < 0 && side(b, a.x1, a.y1) * side(b, a.x2, a.y2) < 0
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

/** The point on a box's edge (grown by `pad`) nearest `p`. */
function nearestOnBox(b: Box, p: Point, pad: number): Point {
  const x0 = b.x0 - pad
  const x1 = b.x1 + pad
  const y0 = b.y0 - pad
  const y1 = b.y1 + pad
  return { x: Math.min(x1, Math.max(x0, p.x)), y: Math.min(y1, Math.max(y0, p.y)) }
}

/**
 * A curly brace from `a` to `b` on the drawing, bulging to `side`, `depth`
 * deep: its path, where its point is, and an outline for labels to keep off.
 */
export function braceOf(a: Point, b: Point, side: BraceSpec['side'], depth: number) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
  // The way it bulges: perpendicular to a→b, toward the side asked for.
  let n = { x: -u.y, y: u.x }
  const want = side === 'below' ? { x: 0, y: 1 } : side === 'above' ? { x: 0, y: -1 } : side === 'left' ? { x: -1, y: 0 } : { x: 1, y: 0 }
  if (n.x * want.x + n.y * want.y < 0) n = { x: -n.x, y: -n.y }
  const q = Math.min(depth, len / 4)
  const at = (s: number, h: number) => ({ x: round(a.x + u.x * s + n.x * h), y: round(a.y + u.y * s + n.y * h) })
  const mid = len / 2
  const P = (p: Point) => `${p.x},${p.y}`
  const d =
    `M${P(at(0, 0))}` +
    `Q${P(at(0, q))} ${P(at(q, q))}` +
    `L${P(at(mid - q, q))}` +
    `Q${P(at(mid, q))} ${P(at(mid, 2 * q))}` +
    `Q${P(at(mid, q))} ${P(at(mid + q, q))}` +
    `L${P(at(len - q, q))}` +
    `Q${P(at(len, q))} ${P(at(len, 0))}`
  return { d, tip: at(mid, 2 * q + 2), outline: [at(0, 0), at(0, q), at(len, q), at(len, 0)] }
}

/** The inks curves and regions are drawn in: colors, or all black for black and white. */
export function inks(bw: boolean) {
  const ink = (c: keyof typeof COLORS) => (bw ? COLORS.black : COLORS[c])
  return {
    demand: ink('blue'),
    supply: ink('red'),
    third: ink('green'),
    fourth: ink('purple'),
    black: COLORS.black,
    /** regions are tinted in their own colors even in black and white, where they're hatched */
    region: { blue: COLORS.blue, red: COLORS.red, green: COLORS.green, orange: COLORS.orange, purple: COLORS.purple, gray: '#6b7280' },
  }
}
