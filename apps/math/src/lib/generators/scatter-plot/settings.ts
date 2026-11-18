// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a scatter plot can be bookmarked or shared.
//
// The data comes one of two ways, and both are kept as typed so switching
// between them loses neither: a table with a row per point (its name the x
// value, its one cell the y value) or a list of pairs, one per line, as
// pasted from two spreadsheet columns. readScatter() reads whichever is in
// use into points, so the drawing never knows which was typed. Only the one
// in use goes into the page address.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { EVERY, MINOR, TITLE_MODES, type TitleMode } from '$shared/graph/axes'
import { GRIDLINES, type Gridlines } from '$shared/graph/grid'
import { fmt, niceText, numberingOf, type Numbering } from '$shared/graph/numbering'
import { parseNumber } from '$lib/shared/math.js'
import { niceRange } from '$lib/stats/data'
import { correlation, leastSquares, type Pair } from '$lib/stats/regression'
import { MAX_ROWS, cleanRows, filledRows, rowFromParam, rowToParam, type TableRow } from '$lib/stats/table'

export { EVERY, MINOR, TITLE_MODES, GRIDLINES, fmt }
export type { TitleMode, Pair }

/** The most points a list can have (a table has at most MAX_ROWS). */
export const MAX_POINTS = 200
export const MAX_BLOCKS = 50
export const INPUTS = { table: 'Table', list: 'List of pairs' } as const
export const MARKS = { dot: 'Dots', cross: 'Crosses' } as const
export const FITS = { none: 'None', best: 'Least squares', own: 'My own line' } as const
export const EQUATION_MODES = { text: 'Written', blank: 'Blank line', none: 'Hidden' } as const
export const CORRELATIONS = { none: 'None', r: 'r', r2: 'r²' } as const
export const PLACES = [0, 1, 2, 3, 4]

export type Input = keyof typeof INPUTS
export type Mark = keyof typeof MARKS
export type Fit = keyof typeof FITS
export type EquationMode = keyof typeof EQUATION_MODES
export type Correlation = keyof typeof CORRELATIONS

export type Settings = {
  input: Input
  /** the list of pairs, as typed */
  data: string
  /** the table: each row's name is a point's x, its one cell the y */
  rows: TableRow[]
  mark: Mark
  fit: Fit
  /** the teacher's own line, as typed: y = 2x + 1 */
  line: string
  equation: EquationMode
  r: Correlation
  places: number
  /** each axis's range as typed; empty fits the data */
  xFrom: string
  xTo: string
  xStep: string
  yFrom: string
  yTo: string
  yStep: string
  xEvery: number
  yEvery: number
  title: string
  titleMode: TitleMode
  xTitle: string
  xTitleMode: TitleMode
  yTitle: string
  yTitleMode: TitleMode
  gridlines: Gridlines
  minor: number
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  input: 'table',
  data: '',
  rows: [],
  mark: 'dot',
  fit: 'none',
  line: '',
  equation: 'text',
  r: 'none',
  places: 2,
  xFrom: '',
  xTo: '',
  xStep: '',
  yFrom: '',
  yTo: '',
  yStep: '',
  xEvery: 1,
  yEvery: 1,
  title: '',
  titleMode: 'none',
  xTitle: '',
  xTitleMode: 'none',
  yTitle: '',
  yTitleMode: 'none',
  gridlines: 'standard',
  minor: 0,
  labelSize: 'medium',
}

// Settings written into the address one parameter each; the data is written its own way.
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k) => k !== 'data' && k !== 'rows')

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T>(list: readonly T[], v: any, fallback: T): T => (list.includes(v) ? v : fallback)
const keyOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T =>
  typeof v === 'string' && Object.hasOwn(names, v) ? (v as T) : fallback

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  return {
    input: keyOf(INPUTS, s.input, d.input),
    data: text(s.data, d.data),
    rows: cleanRows(s.rows, 1),
    mark: keyOf(MARKS, s.mark, d.mark),
    fit: keyOf(FITS, s.fit, d.fit),
    line: text(s.line, d.line),
    equation: keyOf(EQUATION_MODES, s.equation, d.equation),
    r: keyOf(CORRELATIONS, s.r, d.r),
    places: oneOf(PLACES, Number(s.places), d.places),
    xFrom: text(s.xFrom, d.xFrom),
    xTo: text(s.xTo, d.xTo),
    xStep: text(s.xStep, d.xStep),
    yFrom: text(s.yFrom, d.yFrom),
    yTo: text(s.yTo, d.yTo),
    yStep: text(s.yStep, d.yStep),
    xEvery: oneOf(EVERY, Number(s.xEvery), d.xEvery),
    yEvery: oneOf(EVERY, Number(s.yEvery), d.yEvery),
    title: text(s.title, d.title),
    titleMode: oneOf(TITLE_MODES, s.titleMode, d.titleMode),
    xTitle: text(s.xTitle, d.xTitle),
    xTitleMode: oneOf(TITLE_MODES, s.xTitleMode, d.xTitleMode),
    yTitle: text(s.yTitle, d.yTitle),
    yTitleMode: oneOf(TITLE_MODES, s.yTitleMode, d.yTitleMode),
    gridlines: keyOf(GRIDLINES, s.gridlines, d.gridlines),
    minor: oneOf(MINOR, Number(s.minor), d.minor),
    labelSize: cleanLabelSize(s.labelSize),
  }
}

/** The page address: settings that aren't the default, then the data in use (data=1, 2⏎3, 4 or one row=1|2 per point). */
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

// ——— Reading the data ———

/** A number as typed: 12, −3, 2.5, .5 or 3/4. */
export function readNumber(typed: string): number | null {
  const t = typed.trim().replace(/[−–]/g, '-')
  const frac = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(t)
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null
  const v = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : NaN
  return Number.isFinite(v) ? v : null
}

/**
 * The list's points in the order typed: one pair per line, the two numbers
 * separated by a comma, a tab or spaces, as pasted from two spreadsheet
 * columns; or pairs in brackets, (1, 2), (3, 4), on any number of lines.
 * A first line that isn't numbers (the columns' headings) is skipped.
 * Returns the first piece that isn't a pair of numbers, if any.
 */
export function readPairs(typed: string): { points: Pair[]; bad: string | null } {
  const points: Pair[] = []
  let bad: string | null = null
  if (typed.includes('(')) {
    const rest = typed.replace(/\(([^()]*)\)/g, (_, inner: string) => {
      const parts = inner.split(/[,;\t]|\s+/).map((p) => p.trim()).filter(Boolean)
      const [x, y] = parts.map(readNumber)
      if (parts.length === 2 && x !== null && y !== null) points.push({ x, y })
      else bad ??= `(${inner.trim()})`
      return ' '
    })
    bad ??= rest.split(/[\s,;]+/).find(Boolean) ?? null
    return { points, bad }
  }
  const lines = typed.split(/\n/).map((l) => l.trim()).filter(Boolean)
  lines.forEach((line, k) => {
    const parts = line.split(/\s*[,;\t]\s*|\s+/).filter(Boolean)
    const [x, y] = parts.map(readNumber)
    if (parts.length === 2 && x !== null && y !== null) points.push({ x, y })
    else if (!(k === 0 && lines.length > 1 && parts.every((p) => readNumber(p) === null))) bad ??= line
  })
  return { points, bad }
}

/** The table's points. A row with only one of its numbers is a problem. */
export function readRows(rows: TableRow[]): { points: Pair[]; problem: string | null } {
  const points: Pair[] = []
  let problem: string | null = null
  for (const r of filledRows(rows)) {
    const tx = r.name.trim()
    const ty = r.cells[0]?.value.trim() ?? ''
    if (!tx || !ty) {
      problem ??= tx ? `Give x = ${tx} a y value.` : `Give y = ${ty} an x value.`
      continue
    }
    const x = readNumber(tx)
    const y = readNumber(ty)
    if (x === null || y === null) {
      problem ??= `“${x === null ? tx : ty}” isn't a number. Type numbers like 12, 2.5 or −3.`
      continue
    }
    points.push({ x, y })
  }
  return { points, problem }
}

/** A number written back out for the table or the list. */
const typedAs = (v: number) => fmt(v).replace('−', '-')

/** The points as a table, a row each. */
export const tableOf = (points: Pair[]): TableRow[] =>
  points.map((p) => ({ name: typedAs(p.x), cells: [{ value: typedAs(p.y), error: '' }] }))

/** The points as a list, a pair on each line. */
export const listOf = (points: Pair[]) => points.map((p) => `${typedAs(p.x)}, ${typedAs(p.y)}`).join('\n')

/** A line typed as y = mx + b (or y = b + mx, y = −x, y = 4): its slope and intercept. */
export function readLine(typed: string): { slope: number; intercept: number } | null {
  let t = typed.replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/·|\*/g, '').toLowerCase()
  if (!t) return null
  t = t.replace(/^(y|ŷ|y\^)=/, '')
  if (!t || /=/.test(t)) return null
  let slope = 0
  let intercept = 0
  let sawX = false
  const terms = t.match(/[+-]?[^+-]+/g)
  if (!terms || terms.join('') !== t) return null
  for (const term of terms) {
    const sign = term.startsWith('-') ? -1 : 1
    const body = term.replace(/^[+-]/, '')
    if (body.endsWith('x')) {
      if (sawX) return null
      const coef = body.slice(0, -1).replace(/[()]/g, '')
      const v = coef === '' ? 1 : readNumber(coef)
      if (v === null) return null
      slope = sign * v
      sawX = true
    } else {
      const v = readNumber(body)
      if (v === null) return null
      intercept += sign * v
    }
  }
  return { slope, intercept }
}

// ——— The axes ———

/** One axis's range: where its numbers start (start), where the graph does (past a break, one block before), its step and blocks. */
export type AxisRange = { start: number; end: number; step: number; axisStart: number; blocks: number; broken: boolean; numbering: Numbering }
export type RangeKey = 'xFrom' | 'xTo' | 'xStep' | 'yFrom' | 'yTo' | 'yStep'

/**
 * A tidy axis to fit values when the teacher leaves it empty: counting by 1,
 * 2 or 5 times a power of ten, with a step of room past the values at each
 * end (never below 0 for values that aren't). It starts at 0 when that's
 * close (within two more steps, or a quarter of the axis), and otherwise
 * where the room ends, where the axis gets a zig-zag break. So 3 and 4 run
 * from 0 to 5.
 */
export function autoAxis(values: number[]): { from: number; to: number; step: number } {
  if (!values.length) return { from: 0, to: 10, step: 1 }
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  let r = niceRange(lo, hi)
  // Whole-number data counts by whole numbers, never by halves.
  if (r.step < 1 && values.every((v) => Number.isInteger(v))) r = { from: Math.floor(lo), to: Math.ceil(hi), step: 1 }
  const room = (q: { from: number; to: number; step: number }) => ({
    step: q.step,
    from: lo >= 0 ? Math.max(0, clean(q.from - q.step)) : clean(q.from - q.step),
    to: clean(q.to + q.step),
  })
  r = room(r)
  if (r.from > 0 && (r.from / r.step <= 2 + 1e-9 || r.from <= (r.to - r.from) / 4 + 1e-9)) {
    const steps = Math.round(r.to / r.step)
    // Starting at 0 may make too many steps; count by more then.
    if (steps <= 14) return { ...r, from: 0 }
    const wide = niceRange(0, hi)
    return { ...wide, to: clean(wide.to + wide.step) }
  }
  return r
}

const clean = (v: number) => Number(v.toPrecision(12)) || 0

/**
 * What the settings mean: the points, each axis's range (worked out from the
 * data for any part left blank), the line of best fit or the teacher's own,
 * r, and anything the teacher should fix, as messages for the settings panel.
 * A range that can't be used falls back to one fitting the data, so there is
 * always a scatter plot.
 */
export function readScatter(s: Settings) {
  const problems: Record<'data' | 'table' | 'past' | 'fit' | 'line' | RangeKey, string | null> = {
    data: null, table: null, past: null, fit: null, line: null,
    xFrom: null, xTo: null, xStep: null, yFrom: null, yTo: null, yStep: null,
  }

  let points: Pair[]
  if (s.input === 'list') {
    const list = readPairs(s.data)
    if (list.bad) problems.data = `“${list.bad}” isn't a pair of numbers. Type one point a line, like 3, 7, or as (3, 7), (4, 9).`
    points = list.points
    if (points.length > MAX_POINTS) {
      problems.data ??= `That's ${points.length} points. A scatter plot can show up to ${MAX_POINTS}.`
      points = points.slice(0, MAX_POINTS)
    }
  } else {
    const read = readRows(s.rows)
    problems.table = read.problem
    points = read.points
  }

  const auto = { x: autoAxis(points.map((p) => p.x)), y: autoAxis(points.map((p) => p.y)) }
  const axis = (name: 'x' | 'y'): AxisRange => {
    const key = (k: 'From' | 'To' | 'Step') => `${name}${k}` as RangeKey
    const typed = (k: 'From' | 'To' | 'Step') => s[key(k)].trim()
    const read = (k: 'From' | 'To' | 'Step', fallback: number) => (typed(k) ? parseNumber(s[key(k)]) : fallback)
    const a = auto[name]
    const from = read('From', a.from)
    const step = read('Step', a.step)
    // A typed start or step moves the end to fit the data on that count.
    let autoTo = a.to
    if (!typed('To') && from !== null && step !== null && step > 0 && (typed('From') || typed('Step'))) {
      const hi = Math.max(from + step, ...points.map((p) => (name === 'x' ? p.x : p.y)))
      autoTo = clean(from + Math.ceil((hi - from) / step - 1e-9) * step)
    }
    const to = read('To', autoTo)
    const numbering = numberingOf(typed('From'), typed('To'), typed('Step'))
    const n = (v: number) => niceText(v, numbering)
    if (from === null) problems[key('From')] = 'Type a number, like 0, 2.5 or 1/2, or leave it empty to fit the data.'
    if (to === null) problems[key('To')] = 'Type a number, like 10, 2.5 or 1/2, or leave it empty to fit the data.'
    if (step === null) problems[key('Step')] = 'Type a number, like 1, 5 or 1/4, or leave it empty to fit the data.'
    else if (step <= 0) problems[key('Step')] = 'Count by a number bigger than 0.'
    if (from !== null && to !== null && from >= to) problems[key('To')] = `The axis has to end after it starts, so make this bigger than ${n(from)}.`
    let blocks = 0
    if (!problems[key('From')] && !problems[key('To')] && !problems[key('Step')]) {
      blocks = Math.ceil((to! - from!) / step! - 1e-9)
      if (blocks > MAX_BLOCKS) problems[key('Step')] = `That makes ${blocks} blocks. Count by a bigger number (${MAX_BLOCKS} blocks at most).`
    }
    const ok = !problems[key('From')] && !problems[key('To')] && !problems[key('Step')]
    const r = ok ? { from: from!, step: step!, blocks } : { from: a.from, step: a.step, blocks: Math.round((a.to - a.from) / a.step) }
    // An axis starting past 0 begins with a block holding its zig-zag break.
    const broken = r.from > 1e-9
    return {
      start: r.from,
      end: clean(r.from + r.blocks * r.step),
      step: r.step,
      axisStart: broken ? clean(r.from - r.step) : r.from,
      blocks: r.blocks + (broken ? 1 : 0),
      broken,
      numbering: ok ? numbering : 'decimal',
    }
  }
  const x = axis('x')
  const y = axis('y')

  // Points off the graph aren't drawn, and the teacher is told.
  const on = (p: Pair) => p.x >= x.start - 1e-9 && p.x <= x.end + 1e-9 && p.y >= y.start - 1e-9 && p.y <= y.end + 1e-9
  const past = points.filter((p) => !on(p))
  if (past.length) {
    const list = past.slice(0, 4).map((p) => `(${fmt(p.x)}, ${fmt(p.y)})`).join(', ') + (past.length > 4 ? '…' : '')
    problems.past = `${list} ${past.length === 1 ? 'is' : 'are'} off the graph, so not drawn. Widen the axes to show ${past.length === 1 ? 'it' : 'them'}.`
  }

  // The line: the least-squares line through every point typed, or the teacher's own.
  let line: { slope: number; intercept: number } | null = null
  if (s.fit === 'best') {
    line = leastSquares(points)
    if (!line && points.length) problems.fit = 'A line of best fit needs at least two points with different x values.'
  } else if (s.fit === 'own') {
    line = readLine(s.line)
    if (!line && s.line.trim()) problems.line = 'Type a line like y = 2x + 1, y = 0.5x − 3 or y = −x + 10.'
  }
  const r = correlation(points)

  return { points: points.filter(on), all: points, x, y, auto, line, r, problems }
}

export type Read = ReturnType<typeof readScatter>

/** A number rounded to `places`, but never to 0 when it isn't (two significant figures then). */
export function rounded(v: number, places: number): string {
  const r = Number(v.toFixed(places))
  if (r === 0 && Math.abs(v) > 1e-12) return fmt(Number(v.toPrecision(2)))
  return fmt(r)
}

/** The line as written on the graph: y = 0.52x + 3.1. */
export function equationText(line: { slope: number; intercept: number }, places: number): string {
  const m = rounded(line.slope, places)
  const b = rounded(line.intercept, places)
  const xTerm = m === '0' ? '' : m === '1' ? 'x' : m === '−1' ? '−x' : `${m}x`
  if (!xTerm) return `y = ${b}`
  if (b === '0') return `y = ${xTerm}`
  return b.startsWith('−') ? `y = ${xTerm} − ${b.slice(1)}` : `y = ${xTerm} + ${b}`
}

/** r or r², as written on the graph, or null for none. */
export function correlationText(s: Settings, r: number | null): string | null {
  if (s.r === 'none' || r === null) return null
  return s.r === 'r' ? `r = ${rounded(r, s.places)}` : `r² = ${rounded(r * r, s.places)}`
}
