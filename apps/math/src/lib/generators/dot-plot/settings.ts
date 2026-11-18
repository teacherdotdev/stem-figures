// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a dot plot can be bookmarked or shared.
//
// The data comes one of two ways, and both are kept as typed so switching
// between them loses neither: a list of values ("3, 4, 4, 5") or a table of
// values and how many of each (4 | 2). readPlot() reads whichever is in use
// into the same thing, how many dots go over each value, so the drawing never
// knows which was typed. Only the one in use goes into the page address.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { CAPS, type Cap } from '$shared/graph/caps'
import { fmt, niceText, numberingOf, numberText, type Numbering } from '$shared/graph/numbering'
import { parseNumber } from '$lib/shared/math.js'
import { medianOf, niceRange } from '$lib/stats/data'
import { cleanRows, filledRows, readValue, rowFromParam, rowToParam, type TableRow } from '$lib/stats/table'

export { CAPS, fmt }
export const MAX_TICKS = 100
/** The most dots over one value. */
export const MAX_COUNT = 100
export const EVERY = [1, 2, 4, 5, 10, 0] // number every nth tick; 0 = no numbers
export const TITLE_MODES = ['text', 'blank', 'none'] as const // written title, write-on line for students, nothing
export const MARKS = { dot: 'Dots', x: 'X’s' } as const
export const INPUTS = { list: 'List of values', table: 'Values and counts' } as const
export const INK = '#111827'

export type TitleMode = (typeof TITLE_MODES)[number]
export type Mark = keyof typeof MARKS
export type Input = keyof typeof INPUTS

export type Settings = {
  input: Input
  /** the list of values, as typed */
  data: string
  /** the table: each row's name is a value, its one cell how many of it */
  rows: TableRow[]
  mark: Mark
  from: string
  to: string
  step: string
  every: number
  title: string
  titleMode: TitleMode
  axisTitle: string
  axisTitleMode: TitleMode
  startCap: Cap
  endCap: Cap
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  input: 'list',
  data: '',
  rows: [],
  mark: 'dot',
  from: '', // blank: worked out from the data
  to: '',
  step: '',
  every: 1,
  title: '',
  titleMode: 'none',
  axisTitle: '', // under the number line, e.g. "Hours of sleep"
  axisTitleMode: 'none',
  startCap: 'triangle',
  endCap: 'triangle',
  labelSize: 'medium',
}

// Settings written into the address one parameter each; the data is written its own way.
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k) => k !== 'data' && k !== 'rows')

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T>(list: readonly T[], v: any, fallback: T): T => (list.includes(v) ? v : fallback)
const keyOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  return {
    input: keyOf(INPUTS, s.input, d.input),
    data: text(s.data, d.data),
    rows: cleanRows(s.rows, 1),
    mark: keyOf(MARKS, s.mark, d.mark),
    from: text(s.from, d.from),
    to: text(s.to, d.to),
    step: text(s.step, d.step),
    every: oneOf(EVERY, Number(s.every), d.every),
    title: text(s.title, d.title),
    titleMode: oneOf(TITLE_MODES, s.titleMode, d.titleMode),
    axisTitle: text(s.axisTitle, d.axisTitle),
    axisTitleMode: oneOf(TITLE_MODES, s.axisTitleMode, d.axisTitleMode),
    startCap: keyOf(CAPS, s.startCap, d.startCap),
    endCap: keyOf(CAPS, s.endCap, d.endCap),
    labelSize: cleanLabelSize(s.labelSize),
  }
}

/** The page address: settings that aren't the default, then the data in use (data=3, 4, 4 or one row=4|2 per value). */
export function settingsToQuery(s: Settings): string {
  const params = new URLSearchParams()
  for (const key of SCALARS) {
    const v = s[key]
    if (v === DEFAULT_SETTINGS[key] || v === null || v === undefined) continue
    params.set(key, String(v))
  }
  if (s.input === 'list' && s.data.trim()) params.set('data', s.data.trim())
  if (s.input === 'table') for (const r of filledRows(s.rows)) params.append('row', rowToParam(r))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = { ...DEFAULT_SETTINGS, rows: params.getAll('row').map((p) => rowFromParam(p, 1)) }
  for (const key of [...SCALARS, 'data'] as const) {
    if (!params.has(key)) continue
    const raw = params.get(key)
    s[key] = typeof DEFAULT_SETTINGS[key] === 'number' ? Number(raw) : raw
  }
  return cleanSettings(s)
}

/** Do two settings draw the same figure? */
export const sameFigure = (a: RawSettings, b: RawSettings) => settingsToQuery(cleanSettings(a)) === settingsToQuery(cleanSettings(b))

// ——— Reading the data ———

/** A value as typed: 12, −3, 2.5, 3/4 or 1 1/2. Fractions are noted, for numbering the line in them. */
export function readNumber(typed: string): { value: number | null; fraction: boolean } {
  const t = typed.trim().replace(/[−–]/g, '-')
  const mixed = /^(-?)(\d+)\s+(\d+)\/(\d+)$/.exec(t)
  if (mixed) {
    const [, sign, whole, num, den] = mixed
    const v = Number(whole) + Number(num) / Number(den)
    return Number(den) ? { value: sign ? -v : v, fraction: true } : { value: null, fraction: false }
  }
  const frac = /^(-?\d+)\/(\d+)$/.exec(t)
  if (frac) return Number(frac[2]) ? { value: Number(frac[1]) / Number(frac[2]), fraction: true } : { value: null, fraction: false }
  return { value: readValue(t).value, fraction: false }
}

/**
 * The list's values in the order typed. Values are separated by commas,
 * semicolons or new lines, as from a spreadsheet column, or by spaces when
 * there are none of those (so 1 1/2 is one value in "1 1/2, 2, 2 1/4").
 * Returns the first piece that isn't a number, if any.
 */
export function readList(typed: string): { values: number[]; fraction: boolean; bad: string | null } {
  const MIXED = /^\s*[-−–]?\d+\s+\d+\/\d+\s*$/
  const pieces = /[,;\n]/.test(typed)
    ? typed.split(/[,;\n]+/).flatMap((p) => (MIXED.test(p) ? [p] : p.trim().split(/\s+/)))
    : typed.split(/\s+/)
  const values: number[] = []
  let fraction = false
  for (const p of pieces.map((p) => p.trim()).filter(Boolean)) {
    const n = readNumber(p)
    if (n.value === null) return { values, fraction, bad: p }
    values.push(n.value)
    fraction ||= n.fraction
  }
  return { values, fraction, bad: null }
}

/** One value on the plot and how many dots go over it, smallest value first. */
export type Stack = { value: number; count: number }

/** Values counted, equal ones (2.5 and 2.50) together, smallest first. */
export function stacksOf(values: number[]): Stack[] {
  const counts = new Map<number, number>()
  for (const v of values) {
    const key = Number(v.toPrecision(12))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => a.value - b.value)
}

/** The table's values and counts. An empty count is 0 dots; a value typed twice adds its counts. */
export function readCounts(rows: TableRow[]): { stacks: Stack[]; fraction: boolean; problem: string | null } {
  const counts = new Map<number, number>()
  let fraction = false
  let problem: string | null = null
  for (const r of filledRows(rows)) {
    const typedValue = r.name.trim()
    const typedCount = r.cells[0]?.value.trim() ?? ''
    if (!typedValue) {
      problem ??= `Give the count ${typedCount} a value in the Value column.`
      continue
    }
    const n = readNumber(typedValue)
    if (n.value === null) {
      problem ??= `“${typedValue}” isn't a number. Type values like 12, 2.5 or 3/4.`
      continue
    }
    const c = typedCount ? readValue(typedCount).value : 0
    if (c === null || c < 0 || !Number.isInteger(c)) {
      problem ??= `The count for ${typedValue} has to be a whole number, like 0, 3 or 12.`
      continue
    }
    fraction ||= n.fraction
    const key = Number(n.value.toPrecision(12))
    counts.set(key, (counts.get(key) ?? 0) + c)
  }
  const stacks = [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => a.value - b.value)
  return { stacks, fraction, problem }
}

// A value written back out, in fractions when the data was typed in them.
// Past 1 a fraction is written as a mixed number, as a teacher types one (1 1/4, not 5/4).
function typedAs(v: number, numbering: Numbering): string {
  const text = numberText(v, numbering === 'fraction' ? 'fraction' : 'decimal').replace('−', '-')
  const improper = /^(-?)(\d+)\/(\d+)$/.exec(text)
  if (!improper || Number(improper[2]) < Number(improper[3])) return text
  const [, sign, num, den] = improper
  return `${sign}${Math.floor(Number(num) / Number(den))} ${Number(num) % Number(den)}/${den}`
}

/** The list as a table, one row per value with its count. */
export const tableOf = (stacks: Stack[], numbering: Numbering = 'decimal'): TableRow[] =>
  stacks.map((st) => ({ name: typedAs(st.value, numbering), cells: [{ value: String(st.count), error: '' }] }))

/** The table as a list, each value written as many times as its count. */
export const listOf = (stacks: Stack[], numbering: Numbering = 'decimal') =>
  stacks.flatMap((st) => Array(st.count).fill(typedAs(st.value, numbering))).join(', ')

// The most ticks a line worked out from the data has when it counts by the data's own steps.
const AUTO_TICKS = 24
// And the fewest steps, so two values side by side still get a line worth reading.
const MIN_STEPS = 4
const UNITS = [100, 50, 25, 20, 10, 5, 2.5, 2, 1, 1 / 2, 1 / 3, 1 / 4, 0.2, 1 / 6, 1 / 8, 0.1, 1 / 10, 1 / 12, 1 / 16, 0.05, 0.02, 0.01]

/**
 * A line to fit the data when the teacher leaves it blank. Data that comes in
 * steps (whole numbers, halves, eighths of an inch) gets a line from its
 * smallest value to its largest counting by that step, so every dot sits on a
 * tick; other data gets a tidy line it falls along.
 */
export function autoRange(values: number[]): { from: number; to: number; step: number } {
  if (!values.length) return { from: 0, to: 10, step: 1 }
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const onStep = (v: number, u: number) => Math.abs(v / u - Math.round(v / u)) < 1e-6
  const fits = (u: number) => (hi - lo) / u <= AUTO_TICKS
  // Whole numbers count by 1 when they fit (0, 2, 4 pets still has a 1 and a 3);
  // otherwise by the biggest step all the values are on (10, 20, 40 by 10; eighths by 1/8).
  const unit = values.every((v) => onStep(v, 1)) && fits(1) ? 1 : UNITS.find((u) => values.every((v) => onStep(v, u)))
  if (unit === undefined || !fits(unit)) return niceRange(lo, hi)
  // At least MIN_STEPS steps, widened evenly both ways, but not below 0 for data that isn't.
  const short = Math.max(0, MIN_STEPS - Math.round((hi - lo) / unit))
  let below = Math.ceil(short / 2)
  if (lo >= 0) below = Math.min(below, Math.floor(lo / unit + 1e-9))
  return { from: clean(lo - below * unit), to: clean(hi + (short - below) * unit), step: unit }
}

const clean = (v: number) => Number(v.toPrecision(12)) || 0

export type RangeKey = 'from' | 'to' | 'step'

/**
 * What the settings mean: how many dots over each value, the number line's
 * range (worked out from the data for any part left blank), how to write its
 * numbers, and anything the teacher should fix, as messages for the settings
 * panel. When the range can't be used, the figure falls back to one worked
 * out from the data so there is always a dot plot.
 */
export function readPlot(s: Settings): {
  stacks: Stack[]
  total: number
  range: { from: number; to: number; step: number }
  auto: { from: number; to: number; step: number }
  numbering: Numbering
  problems: Record<'data' | 'table' | 'past' | RangeKey, string | null>
} {
  const problems: Record<'data' | 'table' | 'past' | RangeKey, string | null> = { data: null, table: null, past: null, from: null, to: null, step: null }

  let stacks: Stack[]
  let fraction: boolean
  if (s.input === 'list') {
    const list = readList(s.data)
    if (list.bad) problems.data = `“${list.bad}” isn't a number. Separate values with commas, like 3, 4, 4, 5 or 1/2, 3/4.`
    stacks = stacksOf(list.values)
    fraction = list.fraction
  } else {
    const read = readCounts(s.rows)
    problems.table = read.problem
    stacks = read.stacks
    fraction = read.fraction
  }
  const tooMany = stacks.find((st) => st.count > MAX_COUNT)
  if (tooMany) {
    const message = `${fmt(tooMany.value)} has ${tooMany.count} dots. A dot plot can show up to ${MAX_COUNT} over one value.`
    if (s.input === 'list') problems.data ??= message
    else problems.table ??= message
    stacks = stacks.map((st) => ({ ...st, count: Math.min(st.count, MAX_COUNT) }))
  }

  const auto = autoRange(stacks.map((st) => st.value))
  const typed = (key: RangeKey) => s[key].trim()
  const read = (key: RangeKey) => (typed(key) ? parseNumber(s[key]) : auto[key])
  const from = read('from')
  const to = read('to')
  const step = read('step')
  // Numbered in fractions when the range or the data is typed in them.
  const numbering = numberingOf(typed('from'), typed('to'), typed('step'), fraction ? '/' : '')
  if (from === null) problems.from = 'Type a number, like 0, 2.5 or 1/2, or leave it empty to fit the data.'
  if (to === null) problems.to = 'Type a number, like 10, 2.5 or 1/2, or leave it empty to fit the data.'
  if (step === null) problems.step = 'Type a number, like 1, 5 or 1/4, or leave it empty to fit the data.'
  else if (step <= 0) problems.step = 'Count by a number bigger than 0.'
  if (from !== null && to !== null && from >= to) problems.to = `The line has to end after it starts, so make this bigger than ${niceText(from, numbering)}.`
  const ticks = !problems.from && !problems.to && !problems.step ? Math.floor((to! - from!) / step! + 1e-9) : 0
  if (ticks > MAX_TICKS) problems.step = `That makes ${ticks} ticks. Count by a bigger number (${MAX_TICKS} ticks at most).`
  const rangeOk = !problems.from && !problems.to && !problems.step
  const range = rangeOk ? { from: from!, to: to!, step: step! } : auto

  // Values off the ends of the line aren't drawn, and the teacher is told.
  const past = stacks.filter((st) => st.count && (st.value < range.from - 1e-9 || st.value > range.to + 1e-9))
  if (past.length) {
    const list = past.map((st) => niceText(st.value, numbering)).join(', ')
    problems.past = `${list} ${past.length === 1 ? 'is' : 'are'} past the end of the line, so not drawn. Widen the range to show ${past.length === 1 ? 'it' : 'them'}.`
  }
  const shown = stacks.filter((st) => !past.includes(st))

  return { stacks: shown, total: shown.reduce((n, st) => n + st.count, 0), range, auto, numbering, problems }
}

/** What students find from a dot plot: how many values, the mode(s), median and range. */
export function statsOf(stacks: Stack[]): { n: number; modes: number[]; most: number; median: number; min: number; max: number } | null {
  const shown = stacks.filter((st) => st.count > 0)
  if (!shown.length) return null
  const sorted = shown.flatMap((st) => Array<number>(st.count).fill(st.value))
  const most = Math.max(...shown.map((st) => st.count))
  return {
    n: sorted.length,
    modes: shown.filter((st) => st.count === most).map((st) => st.value),
    most,
    median: medianOf(sorted),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}
