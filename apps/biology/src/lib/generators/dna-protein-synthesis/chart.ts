// The codon chart: the standard square table of the genetic code. The first
// base runs down the left, the second across the top, and the third down
// the right of each row of cells; each cell lists its four codons and what
// they code for, the start codon and the stop codons marked.

import { aminoName, CHART_ORDER, CODONS, START, STOP, type NameStyle } from './code'
import { textWidth } from './text'

export interface ChartLine {
  x: number
  y: number
  text: string
  /** the start codon or a stop codon, set in bold on a gray band */
  marked: boolean
}

export interface ChartLayout {
  width: number
  height: number
  /** the grid of cells, its outside and the lines between */
  grid: { x: number; y: number; w: number; h: number; cellW: number; cellH: number }
  lines: ChartLine[]
  /** gray bands behind the start and stop codons */
  bands: { x: number; y: number; w: number; h: number }[]
  /** the bases along the edges, and the edge titles */
  letters: { x: number; y: number; text: string; size: number }[]
  titles: { x: number; y: number; text: string; rotate: number }[]
  fs: number
  letterFs: number
  titleFs: number
}

/** A codon's line in the chart: "UUU Phe", "AUG Met (Start)", "UAA Stop". */
export function chartText(codon: string, style: NameStyle) {
  const a = CODONS.get(codon)
  const name = a ? aminoName(a, style) : STOP
  return `${codon} ${name}${codon === START ? ' (Start)' : ''}`
}

export function layoutChart(style: NameStyle, scale: number): ChartLayout {
  const fs = 13 * scale
  const letterFs = 18 * scale
  const titleFs = 13 * scale
  const lineH = fs * 1.5
  const pad = 8 * scale
  const codons = CHART_ORDER.flatMap((a) => CHART_ORDER.flatMap((b) => CHART_ORDER.map((c) => a + b + c)))
  // Bold text is a little wider than the estimate for plain.
  const widest = Math.max(...codons.map((c) => textWidth(chartText(c, style), fs) * (CODONS.get(c) && c !== START ? 1 : 1.08)))
  const cellW = Math.ceil(widest + 2 * pad)
  const cellH = Math.ceil(4 * lineH + 2 * pad * 0.6)

  // Room for the edge titles and the bases along each edge.
  const titleBand = titleFs * 1.6
  const letterBand = letterFs * 1.5
  const gx = titleBand + letterBand
  const gy = titleBand + letterBand
  const thirdBand = fs * 1.6
  const grid = { x: gx, y: gy, w: 4 * cellW, h: 4 * cellH, cellW, cellH }

  const lines: ChartLine[] = []
  const bands: ChartLayout['bands'] = []
  const letters: ChartLayout['letters'] = []
  CHART_ORDER.forEach((first, r) => {
    letters.push({ x: gx - letterBand / 2, y: gy + (r + 0.5) * cellH, text: first, size: letterFs })
    CHART_ORDER.forEach((third, t) => {
      const y = gy + r * cellH + pad * 0.6 + (t + 0.5) * lineH
      letters.push({ x: gx + grid.w + thirdBand / 2, y, text: third, size: fs })
    })
    CHART_ORDER.forEach((second, c) => {
      CHART_ORDER.forEach((third, t) => {
        const codon = first + second + third
        const y = gy + r * cellH + pad * 0.6 + (t + 0.5) * lineH
        const marked = codon === START || !CODONS.get(codon)
        if (marked) bands.push({ x: gx + c * cellW + 2, y: y - lineH / 2, w: cellW - 4, h: lineH })
        lines.push({ x: gx + c * cellW + pad, y, text: chartText(codon, style), marked })
      })
    })
  })
  CHART_ORDER.forEach((second, c) => letters.push({ x: gx + (c + 0.5) * cellW, y: titleBand + letterBand / 2, text: second, size: letterFs }))

  const width = gx + grid.w + thirdBand + titleBand
  const height = gy + grid.h
  const titles = [
    { x: gx + grid.w / 2, y: titleBand / 2, text: 'Second base', rotate: 0 },
    { x: titleBand / 2, y: gy + grid.h / 2, text: 'First base', rotate: -90 },
    { x: gx + grid.w + thirdBand + titleBand / 2, y: gy + grid.h / 2, text: 'Third base', rotate: 90 },
  ]
  return { width, height, grid, lines, bands, letters, titles, fs, letterFs, titleFs }
}
