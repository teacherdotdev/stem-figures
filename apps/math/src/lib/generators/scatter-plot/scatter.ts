// Lays out a scatter plot as plain numbers for ScatterPlot.svelte to draw, on
// the shared graph grid ($shared/graph). Both axes run along the grid's
// edges, numbered here rather than by the grid, so an axis that starts past
// 0 can begin with a block holding a zig-zag break, its first number after
// it. The line of best fit (or the teacher's own) runs across the graph past
// the breaks, with its equation and r written below the graph.

import { LABEL_SCALE } from '$shared/labelSize'
import type { Axis, GridSettings } from '$shared/graph/axes'
import { CELL, GRIDLINE_STYLES, clipPath, layoutGrid, pathOf, round, type Point } from '$shared/graph/grid'
import { textWidth } from '$shared/graph/labels'
import { numberText } from '$shared/graph/numbering'
import { describeCorrelation } from '$lib/stats/regression'
import { correlationText, equationText, readScatter, type AxisRange, type Settings } from './settings'

const BASE_FS = 14 // the grid's number size, at medium labels
const DOT = 4.5 // a dot's radius
const ARM = 5 // half a cross's width

export type Text = { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }

/** Which of an axis's block lines are numbered: every `every`th, counting from 0 when it's on the axis; never the break's. */
function numbered(a: AxisRange, every: number): { i: number; text: string }[] {
  if (!every) return []
  const first = a.broken ? 1 : 0
  const zero = -a.axisStart / a.step
  const z = Math.round(zero)
  const ref = Math.abs(zero - z) < 1e-9 && z >= first && z <= a.blocks ? z : first
  const out: { i: number; text: string }[] = []
  for (let i = first; i <= a.blocks; i++) {
    if ((i - ref) % every === 0) out.push({ i, text: numberText(a.axisStart + i * a.step, a.numbering) })
  }
  return out
}

/**
 * A zig-zag across an axis, in the middle of its first block: a white cover
 * over the axis, and the zig-zag on it. The zig-zag starts and ends with a
 * short run along the axis itself, the axis's own width, so it joins the
 * axis on either side without a step.
 */
function zigzag(c: number, at: number, across: 'x' | 'y', width: number) {
  const a = Math.min(9, CELL * 0.3)
  const lead = 3 // the run along the axis at each end
  const flip = (p: Point): Point => (across === 'x' ? p : { x: p.y, y: p.x })
  const pts = [
    { x: c - a - lead, y: at },
    { x: c - a, y: at },
    { x: c - a / 2, y: at - 6 },
    { x: c + a / 2, y: at + 6 },
    { x: c + a, y: at },
    { x: c + a + lead, y: at },
  ].map(flip)
  const h = width + 2
  const cover = across === 'x' ? { x: c - a, y: at - h / 2, w: 2 * a, h } : { x: at - h / 2, y: c - a, w: h, h: 2 * a }
  return { cover, width, d: `M${pts.map((p) => `${p.x},${p.y}`).join('L')}` }
}

export function buildScatter(s: Settings) {
  const read = readScatter(s)
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const { x, y } = read

  const xMarks = numbered(x, s.xEvery)
  const yMarks = numbered(y, s.yEvery)
  const yNumW = yMarks.length ? Math.max(...yMarks.map((t) => textWidth(t.text, fs))) + 8 : 0

  const grid: GridSettings = {
    xEvery: 0,
    yEvery: 0,
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
  const xAxis: Axis = { start: x.axisStart, step: x.step, blocks: x.blocks, numbering: x.numbering }
  const yAxis: Axis = { start: y.axisStart, step: y.step, blocks: y.blocks, numbering: y.numbering }
  const laid = layoutGrid(grid, { x: xAxis, y: yAxis }, { edges: true, room: { x: xMarks.length ? fs + 8 : 0, y: yNumW } })
  const { px } = laid
  const box = laid.grid
  const axisY = laid.xAxis.y
  const axisX = laid.yAxis.x
  const axisWidth = GRIDLINE_STYLES[s.gridlines].axisWidth

  // The numbers: x under the x-axis, y left of the y-axis. Where both have a
  // number at the corner, the same one (0) is written once, tucked into the
  // corner as the grid writes it; with different ones, the y-axis's is
  // lifted clear of the x-axis's.
  const numbers: (Text & { anchor: 'middle' | 'end' })[] = []
  const xCorner = xMarks.find((t) => t.i === 0)
  const yCorner = yMarks.find((t) => t.i === 0)
  const both = !!xCorner && !!yCorner
  const once = both && xCorner!.text === yCorner!.text
  for (const t of xMarks) {
    const at = round(box.x + t.i * CELL)
    const corner = once && t === xCorner
    numbers.push({ x: corner ? round(at - 8) : at, y: round(axisY + fs + 6), text: t.text, anchor: corner ? 'end' : 'middle' })
  }
  for (const t of yMarks) {
    const at = box.y + box.h - t.i * CELL
    if (once && t === yCorner) continue
    numbers.push({ x: round(axisX - 6), y: round(both && t === yCorner ? at - 5 : at + fs * 0.35), text: t.text, anchor: 'end' })
  }

  const zigs = [
    x.broken ? zigzag(px({ x: x.axisStart + x.step / 2, y: 0 }).x, axisY, 'x', axisWidth) : null,
    y.broken ? zigzag(px({ x: 0, y: y.axisStart + y.step / 2 }).y, axisX, 'y', axisWidth) : null,
  ].filter((z) => z !== null)

  // The points, on the drawing.
  const points = read.points.map((p) => {
    const q = px(p)
    return { x: round(q.x), y: round(q.y) }
  })

  // The line, across the graph past the breaks.
  const edges = { x0: x.start, x1: x.end, y0: y.start, y1: y.end }
  let fitPath: string | null = null
  let fitPts: Point[] = []
  if (read.line) {
    const { slope, intercept } = read.line
    const run = clipPath([{ x: x.start, y: slope * x.start + intercept }, { x: x.end, y: slope * x.end + intercept }], edges)[0]
    if (run) {
      fitPts = run.map(px)
      fitPath = pathOf(fitPts)
    }
  }

  // The equation and r, one under the other below the graph, off the grid
  // so they never cover a point, the line or a gridline.
  const BLANK_W = fs * 5
  type Line = { text: string; blank: boolean }
  const lines: Line[] = []
  if (read.line && s.equation === 'text') lines.push({ text: equationText(read.line, s.places), blank: false })
  if (read.line && s.equation === 'blank') lines.push({ text: 'y =', blank: true })
  const rText = correlationText(s, read.r)
  if (rText) lines.push({ text: rText, blank: false })

  const labels: Text[] = []
  const blanks: { x1: number; y1: number; x2: number; y2: number }[] = []
  const lineH = fs * 1.35
  const below = lines.length ? lineH * (lines.length - 1) + fs * 1.0 : 0
  lines.forEach((l, k) => {
    const w = textWidth(l.text, fs) + (l.blank ? fs * 0.4 + BLANK_W : 0)
    const x0 = box.x + box.w / 2 - w / 2
    const baseline = laid.height + fs * 0.2 + k * lineH
    labels.push({ x: round(x0), y: round(baseline), text: l.text, anchor: 'start' })
    if (l.blank) {
      const x1 = x0 + textWidth(l.text, fs) + fs * 0.4
      blanks.push({ x1: round(x1), y1: round(baseline), x2: round(x1 + BLANK_W), y2: round(baseline) })
    }
  })

  const description = [
    `Scatter plot of ${read.points.length} ${read.points.length === 1 ? 'point' : 'points'}`,
    `x from ${numberText(x.start, x.numbering)} to ${numberText(x.end, x.numbering)}`,
    `y from ${numberText(y.start, y.numbering)} to ${numberText(y.end, y.numbering)}`,
    read.line && (s.fit === 'best' ? `line of best fit ${equationText(read.line, s.places)}` : `line ${equationText(read.line, s.places)}`),
    read.r !== null && read.points.length > 2 && s.r !== 'none' ? describeCorrelation(read.r) : '',
  ].filter(Boolean).join(', ')

  // Wide enough for the last number under the axis.
  const last = numbers.filter((t) => t.anchor === 'middle').at(-1)
  const width = Math.max(laid.width, last ? last.x + textWidth(last.text, fs) / 2 + 14 : 0)

  return {
    read,
    grid,
    layout: { ...laid, numbers, width: round(width), height: round(laid.height + below) },
    fs,
    points,
    dot: DOT,
    arm: ARM,
    fit: fitPath,
    zigs,
    labels,
    blanks,
    description,
  }
}
