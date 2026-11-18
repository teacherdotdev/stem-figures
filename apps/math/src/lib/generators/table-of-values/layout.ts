// Lays out a table of values as plain numbers for TableOfValues.svelte to
// draw: the headings in a column (across) or a row (down) of their own, then a
// cell per x-value and its y-value, every value cell one size so the table
// reads evenly, and each value centered in its cell. The table's title goes
// above it, and the rule (or a blank line for it) between the two.

import { LABEL_SCALE } from '$shared/labelSize'
import { round } from '$shared/graph/grid'
import { textWidth } from '$shared/graph/labels'
import { layoutMath, type MathBox } from '$lib/shared/mathSvg'
import { isWords, readTable, ruleAsY, type ReadCell, type Settings } from './settings'

const BASE_FS = 15
const PAD = 14 // around the figure
const MIN_CELL = 2.8 // the narrowest value cell, room to write a number by hand, in font sizes
const MIN_ROW = 2.2 // the shortest row, in font sizes
const MATH = 1.12 // math is set a little larger than the headings' sans, so they look one size
const EMPTY_CELLS = 5 // value cells drawn while there are no values yet
const BOLD = 1.08 // how much wider bold text is

export type Rect = { x: number; y: number; w: number; h: number; shade: boolean }
export type Text = { x: number; y: number; text: string; bold: boolean }
export type MathText = { x: number; y: number; box: MathBox }
/** A value cell: its key (x3, y3) and where it is on the figure, for clicking it into a blank. */
export type CellBox = { key: string; name: string; x: number; y: number; w: number; h: number }

type Content = { kind: 'text'; text: string; w: number; bold: boolean } | { kind: 'math'; box: MathBox } | null

export function buildTable(s: Settings) {
  const read = readTable(s)
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const padX = fs * 0.7
  const across = s.direction === 'across'

  /** What's written in a cell: words in the sans the headings use, math as math. */
  function content(typed: string, words: boolean, bold = false): Content {
    const t = typed.trim()
    if (!t) return null
    if (words) return { kind: 'text', text: t, w: textWidth(t, fs) * (bold ? BOLD : 1), bold }
    const box = layoutMath(t, fs * MATH)
    return box && { kind: 'math', box }
  }
  const widthOf = (c: Content) => (!c ? 0 : c.kind === 'text' ? c.w : c.box.w)
  const heightOf = (c: Content) => (!c ? 0 : c.kind === 'text' ? fs * 1.2 : c.box.asc + c.box.desc)

  const heads = [s.xHeading, s.yHeading].map((h) => content(h, isWords(h), true))
  const n = Math.max(read.n, read.n ? 0 : EMPTY_CELLS)
  const cellOf = (c: ReadCell | undefined): Content => (!c || c.blank ? null : content(c.written, c.words))
  const values = [0, 1].map((side) => Array.from({ length: n }, (_, k) => cellOf((side ? read.ys : read.xs)[k])))

  // Every value cell one size: room for the widest value and a number written by hand.
  const valueW = Math.max(fs * MIN_CELL, ...values.flat().map((c) => widthOf(c) + 2 * padX))
  const headW = Math.max(fs * MIN_CELL, ...heads.map((c) => widthOf(c) + 2 * padX))
  const tall = (list: Content[]) => Math.max(fs * MIN_ROW, ...list.map((c) => heightOf(c) + fs * 1.0))

  // The rule above the table, or a line for students to write it on, and the title above that.
  const titleText = s.titleMode === 'text' ? s.title.trim() : ''
  const titleFs = fs * 1.15
  let y = PAD
  const titleY = titleText || s.titleMode === 'blank' ? y + fs * 1.3 : null
  if (titleY !== null) y = titleY + fs * 1.1
  const ruleBox =
    // As typed, with y = before a rule typed without it.
    s.showRule === 'text' && read.ruleText ? layoutMath(read.ruleText.includes('=') ? read.ruleText : ruleAsY(read.ruleText), titleFs * MATH)
    : s.showRule === 'blank' ? layoutMath(`${isWords(s.yHeading) || !s.yHeading.trim() ? 'y' : s.yHeading.trim()}=`, titleFs * MATH)
    : null
  const ruleLine = s.showRule === 'blank' ? fs * 8 : 0
  let ruleY: number | null = null
  if (ruleBox) {
    ruleY = y + ruleBox.asc + fs * 0.4
    y = ruleY + ruleBox.desc + fs * 0.8
  }
  const top = y + (titleY === null && !ruleBox ? 0 : fs * 0.2)

  // The grid of cells: headings first, then the values.
  const rects: Rect[] = []
  const texts: Text[] = []
  const math: MathText[] = []
  const cells: CellBox[] = []
  const shade = s.headers === 'gray'
  /** Put a cell's content in the middle of its box. */
  function place(c: Content, x: number, y: number, w: number, h: number) {
    if (!c) return
    if (c.kind === 'text') texts.push({ x: x + (w - c.w) / 2, y: y + h / 2 + fs * 0.35, text: c.text, bold: c.bold })
    else {
      // One line of math is centered on its digits, as the words are; a stacked fraction on its bar.
      const oneLine = c.box.asc <= fs * MATH * 0.75
      math.push({ x: x + (w - c.box.w) / 2, y: y + h / 2 + (oneLine ? c.box.asc / 2 : (c.box.asc - c.box.desc) / 2), box: c.box })
    }
  }
  // A value cell's name for screen readers, by the headings: y for x = 3, the same words as the missing values.
  const X = s.xHeading.trim() || 'x'
  const Y = s.yHeading.trim() || 'y'
  const nameOf = (side: number, k: number) => {
    const other = (side ? read.xs : read.ys)[k]
    const [what, by] = side ? [Y, X] : [X, Y]
    const at = across ? 'column' : 'row'
    return other?.written && !other.blank ? `${what} for ${by} = ${other.written.replace(/-/g, '−').replace(/pi/g, 'π')}` : `${what} in ${at} ${k + 1}`
  }

  let x1: number
  let y1: number
  if (across) {
    const rowHs = [0, 1].map((side) => tall([heads[side], ...values[side]]))
    const rowY = [top, top + rowHs[0]]
    x1 = PAD + headW + n * valueW
    y1 = top + rowHs[0] + rowHs[1]
    for (const side of [0, 1]) {
      rects.push({ x: PAD, y: rowY[side], w: headW, h: rowHs[side], shade })
      place(heads[side], PAD, rowY[side], headW, rowHs[side])
      for (let k = 0; k < n; k++) {
        const box = { x: PAD + headW + k * valueW, y: rowY[side], w: valueW, h: rowHs[side] }
        rects.push({ ...box, shade: false })
        place(values[side][k], box.x, box.y, box.w, box.h)
        if (k < read.n) cells.push({ key: `${side ? 'y' : 'x'}${k}`, name: nameOf(side, k), ...box })
      }
    }
  } else {
    const colW = Math.max(headW, valueW)
    const headH = tall(heads)
    const rowHs = Array.from({ length: n }, (_, k) => tall([values[0][k], values[1][k]]))
    x1 = PAD + 2 * colW
    let rowY = top + headH
    for (const side of [0, 1]) {
      rects.push({ x: PAD + side * colW, y: top, w: colW, h: headH, shade })
      place(heads[side], PAD + side * colW, top, colW, headH)
    }
    for (let k = 0; k < n; k++) {
      for (const side of [0, 1]) {
        const box = { x: PAD + side * colW, y: rowY, w: colW, h: rowHs[k] }
        rects.push({ ...box, shade: false })
        place(values[side][k], box.x, box.y, box.w, box.h)
        if (k < read.n) cells.push({ key: `${side ? 'y' : 'x'}${k}`, name: nameOf(side, k), ...box })
      }
      rowY += rowHs[k]
    }
    y1 = rowY
  }

  // The title and the rule, centered over the table (and the figure widened if they need it).
  const titleW = titleText ? textWidth(titleText, titleFs) * BOLD : s.titleMode === 'blank' ? fs * 14 : 0
  const ruleW = ruleBox ? ruleBox.w + (ruleLine ? fs * 0.4 + ruleLine : 0) : 0
  const width = Math.max(x1 + PAD, PAD * 2 + titleW, PAD * 2 + ruleW)
  const middle = Math.max((PAD + x1) / 2, PAD + Math.max(titleW, ruleW) / 2)
  const title = titleText && titleY !== null ? { x: middle, y: titleY, text: titleText } : null
  const titleBlank = !titleText && titleY !== null && s.titleMode === 'blank' ? { x1: middle - titleW / 2, y1: titleY, x2: middle + titleW / 2, y2: titleY } : null
  const rule = ruleBox && ruleY !== null ? { x: middle - ruleW / 2, y: ruleY, box: ruleBox } : null
  const ruleBlank = rule && ruleLine ? { x1: rule.x + ruleBox!.w + fs * 0.4, y1: ruleY! + fs * 0.15, x2: rule.x + ruleW, y2: ruleY! + fs * 0.15 } : null

  // Centered in the figure when the title or rule is wider than the table.
  const shift = middle - (PAD + x1) / 2
  const moved = <T extends { x: number }>(o: T): T => ({ ...o, x: o.x + shift })

  const r = <T extends Record<string, unknown>>(o: T): T =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? round(v) : v])) as T
  return {
    read,
    width: round(width),
    height: round(y1 + PAD),
    fs,
    titleFs,
    title: title && r(title),
    titleBlank: titleBlank && r(titleBlank),
    rule: rule && { ...rule, x: round(rule.x), y: round(rule.y) },
    ruleBlank: ruleBlank && r(ruleBlank),
    outline: r({ x: PAD + shift, y: top, w: x1 - PAD, h: y1 - top }),
    rects: rects.map((o) => r(moved(o))),
    texts: texts.map((o) => r(moved(o))),
    math: math.map((m) => ({ ...m, x: round(m.x + shift), y: round(m.y) })),
    cells: cells.map((o) => r(moved(o))),
  }
}

export type TableLayout = ReturnType<typeof buildTable>
