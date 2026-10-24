// Lays out a bar graph as plain numbers for BarGraph.svelte to draw. The value
// axis is the shared graph grid ($shared/graph), with gridlines across it only;
// the category axis is the same grid with no numbers, one stretch of blocks
// per category, and its names drawn here in the room the grid leaves for them.
// Columns stand up from the bottom axis; bars run right from the left one.

import { LABEL_SCALE } from '$shared/labelSize'
import type { Axis, GridSettings } from '$shared/graph/axes'
import { CELL, layoutGrid, round } from '$shared/graph/grid'
import { textWidth } from '$shared/graph/labels'
import { fmt } from '$shared/graph/numbering'
import { fillOf, isDark, isPattern, type Fill } from '$lib/stats/fills'
import { layoutSwatchKey, type KeyLayout } from '$lib/stats/swatchKey'
import { filledRows } from '$lib/stats/table'
import { readGraph, type Settings } from './settings'

const BASE_FS = 14 // the grid's number size, at medium labels
const PAD = 14
const SHARE = { narrow: 0.45, medium: 0.62, wide: 0.8 } // of a category's room taken by its bars
const CROSSBAR = { none: 0, narrow: 0.35, wide: 0.7 } // of a bar's width
const EMPTY_SLOTS = 5 // categories drawn when the table is empty

export type Rect = { x: number; y: number; w: number; h: number }
export type Bar = Rect & { fill: Fill; series: number; row: number }
export type ErrorBar = { x1: number; y1: number; x2: number; y2: number; caps: { x1: number; y1: number; x2: number; y2: number }[] }
export type ValueLabel = { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end'; white: boolean; halo: boolean }
/** A category's name: its lines, where the first sits, and whether it's slanted. */
export type CategoryName = { lines: string[]; x: number; y: number; anchor: 'middle' | 'end'; slant: boolean }

/** Words wrapped into lines no wider than `max`, or null if a word alone is wider. */
function wrap(text: string, fs: number, max: number): string[] | null {
  const lines: string[] = []
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (textWidth(word, fs) > max) return null
    const last = lines.at(-1)
    if (last !== undefined && textWidth(`${last} ${word}`, fs) <= max) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines
}

export function buildBarGraph(s: Settings) {
  const read = readGraph(s)
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const lineH = fs * 1.15
  const columns = s.direction === 'columns'
  const m = read.series
  const rows = read.rows
  const n = rows.length || EMPTY_SLOTS

  // Each category gets k blocks: wider for more bars side by side, and so the
  // graph isn't much flatter than it is tall.
  const { from, to, step } = read.range
  const valueBlocks = Math.max(1, Math.round((to - from) / step))
  const grouped = m > 1 && !read.stacked
  // Under columns, wide enough for each name's longest word too, up to a point.
  const names = rows.map((r) => r.name)
  const longestWord = Math.max(0, ...names.flatMap((t) => t.split(/\s+/)).map((w) => textWidth(w, fs)))
  let k = grouped ? Math.min(m + 1, 5) : 2
  if (columns) k = Math.max(k, Math.min(5, Math.ceil((longestWord + 10) / CELL)))
  while (n * k < valueBlocks * 0.9 && k < 6) k++
  const slot = k * CELL

  // Category names. Under columns they wrap onto two lines to fit their
  // category, or else every name slants; beside bars they wrap to a set width.
  let slant = false
  let wrapped: string[][]
  let room: number
  if (columns) {
    const fits = names.map((t) => wrap(t, fs, slot - 6))
    slant = fits.some((l) => l === null || l.length > 2)
    wrapped = slant ? names.map((t) => [t]) : (fits as string[][])
    const widest = Math.max(0, ...names.map((t) => textWidth(t, fs)))
    room = slant ? widest * Math.SQRT1_2 + fs * 1.2 : Math.max(1, ...wrapped.map((l) => l.length)) * lineH + 6
  } else {
    const max = Math.max(fs * 8, longestWord)
    wrapped = names.map((t) => wrap(t, fs, max) ?? [t])
    room = Math.max(fs * 3, ...wrapped.flat().map((l) => textWidth(l, fs))) + 10
  }
  if (!rows.some((r) => r.name)) room = columns ? fs * 0.6 : fs

  // The shared grid: the value axis numbered, the category axis not.
  const value: Axis = { start: from, step, blocks: valueBlocks, numbering: read.numbering }
  const category: Axis = { start: 0, step: 1 / k, blocks: n * k, numbering: 'decimal' }
  const grid: GridSettings = {
    xEvery: columns ? 0 : s.every,
    yEvery: columns ? s.every : 0,
    title: s.title,
    titleMode: s.titleMode,
    xTitle: columns ? s.categoryTitle : s.valueTitle,
    xTitleMode: columns ? s.categoryTitleMode : s.valueTitleMode,
    yTitle: columns ? s.valueTitle : s.categoryTitle,
    yTitleMode: columns ? s.valueTitleMode : s.categoryTitleMode,
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
  const laid = layoutGrid(grid, columns ? { x: category, y: value } : { x: value, y: category }, { room: columns ? { x: room } : { y: room } })
  // The grid nudges the number where the axes cross clear of the other axis's
  // numbers; the category axis has none, so it goes back on its line.
  const numbers = laid.numbers.map((t) =>
    columns
      ? Math.abs(t.y - (laid.xAxis.y - 5)) < 0.01 ? { ...t, y: laid.xAxis.y + laid.fs * 0.35 } : t
      : t.anchor === 'end' && Math.abs(t.x - (laid.yAxis.x - 8)) < 0.01 ? { ...t, x: laid.yAxis.x, anchor: 'middle' as const } : t,
  )
  const g = { ...laid, numbers }
  const box = g.grid

  // Along the value axis, in drawing units, kept on the grid.
  const at = (v: number) => {
    const c = Math.min(Math.max(v, from), to)
    return columns ? g.px({ x: 0, y: c }).y : g.px({ x: c, y: 0 }).x
  }
  const base = at(0)
  // The middle of category i, across the category axis.
  const mid = (i: number) => (columns ? box.x : box.y) + (i + 0.5) * slot
  /** A bar from value a to value b, `w` wide, centered at c across. */
  const rect = (c: number, w: number, a: number, b: number): Rect => {
    const p = at(a)
    const q = at(b)
    return columns
      ? { x: round(c - w / 2), y: round(Math.min(p, q)), w: round(w), h: round(Math.abs(p - q)) }
      : { x: round(Math.min(p, q)), y: round(c - w / 2), w: round(Math.abs(p - q)), h: round(w) }
  }

  const fills = s.columns.map((_, j) => fillOf(s.look, j, s.fills[j]))
  const groupW = slot * SHARE[s.barWidth]
  const barW = grouped ? groupW / m : groupW
  const bars: Bar[] = []
  const errorBars: ErrorBar[] = []
  const values: ValueLabel[] = []

  /** A value written past the end of a bar (or error bar) at `end`, outward from 0. */
  const atEnd = (c: number, end: number, negative: boolean, text: string) => {
    const gap = fs * 0.35
    if (columns) values.push({ x: c, y: negative ? end + gap + fs * 0.8 : end - gap, text, anchor: 'middle', white: false, halo: true })
    else values.push({ x: negative ? end - gap : end + gap, y: c + fs * 0.36, text, anchor: negative ? 'end' : 'start', white: false, halo: true })
  }
  /** A value written in the middle of a bar. */
  const inside = (r: Rect, fill: Fill, text: string) =>
    values.push({ x: r.x + r.w / 2, y: r.y + r.h / 2 + fs * 0.36, text, anchor: 'middle', white: isDark(fill), halo: isPattern(fill) })
  // A value as the teacher typed it (12.50 stays 12.50), for writing on its bar.
  const filled = filledRows(s.rows)
  const typed = (i: number, j: number) => filled[i]?.cells[j]?.value.trim() ?? ''

  rows.forEach((r, i) => {
    const c = mid(i)
    if (read.stacked) {
      let up = 0
      let down = 0
      r.values.forEach((v, j) => {
        if (v === null) return
        const a = v >= 0 ? up : down
        const b = a + v
        if (v >= 0) up = b
        else down = b
        const bar = { ...rect(c, barW, a, b), fill: fills[j], series: j, row: i }
        bars.push(bar)
        if (s.values === 'inside' && v !== 0) inside(bar, fills[j], typed(i, j) || fmt(v))
      })
      // The stack's total at its end.
      if (r.values.some((v) => v !== null) && s.values === 'end') {
        if (up > 0 || down === 0) atEnd(c, at(up), false, fmt(up))
        if (down < 0) atEnd(c, at(down), true, fmt(down))
      }
      return
    }
    r.values.forEach((v, j) => {
      if (v === null) return
      const cj = grouped ? c - groupW / 2 + (j + 0.5) * barW : c
      const bar = { ...rect(cj, barW, 0, v), fill: fills[j], series: j, row: i }
      bars.push(bar)
      const e = read.errors ? r.errors[j] : null
      let end = at(v)
      if (e) {
        const p = at(v - e)
        const q = at(v + e)
        const half = (barW * CROSSBAR[s.crossbars]) / 2
        const caps = half ? [p, q].map((t) => (columns ? { x1: cj - half, y1: t, x2: cj + half, y2: t } : { x1: t, y1: cj - half, x2: t, y2: cj + half })) : []
        errorBars.push({ ...(columns ? { x1: cj, y1: p, x2: cj, y2: q } : { x1: p, y1: cj, x2: q, y2: cj }), caps })
        // A value at the end clears the error bar on its side.
        end = columns ? (v < 0 ? Math.max(p, q) : Math.min(p, q)) : v < 0 ? Math.min(p, q) : Math.max(p, q)
      }
      if (s.values === 'end') atEnd(cj, end, v < 0, typed(i, j) || fmt(v))
      if (s.values === 'inside' && v !== 0) inside(bar, fills[j], typed(i, j) || fmt(v))
    })
  })

  // Names under each column (or slanted, ending under it), or beside each bar.
  const categories: CategoryName[] = []
  rows.forEach((_, i) => {
    const c = mid(i)
    const lines = wrapped[i]
    if (!lines.length) return
    if (columns && slant) categories.push({ lines, x: c + fs * 0.3, y: box.y + box.h + fs * 0.9, anchor: 'end', slant: true })
    else if (columns) categories.push({ lines, x: c, y: box.y + box.h + fs * 1.15, anchor: 'middle', slant: false })
    else categories.push({ lines, x: box.x - 10, y: c + fs * 0.36 - ((lines.length - 1) * lineH) / 2, anchor: 'end', slant: false })
  })

  // The key, for two or more series: beside the graph or under it. The
  // figure first widens for any value written past the end of a bar.
  let width = Math.max(g.width, ...values.filter((v) => v.anchor === 'start').map((v) => v.x + textWidth(v.text, fs) + PAD))
  let height = g.height
  let key: (KeyLayout & { x: number; y: number }) | null = null
  if (m > 1) {
    const entries = s.columns.map((name, j) => ({ text: name.trim() || `Series ${j + 1}`, fill: fills[j] }))
    if (s.keyAt === 'right') {
      const k = layoutSwatchKey(entries, fs, 'right')
      key = { ...k, x: box.x + box.w + fs * 1.4, y: Math.max(box.y, box.y + (box.h - k.height) / 2) }
      width = Math.max(width, key.x + k.width + PAD)
      height = Math.max(height, key.y + k.height + PAD)
    } else {
      const k = layoutSwatchKey(entries, fs, 'below', Math.max(box.w, fs * 16))
      key = { ...k, x: Math.max(PAD, box.x + box.w / 2 - k.width / 2), y: height }
      width = Math.max(width, key.x + k.width + PAD)
      height += k.height + PAD
    }
  }
  // The teacher's note on the error bars, under everything.
  const note = read.errors && s.errorNote.trim() ? { x: box.x + box.w / 2, y: height + fs * 0.4, text: s.errorNote.trim() } : null
  if (note) {
    width = Math.max(width, textWidth(note.text, fs * 0.95) + PAD * 2)
    note.x = Math.min(Math.max(note.x, textWidth(note.text, fs * 0.95) / 2 + PAD), width - textWidth(note.text, fs * 0.95) / 2 - PAD)
    height += fs * 1.6
  }

  return {
    read,
    grid,
    layout: { ...g, width: round(width), height: round(height) },
    lines: columns ? ('horizontal' as const) : ('vertical' as const),
    fs,
    lineH,
    base,
    bars,
    errorBars,
    values,
    categories,
    key,
    note,
    fills,
  }
}
