// Lays out a stem-and-leaf plot as plain numbers for StemAndLeaf.svelte to
// draw: a column of stems, a line, then the leaves in even columns, so the
// rows' lengths compare like bars. Back-to-back, the first set's leaves run
// left from a second line and the second set's right. Leaves can sit in
// boxes, with empty boxes up to a count for students. The key goes under it.

import { LABEL_SCALE } from '$shared/labelSize'
import { round } from '$shared/graph/grid'
import { textWidth } from '$shared/graph/labels'
import { keyText, readPlot, type Settings } from './settings'

const BASE_FS = 20 // the digits' size, at medium labels
const PAD = 16
const MIN_COLUMNS = 3 // leaf columns at least, so a short plot has room
const EMPTY_COLUMNS = 8 // leaf columns when there are no leaves, to write in

export type Text = { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }
export type Line = { x1: number; y1: number; x2: number; y2: number }
export type Box = { x: number; y: number; size: number }

export function buildStemAndLeaf(s: Settings) {
  const read = readPlot(s)
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const headFs = fs * 0.85
  const titleFs = fs * 1.25
  const keyFs = fs * 0.9
  const back = read.back
  const sides = back ? 2 : 1

  // Columns: a leaf's width plus a space, or a box. Each side is as wide as
  // its longest row, its boxes, or its heading.
  const box = fs * 1.45
  const col = s.boxes ? box : fs * 0.95
  const gap = s.boxes ? fs * 0.4 : fs * 0.55 // from a line to the first leaf
  const anyLeaves = read.rows.some((r) => r.leaves.some((l) => l.length))
  const columns = Array.from({ length: sides }, (_, k) =>
    Math.max(anyLeaves ? MIN_COLUMNS : EMPTY_COLUMNS, read.boxes * Number(s.boxes), ...read.rows.map((r) => r.leaves[k].length)),
  )
  const names = back ? [read.sets[0].name || 'Leaf', read.sets[1].name || 'Leaf'] : ['Leaf']
  const headW = (t: string) => (s.headings ? textWidth(t, headFs) : 0)
  const sideW = columns.map((c, k) => Math.max(c * col, headW(names[k]) - gap))
  const stemW = Math.max(fs, ...read.rows.map((r) => textWidth(r.stem, fs)), headW('Stem'))

  // Across, from the left: [left leaves, line], stems, line, leaves.
  const stemGap = fs * 0.5
  const leftEnd = back ? sideW[0] : 0
  const leftLine = back ? leftEnd + gap : null
  const stemX0 = back ? leftLine! + stemGap : 0
  const stemMid = stemX0 + stemW / 2
  const stemRight = stemX0 + stemW
  const line = stemRight + stemGap
  const leafStart = line + gap
  const plotW = leafStart + sideW[back ? 1 : 0]

  // Down: the title, the headings and their rule, then the rows and the key.
  const rowH = s.boxes ? box : fs * 1.5
  const titled = s.titleMode === 'text' && s.title.trim() ? s.title.trim() : ''
  const titleRow = !!titled || s.titleMode === 'blank'
  const titleY = PAD + titleFs
  const y = PAD + (titleRow ? titleFs * 1.7 : 0)
  const headY = y + headFs
  const rule = s.headings ? headY + headFs * 0.55 : null
  const rowsTop = s.headings ? rule! + fs * 0.25 : y
  const rowsBottom = rowsTop + read.rows.length * rowH
  const keyShown = s.keyMode !== 'none'
  const keyY = rowsBottom + keyFs * 1.9
  const keyLine = keyText(s, read.key, back, read.sets.map((t) => t.name))
  const keyW = s.keyMode === 'text' ? textWidth(`Key: ${keyLine}`, keyFs) : textWidth('Key:', keyFs) + keyFs * 8
  const height = (keyShown ? keyY + keyFs * 0.4 : rowsBottom + fs * 0.2) + PAD

  // The plot and its key are centered in the figure, and the title over both.
  const titleW = titled ? textWidth(titled, titleFs) : titleRow ? 260 : 0
  const width = PAD * 2 + Math.max(plotW, keyShown ? keyW : 0, titleW)
  const ox = PAD + (width - PAD * 2 - plotW) / 2
  const at = (x: number) => round(ox + x)

  const leafX = (k: number, i: number) => (back && k === 0 ? leftEnd - (i + 0.5) * col : leafStart + (i + 0.5) * col)
  const baseline = (i: number) => rowsTop + (i + 0.5) * rowH + fs * 0.36

  const stems: Text[] = read.rows.map((r, i) => ({ x: at(back ? stemMid : stemRight), y: round(baseline(i)), text: r.stem, anchor: back ? 'middle' : 'end' }))
  const leaves: Text[] = []
  const boxes: Box[] = []
  read.rows.forEach((r, i) => {
    r.leaves.forEach((l, k) => {
      l.forEach((q, j) => leaves.push({ x: at(leafX(k, j)), y: round(baseline(i)), text: String(q.leaf), anchor: 'middle' }))
      if (!s.boxes) return
      const n = Math.max(l.length, read.boxes)
      for (let j = 0; j < n; j++) boxes.push({ x: at(leafX(k, j) - box / 2), y: round(rowsTop + i * rowH), size: round(box) })
    })
  })

  // The headings over each column, the rule under them, and the upright lines.
  const headings: Text[] = []
  if (s.headings) {
    if (back) {
      headings.push({ x: at(leftEnd - (col - fs * 0.556) / 2), y: round(headY), text: names[0], anchor: 'end' })
      headings.push({ x: at(stemMid), y: round(headY), text: 'Stem', anchor: 'middle' })
    } else headings.push({ x: at(stemRight), y: round(headY), text: 'Stem', anchor: 'end' })
    headings.push({ x: at(leafStart + (col - fs * 0.556) / 2), y: round(headY), text: names[back ? 1 : 0], anchor: 'start' })
  }
  const top = rule ?? rowsTop - fs * 0.1
  const lines: Line[] = [line, ...(leftLine === null ? [] : [leftLine])].map((x) => ({ x1: at(x), y1: round(top), x2: at(x), y2: round(rowsBottom + fs * 0.15) }))
  if (rule !== null) lines.push({ x1: at(-fs * 0.2), y1: round(rule), x2: at(plotW + fs * 0.2), y2: round(rule) })

  // The title, or a blank line for it, and the key, or "Key:" and a line to write it on.
  const title = titled ? { x: round(width / 2), y: round(titleY), text: titled } : null
  const blanks: Line[] = []
  if (!titled && titleRow) blanks.push({ x1: round(width / 2 - 130), y1: round(titleY), x2: round(width / 2 + 130), y2: round(titleY) })
  const keyX = round(PAD + (width - PAD * 2 - keyW) / 2)
  const key = keyShown ? { x: keyX, y: round(keyY), text: s.keyMode === 'text' ? keyLine : '' } : null
  if (key && s.keyMode === 'blank') {
    const x1 = keyX + textWidth('Key: ', keyFs)
    blanks.push({ x1: round(x1), y1: round(keyY), x2: round(keyX + keyW), y2: round(keyY) })
  }

  return {
    read,
    width: round(width),
    height: round(height),
    fs,
    headFs,
    titleFs,
    keyFs,
    title,
    headings,
    stems,
    leaves,
    boxes,
    lines,
    blanks,
    key,
  }
}
