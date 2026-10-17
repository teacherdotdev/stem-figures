// The DNA and Protein Synthesis figure, laid out: the rows as flat strands
// of boxes, one per base, every row lined up base under base, with each
// row's name on the left and its 5′ and 3′ ends either side; the hydrogen
// bonds between the DNA strands; a bracket under each codon read; the amino
// acids as a chain of beads or as words under their codons; and the codon
// chart, beside or below the strands, or alone. Boxes are a fixed size, so
// only the row names and amino acids need their text sized.

import { LABEL_SCALE } from '$shared/labelSize'
import { layoutChart, type ChartLayout } from './chart'
import { STOP } from './code'
import { answerLines, worksheetOf, type Row, type Worksheet } from './rows'
import { rowName, type DnaSettings, type RowId } from './settings'
import { textWidth, wrap } from './text'

/** Fills for base boxes in color: light to dark in the order U/T, C, A, G, so they read apart in grayscale too. */
export const BASE_FILLS: Record<string, string> = { T: '#fde68a', U: '#fde68a', C: '#9ae6b4', A: '#f39b9b', G: '#6b93e8' }

/** Which end each row is written from, left to right. */
const ENDS: Record<Exclude<RowId, 'amino'>, [string, string]> = {
  coding: ['5′', '3′'],
  template: ['3′', '5′'],
  mrna: ['5′', '3′'],
  trna: ['3′', '5′'],
}
/** The rows drawn as one strand, with a backbone joining their codons across the gaps. */
const STRANDS = new Set<RowId>(['coding', 'template', 'mrna'])

export interface Text {
  x: number
  y: number
  text: string
  anchor: 'start' | 'middle' | 'end'
}
export interface Line {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface BoxLayout {
  x: number
  y: number
  base: string
  blank: boolean
  fill: string
}

export interface BeadLayout {
  x: number
  y: number
  w: number
  h: number
  /** the name, or '' when blank */
  text: string
  fs: number
  stop: boolean
}

export interface RowLayout {
  id: RowId
  y: number
  h: number
  /** its name, a line at a time, or a blank line to write it on */
  name: Text[]
  nameBlank: Line | null
  ends: Text[]
  endBlanks: Line[]
  boxes: BoxLayout[]
  backbone: Line | null
  beads: BeadLayout[]
  /** joins between beads: the peptide bonds */
  links: Line[]
  /** blank lines for amino acids written as words */
  blanks: Line[]
}

export interface DnaLayout {
  worksheet: Worksheet
  width: number
  height: number
  /** how far the strands and chart are moved right to sit in the middle */
  dx: number
  /** how far the strands are moved right, to sit in the middle of a wider chart below them */
  strandsX: number
  /** how far the strands are moved down, to sit level with a taller chart beside them */
  strandsY: number
  box: number
  fs: number
  nameFs: number
  endFs: number
  rows: RowLayout[]
  /** each hydrogen bond, a short line between paired bases */
  bonds: Line[]
  /** the brackets under the codons, as paths */
  brackets: string[]
  chart: (ChartLayout & { x: number; y: number }) | null
  /** said in the figure when there are no bases to draw */
  empty: Text | null
  title: string
  answer: string[]
}

/** The answer key and title are set by FigureFrame in Arial at these sizes. */
const KEY_FS = 18
const TITLE_FS = 22

export function buildDna(s: DnaSettings): DnaLayout {
  const k = LABEL_SCALE[s.labelSize]
  const worksheet = worksheetOf(s)
  const { reading, translation } = worksheet
  const n = reading.bases.length

  const fs = 17 * k
  const box = Math.max(28, Math.round(fs + 12))
  const gap = s.gaps ? Math.round(box * 0.4) : 0
  const nameFs = 14 * k
  const endFs = 15 * k
  const aminoFs = 14 * k

  // Columns: a gap before each codon from the reading frame's start, so the
  // codons stand apart on every row and still line up.
  const start = translation.start
  const groupOf = (col: number) => (start === null || col < start ? 0 : (start > 0 ? 1 : 0) + Math.floor((col - start) / 3))
  const colX = (col: number) => col * box + groupOf(col) * gap
  const stripW = n ? colX(n - 1) + box : 0

  // The name column, each name wrapped to two lines or so.
  const named = s.rowNames !== 'off'
  const nameMax = 112 * k
  const rowsOn = worksheet.rows
  const nameLines = new Map(rowsOn.map((r) => [r.id, wrap(rowName(s, r.id), nameFs, nameMax)]))
  const nameW = !named ? 0 : s.rowNames === 'blank' ? 96 * k : Math.max(...[...nameLines.values()].flat().map((l) => textWidth(l, nameFs)), 0)
  const nameCol = named ? Math.ceil(nameW + 16 * k) : 0
  const endW = s.ends === 'off' ? 6 : s.ends === 'blank' ? Math.ceil(36 * k) : Math.ceil(textWidth('5′', endFs) + 12 * k)
  const left = nameCol + endW

  // Rows down the page.
  const rowGap = Math.round(box * 0.7)
  const beadH = Math.round(box * 1.05)
  const textRowH = Math.round(aminoFs * 1.6)
  const bracketH = s.brackets ? Math.round(box * 0.45) : 0
  const bondsOn = s.bonds && s.coding !== 'off' && s.template !== 'off'
  const rows: RowLayout[] = []
  let y = 0
  let prev: Row | undefined
  for (const r of rowsOn) {
    if (prev) y += rowGap + (prev.id === 'coding' && r.id === 'template' && bondsOn ? Math.round(box * 0.3) : 0) + (prev.id === 'mrna' ? bracketH : 0)
    const h = r.id === 'amino' ? (s.aminoStyle === 'beads' ? beadH : textRowH) : box
    rows.push(layoutRow(r, y, h))
    y += h
    prev = r
  }
  if (prev?.id === 'mrna') y += bracketH
  const stripsH = rowsOn.length ? y : 0

  function layoutRow(r: Row, top: number, h: number): RowLayout {
    const mid = top + h / 2
    const lines = nameLines.get(r.id)!
    const lineH = nameFs * 1.2
    const name: Text[] =
      s.rowNames === 'shown'
        ? lines.map((text, i) => ({ x: 0, y: mid + (i - (lines.length - 1) / 2) * lineH, text, anchor: 'start' }))
        : []
    const nameBlank = s.rowNames === 'blank' ? { x1: 0, y1: mid + nameFs * 0.5, x2: nameW, y2: mid + nameFs * 0.5 } : null
    const out: RowLayout = { id: r.id, y: top, h, name, nameBlank, ends: [], endBlanks: [], boxes: [], backbone: null, beads: [], links: [], blanks: [] }

    if (r.id === 'amino') {
      layoutAminos(r, out, top, h)
      return out
    }
    out.boxes = r.boxes.map((b) => ({
      x: left + colX(b.col), y: top, base: b.base, blank: b.blank,
      fill: s.color && !b.blank ? (BASE_FILLS[b.base] ?? '#fff') : '#fff',
    }))
    if (!r.boxes.length) return out
    const x0 = left + colX(r.boxes[0].col)
    const x1 = left + colX(r.boxes.at(-1)!.col) + box
    if (STRANDS.has(r.id)) out.backbone = { x1: x0 + box / 2, y1: mid, x2: x1 - box / 2, y2: mid }
    const [l, rt] = ENDS[r.id]
    if (s.ends === 'shown') {
      out.ends = [
        { x: x0 - 6 * k, y: mid, text: l, anchor: 'end' },
        { x: x1 + 6 * k, y: mid, text: rt, anchor: 'start' },
      ]
    } else if (s.ends === 'blank') {
      const w = endW - 10 * k
      const by = mid + endFs * 0.5
      out.endBlanks = [
        { x1: x0 - 5 * k - w, y1: by, x2: x0 - 5 * k, y2: by },
        { x1: x1 + 5 * k, y1: by, x2: x1 + 5 * k + w, y2: by },
      ]
    }
    return out
  }

  function layoutAminos(r: Extract<Row, { id: 'amino' }>, out: RowLayout, top: number, h: number) {
    const mid = top + h / 2
    const span = 3 * box
    // A bead can reach into the gaps either side of its codon.
    const maxW = span + gap - Math.max(8, 6 * k)
    const pad = 16 * k
    // Bold names run a little wider than the estimate.
    const wide = (text: string, size: number) => textWidth(text, size) * 1.1
    // Blank beads are as wide as a written one would be, so they don't give the name away.
    const typical = s.aminoNames === 'full' ? maxW : Math.min(maxW, Math.max(beadH, wide(s.aminoNames === 'one' ? 'W' : 'Met', aminoFs) + pad))
    for (const a of r.aminos) {
      const cx = left + colX(a.col) + span / 2
      if (s.aminoStyle === 'text') {
        if (a.blank) out.blanks.push({ x1: cx - maxW / 2, y1: mid + aminoFs * 0.5, x2: cx + maxW / 2, y2: mid + aminoFs * 0.5 })
        else out.beads.push({ x: cx, y: mid, w: 0, h: 0, text: a.name, fs: Math.min(aminoFs, (maxW - 4) / wide(a.name, 1)), stop: a.stop })
        continue
      }
      if (a.stop && !a.blank) {
        out.beads.push({ x: cx, y: mid, w: 0, h: 0, text: STOP, fs: aminoFs, stop: true })
        continue
      }
      const want = a.blank ? typical : Math.max(beadH, wide(a.name, aminoFs) + pad)
      const w = Math.min(maxW, Math.max(typical, want))
      const fit = Math.min(aminoFs, (w - pad) / wide(a.name, 1))
      out.beads.push({ x: cx, y: mid, w, h: beadH, text: a.blank ? '' : a.name, fs: fit, stop: a.stop })
    }
    // Peptide bonds between neighbouring amino acids, not on to Stop.
    if (s.aminoStyle === 'beads') {
      const chain = out.beads.filter((b) => b.w > 0 && !b.stop)
      for (let i = 1; i < chain.length; i++) {
        out.links.push({ x1: chain[i - 1].x + chain[i - 1].w / 2, y1: mid, x2: chain[i].x - chain[i].w / 2, y2: mid })
      }
    }
  }

  // Hydrogen bonds: 2 between A and T, 3 between G and C, wherever both bases are written in.
  const bonds: Line[] = []
  const codingRow = rows.find((r) => r.id === 'coding')
  const templateRow = rows.find((r) => r.id === 'template')
  if (bondsOn && codingRow && templateRow) {
    const correct = reading.strands.coding
    codingRow.boxes.forEach((b, col) => {
      const t = templateRow.boxes[col]
      if (b.blank || t.blank) return
      const count = correct[col] === 'G' || correct[col] === 'C' ? 3 : 2
      const step = box * 0.2
      for (let j = 0; j < count; j++) {
        const x = b.x + box / 2 + (j - (count - 1) / 2) * step
        bonds.push({ x1: x, y1: codingRow.y + box + 3, x2: x, y2: templateRow.y - 3 })
      }
    })
  }

  // A bracket under each mRNA codon that's read, Stop's included.
  const brackets: string[] = []
  const mrnaRow = rows.find((r) => r.id === 'mrna')
  if (s.brackets && mrnaRow) {
    const by = mrnaRow.y + box + 4
    for (const c of translation.codons.filter((c) => c.code !== null)) {
      const x0 = left + colX(c.at) + 3
      const x1 = left + colX(c.at + 2) + box - 3
      brackets.push(`M${x0} ${by}V${by + bracketH - 8}H${x1}V${by}`)
    }
  }

  // The strands' size, then the chart's place beside or below them.
  const showStrands = s.show !== 'chart'
  const strandsW = showStrands ? (n ? left + stripW + endW : 0) : 0
  const strandsH = showStrands ? stripsH : 0
  let chart: DnaLayout['chart'] = null
  let width = strandsW
  let height = strandsH
  let strandsX = 0
  let strandsY = 0
  if (s.show !== 'strands') {
    const c = layoutChart(s.aminoNames, k)
    const besides = s.show === 'both' && strandsW > 0
    const right = besides && s.chartAt === 'right'
    const cx = right ? strandsW + 48 : 0
    const cy = besides && !right ? strandsH + 40 : 0
    chart = { ...c, x: cx, y: right ? Math.max(0, (strandsH - c.height) / 2) : cy }
    width = Math.max(width, cx + c.width)
    height = Math.max(height, chart.y + c.height)
    // A chart taller than the strands beside it: the strands sit level with its middle.
    if (right && c.height > strandsH) strandsY = (c.height - strandsH) / 2
    // One below the other: the narrower one sits in the middle.
    if (besides && !right) {
      if (c.width > strandsW) strandsX = (c.width - strandsW) / 2
      else chart.x = (strandsW - c.width) / 2
    }
  }

  let empty: Text | null = null
  if (showStrands && !n && s.show === 'strands') {
    empty = { x: 160, y: 30, text: 'Type a DNA or mRNA sequence', anchor: 'middle' }
    width = 320
    height = 60
  }

  // The answer key and title sit under and over the drawing; widen it to hold them.
  const title = s.titleMode === 'text' ? s.title.trim() : ''
  const answer = s.answerKey ? answerLines(s, worksheet) : []
  const textW = Math.max(0, ...answer.map((l) => textWidth(l, KEY_FS)), title ? textWidth(title, TITLE_FS) * 1.08 : 0)
  const full = Math.max(width, Math.ceil(textW))
  const dx = (full - width) / 2

  const drawn = showStrands && n > 0
  return {
    worksheet, width: full, height, dx, strandsX, strandsY, box, fs, nameFs, endFs,
    rows: drawn ? rows : [], bonds: drawn ? bonds : [], brackets: drawn ? brackets : [], chart, empty, title, answer,
  }
}

/** What the figure shows, for screen readers. */
export function describeFigure(s: DnaSettings, d: DnaLayout) {
  const { reading, translation } = d.worksheet
  const parts: string[] = []
  if (s.show !== 'chart' && reading.bases.length) {
    const rows = d.worksheet.rows.map((r) => `${rowName(s, r.id)}${r.mode === 'blank' ? ' (blank)' : r.mode === 'some' ? ' (partly blank)' : ''}`)
    parts.push(`DNA and protein synthesis rows: ${rows.join(', ')}.`)
    parts.push(`mRNA 5′-${reading.strands.mrna}-3′.`)
    const coded = translation.codons.filter((c) => c.code !== null).length
    if (coded) parts.push(`${coded} codons read.`)
  }
  if (s.show !== 'strands') parts.push('The standard codon chart: first base down the left, second across the top, third down the right.')
  return parts.join(' ') || 'An empty DNA and protein synthesis figure.'
}
