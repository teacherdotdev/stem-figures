// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a cumulative frequency graph can be bookmarked or
// shared.
//
// The data comes one of three ways, each kept on its own so switching back
// and forth loses nothing: a frequency table (a bin and its frequency on each
// row), a cumulative table (an upper bound and its running total), or a data
// set sorted into bins. Tables are kept as typed (see $lib/stats/table), and
// so are the axes' ranges ("" for fitted to the data); readGraph() works out
// what it all means. The readings (median, quartiles and any other) are read
// off the drawn curve in layout.ts.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { MAX_BLOCKS, EVERY, MINOR, TITLE_MODES, type TitleMode } from '$shared/graph/axes'
import { GRIDLINES, type Gridlines } from '$shared/graph/grid'
import { fmt, niceText, numberingOf, type Numbering } from '$shared/graph/numbering'
import { parseNumber } from '$lib/shared/math.js'
import { binData, checkBins, parseBin, type Bin, type Edge } from '$lib/stats/bins'
import { niceRange, parseData } from '$lib/stats/data'
import { cleanRows, filledRows, readTable, rowFromParam, rowToParam, type TableRow } from '$lib/stats/table'

export { EVERY, MINOR, fmt }

/** Where the numbers come from: the switch at the top of the Data card. */
export const MODES = { frequency: 'Frequency table', cumulative: 'Cumulative table', data: 'Data set' } as const
/** Which bin a value on an edge goes in, for a data set. */
export const EDGES = { left: '10 ≤ x < 20', right: '10 < x ≤ 20' } as const
export const MARKS = { cross: 'Crosses', dot: 'Dots' } as const
export const JOINS = { smooth: 'Smooth curve', straight: 'Straight lines', none: 'None' } as const
/** The vertical axis: running totals, or running totals as a percent of n. */
export const SCALES = { count: 'Cumulative frequency', percent: 'Cumulative percent' } as const
export const LOOKS = { color: 'Color', bw: 'Black and white' } as const
/** How a reading is drawn: not at all, its dashed lines, or those with its value (or a blank for it) at the axis. */
export const SHOWS = { off: 'Off', lines: 'Lines only', value: 'Value', blank: 'Blank' } as const
/** A reading the teacher types: a percentile, across from a value on the vertical axis, or up from one on the horizontal. */
export const KINDS = { percentile: 'Percentile', across: 'Across from', up: 'Up from' } as const

export type Mode = keyof typeof MODES
export type Mark = keyof typeof MARKS
export type Join = keyof typeof JOINS
export type Scale = keyof typeof SCALES
export type Look = keyof typeof LOOKS
export type Show = keyof typeof SHOWS
export type Kind = keyof typeof KINDS
/** One typed reading: its kind, the number as typed, and how it's drawn. */
export type Reading = { kind: Kind; at: string; show: Exclude<Show, 'off'> }

export const MAX_READINGS = 4
const MAX_BINS = 50

export const QUARTILES = ['median', 'lower', 'upper'] as const
export type Quartile = (typeof QUARTILES)[number]

export type Settings = {
  mode: Mode
  /** the frequency table: each row a bin as typed, and its frequency */
  rows: TableRow[]
  /** the cumulative table: each row an upper bound as typed, and its running total */
  totals: TableRow[]
  /** the data set, as typed or pasted */
  data: string
  binStart: string
  binWidth: string
  edges: Edge
  /** a first point at the lowest bound, with nothing below it */
  start: boolean
  mark: Mark
  join: Join
  scale: Scale
  look: Look
  median: Show
  lower: Show
  upper: Show
  readings: Reading[]
  xFrom: string
  xTo: string
  xStep: string
  xEvery: number
  yFrom: string
  yTo: string
  yStep: string
  yEvery: number
  gridlines: Gridlines
  minor: number
  title: string
  titleMode: TitleMode
  xTitle: string
  xTitleMode: TitleMode
  yTitle: string
  yTitleMode: TitleMode
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

/** The vertical axis's title for each scale, swapped for the other when the scale changes. */
export const SCALE_TITLES: Record<Scale, string> = { count: 'Cumulative frequency', percent: 'Cumulative percent' }

export const DEFAULT_SETTINGS: Settings = {
  mode: 'frequency', // as GCSE questions give it
  rows: [],
  totals: [],
  data: '',
  binStart: '', // blank: worked out from the data
  binWidth: '',
  edges: 'left',
  start: true, // mark schemes expect the curve to start from 0
  mark: 'cross',
  join: 'smooth',
  scale: 'count',
  look: 'color',
  median: 'off',
  lower: 'off',
  upper: 'off',
  readings: [],
  xFrom: '', // blank: fitted to the data
  xTo: '',
  xStep: '',
  xEvery: 1,
  yFrom: '',
  yTo: '',
  yStep: '',
  yEvery: 1,
  gridlines: 'light',
  minor: 0,
  title: '',
  titleMode: 'none',
  xTitle: '',
  xTitleMode: 'none',
  yTitle: SCALE_TITLES.count,
  yTitleMode: 'text',
  labelSize: 'medium',
}

const LISTS = ['rows', 'totals', 'readings'] as const
type Scalar = Exclude<keyof Settings, (typeof LISTS)[number]>
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k): k is Scalar => !(LISTS as readonly string[]).includes(k))

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)
const numberOf = (list: readonly number[], v: any, fallback: number) => (list.includes(Number(v)) && String(v).trim() !== '' ? Number(v) : fallback)
const bool = (v: unknown, fallback: boolean) => (v === undefined || v === null ? fallback : v === true || v === '1' || v === 'true')
const titleMode = (v: unknown, fallback: TitleMode) => ((TITLE_MODES as readonly unknown[]).includes(v) ? (v as TitleMode) : fallback)
const SHOWN = { lines: SHOWS.lines, value: SHOWS.value, blank: SHOWS.blank }

function cleanReadings(list: unknown): Reading[] {
  return (Array.isArray(list) ? list : []).slice(0, MAX_READINGS).map((r: any) => ({
    kind: oneOf(KINDS, r?.kind, 'percentile'),
    at: text(r?.at, '').replace(/\|/g, ''),
    show: oneOf(SHOWN, r?.show, 'value'),
  }))
}

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  return {
    mode: oneOf(MODES, s.mode, d.mode),
    rows: cleanRows(s.rows, 1),
    totals: cleanRows(s.totals, 1),
    data: text(s.data, d.data),
    binStart: text(s.binStart, d.binStart),
    binWidth: text(s.binWidth, d.binWidth),
    edges: oneOf(EDGES, s.edges, d.edges),
    start: bool(s.start, d.start),
    mark: oneOf(MARKS, s.mark, d.mark),
    join: oneOf(JOINS, s.join, d.join),
    scale: oneOf(SCALES, s.scale, d.scale),
    look: oneOf(LOOKS, s.look, d.look),
    median: oneOf(SHOWS, s.median, d.median),
    lower: oneOf(SHOWS, s.lower, d.lower),
    upper: oneOf(SHOWS, s.upper, d.upper),
    readings: cleanReadings(s.readings),
    xFrom: text(s.xFrom, d.xFrom),
    xTo: text(s.xTo, d.xTo),
    xStep: text(s.xStep, d.xStep),
    xEvery: numberOf(EVERY, s.xEvery, d.xEvery),
    yFrom: text(s.yFrom, d.yFrom),
    yTo: text(s.yTo, d.yTo),
    yStep: text(s.yStep, d.yStep),
    yEvery: numberOf(EVERY, s.yEvery, d.yEvery),
    gridlines: oneOf(GRIDLINES, s.gridlines, d.gridlines),
    minor: numberOf(MINOR, s.minor, d.minor),
    title: text(s.title, d.title),
    titleMode: titleMode(s.titleMode, d.titleMode),
    xTitle: text(s.xTitle, d.xTitle),
    xTitleMode: titleMode(s.xTitleMode, d.xTitleMode),
    yTitle: text(s.yTitle, d.yTitle),
    yTitleMode: titleMode(s.yTitleMode, d.yTitleMode),
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
  // One row= per bin of the frequency table and one cum= per bound of the
  // cumulative table that has something in it; one read= per typed reading.
  for (const r of filledRows(s.rows)) params.append('row', rowToParam(r))
  for (const r of filledRows(s.totals)) params.append('cum', rowToParam(r))
  for (const r of s.readings) params.append('read', `${r.kind}|${r.at.trim()}|${r.show}`)
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = {
    rows: params.getAll('row').map((p) => rowFromParam(p, 1)),
    totals: params.getAll('cum').map((p) => rowFromParam(p, 1)),
    readings: params.getAll('read').map((p) => {
      const [kind, at, show] = p.split('|')
      return { kind, at, show }
    }),
  }
  for (const key of SCALARS) {
    if (!params.has(key)) continue
    const raw = params.get(key)
    s[key] = typeof DEFAULT_SETTINGS[key] === 'number' ? Number(raw) : raw
  }
  return cleanSettings(s)
}

// Reading the data.

/** An upper bound as a cumulative table gives it: 20, ≤ 20, x < 20, under 20, or a bin like 0 < h ≤ 20 or 10–20. */
const NUM = String.raw`[-−]?(?:\d+\.?\d*|\.\d+)`
const UP_TO = new RegExp(String.raw`^\s*(?:(?:[a-z]\s*)?(?:<=|≤|<|=<)|less than|under|up to|below)?\s*(${NUM})\s*$`, 'i')
export function parseBound(typed: string): { lo: number | null; hi: number } | { problem: string } {
  const bin = parseBin(typed)
  if (!('problem' in bin)) return { lo: bin.lo, hi: bin.hi }
  const m = typed.match(UP_TO)
  if (m) return { lo: null, hi: Number(m[1].replace('−', '-')) }
  return { problem: `Type “${typed.trim()}” as an upper bound, like 20, ≤ 20 or 0 < h ≤ 20.` }
}

/** One plotted point: an upper bound (or the lowest bound) and the running total up to it. */
export type Total = { x: number; cf: number }

/** What the table or data set gives: the running totals, n, and where the curve can start. */
type Totals = { totals: Total[]; lowest: number | null; bins: Bin[]; problem: string | null }

function fromFrequencies(s: Settings): Totals {
  const table = readTable(s.rows)
  let problem = table.problem
  const filled = filledRows(s.rows)
  const bins: Bin[] = []
  const totals: Total[] = []
  let cf = 0
  table.rows.forEach((r, i) => {
    const typed = filled[i].name.trim()
    const f = r.values[0]
    if (!typed) {
      problem ??= f !== null ? `Type the bin for the frequency ${fmt(f)}, like 10–20.` : null
      return
    }
    const bin = parseBin(typed)
    if ('problem' in bin) return void (problem ??= bin.problem)
    if (f === null) return void (problem ??= r.values[0] === null && !filled[i].cells[0].value.trim() ? `Type a frequency for ${typed}.` : null)
    if (f < 0) return void (problem ??= `A frequency can’t be below 0, so make ${filled[i].cells[0].value.trim()} positive.`)
    bins.push(bin)
    cf += f
    totals.push({ x: bin.hi, cf })
  })
  problem ??= checkBins(bins)
  return { totals, lowest: bins[0]?.lo ?? null, bins, problem }
}

function fromTotals(s: Settings): Totals {
  const table = readTable(s.totals)
  let problem = table.problem
  const filled = filledRows(s.totals)
  const totals: Total[] = []
  let lowest: number | null = null
  table.rows.forEach((r, i) => {
    const typed = filled[i].name.trim()
    const cf = r.values[0]
    if (!typed) {
      problem ??= cf !== null ? `Type the upper bound for the cumulative frequency ${fmt(cf)}, like ≤ 20.` : null
      return
    }
    const bound = parseBound(typed)
    if ('problem' in bound) return void (problem ??= bound.problem)
    if (cf === null) return void (problem ??= !filled[i].cells[0].value.trim() ? `Type a cumulative frequency for ${typed}.` : null)
    if (cf < 0) return void (problem ??= `A cumulative frequency can’t be below 0, so make ${filled[i].cells[0].value.trim()} positive.`)
    const before = totals.at(-1)
    if (before && bound.hi <= before.x) return void (problem ??= `The upper bounds have to go up, so put ${typed} before ${fmt(before.x)}.`)
    if (before && cf < before.cf) {
      problem ??= `The cumulative frequencies go down, from ${fmt(before.cf)} to ${fmt(cf)} at ${typed}. Each one is at least the one before.`
      return
    }
    if (!totals.length && bound.lo !== null && bound.lo < bound.hi) lowest = bound.lo
    totals.push({ x: bound.hi, cf })
  })
  return { totals, lowest, bins: [], problem }
}

function fromData(s: Settings): Totals & { auto: { start: number; width: number }; problems: { data: string | null; binStart: string | null; binWidth: string | null } } {
  const { values, bad } = parseData(s.data)
  const problems = { data: null as string | null, binStart: null as string | null, binWidth: null as string | null }
  if (bad) problems.data = `“${bad}” isn't a number. Type numbers separated by commas or spaces, like 152, 158, 161.`
  const fit = values.length ? niceRange(Math.min(...values), Math.max(...values)) : { from: 0, step: 10 }
  const auto = { start: fit.from, width: fit.step }
  const start = s.binStart.trim() ? parseNumber(s.binStart) : auto.start
  const width = s.binWidth.trim() ? parseNumber(s.binWidth) : auto.width
  if (start === null) problems.binStart = 'Type a number, like 0 or 150, or leave it empty to fit the data.'
  if (width === null) problems.binWidth = 'Type a number, like 10 or 5, or leave it empty to fit the data.'
  else if (width <= 0) problems.binWidth = 'A bin has to be wider than 0.'
  const ok = start !== null && width !== null && width > 0
  const { bins, counts } = values.length ? binData(values, ok ? start : auto.start, ok ? width : auto.width, s.edges) : { bins: [], counts: [] }
  if (bins.length > MAX_BINS) {
    problems.binWidth = `That makes ${bins.length} bins. Make them wider (${MAX_BINS} at most).`
    return { totals: [], lowest: null, bins: [], problem: null, auto, problems }
  }
  let cf = 0
  const totals = bins.map((b, i) => ({ x: b.hi, cf: (cf += counts[i]) }))
  return { totals, lowest: bins[0]?.lo ?? null, bins, problem: null, auto, problems }
}

export type RangeKey = 'From' | 'To' | 'Step'
type Range = { from: number; to: number; step: number }

/**
 * One axis's range as typed ("" for fitted, from `auto`), as numbers, with
 * how its numbers are written and anything the teacher should fix. When it
 * can't be used it falls back to the fitted one, so there is always a graph.
 */
function readRange(typed: Record<RangeKey, string>, auto: Range, reach: { lo: number; hi: number } | null) {
  const t = (k: RangeKey) => typed[k].trim()
  const read = (k: RangeKey) => (t(k) ? parseNumber(typed[k]) : auto[k === 'From' ? 'from' : k === 'To' ? 'to' : 'step'])
  const from = read('From')
  const to = read('To')
  const step = read('Step')
  const numbering: Numbering = numberingOf(t('From'), t('To'), t('Step'))
  const problems: Record<RangeKey, string | null> = { From: null, To: null, Step: null }
  if (from === null) problems.From = 'Type a number, like 0 or 150, or leave it empty to fit the data.'
  if (to === null) problems.To = 'Type a number, like 80 or 200, or leave it empty to fit the data.'
  if (step === null) problems.Step = 'Type a number, like 1, 5 or 10, or leave it empty to fit the data.'
  else if (step <= 0) problems.Step = 'Count by a number bigger than 0.'
  if (from !== null && to !== null && from >= to) problems.To = `The axis has to end after it starts, so make this bigger than ${niceText(from, numbering)}.`
  const blocks = !problems.From && !problems.To && !problems.Step ? Math.ceil((to! - from!) / step! - 1e-9) : 0
  if (blocks > MAX_BLOCKS) problems.Step = `That makes ${blocks} lines. Count by a bigger number (${MAX_BLOCKS} at most).`
  const ok = !problems.From && !problems.To && !problems.Step
  const range = ok ? { from: from!, to: Number((from! + blocks * step!).toPrecision(12)), step: step! } : auto
  if (ok && reach && (reach.lo < range.from - 1e-9 || reach.hi > range.to + 1e-9)) {
    problems.To = `The graph runs from ${fmt(reach.lo)} to ${fmt(reach.hi)}, past the end of the axis, so it's cut off. Widen the range to show it all.`
  }
  return { range, numbering, problems }
}

/**
 * What the settings mean: the running totals to plot (each upper bound with
 * the total up to it, after the lowest bound with 0 when the curve starts
 * there), n, each axis's range and how it's numbered, and anything the
 * teacher should fix, as messages for the settings panel.
 */
export function readGraph(s: Settings) {
  const source = s.mode === 'frequency' ? fromFrequencies(s) : s.mode === 'cumulative' ? fromTotals(s) : fromData(s)
  const data = s.mode === 'data' ? (source as ReturnType<typeof fromData>) : null
  const n = source.totals.at(-1)?.cf ?? 0
  const percent = s.scale === 'percent'
  const startsAt = s.start && source.lowest !== null && source.totals.length && source.lowest < source.totals[0].x ? source.lowest : null
  // The plotted points, the running totals in counts: the start, then each upper bound.
  const points: Total[] = [...(startsAt !== null ? [{ x: startsAt, cf: 0 }] : []), ...source.totals]
  const yOf = (cf: number) => (percent ? (n > 0 ? (cf / n) * 100 : 0) : cf)

  // The axes fitted to the points, or 0 to 10 with none.
  const xs = points.map((p) => p.x)
  const xReach = xs.length ? { lo: Math.min(...xs), hi: Math.max(...xs) } : null
  const xAuto = xReach && xReach.hi > xReach.lo ? niceRange(xReach.lo, xReach.hi) : xReach ? niceRange(xReach.lo - 5, xReach.hi + 5) : { from: 0, to: 10, step: 1 }
  const yAuto = percent ? { from: 0, to: 100, step: 10 } : n > 0 ? niceRange(0, n) : { from: 0, to: 10, step: 1 }
  const yReach = points.length ? { lo: 0, hi: yOf(n) } : null
  const x = readRange({ From: s.xFrom, To: s.xTo, Step: s.xStep }, xAuto, xReach)
  const y = readRange({ From: s.yFrom, To: s.yTo, Step: s.yStep }, yAuto, yReach)

  // Starting from 0 needs a lowest bound, which a cumulative table of plain upper bounds doesn't give.
  const start =
    s.start && s.mode === 'cumulative' && source.totals.length && source.totals[0].cf > 0 && startsAt === null
      ? 'Type the first bound as a bin, like 0 < h ≤ 10, for the curve to start from 0 at its lower end.'
      : null

  return {
    /** the points to plot, as running totals in counts */
    points,
    /** each upper bound and its running total, for the readout */
    totals: source.totals,
    bins: source.bins,
    n,
    percent,
    yOf,
    x: { ...x, auto: xAuto },
    y: { ...y, auto: yAuto },
    /** a data set's bins as fitted, for the placeholders */
    binAuto: data?.auto ?? null,
    problems: {
      table: source.problem,
      data: data?.problems.data ?? null,
      binStart: data?.problems.binStart ?? null,
      binWidth: data?.problems.binWidth ?? null,
      start,
      xFrom: x.problems.From,
      xTo: x.problems.To,
      xStep: x.problems.Step,
      yFrom: y.problems.From,
      yTo: y.problems.To,
      yStep: y.problems.Step,
    },
  }
}

export type ReadGraph = ReturnType<typeof readGraph>
