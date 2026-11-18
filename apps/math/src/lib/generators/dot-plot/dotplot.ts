// Lays out a dot plot as plain numbers for DotPlot.svelte to draw: a column
// of marks (dots or X's) over each value, stacked up from a number line. The
// line is always LINE units long, like the Number Line's and the Box Plot's,
// so every figure pastes into a worksheet at the same width; the figure grows
// taller with its tallest column, and the marks shrink to keep it from
// growing too tall or neighbouring columns from running into each other.

import { LABEL_SCALE } from '$shared/labelSize'
import { numberLabel, numberText, type Label } from '$shared/graph/numbering'
import { readPlot, type Settings } from './settings.js'

export const LINE = 600
// Font sizes at the medium label size (see labelSize.ts).
const BASE_FS = 16 // numbers
const BASE_TITLE_FS = 22
const BASE_AXIS_TITLE_FS = 17
const PAD = 16
const EXT = 22 // how far the line runs past its last tick, to its end cap
const TICK = 9 // half height of a numbered tick
const MINOR = 5 // half height of the ticks between numbers
const MARK = 18 // a mark's width at most
const MIN_MARK = 3 // and at least, however tall a column is
const FILL = 0.8 // how much of the room between two columns a mark takes
const PITCH = 1.15 // from one mark up to the next, in marks
const MAX_COLUMN = 300 // the tallest a column grows before its marks shrink
const ABOVE = TICK + 4 // from the line up to the bottom mark, clear of the ticks
const EMPTY = 40 // room over the line when there are no marks yet
const EPS = 1e-9

/** A dot plot laid out for DotPlot.svelte to draw. */
export type PlotLayout = ReturnType<typeof buildPlot>

/** A number under the line: on one line of text, or a stacked fraction. */
type LineNumber =
  | { x: number; text: string; y: number; sign?: undefined; num?: undefined; den?: undefined }
  | { x: number; sign: string; num: string; den: string; numY: number; barY: number; denY: number; text?: undefined; y?: undefined }

export function buildPlot(s: Settings) {
  const scale = LABEL_SCALE[s.labelSize]
  const FS = BASE_FS * scale
  const TITLE_FS = BASE_TITLE_FS * scale
  const AXIS_TITLE_FS = BASE_AXIS_TITLE_FS * scale
  const CHAR = FS * 0.6 // rough width of one digit
  const labelWidth = (l: Label) => (l.text ?? (l.num!.length > l.den!.length ? l.num : l.den) + l.sign!).length * CHAR
  const { stacks, range, numbering } = readPlot(s)
  const { from, to, step } = range

  // Ticks, numbering every nth one counting from the tick at 0 when there is
  // one, so "every 5" gives 0, 5, 10…
  const count = Math.floor((to - from) / step + EPS)
  const zero = -from / step
  const z = Math.round(zero)
  const ref = Math.abs(zero - z) < EPS && z >= 0 && z <= count ? z : 0
  const ticks: { v: number; major: boolean; label: Label | null }[] = []
  for (let i = 0; i <= count; i++) {
    const v = from + i * step
    const numbered = !!s.every && (i - ref) % s.every === 0
    ticks.push({ v, major: numbered || !s.every, label: numbered ? numberLabel(v, numbering) : null })
  }
  const labels = ticks.filter((t): t is { v: number; major: boolean; label: Label } => !!t.label)
  const stacked = labels.some((l) => l.label.den)
  const numbersH = labels.length ? (stacked ? FS * 2.3 : FS) + 6 : 0

  const first = labels.find((l) => Math.abs(l.v - from) < EPS * Math.max(1, Math.abs(from)))
  const last = labels.find((l) => Math.abs(l.v - to) < EPS * Math.max(1, Math.abs(to)))
  const L = PAD + Math.max(EXT, first ? labelWidth(first.label) / 2 : 0)
  const Rt = PAD + Math.max(EXT, last ? labelWidth(last.label) / 2 : 0)
  const x = (v: number) => L + ((v - from) / (to - from)) * LINE

  // How big a mark is: as wide as the room between ticks or between two
  // columns allows, and small enough that the tallest column stays in bounds.
  const columns = stacks.filter((st) => st.count > 0)
  const gaps = [LINE / Math.max(1, count), ...columns.slice(1).map((st, i) => x(st.value) - x(columns[i].value))]
  const tallest = Math.max(0, ...columns.map((st) => st.count))
  const mark = Math.max(MIN_MARK, Math.min(MARK, FILL * Math.min(...gaps), tallest ? MAX_COLUMN / (tallest * PITCH) : MARK))
  const pitch = mark * PITCH

  // Titles are written text, a blank write-on line for students, or nothing.
  const title = s.titleMode === 'text' ? s.title.trim() : ''
  const titleRow = title || s.titleMode === 'blank'
  const axisTitle = s.axisTitleMode === 'text' ? s.axisTitle.trim() : ''
  const axisTitleRow = axisTitle || s.axisTitleMode === 'blank'

  const titleY = PAD + TITLE_FS
  const top = PAD + (titleRow ? TITLE_FS * 1.3 + 12 : 0)
  const axisY = top + (tallest ? tallest * pitch - (pitch - mark) + ABOVE : EMPTY)
  const numbersTop = axisY + TICK + 6
  const axisTitleY = numbersTop + numbersH + AXIS_TITLE_FS + 4
  const height = (axisTitleRow ? axisTitleY + 6 : numbersTop + numbersH) + PAD
  const width = L + LINE + Rt
  const midX = L + LINE / 2

  // Each mark's center, bottom up from the line.
  const marks = columns.flatMap((st) =>
    Array.from({ length: st.count }, (_, i) => ({ x: x(st.value), y: axisY - ABOVE - mark / 2 - i * pitch })),
  )

  const numbers = labels.map(({ v, label }): LineNumber =>
    label.den
      ? { x: x(v), sign: label.sign, num: label.num, den: label.den, numY: numbersTop + FS * 0.85, barY: numbersTop + FS * 1.1, denY: numbersTop + FS * 2.05 }
      : { x: x(v), text: label.text!, y: stacked ? numbersTop + FS * 1.45 : numbersTop + FS * 0.85 },
  )

  const texts: { x: number; y: number; text: string; size: number }[] = []
  const blanks: { x1: number; x2: number; y: number }[] = []
  if (title) texts.push({ x: midX, y: titleY, text: title, size: TITLE_FS })
  else if (s.titleMode === 'blank') blanks.push({ x1: midX - 130, x2: midX + 130, y: titleY })
  if (axisTitle) texts.push({ x: midX, y: axisTitleY, text: axisTitle, size: AXIS_TITLE_FS })
  else if (s.axisTitleMode === 'blank') blanks.push({ x1: midX - 100, x2: midX + 100, y: axisTitleY })

  // What the figure shows, in words, for screen readers.
  const kind = s.mark === 'x' ? ['X', 'X’s'] : ['dot', 'dots']
  const over = columns.map((st) => `${st.count} ${st.count === 1 ? kind[0] : kind[1]} over ${numberText(st.value, numbering)}`)
  const description = `A number line from ${numberText(from, numbering)} to ${numberText(to, numbering)}${over.length ? `, with ${over.join(', ')}` : ''}.`

  return {
    width,
    height,
    fs: FS,
    mark,
    marks,
    axis: { x1: L - EXT, x2: L + LINE + EXT, y: axisY },
    ticks: ticks.map((t) => ({ x: x(t.v), y1: axisY - (t.major ? TICK : MINOR), y2: axisY + (t.major ? TICK : MINOR) })),
    numbers,
    texts,
    blanks,
    description,
  }
}
