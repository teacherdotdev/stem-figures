// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a pie chart can be bookmarked or shared.
//
// The table is kept as typed (see $lib/stats/table), with one value per
// category. A sector's own label and fill, when the teacher picks one, are
// kept in lists beside the table's rows; readPie() works out what it all means.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { TITLE_MODES, type TitleMode } from '$shared/graph/axes'
import { fmt } from '$shared/graph/numbering'
import { FILLS, LOOKS, type Look } from '$lib/stats/fills'
import { cleanRows, filledRows, readValue, rowFromParam, rowToParam, type TableRow } from '$lib/stats/table'

export { fmt }

export const VALUE_KINDS = { count: 'Counts', percent: 'Percents', degrees: 'Degrees' } as const
export const ORDERS = { typed: 'As typed', largest: 'Largest first' } as const
/** What a sector's label says: one part, or a name or value and a second part. */
export const LABEL_MODES = {
  none: 'None',
  name: 'Name',
  value: 'Value',
  percent: 'Percent',
  angle: 'Angle',
  fraction: 'Fraction',
  'name-value': 'Name and value',
  'name-percent': 'Name and percent',
  'name-angle': 'Name and angle',
  'name-fraction': 'Name and fraction',
  'value-percent': 'Value and percent',
} as const
/** A sector's own label: any of the chart's, or its number left blank or written as a letter. */
export const SECTOR_LABELS = { ...LABEL_MODES, blank: 'Blank line', letter: 'Letter (x°)' } as const
export const KEY_PLACES = { none: 'None', right: 'Right', below: 'Below' } as const
export const ANGLE_MARKS = { none: 'None', arcs: 'Arcs', measures: 'Arcs and measures' } as const
export const CENTER_DOTS = { auto: 'Auto', on: 'On', off: 'Off' } as const

export type ValueKind = keyof typeof VALUE_KINDS
export type Order = keyof typeof ORDERS
export type LabelMode = keyof typeof LABEL_MODES
export type SectorLabel = keyof typeof SECTOR_LABELS
export type KeyPlace = keyof typeof KEY_PLACES
export type AngleMarks = keyof typeof ANGLE_MARKS
export type CenterDot = keyof typeof CENTER_DOTS

/** The most sectors a pie chart draws. */
export const MAX_SECTORS = 12

export type Settings = {
  /** the categories, each with one value */
  rows: TableRow[]
  values: ValueKind
  /** what the whole circle stands for, for counts ('' for the values' sum) */
  total: string
  order: Order
  labels: LabelMode
  /** a label for each row picked by the teacher, '' for the chart's */
  sectorLabels: string[]
  look: Look
  /** a fill for each row picked by the teacher, '' for the look's next one */
  fills: string[]
  keyAt: KeyPlace
  angleMarks: AngleMarks
  centerDot: CenterDot
  title: string
  titleMode: TitleMode
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  rows: [],
  values: 'count',
  total: '',
  order: 'typed',
  labels: 'name',
  sectorLabels: [],
  look: 'color',
  fills: [],
  keyAt: 'none',
  angleMarks: 'none',
  centerDot: 'auto', // on when there's something to measure or draw
  title: '',
  titleMode: 'none',
  labelSize: 'medium',
}

const LISTS = ['rows', 'sectorLabels', 'fills'] as const
type Scalar = Exclude<keyof Settings, (typeof LISTS)[number]>
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k): k is Scalar => !(LISTS as readonly string[]).includes(k))

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)
const titleMode = (v: unknown, fallback: TitleMode) => ((TITLE_MODES as readonly unknown[]).includes(v) ? (v as TitleMode) : fallback)

/** A list kept beside the rows: `rows` long at most, unknown entries '' and none trailing. */
function rowList(list: unknown, names: Record<string, string>, rows: number): string[] {
  const out = (Array.isArray(list) ? list : []).slice(0, rows).map((v: unknown) => (typeof v === 'string' && v in names ? v : ''))
  while (out.length && !out.at(-1)) out.pop()
  return out
}

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  const rows = cleanRows(s.rows, 1)
  return {
    rows,
    values: oneOf(VALUE_KINDS, s.values, d.values),
    total: text(s.total, d.total),
    order: oneOf(ORDERS, s.order, d.order),
    labels: oneOf(LABEL_MODES, s.labels, d.labels),
    sectorLabels: rowList(s.sectorLabels, SECTOR_LABELS, rows.length),
    look: oneOf(LOOKS, s.look, d.look),
    fills: rowList(s.fills, FILLS, rows.length),
    keyAt: oneOf(KEY_PLACES, s.keyAt, d.keyAt),
    angleMarks: oneOf(ANGLE_MARKS, s.angleMarks, d.angleMarks),
    centerDot: oneOf(CENTER_DOTS, s.centerDot, d.centerDot),
    title: text(s.title, d.title),
    titleMode: titleMode(s.titleMode, d.titleMode),
    labelSize: cleanLabelSize(s.labelSize),
  }
}

/** Which rows have something in them, so the lists beside them can follow. */
export const filledAt = (rows: TableRow[]) => rows.flatMap((r, i) => (filledRows([r]).length ? [i] : []))

export function settingsToQuery(s: Settings): string {
  const params = new URLSearchParams()
  for (const key of SCALARS) {
    const v = s[key]
    if (v === DEFAULT_SETTINGS[key] || v === null || v === undefined) continue
    params.set(key, String(v))
  }
  // One row= per category that has something in it, and its own label and
  // fill (if any) at the same place in lab= and fills=.
  const at = filledAt(s.rows)
  const list = (l: string[]) => {
    const out = at.map((i) => l[i] ?? '')
    while (out.length && !out.at(-1)) out.pop()
    return out.join('|')
  }
  if (list(s.sectorLabels)) params.set('lab', list(s.sectorLabels))
  if (list(s.fills)) params.set('fills', list(s.fills))
  for (const i of at) params.append('row', rowToParam(s.rows[i]))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = {
    rows: params.getAll('row').map((p) => rowFromParam(p, 1)),
    sectorLabels: (params.get('lab') ?? '').split('|'),
    fills: (params.get('fills') ?? '').split('|'),
  }
  for (const key of SCALARS) if (params.has(key)) s[key] = params.get(key)
  return cleanSettings(s)
}

// Rounding error trimmed: 172.79999999999995 is 172.8.
const tidy = (v: number) => Number(v.toPrecision(12))

/** A fraction in lowest terms. */
export type Fraction = { n: number; d: number }

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
const decimals = (v: number) => (Number.isInteger(v) ? 0 : (String(v).split('.')[1]?.length ?? 6))

/** v ÷ total in lowest terms, or null when either isn't a whole number of tenths, hundredths… or the result is unwieldy. */
export function fractionOf(v: number, total: number): Fraction | null {
  if (!(total > 0) || v < 0) return null
  const scale = 10 ** Math.min(6, Math.max(decimals(v), decimals(total)))
  const n = Math.round(v * scale)
  const d = Math.round(total * scale)
  if (Math.abs(n - v * scale) > 1e-6 || Math.abs(d - total * scale) > 1e-6) return null
  const g = gcd(n, d) || 1
  return n / g <= 9999 && d / g <= 9999 ? { n: n / g, d: d / g } : null
}

/** A number for a label or the readout: whole, or to one decimal place. */
export const nice = (v: number) => fmt(Math.round(v * 10) / 10)

/** One category: its value as typed and read, and what share of the circle it takes. */
export type Part = {
  /** its place among the table's filled rows */
  row: number
  name: string
  typed: string
  value: number | null
  /** in degrees, percent and as a fraction of the whole, when it has a value */
  angle: number | null
  percent: number | null
  fraction: Fraction | null
  /** the teacher's own label and fill for it ('' for the chart's) */
  label: SectorLabel | ''
  fill: string
}

/**
 * What the settings mean: each category's share of the circle, the whole the
 * circle stands for, the part of it left undrawn, and anything the teacher
 * should fix, as messages for the settings panel. Values past the whole are
 * fitted into the circle, so there is always a pie chart.
 */
export function readPie(s: Settings) {
  const at = filledAt(s.rows)
  const problems = { table: null as string | null, total: null as string | null, sum: null as string | null }
  // The rows as numbers, with a message for the first that isn't one.
  let parts: Part[] = at.map((i, k) => {
    const r = s.rows[i]
    const typed = r.cells[0]?.value.trim() ?? ''
    const read = readValue(typed)
    if (!problems.table && read.bad) problems.table = `“${read.bad}” isn't a number. Type numbers like 12, 2.5 or 30.`
    if (!problems.table && read.value !== null && read.value < 0) problems.table = `A pie chart can't show ${typed}, since a sector can't be less than nothing. Make it 0 or more.`
    const value = read.value !== null && read.value >= 0 ? read.value : null
    return { row: k, name: r.name.trim(), typed, value, angle: null, percent: null, fraction: null, label: (s.sectorLabels[i] ?? '') as SectorLabel | '', fill: s.fills[i] ?? '' }
  })
  if (parts.length > MAX_SECTORS) {
    problems.table ??= `A pie chart has ${MAX_SECTORS} sectors at most, so the rows after the ${MAX_SECTORS}th are left out.`
    parts = parts.slice(0, MAX_SECTORS)
  }

  const sum = parts.reduce((t, p) => t + (p.value ?? 0), 0)
  // Some values left empty: whatever they'd take is left for students.
  const leftEmpty = parts.some((p) => !p.typed)
  const unit = s.values === 'percent' ? '%' : s.values === 'degrees' ? '°' : ''
  let whole = s.values === 'percent' ? 100 : s.values === 'degrees' ? 360 : sum
  if (s.values === 'count' && s.total.trim()) {
    const t = readValue(s.total)
    if (t.value === null || t.value <= 0) problems.total = 'Type the total as a number bigger than 0, or leave it empty for the values’ sum.'
    else if (t.value < sum - 1e-9) problems.total = `The values add up to ${fmt(sum)}, more than the total ${fmt(t.value)}, so the total is their sum.`
    else whole = t.value
  } else if (s.values === 'count' && leftEmpty && sum > 0) {
    problems.total = 'Some values are empty. Type the total the whole circle stands for, to leave room for them.'
  }
  // Past the whole: fitted into the circle. Short of it, with nothing left
  // empty: the gap is an empty sector, not stretched over.
  const over = sum > whole + 1e-9
  if (over) problems.sum = `These add up to ${fmt(sum)}${unit}, more than ${fmt(whole)}${unit}, so the sectors are shrunk to fit the circle.`
  else if (!leftEmpty && sum > 0 && sum < whole - 1e-9)
    problems.sum = `These add up to ${fmt(sum)}${unit}, ${fmt(Number((whole - sum).toPrecision(12)))}${unit} short of ${fmt(whole)}${unit}, so the rest is left as an empty sector.`
  const of = over ? sum : whole
  for (const p of parts) {
    if (p.value === null || !(of > 0)) continue
    p.angle = tidy((p.value / of) * 360)
    p.percent = tidy((p.value / of) * 100)
    p.fraction = fractionOf(p.value, of)
  }
  const drawn = parts.filter((p) => p.angle !== null && p.angle > 1e-9)
  const gap = of > 0 ? Math.max(0, 360 - drawn.reduce((t, p) => t + p.angle!, 0)) : 360

  // Values that make 100 or 360 might be meant as percents or degrees.
  const offer: ValueKind | null =
    s.values === 'count' && !s.total.trim() && !leftEmpty && !problems.table && parts.length > 1
      ? Math.abs(sum - 360) < 1e-9 ? 'degrees' : Math.abs(sum - 100) < 1e-9 ? 'percent' : null
      : null

  return { parts, sum, whole: of, unit, gap: gap < 1e-6 ? 0 : gap, leftEmpty, offer, problems }
}
export type ReadPie = ReturnType<typeof readPie>
