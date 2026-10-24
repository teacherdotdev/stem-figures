// Lays out a histogram as plain numbers for Histogram.svelte to draw. Both
// axes are the shared graph grid ($shared/graph). The vertical axis is the
// grid's own, numbered from 0. The horizontal one is numbered here, at the
// bins' edges or every step of a range, in the room the grid leaves under it:
// edges needn't fall on every gridline, and unequal bins don't fall evenly.
// When the axis starts past 0 it begins with a zig-zag break.

import { LABEL_SCALE } from '$shared/labelSize'
import type { Axis, GridSettings } from '$shared/graph/axes'
import { CELL, clipPath, layoutGrid, pathOf, round, type Point } from '$shared/graph/grid'
import { textWidth } from '$shared/graph/labels'
import { fmt, niceText } from '$shared/graph/numbering'
import { MEASURES, readHistogram, type Settings } from './settings'

const BASE_FS = 14 // the grid's number size, at medium labels
const PAD = 14
const DOT = 3.6 // the polygon's points

export type Rect = { x: number; y: number; w: number; h: number }
/** A bar, and the bin it stands for (its index in read.bins). */
export type Bar = Rect & { bin: number }
export type Text = { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }

/** A nice step (1, 2 or 5 times a power of ten) at least `rough`. */
function niceStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough))
  for (const k of [1, 2, 5, 10]) if (k * power >= rough - 1e-9) return Number((k * power).toPrecision(12))
  return 10 * power
}

/** The biggest step that every gap in `gaps` is a whole number of, as with 10, 5 and 15 (5). */
function commonUnit(gaps: number[]): number {
  const places = (v: number) => (String(Number(v.toPrecision(12))).split('.')[1] ?? '').length
  const scale = 10 ** Math.min(6, Math.max(0, ...gaps.map(places)))
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  return gaps.map((g) => Math.round(g * scale)).reduce(gcd, 0) / scale
}

export function buildHistogram(s: Settings) {
  const read = readHistogram(s)
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const { bins, heights, y } = read
  const yBlocks = Math.max(1, Math.round((y.to - y.from) / y.step))

  // The horizontal axis: where it starts and ends (past the break, if any)
  // and each block's step. Numbered at the bins' edges, the blocks are a step
  // every edge lands on, split so the graph isn't much flatter than it's tall.
  const edges = [...new Set(bins.flatMap((b) => [b.lo, b.hi]))].sort((a, b) => a - b)
  const byEdges = s.xNumbers === 'edges' && edges.length > 1
  let unit: number
  let start: number
  let end: number
  if (!byEdges) {
    const x = read.x ?? read.xAuto
    ;({ step: unit, from: start, to: end } = x)
  } else {
    const { lo, hi } = read.reach
    const base = commonUnit(edges.slice(1).map((e, i) => e - edges[i]))
    const count = (hi - lo) / base
    const target = Math.min(36, Math.max(12, Math.round(yBlocks * 1.3)))
    if (!(base > 0) || count > 40) {
      // Edges with no common step that fits: blocks of a nice step, edges between lines.
      unit = niceStep((hi - lo) / 24)
      start = Math.floor(lo / unit + 1e-9) * unit
      end = Math.ceil(hi / unit - 1e-9) * unit
    } else {
      const k = [10, 5, 4, 2, 1].find((k) => count * k <= target) ?? 1
      unit = base / k
      start = edges[0] - Math.ceil((edges[0] - lo) / unit - 1e-9) * unit
      end = edges[0] + Math.ceil((hi - edges[0]) / unit - 1e-9) * unit
    }
  }
  // An axis that would start a little past 0 (two blocks, or a quarter of its
  // length) starts at 0 instead, when 0 is on a gridline; any further along,
  // and it gets a break.
  const typedFrom = s.xNumbers === 'steps' && s.xFrom.trim() !== ''
  const fromZero = start / unit
  const near = fromZero <= 2 + 1e-9 || start <= (end - start) / 4 + 1e-9
  if (!typedFrom && start > 0 && near && Math.abs(fromZero - Math.round(fromZero)) < 1e-9) start = 0
  const broken = start > 1e-9
  const axisStart = broken ? start - unit : start
  const blocks = Math.max(1, Math.round((end - axisStart) / unit))

  const yTitle = s.yTitleMode === 'text' && !s.yTitle.trim() ? MEASURES[read.measure] : s.yTitle
  const grid: GridSettings = {
    xEvery: 0,
    yEvery: s.every,
    title: s.title,
    titleMode: s.titleMode,
    xTitle: s.xTitle,
    xTitleMode: s.xTitleMode,
    yTitle,
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
  const xAxis: Axis = { start: axisStart, step: unit, blocks, numbering: byEdges ? 'decimal' : read.xNumbering }
  const yAxis: Axis = { start: 0, step: y.step, blocks: yBlocks, numbering: read.yNumbering }
  // The axes stay on the grid's edges even when the bins run below 0.
  const laid = layoutGrid(grid, { x: xAxis, y: yAxis }, { edges: true, room: { x: fs + 8 } })
  const { px } = laid
  const box = laid.grid
  const axisY = laid.xAxis.y
  const axisX = laid.yAxis.x

  // The horizontal axis's numbers, under it as the grid writes its own,
  // leaving out any that would run into the one before.
  const marks = byEdges ? edges : Array.from({ length: Math.round((end - start) / unit) + 1 }, (_, i) => Number((start + i * unit).toPrecision(12)))
  const xNumbers: Text[] = []
  let right = -Infinity
  for (const v of marks) {
    const x = px({ x: v, y: 0 }).x
    if (x < box.x - 0.5 || x > box.x + box.w + 0.5) continue
    const text = byEdges ? fmt(v) : niceText(v, xAxis.numbering)
    const w = textWidth(text, fs)
    if (x - w / 2 < right + fs * 0.4) continue
    xNumbers.push({ x: round(x), y: round(axisY + fs + 6), text, anchor: 'middle' })
    right = x + w / 2
  }
  // The grid nudges the vertical axis's 0 up, clear of a number under the
  // corner. With a 0 under the corner too, one 0 is written, as the grid
  // writes it; with no number there, the 0 goes back on its line.
  const corner = xNumbers.find((t) => Math.abs(t.x - axisX) < 0.5)
  const isCornerZero = (t: { x: number; y: number }) => Math.abs(t.y - (axisY - 5)) < 0.01 && Math.abs(t.x - (axisX - 6)) < 0.01
  let yNumbers = laid.numbers
  if (corner?.text === '0' && yNumbers.some(isCornerZero)) {
    yNumbers = yNumbers.filter((t) => !isCornerZero(t))
    Object.assign(corner, { x: round(axisX - 8), anchor: 'end' })
  } else if (!corner) {
    yNumbers = yNumbers.map((t) => (isCornerZero(t) ? { ...t, y: round(axisY + fs * 0.35) } : t))
  }

  // The bars, cut to the axes: touching, as their bins do. A bin with no
  // frequency has none.
  const at = (vx: number, vy: number) => px({ x: Math.min(Math.max(vx, start), end), y: Math.min(Math.max(vy, 0), y.to) })
  const bars: Bar[] = []
  if (s.polygon !== 'alone') {
    bins.forEach((b, i) => {
      const h = heights[i]
      if (h === null || b.hi <= start || b.lo >= end) return
      const p = at(b.lo, 0)
      const q = at(b.hi, h)
      bars.push({ x: round(p.x), y: round(q.y), w: round(q.x - p.x), h: round(p.y - q.y), bin: i })
    })
  }

  // The frequency polygon: through each bin's midpoint at its bar's height,
  // left to right, broken where a bin has no frequency; closed down to the
  // axis half a bin past each end.
  const order = bins.map((_, i) => i).sort((a, b) => bins[a].lo - bins[b].lo)
  const points: (Point & { bin: number })[] = []
  const lines: string[] = []
  if (s.polygon !== 'none') {
    const runs: Point[][] = [[]]
    order.forEach((i, k) => {
      const b = bins[i]
      const h = heights[i]
      if (h === null) {
        runs.push([])
        return
      }
      const w = b.hi - b.lo
      const run = runs.at(-1)!
      if (s.closePolygon && k === 0) run.push({ x: b.lo - w / 2, y: 0 })
      run.push({ x: (b.lo + b.hi) / 2, y: h })
      points.push({ x: (b.lo + b.hi) / 2, y: h, bin: i })
      if (s.closePolygon && k === order.length - 1) run.push({ x: b.hi + w / 2, y: 0 })
    })
    const edgesOf = { x0: start, x1: end, y0: 0, y1: y.to }
    for (const run of runs) {
      for (const piece of clipPath(run, edgesOf)) lines.push(pathOf(piece.map(px)))
    }
  }
  const dots = points
    .filter((p) => p.x >= start - 1e-9 && p.x <= end + 1e-9 && p.y <= y.to + 1e-9)
    .map((p) => ({ ...px(p), bin: p.bin }))
    .map((p) => ({ x: round(p.x), y: round(p.y), bin: p.bin }))

  // Each bar's frequency above it (and its polygon point).
  const values: Text[] = []
  if (s.values) {
    bins.forEach((b, i) => {
      if (b.frequency === null || heights[i] === null || b.hi <= start || b.lo >= end) return
      const top = at((b.lo + b.hi) / 2, heights[i]!)
      const lift = s.polygon === 'none' ? fs * 0.35 : fs * 0.35 + DOT + 2 // clear of the polygon's point
      values.push({ x: round(top.x), y: round(top.y - lift), text: fmt(b.frequency), anchor: 'middle' })
    })
  }

  // The zig-zag break, in the middle of the block before the first bin.
  const zig = broken ? (() => {
    const c = px({ x: axisStart + unit / 2, y: 0 }).x
    const a = Math.min(9, CELL * 0.3)
    return {
      cover: { x: round(c - a), y: round(axisY - 3), w: round(2 * a), h: 6 },
      path: pathOf([{ x: c - a, y: axisY }, { x: c - a / 2, y: axisY - 6 }, { x: c, y: axisY + 6 }, { x: c + a / 2, y: axisY - 6 }, { x: c + a, y: axisY }]),
    }
  })() : null

  // Wide enough for the last number under the axis.
  const last = xNumbers.at(-1)
  const width = Math.max(laid.width, last ? last.x + textWidth(last.text, fs) / 2 + PAD : 0)

  return {
    read,
    grid,
    layout: { ...laid, numbers: yNumbers, width: round(width) },
    fs,
    xNumbers,
    bars,
    lines,
    dots,
    values,
    zig,
  }
}
