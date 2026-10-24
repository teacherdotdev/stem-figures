// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a bar graph can be bookmarked or shared.
//
// The table is kept as typed (see $lib/stats/table): its headings are the
// series and each row a category. The value axis's range is kept as typed too
// ("" for fitted to the data); readGraph() works out what it all means.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { MAX_BLOCKS, EVERY, MINOR, TITLE_MODES, type TitleMode } from '$shared/graph/axes'
import { GRIDLINES, type Gridlines } from '$shared/graph/grid'
import { fmt, niceText, numberingOf, type Numbering } from '$shared/graph/numbering'
import { parseNumber } from '$lib/shared/math.js'
import { niceRange } from '$lib/stats/data'
import { FILLS, LOOKS, type Look } from '$lib/stats/fills'
import {
  cleanColumns, cleanRows, columnsFromParam, columnsToParam, filledRows, readTable, rowFromParam, rowToParam,
  type ReadRow, type TableRow,
} from '$lib/stats/table'

export { EVERY, MINOR, fmt }

export const DIRECTIONS = { columns: 'Columns', bars: 'Bars' } as const // upright, or sideways
export const STACKINGS = { grouped: 'Side by side', stacked: 'Stacked' } as const
export const BAR_WIDTHS = { narrow: 'Narrow', medium: 'Medium', wide: 'Wide' } as const
export const VALUE_LABELS = { none: 'None', end: 'At the end', inside: 'Inside' } as const
export const KEY_PLACES = { right: 'Right', below: 'Below' } as const
export const CROSSBARS = { none: 'None', narrow: 'Narrow', wide: 'Wide' } as const

export type Direction = keyof typeof DIRECTIONS
export type Stacking = keyof typeof STACKINGS
export type BarWidth = keyof typeof BAR_WIDTHS
export type ValueLabels = keyof typeof VALUE_LABELS
export type KeyPlace = keyof typeof KEY_PLACES
export type Crossbars = keyof typeof CROSSBARS

export type Settings = {
  /** the series' headings, one per column of values */
  columns: string[]
  /** the categories, each with a value per series */
  rows: TableRow[]
  direction: Direction
  stacking: Stacking
  barWidth: BarWidth
  values: ValueLabels
  look: Look
  /** a fill for each series picked by the teacher, '' for the look's next one */
  fills: string[]
  keyAt: KeyPlace
  errorBars: boolean
  crossbars: Crossbars
  errorNote: string
  from: string
  to: string
  step: string
  every: number
  gridlines: Gridlines
  minor: number
  title: string
  titleMode: TitleMode
  categoryTitle: string
  categoryTitleMode: TitleMode
  valueTitle: string
  valueTitleMode: TitleMode
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  columns: [''], // one series, with no heading
  rows: [],
  direction: 'columns',
  stacking: 'grouped',
  barWidth: 'medium',
  values: 'none',
  look: 'color',
  fills: [],
  keyAt: 'right',
  errorBars: false,
  crossbars: 'narrow',
  errorNote: '', // under the graph, like "Error bars show ±1 SEM"
  from: '', // blank: fitted to the data
  to: '',
  step: '',
  every: 1,
  gridlines: 'light',
  minor: 0,
  title: '',
  titleMode: 'none',
  categoryTitle: '',
  categoryTitleMode: 'none',
  valueTitle: '',
  valueTitleMode: 'none',
  labelSize: 'medium',
}

const LISTS = ['columns', 'rows', 'fills'] as const
type Scalar = Exclude<keyof Settings, (typeof LISTS)[number]>
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k): k is Scalar => !(LISTS as readonly string[]).includes(k))

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)
const numberOf = (list: readonly number[], v: any, fallback: number) => (list.includes(Number(v)) && String(v).trim() !== '' ? Number(v) : fallback)
const bool = (v: unknown, fallback: boolean) => (v === undefined || v === null ? fallback : v === true || v === '1' || v === 'true')
const titleMode = (v: unknown, fallback: TitleMode) => ((TITLE_MODES as readonly unknown[]).includes(v) ? (v as TitleMode) : fallback)

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  const columns = cleanColumns(s.columns)
  const fills = (Array.isArray(s.fills) ? s.fills : []).slice(0, columns.length).map((f: unknown) => (typeof f === 'string' && f in FILLS ? f : ''))
  while (fills.length && !fills.at(-1)) fills.pop()
  return {
    columns,
    rows: cleanRows(s.rows, columns.length),
    direction: oneOf(DIRECTIONS, s.direction, d.direction),
    stacking: oneOf(STACKINGS, s.stacking, d.stacking),
    barWidth: oneOf(BAR_WIDTHS, s.barWidth, d.barWidth),
    values: oneOf(VALUE_LABELS, s.values, d.values),
    look: oneOf(LOOKS, s.look, d.look),
    fills,
    keyAt: oneOf(KEY_PLACES, s.keyAt, d.keyAt),
    errorBars: bool(s.errorBars, d.errorBars),
    crossbars: oneOf(CROSSBARS, s.crossbars, d.crossbars),
    errorNote: text(s.errorNote, d.errorNote),
    from: text(s.from, d.from),
    to: text(s.to, d.to),
    step: text(s.step, d.step),
    every: numberOf(EVERY, s.every, d.every),
    gridlines: oneOf(GRIDLINES, s.gridlines, d.gridlines),
    minor: numberOf(MINOR, s.minor, d.minor),
    title: text(s.title, d.title),
    titleMode: titleMode(s.titleMode, d.titleMode),
    categoryTitle: text(s.categoryTitle, d.categoryTitle),
    categoryTitleMode: titleMode(s.categoryTitleMode, d.categoryTitleMode),
    valueTitle: text(s.valueTitle, d.valueTitle),
    valueTitleMode: titleMode(s.valueTitleMode, d.valueTitleMode),
    labelSize: cleanLabelSize(s.labelSize),
  }
}

export function settingsToQuery(s: Settings): string {
  const params = new URLSearchParams()
  for (const key of SCALARS) {
    const v = s[key]
    if (v === DEFAULT_SETTINGS[key] || v === null || v === undefined) continue
    params.set(key, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  // The headings once, when there's more than one series or one has a name;
  // then one row= per category that has something in it.
  if (s.columns.length > 1 || s.columns[0].trim()) params.set('cols', columnsToParam(s.columns))
  if (s.fills.some(Boolean)) params.set('fills', s.fills.join('|'))
  for (const r of filledRows(s.rows)) params.append('row', rowToParam(r))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const columns = columnsFromParam(params.get('cols'))
  const s: RawSettings = {
    columns,
    rows: params.getAll('row').map((p) => rowFromParam(p, columns.length)),
    fills: (params.get('fills') ?? '').split('|'),
  }
  for (const key of SCALARS) {
    if (!params.has(key)) continue
    const raw = params.get(key)
    s[key] = typeof DEFAULT_SETTINGS[key] === 'number' ? Number(raw) : raw
  }
  return cleanSettings(s)
}

export type RangeKey = 'from' | 'to' | 'step'

/**
 * What the settings mean: the table as numbers, the value axis's range (fitted
 * to the data for any part left blank), how its numbers are written, and
 * anything the teacher should fix, as messages for the settings panel. When the
 * range can't be used, the graph falls back to the fitted one, so there is
 * always a graph.
 */
export function readGraph(s: Settings): {
  rows: ReadRow[]
  series: number
  stacked: boolean
  /** error bars drawn: on, and not stacked */
  errors: boolean
  range: { from: number; to: number; step: number }
  auto: { from: number; to: number; step: number }
  numbering: Numbering
  problems: { table: string | null; errors: string | null } & Record<RangeKey, string | null>
} {
  const table = readTable(s.rows)
  const series = s.columns.length
  const stacked = series > 1 && s.stacking === 'stacked'
  const errors = s.errorBars && !stacked

  // How far the bars reach each way from 0, including their error bars.
  let lo = 0
  let hi = 0
  for (const r of table.rows) {
    if (stacked) {
      lo = Math.min(lo, r.values.reduce<number>((t, v) => t + (v !== null && v < 0 ? v : 0), 0))
      hi = Math.max(hi, r.values.reduce<number>((t, v) => t + (v !== null && v > 0 ? v : 0), 0))
    } else {
      r.values.forEach((v, j) => {
        if (v === null) return
        const e = errors ? (r.errors[j] ?? 0) : 0
        lo = Math.min(lo, v - e)
        hi = Math.max(hi, v + e)
      })
    }
  }
  const fitted = hi > lo ? niceRange(lo, hi) : { from: 0, to: 10, step: 1 }
  // Room above the tallest column for its value, when values are written at
  // the ends. (Sideways bars' values go past the grid instead.)
  const auto =
    s.values === 'end' && s.direction === 'columns' && hi > 0 && fitted.to - hi < fitted.step * 0.3 && (fitted.to - fitted.from) / fitted.step < 20
      ? { ...fitted, to: Number((fitted.to + fitted.step).toPrecision(12)) }
      : fitted

  const problems = { table: table.problem, errors: null as string | null, from: null as string | null, to: null as string | null, step: null as string | null }
  if (s.errorBars && stacked) problems.errors = 'Error bars are drawn on side-by-side bars only, so they’re off while the bars are stacked.'
  const typed = (key: RangeKey) => s[key].trim()
  const read = (key: RangeKey) => (typed(key) ? parseNumber(s[key]) : auto[key])
  const from = read('from')
  const to = read('to')
  const step = read('step')
  const numbering = numberingOf(typed('from'), typed('to'), typed('step'))
  if (from === null) problems.from = 'Type a number, like 0 or 2.5, or leave it empty to fit the data.'
  if (to === null) problems.to = 'Type a number, like 50 or 2.5, or leave it empty to fit the data.'
  if (step === null) problems.step = 'Type a number, like 1, 5 or 0.5, or leave it empty to fit the data.'
  else if (step <= 0) problems.step = 'Count by a number bigger than 0.'
  if (from !== null && to !== null && from >= to) problems.to = `The axis has to end after it starts, so make this bigger than ${niceText(from, numbering)}.`
  const blocks = !problems.from && !problems.to && !problems.step ? Math.ceil((to! - from!) / step! - 1e-9) : 0
  if (blocks > MAX_BLOCKS) problems.step = `That makes ${blocks} lines. Count by a bigger number (${MAX_BLOCKS} at most).`
  const ok = !problems.from && !problems.to && !problems.step
  const range = ok ? { from: from!, to: from! + blocks * step!, step: step! } : auto
  if (ok && (lo < range.from - 1e-9 || hi > range.to + 1e-9)) {
    const past = hi > range.to + 1e-9 ? hi : lo
    problems.to = `${fmt(past)} is past the end of the axis, so its bar is cut off. Widen the range to show it.`
  }
  return { rows: table.rows, series, stacked, errors, range, auto, numbering, problems }
}
