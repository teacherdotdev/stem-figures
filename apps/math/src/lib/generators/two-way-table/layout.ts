// Lays out a two-way table as plain numbers for TwoWayTable.svelte to draw:
// the row categories down the left, the column categories across the top, a
// Total column and a Total row, and the variables' titles above and beside the
// headings (or both in a corner split by a diagonal). Every value column is
// as wide as the widest heading or value needs, and the values in it are
// right-aligned on one edge, as a printed table has them.

import { LABEL_SCALE } from '$shared/labelSize'
import { round } from '$shared/graph/grid'
import { textWidth, type Segment } from '$shared/graph/labels'
import { layoutMath, type MathBox } from '$lib/shared/mathSvg'
import { readTwoWay, type Settings } from './settings'

const BASE_FS = 15
const PAD = 14 // around the figure
const LINE = 1.2 // a heading's line height, in font sizes
const MIN_VALUE = 3.6 // the narrowest value column, room to write a number by hand, in font sizes
const MAX_HEADING = 7 // headings wrap at this width (or the values' width), in font sizes

export type Rect = { x: number; y: number; w: number; h: number; shade: boolean }
export type Text = { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end'; bold: boolean; rotate?: boolean }
export type Fraction = { x: number; y: number; w: number; num: string; den: string; bold: boolean }
export type MathText = { x: number; y: number; box: MathBox }
/** A data or total cell: where it is in the table (row i, column j) and on the figure. */
export type CellBox = { i: number; j: number; x: number; y: number; w: number; h: number }

/** Words wrapped into lines no wider than `max`; a word wider than that has a line to itself. */
function wrap(text: string, fs: number, max: number): string[] {
  const lines: string[] = []
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines.at(-1)
    if (last !== undefined && textWidth(`${last} ${word}`, fs) <= max) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines
}

export function buildTable(s: Settings) {
  const read = readTwoWay(s)
  const { R, C } = read
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const lineH = fs * LINE
  const padX = fs * 0.6
  const tc = s.totalColumn
  const tr = s.totalRow

  // What goes in each cell, and how wide it is.
  type Content = { kind: 'text'; text: string } | { kind: 'fraction'; num: string; den: string; w: number } | { kind: 'math'; box: MathBox }
  const contents: (Content | null)[][] = read.cells.map((r) =>
    r.map((c) => {
      const w = c && read.written[c.i][c.j]
      if (!c || !w) return null
      if ('num' in w) return { kind: 'fraction', num: w.num, den: w.den, w: Math.max(textWidth(w.num, fs), textWidth(w.den, fs)) + fs * 0.3 }
      if (c.kind === 'letter') {
        const box = layoutMath(c.typed, fs * 1.1)
        return box ? { kind: 'math', box } : null
      }
      return { kind: 'text', text: w.text }
    }),
  )
  const widthOf = (c: Content) => (c.kind === 'text' ? textWidth(c.text, fs) : c.kind === 'fraction' ? c.w : c.box.w)
  const valuesW = Math.max(0, ...contents.flat().map((c) => (c ? widthOf(c) : 0)))

  // Value columns, all one width: room for the values, the headings (wrapped
  // onto lines), the word Total, and a number written by hand.
  const headings = read.columnNames.map((t) => wrap(t, fs, Math.max(fs * MAX_HEADING, valuesW)))
  let colW = Math.max(
    fs * MIN_VALUE,
    valuesW + 2 * padX,
    ...headings.flat().map((l) => textWidth(l, fs) + 2 * padX),
    textWidth('Total', fs) + 2 * padX,
  )

  // The titles: outside the table (across the top of the headings and down
  // the side of the names), or both in the corner, split by a diagonal.
  const columnTitle = s.columnTitle.trim()
  const rowTitle = s.rowTitle.trim()
  const diagonal = s.corner === 'diagonal' && !!(columnTitle || rowTitle)
  const topTitle = !diagonal && !!columnTitle
  const sideTitle = !diagonal && !!rowTitle
  if (topTitle) colW = Math.max(colW, (textWidth(columnTitle, fs) + 2 * padX) / C)

  let namesW = Math.max(fs * 3, ...read.rowNames.map((t) => textWidth(t, fs)), tr ? textWidth('Total', fs) : 0) + 2 * padX
  let headH = Math.max(1, ...headings.map((l) => l.length)) * lineH + fs * 0.9
  const titleH = fs * 2.1
  const sideW = fs * 2.2

  // Row heights: taller for stacked fractions or tall math.
  const heightOf = (c: Content | null) =>
    !c ? 0 : c.kind === 'fraction' ? fs * 3 : c.kind === 'math' ? c.box.asc + c.box.desc + fs * 0.9 : 0
  const rowHs = Array.from({ length: R + 1 }, (_, i) => Math.max(fs * 2.1, ...contents[i].map(heightOf)))
  // The title down the side fits along the rows beside it.
  if (sideTitle) {
    const need = textWidth(rowTitle, fs) + 2 * padX
    const have = rowHs.slice(0, R).reduce((a, h) => a + h, 0)
    if (need > have) for (let i = 0; i < R; i++) rowHs[i] += (need - have) / R
  }

  // A diagonal corner tall and wide enough that each title clears the line:
  // the column title in the top right, the row title in the bottom left.
  let corner: { x: number; y: number; w: number; h: number } | null = null
  if (diagonal) {
    const a = columnTitle ? textWidth(columnTitle, fs) : 0
    const b = rowTitle ? textWidth(rowTitle, fs) : 0
    const px = fs * 0.45
    const py = fs * 0.35
    const clear = fs * 1.3 + py // a line of text, its gap from the edge and from the line
    let best = { w: Infinity, h: headH, score: Infinity }
    for (let h = Math.max(headH, clear * 1.3); h <= fs * 5; h += fs * 0.1) {
      const w = Math.max(namesW, a ? (px + a) / (1 - clear / h) : 0, b ? (h * (px + b)) / (h - clear) : 0)
      const score = w + 1.5 * h
      if (score < best.score) best = { w, h, score }
    }
    namesW = best.w
    headH = best.h
  }

  // Where each column and row starts.
  const titleText = s.titleMode === 'text' ? s.title.trim() : ''
  const top = PAD + (titleText || s.titleMode === 'blank' ? fs * 2.4 : 0)
  const x0 = PAD
  const xNames = x0 + (sideTitle ? sideW : 0)
  const xData = xNames + namesW
  const colX = (j: number) => xData + j * colW
  const x1 = colX(C + (tc ? 1 : 0))
  const y0 = top
  const yHead = y0 + (topTitle ? titleH : 0)
  const yData = yHead + headH
  const rowY: number[] = [yData]
  for (let i = 0; i <= R; i++) rowY.push(rowY[i] + rowHs[i])
  const y1 = rowY[R + (tr ? 1 : 0)]

  const shade = s.headers === 'gray'
  const rects: Rect[] = []
  const texts: Text[] = []
  const rules: Segment[] = []
  const cellBoxes: CellBox[] = []
  const fractions: Fraction[] = []
  const math: MathText[] = []
  const mid = (y: number, h: number) => y + h / 2 + fs * 0.35 // a line's baseline, centered in a box

  // The corner: blank when the titles are outside it, else a heading cell.
  const blankCorner = topTitle || sideTitle
  if (!blankCorner) {
    corner = { x: xNames, y: yHead, w: namesW, h: headH }
    rects.push({ ...corner, shade })
  }
  if (diagonal && corner) {
    const { x, y, w, h } = corner
    rules.push({ x1: x, y1: y, x2: x + w, y2: y + h })
    const px = fs * 0.45
    const py = fs * 0.35
    if (columnTitle) texts.push({ x: x + w - px, y: y + py + fs * 0.78, text: columnTitle, anchor: 'end', bold: true })
    if (rowTitle) texts.push({ x: x + px, y: y + h - py - fs * 0.22, text: rowTitle, anchor: 'start', bold: true })
  }

  // The column title across the top of the headings, and the row title down the side of the names.
  if (topTitle) {
    rects.push({ x: xData, y: y0, w: C * colW, h: titleH, shade })
    texts.push({ x: xData + (C * colW) / 2, y: mid(y0, titleH), text: columnTitle, anchor: 'middle', bold: true })
  }
  if (sideTitle) {
    const h = rowY[R] - yData
    rects.push({ x: x0, y: yData, w: sideW, h, shade })
    texts.push({ x: x0 + sideW / 2 + fs * 0.35, y: yData + h / 2, text: rowTitle, anchor: 'middle', bold: true, rotate: true })
  }

  // The headings, each centered in its column; Total reaches up beside the column title.
  headings.forEach((lines, j) => {
    rects.push({ x: colX(j), y: yHead, w: colW, h: headH, shade })
    const first = yHead + (headH - lines.length * lineH) / 2 + lineH / 2 + fs * 0.35
    lines.forEach((text, k) => texts.push({ x: colX(j) + colW / 2, y: first + k * lineH, text, anchor: 'middle', bold: true }))
  })
  if (tc) {
    const y = topTitle ? y0 : yHead
    const h = yData - y
    rects.push({ x: colX(C), y, w: colW, h, shade })
    texts.push({ x: colX(C) + colW / 2, y: mid(y, h), text: 'Total', anchor: 'middle', bold: true })
  }

  // The row names down the left; Total reaches across beside the row title.
  read.rowNames.forEach((name, i) => {
    rects.push({ x: xNames, y: rowY[i], w: namesW, h: rowHs[i], shade })
    if (name) texts.push({ x: xNames + padX, y: mid(rowY[i], rowHs[i]), text: name, anchor: 'start', bold: true })
  })
  if (tr) {
    rects.push({ x: x0, y: rowY[R], w: xData - x0, h: rowHs[R], shade })
    texts.push({ x: x0 + padX, y: mid(rowY[R], rowHs[R]), text: 'Total', anchor: 'start', bold: true })
  }

  // The values, right-aligned on one edge a little past each column's middle;
  // or, among stacked fractions, each in its column's middle.
  const centered = contents.flat().some((c) => c?.kind === 'fraction')
  for (const c of read.cells.flat()) {
    if (!c) continue
    const box = { i: c.i, j: c.j, x: colX(c.j), y: rowY[c.i], w: colW, h: rowHs[c.i] }
    cellBoxes.push(box)
    rects.push({ x: box.x, y: box.y, w: box.w, h: box.h, shade: false })
    const content = contents[c.i][c.j]
    if (!content) continue
    const middle = box.x + colW / 2
    const right = centered ? middle + widthOf(content) / 2 : middle + valuesW / 2
    const bold = s.totalsBold && (c.i === R || c.j === C)
    if (content.kind === 'text') texts.push({ x: right, y: mid(box.y, box.h), text: content.text, anchor: 'end', bold })
    else if (content.kind === 'fraction') fractions.push({ x: right - content.w / 2, y: box.y + box.h / 2 - fs * 0.1, w: content.w, num: content.num, den: content.den, bold })
    else math.push({ x: right - content.box.w, y: box.y + box.h / 2 + (content.box.asc - content.box.desc) / 2, box: content.box })
  }

  // Rules: round every cell with the table framed, or only under the
  // headings, beside the names and before the totals.
  let outline: string | null = null
  if (s.rules === 'all') {
    const pts = blankCorner
      ? [[xData, y0], [x1, y0], [x1, y1], [x0, y1], [x0, yData], [xData, yData]]
      : [[xNames, yHead], [x1, yHead], [x1, y1], [xNames, y1]]
    outline = pts.map(([x, y]) => `${round(x)},${round(y)}`).join(' ')
  } else {
    const inset = fs * 0.3
    rules.push({ x1: x0, y1: yData, x2: x1, y2: yData }, { x1: xData, y1: blankCorner ? y0 : yHead, x2: xData, y2: y1 })
    if (tr) rules.push({ x1: x0, y1: rowY[R], x2: x1, y2: rowY[R] })
    if (tc) rules.push({ x1: colX(C), y1: blankCorner ? y0 : yHead, x2: colX(C), y2: y1 })
    if (topTitle) rules.push({ x1: xData + inset, y1: yHead, x2: colX(C) - inset, y2: yHead })
    if (sideTitle) rules.push({ x1: xNames, y1: yData + inset, x2: xNames, y2: rowY[R] - inset })
  }

  // The table's title above it, or a line for students to write one on.
  const left = x0
  const titleY = PAD + fs * 1.3
  let width = x1 + PAD
  if (titleText) width = Math.max(width, x0 + textWidth(titleText, fs * 1.15) + PAD)
  const titleX = Math.min(Math.max((left + x1) / 2, x0 + textWidth(titleText, fs * 1.15) / 2), width - PAD - textWidth(titleText, fs * 1.15) / 2)
  const title = titleText ? { x: titleX, y: titleY, text: titleText } : null
  const titleBlank = s.titleMode === 'blank' ? { x1: (left + x1) / 2 - fs * 7, y1: titleY, x2: (left + x1) / 2 + fs * 7, y2: titleY } : null
  if (titleBlank) {
    titleBlank.x1 = Math.max(x0, titleBlank.x1)
    width = Math.max(width, titleBlank.x2 + PAD)
  }

  const r = <T extends Record<string, unknown>>(o: T): T =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? round(v) : v])) as T
  return {
    read,
    width: round(width),
    height: round(y1 + PAD),
    fs,
    lineH,
    title: title && r(title),
    titleBlank: titleBlank && r(titleBlank),
    rects: rects.map(r),
    outline,
    rules: rules.map(r),
    texts: texts.map(r),
    fractions: fractions.map(r),
    math: math.map((m) => ({ ...m, x: round(m.x), y: round(m.y) })),
    cells: cellBoxes.map(r),
    columns: Array.from({ length: C }, (_, j) => ({ x: round(colX(j)), w: round(colW), lines: headings[j] })),
    names: { x: round(xNames), w: round(namesW) },
  }
}
