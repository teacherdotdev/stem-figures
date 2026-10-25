// Lays out a graph's grid, axes, numbers and titles as plain numbers for
// Grid.svelte to draw. Every block is a square of CELL units; the SVG scales to
// fit wherever it's shown. What's graphed on the grid is each generator's own:
// px() places a point of the graph on the drawing.

import { LABEL_SCALE } from '../labelSize'
import { numberText, type Numbering } from './numbering'
import type { Axes, GridSettings } from './axes'

export const CELL = 32
const BASE_FS = 14 // tick-number font size, at medium labels
const PAD = 14
const EXT = 20 // how far an arrowed axis runs past the grid

export const INK = '#111827'
export const SANS = 'Arial, Helvetica, sans-serif'
export const SERIF = "'Times New Roman', Times, serif"

// How the gridlines are drawn, for a graph that lets the teacher choose: light gray so the
// axes and what's graphed stand out, standard (every other graph's), bold to survive a
// photocopier, or none, which leaves the axes with a tick at each block.
export const GRIDLINES = { light: 'Light', standard: 'Standard', bold: 'Bold', none: 'None' }
export type Gridlines = keyof typeof GRIDLINES
export const GRIDLINE_STYLES: Record<Gridlines, { block: string; blockWidth: number; minor: string; minorWidth: number; axisWidth: number }> = {
  light: { block: '#9ca3af', blockWidth: 1, minor: '#d1d5db', minorWidth: 0.6, axisWidth: 2.4 },
  standard: { block: INK, blockWidth: 1, minor: '#9ca3af', minorWidth: 0.5, axisWidth: 2.4 },
  bold: { block: INK, blockWidth: 1.6, minor: '#4b5563', minorWidth: 0.9, axisWidth: 3.2 },
  none: { block: 'none', blockWidth: 0, minor: 'none', minorWidth: 0, axisWidth: 2.4 },
}

export type Point = { x: number; y: number }
type Text = { x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end' }
type Segment = { x1: number; y1: number; x2: number; y2: number }

export const round = (v: number) => Math.round(v * 100) / 100

function ticks(blocks: number, step: number, start: number, every: number, numbering: Numbering) {
  // Count from the line at 0 when there is one, so "every 5" gives 0, 5, 10…
  const zero = -start / step
  const z = Math.round(zero)
  const ref = Math.abs(zero - z) < 1e-9 && z >= 0 && z <= blocks ? z : 0
  const out: { i: number; text: string }[] = []
  if (!every) return out
  for (let i = 0; i <= blocks; i++) {
    if ((i - ref) % every === 0) out.push({ i, text: numberText(start + i * step, numbering) })
  }
  return out
}

/** Where minor gridlines go, in blocks: each block split into `parts`. */
const minorLines = (blocks: number, parts: number) =>
  parts > 1 ? Array.from({ length: blocks * parts }, (_, k) => k / parts).filter((_, k) => k % parts) : []

/** A grid laid out for Grid.svelte to draw. */
export type GridLayout = Omit<ReturnType<typeof layoutGrid>, 'px' | 'box'>

/**
 * `edges` puts the axes along the grid's left and bottom edges even when 0 is
 * on the grid, for a graph whose negative values aren't a second quadrant
 * (temperatures below 0 °C). `room` keeps space under the grid (`x`) or left
 * of it (`y`) for labels the generator draws itself, such as a bar graph's
 * category names; the axis titles move out past it.
 */
export function layoutGrid(
  s: GridSettings,
  { x, y }: Axes,
  { edges = false, room = {} }: { edges?: boolean; room?: { x?: number; y?: number } } = {},
) {
  const FS = BASE_FS * LABEL_SCALE[s.labelSize]
  const CHAR = FS * 0.6 // rough width of one digit
  const x0 = x.start
  const y0 = y.start
  const x1 = x0 + x.blocks * x.step
  const y1 = y0 + y.blocks * y.step
  const gridW = x.blocks * CELL
  const gridH = y.blocks * CELL

  // Axes cross at 0 when 0 is on the grid, otherwise they run along the left and bottom edges.
  const yAxisInside = !edges && x0 < 0 && x1 > 0
  const xAxisInside = !edges && y0 < 0 && y1 > 0

  const xTicks = ticks(x.blocks, x.step, x0, s.xEvery, x.numbering)
  const yTicks = ticks(y.blocks, y.step, y0, s.yEvery, y.numbering)
  // An axis runs a little past the grid wherever it ends in a cap.
  const extL = s.xStartCap === 'none' ? 0 : EXT
  const extR = s.xEndCap === 'none' ? 0 : EXT
  const extB = s.yStartCap === 'none' ? 0 : EXT
  const extT = s.yEndCap === 'none' ? 0 : EXT

  // Titles are written text, a blank write-on line for students, or nothing.
  // The chart title sits on top; axis titles run along the bottom and left.
  // Axis labels (x, y) sit at the arrow tips.
  const title = s.titleMode === 'text' ? s.title.trim() : ''
  const xTitle = s.xTitleMode === 'text' ? s.xTitle.trim() : ''
  const yTitle = s.yTitleMode === 'text' ? s.yTitle.trim() : ''
  const titleBlank = s.titleMode === 'blank'
  const xBlank = s.xTitleMode === 'blank'
  const yBlank = s.yTitleMode === 'blank'
  const titleRow = title || titleBlank
  const xSide = xTitle || xBlank
  const ySide = yTitle || yBlank
  const xLabel = s.xLabelMode === 'text' ? s.xLabel.trim() : ''
  const yLabel = s.yLabelMode === 'text' ? s.yLabel.trim() : ''
  const xTip = !!xLabel
  const yTip = !!yLabel

  const yNumW = (!yAxisInside && yTicks.length ? Math.max(...yTicks.map((t) => t.text.length)) * CHAR + 8 : 0) + (room.y ?? 0)
  const xRoom = room.x ?? 0
  const xNumH = !xAxisInside && xTicks.length ? FS + 8 : 0
  const lastX = xTicks.at(-1)?.text.length ?? 0

  // Tip labels can be any length; a long y label centered over its axis may
  // need room on either side.
  const TIP_CHAR = FS * 0.75
  const yTipHalf = yTip ? (yLabel.length * TIP_CHAR) / 2 : 0
  const yAxisOffset = yAxisInside ? (-x0 / x.step) * CELL : 0
  const yTipGap = Math.max(extT, 10) // keeps the label clear of the top number

  const L = Math.max(PAD + (ySide ? FS * 1.2 + 12 : 0) + Math.max(extL, yNumW), PAD + yTipHalf - yAxisOffset)
  const T = PAD + (titleRow ? FS * 1.6 + 14 : 0) + (yTip ? yTipGap + FS * 1.3 + 4 : extT)
  const R = PAD + Math.max(
    (lastX * CHAR) / 2,
    extR + (xTip ? xLabel.length * TIP_CHAR + 8 : 0),
    yTipHalf - (gridW - yAxisOffset),
  )
  const B = PAD + Math.max(extB, Math.max(xNumH, yAxisInside ? extB : 0) + xRoom + (xSide ? FS * 1.2 + 14 : 0))

  const axisX = L + yAxisOffset
  const axisY = xAxisInside ? T + gridH + (y0 / y.step) * CELL : T + gridH

  // Tick numbers: x below the x-axis, y to the left of the y-axis. Where the
  // axes cross, a shared value is written once (like the "0" in the corner).
  const onYAxis = (i: number) => Math.abs(L + i * CELL - axisX) < 0.5
  const onXAxis = (j: number) => Math.abs(T + gridH - j * CELL - axisY) < 0.5
  const xCross = xTicks.find((t) => onYAxis(t.i))
  const yCross = yTicks.find((t) => onXAxis(t.i))
  const numbers: (Text & { anchor: 'middle' | 'end' })[] = []
  for (const t of xTicks) {
    const x = L + t.i * CELL
    const cross = t === xCross
    numbers.push({ x: cross ? x - 8 : x, y: axisY + FS + 6, text: t.text, anchor: cross ? 'end' : 'middle' })
  }
  for (const t of yTicks) {
    const y = T + gridH - t.i * CELL
    if (t === yCross && xCross && xCross.text === t.text) continue
    numbers.push({ x: axisX - 6, y: t === yCross ? y - 5 : y + FS * 0.35, text: t.text, anchor: 'end' })
  }

  // Titles, axis labels, and write-on lines for any left blank.
  const labels: (Text & { kind: 'title' | 'tip' | 'side'; rotate?: boolean })[] = []
  const blanks: Segment[] = []
  const midX = L + gridW / 2
  const midY = T + gridH / 2
  const titleY = PAD + FS * 1.6
  if (title) labels.push({ x: midX, y: titleY, text: title, kind: 'title' })
  else if (titleBlank) blanks.push({ x1: midX - Math.min(130, gridW / 2), y1: titleY, x2: midX + Math.min(130, gridW / 2), y2: titleY })

  const xSideY = T + gridH + Math.max(xNumH, yAxisInside ? extB : 0) + xRoom + FS * 1.2 + 6
  if (xTip) labels.push({ x: L + gridW + extR + 6, y: axisY + FS * 0.4, text: xLabel, kind: 'tip', anchor: 'start' })
  if (xTitle) labels.push({ x: midX, y: xSideY, text: xTitle, kind: 'side' })
  else if (xBlank) blanks.push({ x1: midX - Math.min(100, gridW / 2), y1: xSideY, x2: midX + Math.min(100, gridW / 2), y2: xSideY })

  const ySideX = PAD + FS * 0.9
  if (yTip) labels.push({ x: axisX, y: T - yTipGap - 6, text: yLabel, kind: 'tip', anchor: 'middle' })
  if (yTitle) labels.push({ x: ySideX, y: midY, text: yTitle, kind: 'side', rotate: true })
  else if (yBlank) blanks.push({ x1: ySideX, y1: midY - Math.min(100, gridH / 2), x2: ySideX, y2: midY + Math.min(100, gridH / 2) })

  return {
    width: L + gridW + R,
    height: T + gridH + B,
    fs: FS,
    grid: { x: L, y: T, w: gridW, h: gridH },
    vLines: Array.from({ length: x.blocks + 1 }, (_, i) => L + i * CELL),
    hLines: Array.from({ length: y.blocks + 1 }, (_, j) => T + j * CELL),
    // Minor gridlines: the lines inside each block, never on a block's own line.
    minorV: minorLines(x.blocks, s.minor).map((i) => round(L + i * CELL)),
    minorH: minorLines(y.blocks, s.minor).map((j) => round(T + j * CELL)),
    xAxis: { x1: L - extL, x2: L + gridW + extR, y: axisY },
    yAxis: { y1: T + gridH + extB, y2: T - extT, x: axisX },
    numbers,
    labels,
    blanks,
    /** A point of the graph, in the axes' own numbers, on the drawing. */
    px: ({ x: vx, y: vy }: Point): Point => ({ x: L + ((vx - x0) / x.step) * CELL, y: T + gridH - ((vy - y0) / y.step) * CELL }),
    /** The graph's edges, in the axes' own numbers. */
    box: { x0, x1, y0, y1 },
  }
}

/** A path through points already on the drawing: "M1,2L3,4". */
export const pathOf = (pts: Point[]) => pts.map((p, k) => `${k ? 'L' : 'M'}${round(p.x)},${round(p.y)}`).join('')

/**
 * A line through points of the graph (in the axes' own numbers), cut to the
 * graph's edges: the runs of it that are on the grid.
 */
export function clipPath(pts: Point[], box: { x0: number; x1: number; y0: number; y1: number }): Point[][] {
  const runs: Point[][] = []
  let run: Point[] = []
  const end = () => {
    if (run.length > 1) runs.push(run)
    run = []
  }
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1]
    const b = pts[k]
    // Liang–Barsky: how far along a→b the segment enters and leaves the box.
    let t0 = 0
    let t1 = 1
    const dx = b.x - a.x
    const dy = b.y - a.y
    const edges: [number, number][] = [[-dx, a.x - box.x0], [dx, box.x1 - a.x], [-dy, a.y - box.y0], [dy, box.y1 - a.y]]
    let inside = true
    for (const [p, q] of edges) {
      if (p === 0) {
        if (q < 0) inside = false
      } else {
        const t = q / p
        if (p < 0) t0 = Math.max(t0, t)
        else t1 = Math.min(t1, t)
      }
    }
    if (!inside || t0 > t1) {
      end()
      continue
    }
    const at = (t: number) => ({ x: a.x + dx * t, y: a.y + dy * t })
    if (t0 > 0) end()
    if (!run.length) run.push(at(t0))
    run.push(at(t1))
    if (t1 < 1) end()
  }
  end()
  return runs
}
