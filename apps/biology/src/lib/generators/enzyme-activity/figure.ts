// Lays out an enzyme activity graph for EnzymeFigure.svelte to draw: up to
// three curves of rate against temperature, pH or substrate concentration
// on a $shared/graph grid with no numbers (the shape is what matters), told
// apart by their dashes and a key under the graph. Marked on them: each
// optimum and where the enzyme has denatured, or Vmax, ½Vmax and Km, with
// dashed lines to the axes. Vmax, ½Vmax and Km are written at the axes,
// where the numbers would be, each named for its curve when there's more
// than one; the other labels go wherever on the graph they touch nothing.

import { readAxes, type GridSettings } from '$shared/graph/axes'
import { COLORS } from '$shared/graph/colors'
import { clipPath, layoutGrid, pathOf, round, type GridLayout, type Point } from '$shared/graph/grid'
import { DASHES, layoutKey, placer, textWidth, type Anchor, type Box, type KeyEntry, type Spot } from '$shared/graph/labels'
import { UNKNOWN, enzymeOf, unknownName } from './enzymes'
import {
  denaturedAbove, denaturedPH, kinetics, rateAtPH, rateAtSubstrate, rateAtTemperature,
} from './model'
import { CURVES, INHIBITOR_NAMES, curveOf, type CurveIndex, type EnzymeSettings } from './settings'

const X_BLOCKS = 15
const Y_BLOCKS = 10
/** The fastest rate (an optimum, or Vmax), in blocks up the y-axis, leaving room above for labels. */
const TOP = 8
/** The substrate concentration axis runs from 0 to this, in the units Km is typed in. */
export const SUBSTRATE_END = 10
const SAMPLES = 400
const PAD = 14
const INSET = 4 // how far inside the grid's border labels stay
const DOT_R = 5
const BLANK_W = 70 // a write-on line for a label left blank
const SIDE_BLANK_W = 40 // the same, at an axis
/** How far apart rows of labels under the x-axis are. */
const X_ROW = (fs: number) => fs * 1.35
const INKS = ['blue', 'red', 'green'] as const

type Segment = { x1: number; y1: number; x2: number; y2: number }
type Mode = EnzymeSettings['optLabelMode']

/** A stretch of a label's text, `sub` for the max of Vmax and the m of Km; `dy` moves it down from the run before. */
export type Run = { text: string; sub?: boolean; dy: number }
/** A label on the figure: written text, or a write-on line for students. */
export type Label = { x: number; y: number; anchor: Anchor; runs?: Run[]; blank?: Segment }
export type Curve = { index: CurveIndex; name: string; color: string; dash?: string; paths: string[] }

const SUB = 0.7 // a subscript's size, of the label's

/** A label's words in runs, with Vmax and Km written as textbooks do, their last letters lowered and smaller. */
export function runsOf(text: string, fs: number): Run[] {
  const runs: Omit<Run, 'dy'>[] = []
  let last = 0
  for (const m of text.matchAll(/\b(V)(max)\b|\b(K)(m)\b/g)) {
    runs.push({ text: text.slice(last, m.index) + (m[1] ?? m[3]) }, { text: m[2] ?? m[4], sub: true })
    last = m.index + m[0].length
  }
  runs.push({ text: text.slice(last) })
  let level = 0
  return runs
    .filter((r) => r.text)
    .map((r) => {
      const to = r.sub ? fs * 0.22 : 0
      const dy = round(to - level)
      level = to
      return { ...r, dy }
    })
}

const runsWidth = (runs: Run[], fs: number) => runs.reduce((w, r) => w + textWidth(r.text, r.sub ? fs * SUB : fs), 0)

/** A curve's name in the key: the one typed, or its enzyme's (Enzyme A for an unknown one), or its inhibitor's. */
export function curveName(s: EnzymeSettings, i: CurveIndex) {
  const c = curveOf(s, i)
  if (c.name.trim()) return c.name.trim()
  if (s.graph === 'substrate') return INHIBITOR_NAMES[c.inhibitor]
  return c.enzyme === UNKNOWN ? unknownName(i) : enzymeOf(c.enzyme)!.name
}

/** A curve's optimum and width against temperature or pH: its enzyme's, or as typed for an unknown one. */
export function shapeOf(s: EnzymeSettings, i: CurveIndex) {
  const c = curveOf(s, i)
  const known = enzymeOf(c.enzyme)
  if (s.graph === 'ph') return known && c.enzyme !== UNKNOWN ? known.ph : { opt: c.pOpt, width: c.pWidth }
  return known && c.enzyme !== UNKNOWN ? known.temperature : { opt: c.tOpt, width: c.tWidth }
}

/** The curves drawn, by index. */
export const drawnOf = (s: EnzymeSettings) => CURVES.filter((i) => curveOf(s, i).show)

/**
 * What the x-axis shows, fitted to the curves (or the first, for blank
 * axes): from 0 °C to a little past where the last enzyme denatures, the
 * pH each side of where the enzymes work, or substrate up to 10 Km units.
 */
export function rangeOf(s: EnzymeSettings) {
  const drawn = drawnOf(s)
  const shapes = (drawn.length ? drawn : [0 as const]).map((i) => shapeOf(s, i))
  if (s.graph === 'temperature') {
    const end = Math.max(...shapes.map((sh) => denaturedAbove(sh.opt, sh.width)))
    // A fifth more past it, to the next 10 °C, leaves room for its label.
    return { from: 0, to: Math.min(150, Math.max(30, Math.ceil((end * 1.2) / 10) * 10)) }
  }
  if (s.graph === 'ph') {
    const from = Math.max(0, Math.floor(Math.min(...shapes.map((sh) => sh.opt - sh.width)) - 1))
    const to = Math.min(14, Math.ceil(Math.max(...shapes.map((sh) => sh.opt + sh.width)) + 1))
    return to - from >= 4 ? { from, to } : { from: Math.max(0, Math.min(from, to - 4)), to: Math.max(to, 4) }
  }
  return { from: 0, to: SUBSTRATE_END }
}

/** Vmax and Km of a curve against substrate concentration, as shares of the enzyme's own Vmax and Km units. */
export const kineticsOf = (s: EnzymeSettings, i: CurveIndex) => kinetics(curveOf(s, i).inhibitor, s.km, s.strength)

/** The rate on a curve, 0 to 1, at x in the graph's own units. */
function rateFn(s: EnzymeSettings, i: CurveIndex): (v: number) => number {
  if (s.graph === 'substrate') {
    const k = kineticsOf(s, i)
    return (v) => rateAtSubstrate(v, k)
  }
  const { opt, width } = shapeOf(s, i)
  return s.graph === 'ph' ? (v) => rateAtPH(v, opt, width) : (v) => rateAtTemperature(v, opt, width)
}

/** Where a curve meets the x-axis, where it starts and stops working, in the graph's own units. */
function zerosOf(s: EnzymeSettings, i: CurveIndex) {
  const { opt, width } = shapeOf(s, i)
  if (s.graph === 'ph') {
    const d = denaturedPH(opt, width)
    return [d.low, d.high]
  }
  return s.graph === 'temperature' ? [denaturedAbove(opt, width)] : []
}

const n3 = (v: number) => String(Number(v.toPrecision(3)))

/** What each curve works out to, for the settings panel and the examples' answer keys. */
export function readoutOf(s: EnzymeSettings) {
  return drawnOf(s).map((i) => {
    const name = curveName(s, i)
    if (s.graph === 'substrate') {
      const c = curveOf(s, i)
      const x = n3(s.strength)
      if (c.inhibitor === 'competitive') return `${name}: the same Vmax, and Km ${x} times higher`
      if (c.inhibitor === 'noncompetitive') return `${name}: Vmax ${x} times lower, and the same Km`
      return `${name}: Vmax and Km of the enzyme on its own`
    }
    const { opt, width } = shapeOf(s, i)
    if (s.graph === 'ph') {
      const d = denaturedPH(opt, width)
      return `${name}: works best at pH ${n3(opt)}, and between pH ${n3(Math.max(0, d.low))} and ${n3(Math.min(14, d.high))}`
    }
    return `${name}: works best at ${n3(opt)} °C, and has denatured by ${Math.round(denaturedAbove(opt, width))} °C`
  })
}

const SHORT = { competitive: 'competitive', noncompetitive: 'non-competitive' }

/** A curve's name after a mark of its own: the name typed for it, or its inhibitor's. */
function shortName(s: EnzymeSettings, i: CurveIndex) {
  const c = curveOf(s, i)
  return c.name.trim() || (c.inhibitor === 'none' ? 'no inhibitor' : SHORT[c.inhibitor])
}

/** The curves drawn against substrate concentration, grouped by `key`: those sharing a Vmax, say. */
function groupsOf(curves: CurveIndex[], key: (i: CurveIndex) => number) {
  const groups: { at: number; curves: CurveIndex[] }[] = []
  for (const i of curves) {
    const v = key(i)
    const g = groups.find((g) => Math.abs(g.at - v) < 1e-6)
    if (g) g.curves.push(i)
    else groups.push({ at: v, curves: [i] })
  }
  return groups
}

/**
 * The marks against substrate concentration: each Vmax, ½Vmax and Km once,
 * with the curves it belongs to and what its label adds to the words: when
 * there's more than one of a kind, the curve's name, "Vmax (competitive)",
 * except for the enzyme's own, shared with the curve with no inhibitor.
 */
export function substrateMarksOf(s: EnzymeSettings) {
  const drawn = s.graph === 'substrate' ? drawnOf(s) : []
  const k = (i: CurveIndex) => kineticsOf(s, i)
  const named = <G extends { curves: CurveIndex[] }>(groups: G[]) =>
    groups.map((g) => {
      const own = groups.length < 2 || g.curves.some((i) => curveOf(s, i).inhibitor === 'none')
      const names = [...new Set(g.curves.map((i) => shortName(s, i)))]
      return { ...g, suffix: own ? '' : ` (${names.join(' and ')})` }
    })
  const onAxis = drawn.filter((i) => k(i).km <= SUBSTRATE_END)
  return {
    vmax: named(groupsOf(drawn, (i) => k(i).vmax)),
    half: named(groupsOf(onAxis, (i) => k(i).vmax / 2)),
    km: named(groupsOf(onAxis, (i) => k(i).km)),
  }
}

export function buildEnzyme(s: EnzymeSettings) {
  const graph = s.graph
  const range = rangeOf(s)
  const drawn = drawnOf(s)

  // The grid, with no numbers or titles of its own: the titles go where
  // this figure makes room for them, beside the labels written at the axes.
  const gs: GridSettings = {
    xEvery: 0, yEvery: 0,
    title: '', titleMode: 'none', xTitle: '', xTitleMode: 'none', yTitle: '', yTitleMode: 'none',
    xLabel: '', xLabelMode: 'none', yLabel: '', yLabelMode: 'none',
    xStartCap: 'none', xEndCap: s.xEndCap, yStartCap: 'none', yEndCap: s.yEndCap,
    minor: s.gridlines ? s.minor : 0, labelSize: s.labelSize,
  }
  const axes = readAxes({ xFrom: '0', xTo: String(X_BLOCKS), xStep: '1', yFrom: '0', yTo: String(Y_BLOCKS), yStep: '1' })
  const { px: gridPx, box, ...base } = layoutGrid(gs, axes)
  const fs = base.fs
  const LABEL_FS = fs * 1.05

  const text = (mode: Mode, words: string) => (mode === 'text' ? words.trim() : '')
  const shown = (mode: Mode, words: string) => mode === 'blank' || !!text(mode, words)

  // Room on the left for the y-axis title and the labels written at the
  // y-axis (Vmax and ½Vmax), and above for the chart title.
  const substrate = graph === 'substrate' && drawn.length > 0
  const vmaxAt = substrate && s.markVmax && shown(s.vmaxLabelMode, s.vmaxLabel)
  const halfAt = substrate && s.markKm && shown(s.halfLabelMode, s.halfLabel)
  const kmAt = substrate && s.markKm && shown(s.kmLabelMode, s.kmLabel)
  const sideWidth = (mode: Mode, words: string) => (mode === 'blank' ? SIDE_BLANK_W : runsWidth(runsOf(text(mode, words), LABEL_FS), LABEL_FS))
  const marks = substrateMarksOf(s)
  /** A mark's words with its curve's name after them; a blank line stays blank. */
  const wordsOf = (mode: Mode, words: string, suffix: string) => (mode === 'text' && words.trim() ? words.trim() + suffix : words)
  const yMarksW = Math.max(
    0,
    ...(vmaxAt ? marks.vmax.map((m) => sideWidth(s.vmaxLabelMode, wordsOf(s.vmaxLabelMode, s.vmaxLabel, m.suffix))) : []),
    ...(halfAt ? marks.half.map((m) => sideWidth(s.halfLabelMode, wordsOf(s.halfLabelMode, s.halfLabel, m.suffix))) : []),
  )
  const title = s.titleMode === 'text' ? s.title.trim() : ''
  const xTitle = s.xTitleMode === 'text' ? s.xTitle.trim() : ''
  const yTitle = s.yTitleMode === 'text' ? s.yTitle.trim() : ''
  const titleRow = title || s.titleMode === 'blank' ? fs * 1.6 + 14 : 0
  const ySide = yTitle || s.yTitleMode === 'blank'
  const xSide = xTitle || s.xTitleMode === 'blank'
  const left = PAD + (ySide ? fs * 1.2 + 12 : 0) + (yMarksW ? yMarksW + 8 : 0)
  const dx = left - base.grid.x
  const dy = titleRow
  const area = { ...base.grid, x: base.grid.x + dx, y: base.grid.y + dy }
  const axisY = area.y + area.h
  const px = (p: Point): Point => {
    const q = gridPx(p)
    return { x: q.x + dx, y: q.y + dy }
  }
  /** A point of a curve, from x in the graph's units and a rate from 0 to 1, in the grid's blocks. */
  const toGrid = (v: number, rate: number): Point => ({ x: ((v - range.from) / (range.to - range.from)) * X_BLOCKS, y: rate * TOP })
  const inRange = (v: number) => v >= range.from - 1e-9 && v <= range.to + 1e-9

  const bounds: Box = { x0: area.x + INSET, y0: area.y + INSET, x1: area.x + area.w - INSET, y1: area.y + area.h - INSET }
  const place = placer(bounds)

  // The curves, cut to the grid. One that stops (a denatured enzyme) ends
  // where it meets the x-axis, rather than running on along it.
  const curves: Curve[] = drawn.map((i) => {
    const rate = rateFn(s, i)
    const zeros = zerosOf(s, i).filter((v) => v > range.from && v < range.to)
    const xs = [...Array.from({ length: SAMPLES + 1 }, (_, k) => range.from + ((range.to - range.from) * k) / SAMPLES), ...zeros].sort((a, b) => a - b)
    let pts = xs.map((v) => toGrid(v, rate(v)))
    const first = pts.findIndex((p) => p.y > 1e-9)
    const last = pts.findLastIndex((p) => p.y > 1e-9)
    pts = first < 0 ? [] : pts.slice(Math.max(0, first - 1), last + 2)
    const paths: string[] = []
    for (const run of clipPath(pts, box)) {
      const onPage = run.map(px).filter((v, k, all) => k === 0 || k === all.length - 1 || Math.hypot(v.x - all[k - 1].x, v.y - all[k - 1].y) > 0.4)
      paths.push(pathOf(onPage))
      place.line(onPage)
    }
    const color = s.color ? COLORS[INKS[i]] : COLORS.black
    return { index: i, name: curveName(s, i), color, dash: DASHES[i], paths }
  })

  // The marks: dots, dashed lines to the axes, and their labels.
  const dots: Point[] = []
  const guides: Segment[] = []
  const lines: Segment[] = [] // Vmax, across the graph
  const markLabels: Label[] = []
  const sideY: { y: number; mode: Mode; words: string }[] = []
  const sideX: { x: number; mode: Mode; words: string }[] = []
  /** The first of each group of things `same` as each other. */
  const once = <T>(list: T[], same: (a: T, b: T) => boolean) => list.filter((t, k) => list.findIndex((u) => same(u, t)) === k)
  const near = (a: number, b: number) => Math.abs(a - b) < 0.5
  const sameX = (a: Point, b: Point) => near(a.x, b.x)
  const sameY = (a: Point, b: Point) => near(a.y, b.y)
  const guide = (l: Segment) => {
    guides.push(l)
    place.line([{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }])
  }
  const dot = (p: Point) => {
    dots.push(p)
    place.box({ x0: p.x - DOT_R, y0: p.y - DOT_R, x1: p.x + DOT_R, y1: p.y + DOT_R })
  }

  const optima: Point[] = []
  const denatured: Point[] = []
  if (graph !== 'substrate') {
    for (const i of drawn) {
      const { opt } = shapeOf(s, i)
      if (s.markOpt && inRange(opt)) optima.push(px(toGrid(opt, 1)))
      if (s.markDen) for (const v of zerosOf(s, i)) if (v > range.from && v < range.to) denatured.push(px(toGrid(v, 0)))
    }
    for (const p of once(optima, sameX)) {
      guide({ x1: p.x, y1: p.y, x2: p.x, y2: axisY })
      dot(p)
    }
    for (const p of once(denatured, sameX)) dot(p)
  } else if (drawn.length) {
    if (s.markVmax) {
      for (const m of marks.vmax) {
        const y = px(toGrid(0, m.at)).y
        lines.push({ x1: area.x, y1: y, x2: area.x + area.w, y2: y })
        place.line([{ x: area.x, y }, { x: area.x + area.w, y }], true)
        sideY.push({ y, mode: s.vmaxLabelMode, words: wordsOf(s.vmaxLabelMode, s.vmaxLabel, m.suffix) })
      }
    }
    if (s.markKm) {
      const halves = once(marks.km.flatMap((m) => m.curves.map((i) => px(toGrid(m.at, kineticsOf(s, i).vmax / 2)))), (a, b) => sameX(a, b) && sameY(a, b))
      // One line across to each height and down from each Km, to the furthest dot on it.
      for (const m of marks.half) {
        const y = px(toGrid(0, m.at)).y
        const far = Math.max(...halves.filter((q) => near(q.y, y)).map((q) => q.x))
        guide({ x1: area.x, y1: y, x2: far, y2: y })
        sideY.push({ y, mode: s.halfLabelMode, words: wordsOf(s.halfLabelMode, s.halfLabel, m.suffix) })
      }
      for (const m of marks.km) {
        const x = px(toGrid(m.at, 0)).x
        const high = Math.min(...halves.filter((q) => near(q.x, x)).map((q) => q.y))
        guide({ x1: x, y1: high, x2: x, y2: axisY })
        sideX.push({ x, mode: s.kmLabelMode, words: wordsOf(s.kmLabelMode, s.kmLabel, m.suffix) })
      }
      for (const p of halves) dot(p)
    }
  }

  // Labels on the graph, each where it touches nothing.
  const widthOf = (mode: Mode, words: string) => (mode === 'blank' ? BLANK_W : runsWidth(runsOf(text(mode, words), LABEL_FS), LABEL_FS) * 1.06 + 2)
  const label = (spots: Spot[], mode: Mode, words: string) => {
    if (!shown(mode, words)) return
    const spot = place.place(spots, widthOf(mode, words), LABEL_FS)
    if (mode === 'text') markLabels.push({ x: spot.x, y: spot.y, anchor: spot.anchor, runs: runsOf(text(mode, words), LABEL_FS) })
    else markLabels.push({ x: spot.x, y: spot.y, anchor: spot.anchor, blank: { x1: spot.box.x0, y1: spot.y, x2: spot.box.x1, y2: spot.y } })
  }
  const rows = [12, 12 + LABEL_FS * 1.25, 12 + LABEL_FS * 2.5]
  // Over a peak, centered, then to either side and higher up, then beside it.
  const overPeak = (p: Point): Spot[] => [
    ...rows.flatMap((up) => [
      { x: p.x, y: p.y - up, anchor: 'middle' as const },
      { x: p.x + 8, y: p.y - up, anchor: 'start' as const },
      { x: p.x - 8, y: p.y - up, anchor: 'end' as const },
    ]),
    { x: p.x + 12, y: p.y + LABEL_FS * 0.35, anchor: 'start' },
    { x: p.x - 12, y: p.y + LABEL_FS * 0.35, anchor: 'end' },
  ]
  // Just above the axis, outside the curve it ends first, then higher.
  const offAxis = (p: Point): Spot[] =>
    rows.flatMap((up) => [8, 24].flatMap((side) => [
      { x: p.x + side, y: p.y - up, anchor: 'start' as const },
      { x: p.x - side, y: p.y - up, anchor: 'end' as const },
    ]))
  for (const p of once(optima, sameX)) label(overPeak(p), s.optLabelMode, s.optLabel)
  for (const p of once(denatured, sameX)) label(offAxis(p), s.denLabelMode, s.denLabel)

  // Labels at the axes, where the numbers would be: kept apart along each axis.
  const sideLabels: Label[] = []
  const sideLabel = (x: number, y: number, anchor: Anchor, mode: Mode, words: string) => {
    if (mode === 'text') sideLabels.push({ x, y, anchor, runs: runsOf(text(mode, words), LABEL_FS) })
    else if (mode === 'blank') {
      const x0 = anchor === 'end' ? x - SIDE_BLANK_W : x - SIDE_BLANK_W / 2
      sideLabels.push({ x, y, anchor, blank: { x1: x0, y1: y, x2: x0 + SIDE_BLANK_W, y2: y } })
    }
  }
  const ys = spread(sideY.filter((l) => shown(l.mode, l.words)).map((l) => ({ ...l, at: l.y, half: LABEL_FS * 0.6 })), 3)
  for (const l of ys) sideLabel(area.x - 7, l.at + LABEL_FS * 0.35, 'end', l.mode, l.words)
  // Under the x-axis each stays centered under its line, on a row further
  // down when it would run into one already there.
  const xRows: { x0: number; x1: number }[][] = []
  for (const l of [...sideX].filter((l) => shown(l.mode, l.words)).sort((a, b) => a.x - b.x)) {
    const half = sideWidth(l.mode, l.words) / 2
    const span = { x0: l.x - half - 4, x1: l.x + half + 4 }
    let row = xRows.findIndex((r) => r.every((b) => span.x0 >= b.x1 || span.x1 <= b.x0))
    if (row < 0) row = xRows.push([]) - 1
    xRows[row].push(span)
    sideLabel(l.x, axisY + LABEL_FS + 5 + row * X_ROW(LABEL_FS), 'middle', l.mode, l.words)
  }

  // The titles, as the grid would place them, around the room made here.
  const gridLabels: GridLayout['labels'] = []
  const blanks: Segment[] = []
  const midX = area.x + area.w / 2
  const midY = area.y + area.h / 2
  const titleY = PAD + fs * 1.6
  if (title) gridLabels.push({ x: midX, y: titleY, text: title, kind: 'title' })
  else if (s.titleMode === 'blank') blanks.push({ x1: midX - Math.min(130, area.w / 2), y1: titleY, x2: midX + Math.min(130, area.w / 2), y2: titleY })
  const xMarksH = kmAt ? LABEL_FS + 8 + (Math.max(1, xRows.length) - 1) * X_ROW(LABEL_FS) : 0
  const xTitleY = axisY + xMarksH + fs * 1.2 + 6
  if (xTitle) gridLabels.push({ x: midX, y: xTitleY, text: xTitle, kind: 'side' })
  else if (s.xTitleMode === 'blank') blanks.push({ x1: midX - Math.min(100, area.w / 2), y1: xTitleY, x2: midX + Math.min(100, area.w / 2), y2: xTitleY })
  const ySideX = PAD + fs * 0.9
  if (yTitle) gridLabels.push({ x: ySideX, y: midY, text: yTitle, kind: 'side', rotate: true })
  else if (s.yTitleMode === 'blank') blanks.push({ x1: ySideX, y1: midY - Math.min(100, area.h / 2), x2: ySideX, y2: midY + Math.min(100, area.h / 2) })

  let width = left + area.w + (base.width - base.grid.x - base.grid.w)
  let bottom = axisY + xMarksH + (xSide ? fs * 1.2 + 14 : 0)

  // The key: each curve's line and name, in rows centered under the graph,
  // when there's more than one to tell apart.
  let keyEntries: KeyEntry<CurveIndex>[] = []
  if (curves.length > 1) {
    const key = layoutKey(curves, { midX, wrap: Math.max(area.w, 360), top: bottom, left: PAD, fs, labelFs: LABEL_FS })
    keyEntries = key.entries
    width = Math.max(width, key.right + PAD)
    bottom = key.bottom
  }

  const layout: GridLayout = {
    ...base,
    width: round(width),
    height: round(bottom + PAD),
    grid: area,
    // Shape-only graphs are plain axes unless the teacher wants the grid.
    vLines: s.gridlines ? base.vLines.map((x) => x + dx) : [],
    hLines: s.gridlines ? base.hLines.map((y) => y + dy) : [],
    minorV: s.gridlines ? base.minorV.map((x) => round(x + dx)) : [],
    minorH: s.gridlines ? base.minorH.map((y) => round(y + dy)) : [],
    xAxis: { x1: base.xAxis.x1 + dx, x2: base.xAxis.x2 + dx, y: base.xAxis.y + dy },
    yAxis: { x: base.yAxis.x + dx, y1: base.yAxis.y1 + dy, y2: base.yAxis.y2 + dy },
    numbers: [],
    labels: gridLabels,
    blanks,
  }

  return {
    ...layout,
    /** the grid's own settings, for its end caps */
    gridSettings: gs,
    labelFs: LABEL_FS,
    r: DOT_R,
    curves,
    dots,
    guides,
    lines,
    markLabels,
    sideLabels,
    keyEntries,
    range,
  }
}

export type EnzymeLayout = ReturnType<typeof buildEnzyme>

/**
 * Places along an axis for labels wanting to be `at`, each `half` its
 * length either side: moved apart, in order, just enough to keep `gap`
 * between neighbours.
 */
export function spread<T extends { at: number; half: number }>(items: T[], gap: number): T[] {
  const sorted = [...items].sort((a, b) => a.at - b.at)
  const out: T[] = []
  for (const item of sorted) {
    const before = out.at(-1)
    out.push(before ? { ...item, at: Math.max(item.at, before.at + before.half + item.half + gap) } : item)
  }
  return out
}
