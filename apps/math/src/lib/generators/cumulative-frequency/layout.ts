// Lays out a cumulative frequency graph as plain numbers for
// CumulativeFrequency.svelte to draw: the shared graph grid ($shared/graph),
// a cross or dot at each upper bound, the join through them (a smooth curve
// or straight lines), and each reading's dashed lines across to the curve and
// down (or up and across), with its value or a blank written past the axis
// numbers it lands on.
//
// Every reading is read off the join as drawn: the curve is drawn as a path
// through `join`, and a reading finds where that same path crosses its line,
// so a student measuring the printed graph gets the same value.

import { LABEL_SCALE } from '$shared/labelSize'
import { spread, rowsUnder, guidesFrom } from '$shared/graph/axisMarks'
import type { Axis, GridSettings } from '$shared/graph/axes'
import { COLORS } from '$shared/graph/colors'
import { INK, clipPath, layoutGrid, pathOf, round, type Point } from '$shared/graph/grid'
import { textWidth, type Segment } from '$shared/graph/labels'
import { fmt } from '$shared/graph/numbering'
import { smoothThrough } from '$lib/stats/smooth'
import { KINDS, QUARTILES, readGraph, type Kind, type Quartile, type Settings, type Show } from './settings'

const BASE_FS = 14 // the grid's number size, at medium labels
const PAD = 14
const PER_GAP = 32 // points drawn between two plotted points of a smooth curve
const ROW = 1.3 // the rows of values under the x-axis, in font sizes

/** The fraction of n each quartile is read across from. */
export const QUARTILE_SHARE: Record<Quartile, number> = { median: 0.5, lower: 0.25, upper: 0.75 }
export const QUARTILE_NAMES: Record<Quartile, string> = { median: 'Median', lower: 'Lower quartile', upper: 'Upper quartile' }

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st… */
export function ordinal(v: number): string {
  const t = fmt(v)
  if (!/^\d+$/.test(t)) return `${t}th`
  const n = Number(t)
  const tens = n % 100
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${t}${suffix}`
}

/**
 * Where a line through the drawn join crosses it: across at height `y` (the
 * first place the join reaches it, for a level stretch) or up at `x`. Null
 * when the line misses the join.
 */
export function across(join: Point[], y: number): number | null {
  for (let k = 0; k < join.length - 1; k++) {
    const a = join[k]
    const b = join[k + 1]
    if (y < Math.min(a.y, b.y) - 1e-9 || y > Math.max(a.y, b.y) + 1e-9) continue
    if (Math.abs(b.y - a.y) < 1e-12) return a.x
    return a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x)
  }
  return null
}
export function up(join: Point[], x: number): number | null {
  for (let k = 0; k < join.length - 1; k++) {
    const a = join[k]
    const b = join[k + 1]
    if (x < a.x - 1e-9 || x > b.x + 1e-9) continue
    if (Math.abs(b.x - a.x) < 1e-12) return a.y
    return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y)
  }
  return null
}

/** A reading worked out: where it meets the join, and its answer on the axis it lands on. */
export type ReadingOut = {
  /** what it's called in the readout: "Median", "90th percentile", "Up from 60" */
  name: string
  show: Exclude<Show, 'off'>
  /** where the reading meets the join, in the axes' own numbers */
  at: Point
  /** the axis its answer is on, and the answer read to a tenth of a block */
  axis: 'x' | 'y'
  value: number
  text: string
}
/** A value or a blank written past an axis's numbers. */
export type AxisLabel = { x: number; y: number; text: string; anchor: 'middle' | 'end' }
export type Blank = { x1: number; x2: number; y: number }

export function buildCumulative(s: Settings) {
  const read = readGraph(s)
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const { yOf, n } = read
  const plotted = read.points.map((p) => ({ x: p.x, y: yOf(p.cf) }))
  // The join, as drawn: smooth, straight, or none for students to draw.
  const join: Point[] | null = s.join === 'none' || plotted.length < 2 ? null : s.join === 'smooth' ? smoothThrough(plotted, 'x', PER_GAP) : plotted

  const xr = read.x.range
  const yr = read.y.range
  /** A value read to a tenth of a block, as a student reads the grid. */
  const toTenth = (v: number, step: number) => Number((Math.round(v / (step / 10)) * (step / 10)).toPrecision(12))

  // The quartiles always, for the readout; then the readings typed.
  const quartiles = {} as Record<Quartile, ReadingOut | null>
  const readings: (ReadingOut | null)[] = []
  const problems: (string | null)[] = []
  const acrossFrom = (name: string, show: ReadingOut['show'], y: number): ReadingOut | null => {
    const x = join && across(join, y)
    if (x === null || x === undefined) return null
    const value = toTenth(x, xr.step)
    return { name, show, at: { x, y }, axis: 'x', value, text: fmt(value) }
  }
  for (const q of QUARTILES) {
    quartiles[q] = n > 0 ? acrossFrom(QUARTILE_NAMES[q], s[q] === 'off' ? 'lines' : s[q], yOf(n * QUARTILE_SHARE[q])) : null
  }
  const curveY = join ? { lo: join[0].y, hi: join.at(-1)!.y } : null
  const curveX = join ? { lo: join[0].x, hi: join.at(-1)!.x } : null
  for (const r of s.readings) {
    const typed = r.at.trim()
    const v = typed ? Number(typed.replace(/[−–]/g, '-').replace(/\s*%$/, '')) : NaN
    if (!typed || !join || n <= 0) {
      readings.push(null)
      problems.push(null)
      continue
    }
    if (!Number.isFinite(v)) {
      readings.push(null)
      problems.push(`“${typed}” isn't a number. Type one like 90 or 45.`)
      continue
    }
    if (r.kind === 'percentile' && (v < 0 || v > 100)) {
      readings.push(null)
      problems.push('A percentile is from 0 to 100.')
      continue
    }
    const name = readingName(r.kind, v)
    if (r.kind === 'up') {
      const y = up(join, v)
      if (y === null) {
        readings.push(null)
        problems.push(`Up from ${fmt(v)} misses the ${s.join === 'smooth' ? 'curve' : 'lines'}, which run from ${fmt(curveX!.lo)} to ${fmt(curveX!.hi)}.`)
        continue
      }
      const value = toTenth(y, yr.step)
      readings.push({ name, show: r.show, at: { x: v, y }, axis: 'y', value, text: fmt(value) })
      problems.push(null)
      continue
    }
    const y = r.kind === 'percentile' ? yOf((n * v) / 100) : v
    const out = acrossFrom(name, r.show, y)
    readings.push(out)
    problems.push(out ? null : `Across from ${fmt(v)} misses the ${s.join === 'smooth' ? 'curve' : 'lines'}, which run from ${fmt(curveY!.lo)} to ${fmt(curveY!.hi)}.`)
  }
  // Reading lines need something to read off.
  const wantsReadings = QUARTILES.some((q) => s[q] !== 'off') || s.readings.some((r) => r.at.trim())
  const joinProblem = wantsReadings && !join && plotted.length > 1 ? 'Reading lines go to the curve, so they’re off while the points aren’t joined.' : null

  // The readings drawn: the quartiles turned on, then those typed.
  const drawn = [...QUARTILES.filter((q) => s[q] !== 'off').map((q) => quartiles[q]), ...readings].filter((r): r is ReadingOut => !!r)

  // The shared grid, with both axes along its edges.
  const blocks = (r: { from: number; to: number; step: number }) => Math.max(1, Math.round((r.to - r.from) / r.step))
  const xAxis: Axis = { start: xr.from, step: xr.step, blocks: blocks(xr), numbering: read.x.numbering }
  const yAxis: Axis = { start: yr.from, step: yr.step, blocks: blocks(yr), numbering: read.y.numbering }
  const grid: GridSettings = {
    xEvery: s.xEvery,
    yEvery: s.yEvery,
    title: s.title,
    titleMode: s.titleMode,
    xTitle: s.xTitle,
    xTitleMode: s.xTitleMode,
    yTitle: s.yTitle,
    yTitleMode: s.yTitleMode,
    xLabel: '',
    xLabelMode: 'none',
    yLabel: '',
    yLabelMode: 'none',
    xStartCap: 'none',
    xEndCap: 'none',
    yStartCap: 'none',
    yEndCap: 'none',
    minor: s.minor,
    labelSize: s.labelSize,
  }

  // Values (or blanks) written at the axes: those landing on the x-axis in
  // rows under its numbers, those on the y-axis left of its numbers.
  const BLANK_W = fs * 2.6
  const widthOf = (r: ReadingOut) => (r.show === 'blank' ? BLANK_W : textWidth(r.text, fs))
  const marked = drawn.filter((r) => r.show !== 'lines')
  const onX = marked.filter((r) => r.axis === 'x')
  const onY = marked.filter((r) => r.axis === 'y')
  // A first layout finds how many rows the x-axis's values need; they only move together after.
  const first = layoutGrid(grid, { x: xAxis, y: yAxis }, { edges: true })
  const rowsFirst = rowsUnder(onX.map((r) => ({ x: first.px(r.at).x, half: widthOf(r) / 2 })))
  const rowH = fs * ROW
  const room = {
    x: rowsFirst.rows ? fs + 6 + (rowsFirst.rows - 1) * rowH : 0,
    y: onY.length ? Math.max(...onY.map(widthOf)) + 10 : 0,
  }
  const laid = layoutGrid(grid, { x: xAxis, y: yAxis }, { edges: true, room })

  // Where the axes meet away from 0 (150 and 0), each axis's first number is
  // written where its others are, rather than nudged apart as the grid does
  // for a 0 written once.
  const xCorner = laid.numbers.find((t) => t.anchor === 'end' && Math.abs(t.y - (laid.xAxis.y + laid.fs + 6)) < 0.01)
  const yCorner = laid.numbers.find((t) => Math.abs(t.x - (laid.yAxis.x - 6)) < 0.01 && Math.abs(t.y - (laid.xAxis.y - 5)) < 0.01)
  const apart = !!xCorner && !!yCorner
  const numbers = laid.numbers.map((t) =>
    apart && t === xCorner ? { ...t, x: laid.grid.x, anchor: 'middle' as const } : apart && t === yCorner ? { ...t, y: laid.xAxis.y + laid.fs * 0.35 } : t,
  )
  const g = { ...laid, numbers }
  const px = g.px
  const box = g.box

  // The points, inside the grid.
  const inside = (p: Point) => p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9
  const points = plotted.filter(inside).map((p) => {
    const q = px(p)
    return { x: round(q.x), y: round(q.y) }
  })
  const paths = join ? clipPath(join, box).map((run) => pathOf(run.map(px))) : []

  // The reading lines: across to the join and down to the x-axis, or up to it and across to the y-axis.
  const guides: Segment[] = []
  for (const r of drawn) {
    if (!inside(r.at)) continue
    for (const l of guidesFrom(px(r.at), g.yAxis.x, g.xAxis.y)) guides.push({ x1: round(l.x1), y1: round(l.y1), x2: round(l.x2), y2: round(l.y2) })
  }

  // The values and blanks at the axes.
  const labels: AxisLabel[] = []
  const blanks: Blank[] = []
  const xNumH = s.xEvery ? fs + 8 : 0
  const under = rowsUnder(onX.filter((r) => inside(r.at)).map((r) => ({ r, x: px(r.at).x, half: widthOf(r) / 2 })))
  for (const m of under.placed) {
    const y = g.xAxis.y + xNumH + fs + 2 + m.row * rowH
    if (m.r.show === 'blank') blanks.push({ x1: round(m.x - BLANK_W / 2), x2: round(m.x + BLANK_W / 2), y: round(y) })
    else labels.push({ x: round(m.x), y: round(y), text: m.r.text, anchor: 'middle' })
  }
  const yNumbers = g.numbers.filter((t) => t.anchor === 'end' && Math.abs(t.x - (g.yAxis.x - 6)) < 0.01)
  const yRight = Math.min(g.yAxis.x - 6, ...yNumbers.map((t) => t.x - textWidth(t.text, fs))) - 8
  const beside = spread(onY.filter((r) => inside(r.at)).map((r) => ({ r, at: px(r.at).y, half: fs * 0.6 })), 3)
  for (const m of beside) {
    if (m.r.show === 'blank') blanks.push({ x1: round(yRight - BLANK_W), x2: round(yRight), y: round(m.at + fs * 0.35) })
    else labels.push({ x: round(yRight), y: round(m.at + fs * 0.35), text: m.r.text, anchor: 'end' })
  }

  // The figure widens for a value written past the grid's right end.
  const width = Math.max(g.width, ...labels.filter((l) => l.anchor === 'middle').map((l) => l.x + textWidth(l.text, fs) / 2 + PAD), ...blanks.map((b) => b.x2 + PAD))

  const colors = s.look === 'color' ? { curve: COLORS.blue, reading: COLORS.red } : { curve: INK, reading: INK }

  return {
    read,
    grid,
    layout: { ...g, width: round(width) },
    fs,
    /** the points as plotted, on the drawing */
    points,
    mark: s.mark,
    /** the join as drawn: one path per run of it on the grid */
    paths,
    /** the join in the axes' own numbers, which every reading is read off */
    join,
    guides,
    labels,
    blanks,
    colors,
    quartiles,
    readings,
    problems: { readings: problems, join: joinProblem },
  }
}

export function readingName(kind: Kind, v: number): string {
  if (kind === 'percentile') return `${ordinal(v)} percentile`
  return `${KINDS[kind]} ${fmt(v)}`
}

export type CumulativeGraph = ReturnType<typeof buildCumulative>
