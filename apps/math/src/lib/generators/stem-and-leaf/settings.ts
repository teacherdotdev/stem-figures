// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a stem-and-leaf plot can be bookmarked or shared.
//
// Each data set is kept as the text the teacher typed ("12, 15, 15, 18"), and
// the first and last stems, the leaf unit and the key's example as typed too
// ("" for worked out from the data); readPlot() works out what they mean.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { TITLE_MODES, type TitleMode } from '$shared/graph/axes'
import { fmt } from '$shared/graph/numbering'
import { parseData, summarize, type Summary } from '$lib/stats/data'
import {
  MAX_ROWS, SPLITS, UNITS, autoUnit, place, placeOf, readStem, rowsNeeded, sortLeaves, stemRows, stemText, valueText,
  type Placed, type Split,
} from './stems'

export { MAX_ROWS, UNITS, fmt }

export const LAYOUTS = { single: 'One data set', back: 'Back-to-back' } as const
export const SPLIT_NAMES: Record<Split, string> = { 1: 'Once', 2: 'Twice', 5: '5 times' }
export const ORDERS = { sorted: 'In order', typed: 'As typed' } as const
export const KEY_WORDS = { equals: '=', means: 'means' } as const
export const MAX_BOXES = 30

export type Layout = keyof typeof LAYOUTS
export type Order = keyof typeof ORDERS
export type KeyWords = keyof typeof KEY_WORDS

export type Settings = {
  layout: Layout
  /** the first data set as typed: the only one, or the one whose leaves run left */
  data: string
  name: string
  /** the second data set, whose leaves run right when back-to-back */
  data2: string
  name2: string
  /** 'auto' for the last digit typed, or one of UNITS */
  unit: string
  /** rows for each stem: 1, 2 or 5 */
  split: Split
  /** the first and last stems, '' for the data's */
  from: string
  to: string
  order: Order
  headings: boolean
  boxes: boolean
  /** boxes in each row at least, '' for as many as it has leaves */
  boxCount: string
  keyMode: TitleMode
  keyWords: KeyWords
  /** written after the key's values, like cm */
  keyUnit: string
  /** the value (or two, back-to-back) the key shows, '' for one from the data */
  keyValue: string
  title: string
  titleMode: TitleMode
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  layout: 'single',
  data: '',
  name: '',
  data2: '',
  name2: '',
  unit: 'auto',
  split: 1,
  from: '',
  to: '',
  order: 'sorted',
  headings: true,
  boxes: false,
  boxCount: '',
  keyMode: 'text',
  keyWords: 'equals',
  keyUnit: '',
  keyValue: '',
  title: '',
  titleMode: 'none',
  labelSize: 'medium',
}

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)
const bool = (v: unknown, fallback: boolean) => (v === undefined || v === null ? fallback : v === true || v === '1' || v === 'true')
const titleMode = (v: unknown, fallback: TitleMode) => ((TITLE_MODES as readonly unknown[]).includes(v) ? (v as TitleMode) : fallback)
const unitOf = (v: unknown) => (UNITS.some((u) => String(u) === String(v)) ? String(v) : 'auto')

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  return {
    layout: oneOf(LAYOUTS, s.layout, d.layout),
    data: text(s.data, d.data),
    name: text(s.name, d.name),
    data2: text(s.data2, d.data2),
    name2: text(s.name2, d.name2),
    unit: unitOf(s.unit),
    split: (SPLITS as readonly number[]).includes(Number(s.split)) ? (Number(s.split) as Split) : d.split,
    from: text(s.from, d.from),
    to: text(s.to, d.to),
    order: oneOf(ORDERS, s.order, d.order),
    headings: bool(s.headings, d.headings),
    boxes: bool(s.boxes, d.boxes),
    boxCount: text(s.boxCount, d.boxCount),
    keyMode: titleMode(s.keyMode, d.keyMode),
    keyWords: oneOf(KEY_WORDS, s.keyWords, d.keyWords),
    keyUnit: text(s.keyUnit, d.keyUnit),
    keyValue: text(s.keyValue, d.keyValue),
    title: text(s.title, d.title),
    titleMode: titleMode(s.titleMode, d.titleMode),
    labelSize: cleanLabelSize(s.labelSize),
  }
}

export function settingsToQuery(s: Settings): string {
  const params = new URLSearchParams()
  for (const key of KEYS) {
    const v = s[key]
    if (v === DEFAULT_SETTINGS[key] || v === null || v === undefined) continue
    params.set(key, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = {}
  for (const key of KEYS) if (params.has(key)) s[key] = params.get(key)
  return cleanSettings(s)
}

/** One data set read: its values at the leaf unit, their summary, and anything to fix. */
export type SetRead = {
  name: string
  /** each value as typed, at the leaf unit, in the order typed */
  placed: Placed[]
  /** the summary of the values as plotted, null with none */
  summary: Summary | null
  count: number
  /** the values that appear most, none when no value repeats */
  modes: number[]
  /** typed values whose digits past the leaf unit were cut off, and what they became */
  cut: { typed: number; value: number }[]
  problem: string | null
}

/** One row of the plot: its stem as written ('' for a blank stem) and each set's leaves, from the stem outward. */
export type PlotRow = { row: number; stem: string; leaves: Placed[][] }

/** The key's example: a stem, a leaf for each set, and the values they stand for. */
export type KeyExample = { stem: string; leaves: string[]; values: string[] }

export type ProblemKey = 'data' | 'data2' | 'unit' | 'from' | 'to' | 'boxCount' | 'key'

const EMPTY_ROWS = 5 // rows drawn with blank stems when there's nothing to go on
const EMPTY_STEMS = 5 // stems drawn from one typed stem when there's no data

const unitName = (u: number) => fmt(u)

/**
 * What the settings mean: each data set at the leaf unit, the rows from the
 * first stem to the last, the key's example, and anything the teacher should
 * fix, as messages for the settings panel. There is always a plot: anything
 * that can't be used falls back to what the data gives.
 */
export function readPlot(s: Settings): {
  back: boolean
  sets: SetRead[]
  unit: number
  /** the leaf unit the last digit typed gives */
  auto: number
  split: Split
  rows: PlotRow[]
  /** the stems the data alone starts and ends at, for the From and To fields */
  fitted: { from: string; to: string }
  key: KeyExample
  /** how many boxes each row has at least, 0 for as many as its leaves */
  boxes: number
  problems: Record<ProblemKey, string | null>
} {
  const back = s.layout === 'back'
  const problems: Record<ProblemKey, string | null> = { data: null, data2: null, unit: null, from: null, to: null, boxCount: null, key: null }
  const typed = [s.data, ...(back ? [s.data2] : [])]
  const parsed = typed.map((t) => parseData(t))
  parsed.forEach((p, i) => {
    if (p.bad) problems[i ? 'data2' : 'data'] = `“${p.bad}” isn't a number. Separate numbers with commas, like 12, 15, 18.`
  })
  const all = parsed.flatMap((p) => p.values)
  const split = s.split

  // The leaf unit: the last digit typed, or the teacher's if it makes few enough rows.
  const auto = autoUnit(typed, all, split)
  let unit = s.unit === 'auto' ? auto : Number(s.unit)
  const need = rowsNeeded(all, unit, split)
  if (need > MAX_ROWS) {
    problems.unit = `A leaf unit of ${unitName(unit)} makes ${need} rows (${MAX_ROWS} at most), so the plot uses ${unitName(auto)}. Pick a bigger leaf unit.`
    unit = auto
  }

  const sets: SetRead[] = parsed.map((p, i) => {
    const placed = p.values.map((v) => place(v, unit, split))
    const values = placed.map((q) => q.value)
    const counts = new Map<number, number>()
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
    const most = Math.max(0, ...counts.values())
    const cut = placed.flatMap((q, j) => (q.cut ? [{ typed: p.values[j], value: q.value }] : []))
    return {
      name: (i ? s.name2 : s.name).trim(),
      placed,
      summary: values.length ? summarize(values) : null,
      count: values.length,
      modes: most > 1 ? [...counts].filter(([, c]) => c === most).map(([v]) => v).sort((a, b) => a - b) : [],
      cut: cut.filter((c, j) => cut.findIndex((d) => d.typed === c.typed) === j),
      problem: problems[i ? 'data2' : 'data'],
    }
  })

  // The rows: from the first stem to the last, the data's unless typed wider.
  const placedAll = sets.flatMap((t) => t.placed)
  const dataRows = placedAll.map((q) => q.row)
  const data = dataRows.length ? { lo: Math.min(...dataRows), hi: Math.max(...dataRows) } : null
  const stemOfRow = (row: number) => {
    const p = placeOf(row, split)
    return stemText(p.negative, p.stem, unit)
  }
  const fitted = data ? { from: stemOfRow(data.lo), to: stemOfRow(data.hi) } : { from: '', to: '' }
  const example = unit < 0.1 ? '2.3' : '3'
  const readEnd = (key: 'from' | 'to') => {
    if (!s[key].trim()) return null
    const stem = readStem(s[key], unit)
    if (!stem) problems[key] = `Type a stem at this leaf unit, like ${example} or −0, or leave it empty to fit the data.`
    return stem
  }
  const from = readEnd('from')
  const to = readEnd('to')
  let lo = from ? stemRows(from.negative, from.stem, split).first : null
  let hi = to ? stemRows(to.negative, to.stem, split).last : null
  if (data) {
    if (lo !== null && lo > data.lo) problems.from = `The data starts at stem ${fitted.from}, so the plot does too.`
    if (hi !== null && hi < data.hi) problems.to = `The data ends at stem ${fitted.to}, so the plot does too.`
    lo = Math.min(lo ?? data.lo, data.lo)
    hi = Math.max(hi ?? data.hi, data.hi)
  } else if (lo !== null || hi !== null) {
    // No data: one typed stem starts (or ends) a few empty stems.
    lo ??= hi! - EMPTY_STEMS * split + 1
    hi ??= lo + EMPTY_STEMS * split - 1
  }
  if (lo !== null && hi !== null && lo > hi) {
    problems.to = `The last stem has to come after the first, so make it ${stemOfRow(lo)} or more.`
    hi = lo + split - 1
  }
  if (lo !== null && hi !== null && hi - lo + 1 > MAX_ROWS) {
    problems.to = `That makes ${hi - lo + 1} rows (${MAX_ROWS} at most). Start and end the stems closer together.`
    if (data) ({ lo, hi } = data)
    else hi = lo + EMPTY_STEMS * split - 1
  }

  const rows: PlotRow[] = []
  if (lo === null || hi === null) {
    // Nothing to go on: rows with blank stems, for students to fill in.
    for (let i = 0; i < EMPTY_ROWS; i++) rows.push({ row: i, stem: '', leaves: sets.map(() => []) })
  } else {
    for (let row = lo; row <= hi; row++) {
      const leaves = sets.map((t) => {
        const on = t.placed.filter((q) => q.row === row)
        return s.order === 'sorted' ? sortLeaves(on) : on
      })
      rows.push({ row, stem: stemOfRow(row), leaves })
    }
  }

  // Boxes in each row, at least.
  let boxes = 0
  if (s.boxCount.trim()) {
    const n = Number(s.boxCount.trim())
    if (!Number.isInteger(n) || n < 0 || n > MAX_BOXES) problems.boxCount = `Type a whole number of boxes, like 8 (${MAX_BOXES} at most).`
    else boxes = n
  }

  return { back, sets, unit, auto, split, rows, fitted, key: keyExample(s, back, sets, rows, unit, split, problems), boxes, problems }
}

/** The key's example: the teacher's value(s), or else a stem from the plot with a leaf from each set. */
function keyExample(
  s: Settings, back: boolean, sets: SetRead[], rows: PlotRow[], unit: number, split: Split, problems: Record<ProblemKey, string | null>,
): KeyExample {
  const make = (negative: boolean, stem: number, leaves: number[]): KeyExample => ({
    stem: stemText(negative, stem, unit),
    leaves: leaves.map(String),
    values: leaves.map((l) => valueText(negative, stem, l, unit)),
  })
  /** A second leaf for back-to-back, different from the first, when the data gives none. */
  const other = (leaf: number) => (leaf === 1 ? 2 : 1)

  if (s.keyValue.trim()) {
    const { values, bad } = parseData(s.keyValue)
    if (bad || !values.length) problems.key = `Type a value for the key, like ${back ? '34, 31' : '34'}.`
    else {
      const [a, b] = values.map((v) => place(v, unit, split))
      if (a.cut || b?.cut) problems.key = `The key shows values at the leaf unit, so it writes ${valueText(a.negative, a.stem, a.leaf, unit)}${b ? ` and ${valueText(b.negative, b.stem, b.leaf, unit)}` : ''}.`
      if (!back) return make(a.negative, a.stem, [a.leaf])
      if (b && (b.negative !== a.negative || b.stem !== a.stem)) problems.key = 'Give the two values the same stem, like 34, 31.'
      else return make(a.negative, a.stem, [a.leaf, b ? b.leaf : other(a.leaf)])
    }
  }

  // From the plot: the first row with leaves on both sides (or any leaves),
  // the leaf nearest the stem on each side.
  const withAll = rows.find((r) => r.stem && r.leaves.every((l) => l.length))
  const withAny = rows.find((r) => r.stem && r.leaves.some((l) => l.length))
  const r = withAll ?? withAny
  if (r) {
    const first = r.leaves.map((l) => l[0])
    const q = first.find(Boolean)!
    if (!back) return make(q.negative, q.stem, [q.leaf])
    const left = first[0]?.leaf ?? other(first[1]!.leaf)
    return make(q.negative, q.stem, [left, first[1]?.leaf ?? other(left)])
  }
  // No data: the first stem shown, or 3, with a leaf of 4 (and 1).
  const p = rows[0].stem ? placeOf(rows[0].row, split) : { negative: false, stem: 3 }
  return make(p.negative, p.stem, back ? [4, 1] : [4])
}

/** The key as written under the plot: "3 | 4 = 34 cm", or back-to-back "4 | 3 | 1 means 34 for Class A and 31 for Class B". */
export function keyText(s: Settings, key: KeyExample, back: boolean, names: string[]): string {
  const unit = s.keyUnit.trim()
  const withUnit = (v: string) => (unit ? (/^(%|°)$/.test(unit) ? `${v}${unit}` : `${v} ${unit}`) : v)
  const words = s.keyWords === 'means' ? 'means' : '='
  if (!back) return `${key.stem} | ${key.leaves[0]} ${words} ${withUnit(key.values[0])}`
  const [a, b] = names
  const values =
    a || b
      ? `${withUnit(key.values[0])} for ${a || 'the left'} and ${withUnit(key.values[1])} for ${b || 'the right'}`
      : `${withUnit(key.values[0])} on the left and ${withUnit(key.values[1])} on the right`
  return `${key.leaves[0]} | ${key.stem} | ${key.leaves[1]} ${words} ${values}`
}

/** A data set's numbers for the panel: n, minimum, maximum, range, median, mode, Q1 and Q3. */
export function readoutParts(set: SetRead): string[] {
  const m = set.summary
  if (!m) return []
  const mode = set.modes.length ? set.modes.map(fmt).join(', ') : 'none'
  return [
    `n ${set.count}`, `Min ${fmt(m.min)}`, `Max ${fmt(m.max)}`, `Range ${fmt(m.max - m.min)}`,
    `Median ${fmt(m.median)}`, `Mode ${mode}`, `Q1 ${fmt(m.q1)}`, `Q3 ${fmt(m.q3)}`,
  ]
}

export const readoutOf = (set: SetRead) => readoutParts(set).join(' · ')
