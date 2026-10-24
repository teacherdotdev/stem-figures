// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a histogram can be bookmarked or shared.
//
// The data come one of two ways: a data set (numbers, sorted into bins from a
// start and a width) or a frequency table (each row a bin as typed, like
// 10–20 or 10 ≤ x < 20, and its frequency). Both are kept as typed, and so are
// the axes' ranges ("" for fitted to the data); readHistogram() works out what
// it all means.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { MAX_BLOCKS, EVERY, MINOR, TITLE_MODES, type TitleMode } from '$shared/graph/axes'
import { GRIDLINES, type Gridlines } from '$shared/graph/grid'
import { fmt, niceText, numberingOf } from '$shared/graph/numbering'
import { parseNumber } from '$lib/shared/math.js'
import { binData, checkBins, parseBin, type Bin, type Edge } from '$lib/stats/bins'
import { niceRange, parseData } from '$lib/stats/data'
import { FILLS, type Fill } from '$lib/stats/fills'
import {
  cleanColumns, cleanRows, columnsFromParam, columnsToParam, filledRows, readValue, rowFromParam, rowToParam, type TableRow,
} from '$lib/stats/table'

export { EVERY, MINOR, fmt }

export const SOURCES = { data: 'Data set', table: 'Frequency table' } as const
/** What the vertical axis measures. */
export const MEASURES = {
  frequency: 'Frequency',
  relative: 'Relative frequency',
  percent: 'Relative frequency (%)',
  density: 'Frequency density',
} as const
export const POLYGONS = { none: 'None', over: 'Over the bars', alone: 'Alone' } as const
/** Where the horizontal axis is numbered: at the bins' edges, or every step of a range. */
export const X_NUMBERS = { edges: 'Bin edges', steps: 'Every step' } as const

export type Source = keyof typeof SOURCES
export type Measure = keyof typeof MEASURES
export type Polygon = keyof typeof POLYGONS
export type XNumbers = keyof typeof X_NUMBERS

export type Settings = {
  source: Source
  /** the data set, as typed or pasted */
  data: string
  /** where the first bin starts, and each bin's width, "" for worked out from the data */
  binStart: string
  binWidth: string
  /** which bin holds a value on an edge: the one starting there (10 ≤ x < 20) or ending there */
  edges: Edge
  /** the frequency table's one heading */
  columns: string[]
  /** the frequency table: each row's name is its bin, its one cell the frequency */
  rows: TableRow[]
  /** 'auto': frequency with equal bins, frequency density with unequal ones */
  measure: 'auto' | Measure
  fill: Fill
  polygon: Polygon
  /** the polygon closed down to the axis half a bin past each end */
  closePolygon: boolean
  /** each bar's frequency written above it */
  values: boolean
  xNumbers: XNumbers
  xFrom: string
  xTo: string
  xStep: string
  yTo: string
  yStep: string
  every: number
  gridlines: Gridlines
  minor: number
  title: string
  titleMode: TitleMode
  xTitle: string
  xTitleMode: TitleMode
  /** the vertical axis's title; empty text is the measure's name */
  yTitle: string
  yTitleMode: TitleMode
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  source: 'data',
  data: '',
  binStart: '',
  binWidth: '',
  edges: 'left', // 10 ≤ x < 20, as CONTEXT.md says
  columns: [''],
  rows: [],
  measure: 'auto',
  fill: 'blue',
  polygon: 'none',
  closePolygon: true,
  values: false,
  xNumbers: 'edges',
  xFrom: '', // blank: fitted to the bins
  xTo: '',
  xStep: '',
  yTo: '', // blank: fitted to the data; the vertical axis always starts at 0
  yStep: '',
  every: 1,
  gridlines: 'light',
  minor: 0,
  title: '',
  titleMode: 'none',
  xTitle: '',
  xTitleMode: 'none',
  yTitle: '',
  yTitleMode: 'text', // the measure's name, unless the teacher types another
  labelSize: 'medium',
}

const LISTS = ['columns', 'rows'] as const
type Scalar = Exclude<keyof Settings, (typeof LISTS)[number]>
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k): k is Scalar => !(LISTS as readonly string[]).includes(k))

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)
const numberOf = (list: readonly number[], v: any, fallback: number) => (list.includes(Number(v)) && String(v).trim() !== '' ? Number(v) : fallback)
const bool = (v: unknown, fallback: boolean) => (v === undefined || v === null ? fallback : v === true || v === '1' || v === 'true')
const titleMode = (v: unknown, fallback: TitleMode) => ((TITLE_MODES as readonly unknown[]).includes(v) ? (v as TitleMode) : fallback)
const EDGES = { left: '', right: '' } as const

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  const columns = cleanColumns(s.columns).slice(0, 1)
  return {
    source: oneOf(SOURCES, s.source, d.source),
    data: text(s.data, d.data),
    binStart: text(s.binStart, d.binStart),
    binWidth: text(s.binWidth, d.binWidth),
    edges: oneOf(EDGES, s.edges, d.edges),
    columns,
    rows: cleanRows(s.rows, 1),
    measure: typeof s.measure === 'string' && s.measure in MEASURES ? (s.measure as Measure) : 'auto',
    fill: oneOf(FILLS, s.fill, d.fill),
    polygon: oneOf(POLYGONS, s.polygon, d.polygon),
    closePolygon: bool(s.closePolygon, d.closePolygon),
    values: bool(s.values, d.values),
    xNumbers: oneOf(X_NUMBERS, s.xNumbers, d.xNumbers),
    xFrom: text(s.xFrom, d.xFrom),
    xTo: text(s.xTo, d.xTo),
    xStep: text(s.xStep, d.xStep),
    yTo: text(s.yTo, d.yTo),
    yStep: text(s.yStep, d.yStep),
    every: numberOf(EVERY, s.every, d.every),
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
  // The table's heading when it has one, then one row= per bin with something in it.
  if (s.columns[0].trim()) params.set('cols', columnsToParam(s.columns))
  for (const r of filledRows(s.rows)) params.append('row', rowToParam(r))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = {
    columns: columnsFromParam(params.get('cols')),
    rows: params.getAll('row').map((p) => rowFromParam(p, 1)),
  }
  for (const key of SCALARS) {
    if (!params.has(key)) continue
    const raw = params.get(key)
    s[key] = typeof DEFAULT_SETTINGS[key] === 'number' ? Number(raw) : raw
  }
  return cleanSettings(s)
}

/** A bin as drawn: its edges, its frequency (null: left empty for students), and how it was typed. */
export type ReadBin = Bin & { frequency: number | null; name: string }
export type Range = { from: number; to: number; step: number }
export type RangeKey = 'xFrom' | 'xTo' | 'xStep' | 'yTo' | 'yStep'

/** A bin written as teachers write it: 10–20. */
export const binText = (b: Bin) => `${fmt(b.lo)}–${fmt(b.hi)}`

/** Each bar's height on the vertical axis, by what it measures. */
export function heightOf(b: ReadBin, measure: Measure, n: number): number | null {
  if (b.frequency === null) return null
  if (measure === 'density') return b.frequency / (b.hi - b.lo)
  if (measure === 'relative') return n ? b.frequency / n : null
  if (measure === 'percent') return n ? (100 * b.frequency) / n : null
  return b.frequency
}

/** A number free of float noise, for heights like 0.1 + 0.2. */
const tidy = (v: number) => Number(v.toPrecision(12)) || 0

/** The bins from a data set, or the problems with it. */
function readDataSet(s: Settings) {
  const problems = { data: null as string | null, binStart: null as string | null, binWidth: null as string | null }
  const { values, bad } = parseData(s.data)
  if (bad) problems.data = `“${bad}” isn't a number. Type numbers like 12, 2.5 or −3, separated by commas or spaces.`
  const fitted = values.length ? niceRange(Math.min(...values), Math.max(...values)) : { from: 0, to: 10, step: 1 }
  const auto = { binStart: fitted.from, binWidth: fitted.step }
  let start = auto.binStart
  let width = auto.binWidth
  if (s.binStart.trim()) {
    const v = parseNumber(s.binStart)
    if (v === null) problems.binStart = 'Type a number, like 0 or 150, or leave it empty to fit the data.'
    else start = v
  }
  if (s.binWidth.trim()) {
    const v = parseNumber(s.binWidth)
    if (v === null || v <= 0) problems.binWidth = 'Type a width bigger than 0, like 5 or 0.5, or leave it empty to fit the data.'
    else if (values.length && (Math.max(...values) - Math.min(start, ...values)) / v > MAX_BLOCKS) {
      problems.binWidth = `That makes more than ${MAX_BLOCKS} bins. Make the bins wider.`
    } else width = v
  }
  // A value on the first edge, when bins hold their right ends, needs a bin before it.
  if (s.edges === 'right' && values.length) {
    const min = Math.min(...values)
    start = Math.min(start, tidy(start + (Math.ceil((min - start) / width - 1e-9) - 1) * width))
  }
  const binned = binData(values, start, width, s.edges)
  const bins: ReadBin[] = binned.bins.map((b, i) => ({ ...b, frequency: binned.counts[i], name: binText(b) }))
  return { bins, auto, problems, count: values.length }
}

/** Whole-number bins like 10–19, 20–29, with a gap of 1 between each: the edges they stand for (9.5–19.5…). */
function wholeNumberEdges(bins: Bin[]): string[] | null {
  if (bins.length < 2) return null
  const whole = bins.every((b) => Number.isInteger(b.lo) && Number.isInteger(b.hi))
  const gapsOfOne = bins.slice(1).every((b, i) => b.lo - bins[i].hi === 1)
  return whole && gapsOfOne ? bins.map((b) => `${fmt(b.lo - 0.5)}–${fmt(b.hi + 0.5)}`) : null
}

/** The bins from a frequency table, or the problems with it. */
function readTable(s: Settings) {
  let table: string | null = null
  let fix: string[] | null = null
  const bins: ReadBin[] = []
  for (const r of filledRows(s.rows)) {
    const typed = r.name.trim()
    const f = readValue(r.cells[0]?.value ?? '')
    if (!typed) {
      table ??= `Type a bin for the frequency ${r.cells[0].value.trim()}, like 10–20.`
      continue
    }
    const bin = parseBin(typed)
    if ('problem' in bin) {
      table ??= bin.problem
      continue
    }
    if (f.bad) table ??= `“${f.bad}” isn't a number. Type frequencies like 12 or 3.`
    else if (f.value !== null && f.value < 0) table ??= `A frequency can't be below 0, so make ${fmt(f.value)} 0 or more.`
    bins.push({ ...bin, frequency: f.value !== null && f.value >= 0 ? f.value : null, name: typed })
  }
  let order = checkBins(bins)
  if (order) {
    fix = wholeNumberEdges(bins)
    if (fix) order += ` For whole numbers, the edges go halfway between: ${fix.slice(0, 2).join(', ')} and so on.`
  }
  return { bins, problems: { table, bins: order }, fix }
}

/**
 * What the settings mean: the bins and their frequencies, n, what the vertical
 * axis measures and each bar's height on it, both axes' ranges (fitted to the
 * data for any part left blank), and anything the teacher should fix, as
 * messages for the settings panel. When a range can't be used, the fitted one
 * is drawn instead, so there is always a histogram.
 */
export function readHistogram(s: Settings) {
  const fromData = s.source === 'data'
  const dataSet = fromData ? readDataSet(s) : null
  const tableRead = fromData ? null : readTable(s)
  const bins = dataSet?.bins ?? tableRead!.bins
  const n = bins.reduce((t, b) => t + (b.frequency ?? 0), 0)
  const widths = bins.map((b) => b.hi - b.lo)
  const equal = widths.every((w) => Math.abs(w - widths[0]) < 1e-9 * Math.max(1, Math.abs(w)))
  const measure: Measure = s.measure === 'auto' ? (equal ? 'frequency' : 'density') : s.measure
  const auto: Measure = equal ? 'frequency' : 'density'

  const problems: Record<'data' | 'binStart' | 'binWidth' | 'table' | 'bins' | 'measure' | RangeKey, string | null> = {
    data: null, binStart: null, binWidth: null, table: null, bins: null, measure: null,
    xFrom: null, xTo: null, xStep: null, yTo: null, yStep: null,
  }
  Object.assign(problems, dataSet?.problems ?? tableRead!.problems)
  if (!equal && measure !== 'density') {
    problems.measure = 'The bins aren’t all the same width, so the bars’ areas don’t match their frequencies. Frequency density keeps them in step.'
  } else if ((measure === 'relative' || measure === 'percent') && bins.some((b) => b.frequency === null)) {
    problems.measure = `A bin has no frequency, so n = ${fmt(n)} counts only the others.`
  }
  const heights = bins.map((b) => {
    const h = heightOf(b, measure, n)
    return h === null ? null : tidy(h)
  })

  // The vertical axis: from 0 up past the tallest bar, with room above it for
  // its frequency when they're written on.
  const top = Math.max(0, ...heights.filter((h): h is number => h !== null))
  const fitted = top > 0 ? niceRange(0, top) : measure === 'relative' ? { from: 0, to: 1, step: 0.1 } : { from: 0, to: 10, step: 1 }
  const yAuto = s.values && top > 0 && fitted.to - top < fitted.step * 0.4 && fitted.to / fitted.step < 20 ? { ...fitted, to: tidy(fitted.to + fitted.step) } : fitted
  const typed = (key: RangeKey) => s[key].trim()
  const yNumbering = numberingOf(typed('yTo'), typed('yStep'))
  const yTo = typed('yTo') ? parseNumber(s.yTo) : yAuto.to
  const yStep = typed('yStep') ? parseNumber(s.yStep) : yAuto.step
  if (yTo === null) problems.yTo = 'Type a number, like 10 or 0.5, or leave it empty to fit the data.'
  else if (yTo <= 0) problems.yTo = 'The axis starts at 0, so make this bigger than 0.'
  if (yStep === null) problems.yStep = 'Type a number, like 1, 5 or 0.5, or leave it empty to fit the data.'
  else if (yStep <= 0) problems.yStep = 'Count by a number bigger than 0.'
  const yBlocks = !problems.yTo && !problems.yStep ? Math.ceil(yTo! / yStep! - 1e-9) : 0
  if (yBlocks > MAX_BLOCKS) problems.yStep = `That makes ${yBlocks} lines. Count by a bigger number (${MAX_BLOCKS} at most).`
  const yOk = !problems.yTo && !problems.yStep
  const y: Range = yOk ? { from: 0, to: tidy(yBlocks * yStep!), step: yStep! } : yAuto
  if (yOk && top > y.to + 1e-9) problems.yTo = `${fmt(top)} is past the top of the axis, so its bar is cut off. Make the axis taller to show it.`

  // The horizontal axis, numbered at every step of a range: fitted to the bins
  // (and the polygon's ends) unless typed.
  const lo = bins.length ? Math.min(...bins.map((b) => b.lo)) : 0
  const hi = bins.length ? Math.max(...bins.map((b) => b.hi)) : 10
  const closed = s.polygon !== 'none' && s.closePolygon && bins.length > 0
  const first = bins.find((b) => b.lo === lo)
  const last = bins.find((b) => b.hi === hi)
  const reach = closed && first && last ? { lo: lo - (first.hi - first.lo) / 2, hi: hi + (last.hi - last.lo) / 2 } : { lo, hi }
  const xAuto = niceRange(reach.lo, reach.hi)
  const xNumbering = numberingOf(typed('xFrom'), typed('xTo'), typed('xStep'))
  let x: Range | null = null
  if (s.xNumbers === 'steps') {
    const read = (key: 'xFrom' | 'xTo' | 'xStep', fallback: number) => (typed(key) ? parseNumber(s[key]) : fallback)
    const from = read('xFrom', xAuto.from)
    const to = read('xTo', xAuto.to)
    const step = read('xStep', xAuto.step)
    if (from === null) problems.xFrom = 'Type a number, like 0 or 150, or leave it empty to fit the bins.'
    if (to === null) problems.xTo = 'Type a number, like 50 or 190, or leave it empty to fit the bins.'
    if (step === null) problems.xStep = 'Type a number, like 1, 5 or 0.5, or leave it empty to fit the bins.'
    else if (step <= 0) problems.xStep = 'Count by a number bigger than 0.'
    if (from !== null && to !== null && from >= to) problems.xTo = `The axis has to end after it starts, so make this bigger than ${niceText(from, xNumbering)}.`
    const blocks = !problems.xFrom && !problems.xTo && !problems.xStep ? Math.ceil((to! - from!) / step! - 1e-9) : 0
    if (blocks > MAX_BLOCKS) problems.xStep = `That makes ${blocks} lines. Count by a bigger number (${MAX_BLOCKS} at most).`
    const ok = !problems.xFrom && !problems.xTo && !problems.xStep
    x = ok ? { from: from!, to: tidy(from! + blocks * step!), step: step! } : xAuto
    if (ok && (lo < x.from - 1e-9 || hi > x.to + 1e-9)) {
      problems.xTo = `The bins run from ${fmt(lo)} to ${fmt(hi)}, past the ends of the axis, so some bars are cut off. Widen the range to show them.`
    }
  }

  return {
    bins,
    n,
    /** how many values the data set has, or null for a frequency table */
    count: dataSet?.count ?? null,
    equal,
    measure,
    /** the measure 'auto' picks for these bins */
    auto,
    heights,
    y,
    yAuto,
    yNumbering,
    /** the horizontal axis's range, when it's numbered at every step */
    x,
    xAuto,
    xNumbering,
    /** how far the figure reaches along the horizontal axis: the bins, and the polygon's closing ends */
    reach,
    /** the data set's start and width, worked out from the data */
    binAuto: dataSet?.auto ?? null,
    /** whole-number bins typed with gaps, as the edges they stand for (9.5–19.5…) */
    fix: tableRead?.fix ?? null,
    problems,
  }
}

export type ReadHistogram = ReturnType<typeof readHistogram>
