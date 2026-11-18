// Every choice the teacher makes for a table of values, with its default. The
// page address carries any non-default values so a table can be bookmarked or
// shared.
//
// The values come from a rule (y = 2x + 1, typed as the page address keeps it,
// "y=2x+1") worked out at x-values from a range or a list, or are typed as
// pairs, one row per pair (the row's name is x, its one cell y). Cells clicked
// into blanks on the figure are kept as keys, x3 or y3 for the fourth x or y,
// so a blank stays with its place in the table. readTable() works out what it
// all means: what's written in each cell, the pattern, the missing values and
// anything the teacher should fix.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { TITLE_MODES, type TitleMode } from '$shared/graph/axes'
import { numberLabel, numberingOf, type Numbering } from '$shared/graph/numbering'
import { parseNumber } from '$lib/shared/math.js'
import { cleanRows, filledRows, rowFromParam, type TableRow } from '$lib/stats/table'
import { parseEquation, type Line, type Curve } from '$lib/generators/coordinate-grid/equations'
import type { AngleUnit } from '$lib/generators/coordinate-grid/evaluate'

export const SOURCES = { rule: 'From a rule', typed: 'Typed' } as const
export const X_FROM = { range: 'A range', list: 'A list' } as const
export const DIRECTIONS = { across: 'Across', down: 'Down' } as const
export const FORMS = { exact: 'Fractions', decimal: 'Decimals' } as const
export const PLACES = [0, 1, 2, 3, 4] as const
export const RULE_SHOWS = { none: 'None', text: 'Written', blank: 'Blank line' } as const
export const HEADERS = { gray: 'Gray', plain: 'Plain' } as const
/** Heading pairs offered with one click. */
export const HEADING_PAIRS = [
  ['x', 'y'],
  ['Input', 'Output'],
  ['x', 'f(x)'],
  ['n', 'aₙ'],
] as const

/** The most values a table holds: 20 across fits a page, just. */
export const MAX_VALUES = 20

export type Source = keyof typeof SOURCES
export type XFrom = keyof typeof X_FROM
export type Direction = keyof typeof DIRECTIONS
export type Form = keyof typeof FORMS
export type RuleShow = keyof typeof RULE_SHOWS
export type Headers = keyof typeof HEADERS

export type Settings = {
  source: Source
  /** the rule as the page address keeps it: "y=2x+1" (y = is optional) */
  rule: string
  xFrom: XFrom
  from: string
  to: string
  step: string
  /** the x-values as typed, split at commas: "-2, 0, 1/2, 3" */
  list: string
  /** typed pairs: each row's name is x, its one cell y */
  rows: TableRow[]
  /** cells clicked into blanks: x3, y3 */
  blanks: string[]
  xHeading: string
  yHeading: string
  direction: Direction
  form: Form
  places: number
  showRule: RuleShow
  title: string
  titleMode: TitleMode
  headers: Headers
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  source: 'rule',
  rule: '',
  xFrom: 'range',
  from: '-2',
  to: '2',
  step: '1',
  list: '',
  rows: [],
  blanks: [],
  xHeading: 'x',
  yHeading: 'y',
  direction: 'across',
  form: 'exact',
  places: 2,
  showRule: 'none',
  title: '',
  titleMode: 'none',
  headers: 'gray',
  labelSize: 'medium',
}

const LISTS = ['rows', 'blanks'] as const
type Scalar = Exclude<keyof Settings, (typeof LISTS)[number]>
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k): k is Scalar => !(LISTS as readonly string[]).includes(k))

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)
const numberOf = (list: readonly number[], v: any, fallback: number) => (list.includes(Number(v)) && String(v).trim() !== '' ? Number(v) : fallback)
const titleMode = (v: unknown, fallback: TitleMode) => ((TITLE_MODES as readonly unknown[]).includes(v) ? (v as TitleMode) : fallback)
const BLANK_KEY = /^[xy]\d{1,2}$/

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  const blanks: unknown[] = Array.isArray(s.blanks) ? s.blanks : []
  return {
    source: oneOf(SOURCES, s.source, d.source),
    rule: text(s.rule, d.rule),
    xFrom: oneOf(X_FROM, s.xFrom, d.xFrom),
    from: text(s.from, d.from),
    to: text(s.to, d.to),
    step: text(s.step, d.step),
    list: text(s.list, d.list),
    rows: cleanRows(s.rows, 1).map((r) => ({ ...r, cells: r.cells.map((c) => ({ ...c, error: '' })) })),
    blanks: blanks.map(String).filter((k, i, all) => BLANK_KEY.test(k) && all.indexOf(k) === i),
    xHeading: text(s.xHeading, d.xHeading),
    yHeading: text(s.yHeading, d.yHeading),
    direction: oneOf(DIRECTIONS, s.direction, d.direction),
    form: oneOf(FORMS, s.form, d.form),
    places: numberOf(PLACES, s.places, d.places),
    showRule: oneOf(RULE_SHOWS, s.showRule, d.showRule),
    title: text(s.title, d.title),
    titleMode: titleMode(s.titleMode, d.titleMode),
    headers: oneOf(HEADERS, s.headers, d.headers),
    labelSize: cleanLabelSize(s.labelSize),
  }
}

// In the page address: the scalars that differ from the default, one row=
// per typed pair (row=2|5), and the clicked blanks together (blank=y1,y3).
export function settingsToQuery(s: Settings): string {
  const params = new URLSearchParams()
  for (const key of SCALARS) {
    const v = s[key]
    if (v === DEFAULT_SETTINGS[key] || v === null || v === undefined) continue
    params.set(key, String(v))
  }
  for (const r of filledRows(s.rows)) params.append('row', `${r.name.trim()}|${r.cells[0].value.trim()}`)
  if (s.blanks.length) params.set('blank', s.blanks.join(','))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = {
    rows: params.getAll('row').map((p) => rowFromParam(p, 1)),
    blanks: (params.get('blank') ?? '').split(',').filter(Boolean),
  }
  for (const key of SCALARS) {
    if (!params.has(key)) continue
    const raw = params.get(key)
    s[key] = typeof DEFAULT_SETTINGS[key] === 'number' ? Number(raw) : raw
  }
  return cleanSettings(s)
}

// ——— Reading the table ———

/** One cell of the table: what's written in it (as math text, for layoutMath), its value, and whether it's a blank. */
export type ReadCell = {
  key: string
  /** what's written, as typed math ("-7/2", "3pi/4", "30°") or words; empty when there's nothing */
  written: string
  /** whether `written` is words ("Figure 1", "undefined") rather than math */
  words: boolean
  value: number | null
  /** left for students: clicked into a blank, or typed empty */
  blank: boolean
}

/** A missing value students fill in, and what it is, when it can be worked out. */
export type Missing = { key: string; name: string; value: string | null }

/** A number exactly as the figure writes it, and whether that's rounded. */
export type Written = { text: string; rounded: boolean }

const MAX_DENOMINATOR = 100

/** v as p/q in lowest terms with a small q, or null. */
function ratio(v: number): { p: number; q: number } | null {
  for (let q = 1; q <= MAX_DENOMINATOR; q++) {
    const p = Math.round(v * q)
    if (Math.abs(p / q - v) < 1e-9 * Math.max(1, Math.abs(v))) return { p, q }
  }
  return null
}

/** v to p places, as short as it can be written (2.50 is 2.5), with a true minus. */
function rounded(v: number, p: number): string {
  const n = Number((Math.round(Number((v * 10 ** p).toPrecision(12))) / 10 ** p).toFixed(p))
  return String(Object.is(n, -0) ? 0 : n)
}

/**
 * A worked-out value as the figure writes it: a whole number, or a fraction in
 * lowest terms (or a multiple of π, when the x-values are in π), or a decimal
 * rounded to `places`.
 */
export function writeValue(v: number, form: Form, places: number, pi = false): Written {
  const whole = ratio(v)
  if (whole?.q === 1) return { text: String(whole.p), rounded: false }
  if (form === 'exact') {
    if (whole) return { text: `${whole.p}/${whole.q}`, rounded: false }
    const k = pi ? ratio(v / Math.PI) : null
    if (k) {
      const times = Math.abs(k.p) === 1 ? '' : String(Math.abs(k.p))
      return { text: `${k.p < 0 ? '-' : ''}${times}pi${k.q === 1 ? '' : `/${k.q}`}`, rounded: false }
    }
  }
  const t = rounded(v, places)
  return { text: t, rounded: Math.abs(Number(t) - v) > 1e-12 * Math.max(1, Math.abs(v)) }
}

/** Typed math as one line of plain text for the settings panel: "-7/2" as −7/2, "3pi/4" as 3π/4. */
export const plain = (t: string) => t.replace(/pi/g, 'π').replace(/-/g, '−').replace(/\^2/g, '²').replace(/\^3/g, '³')

/** A label from a range's numbering as typed math: "−3/2" as "-3/2". */
const labelText = (v: number, numbering: Numbering) => {
  const l = numberLabel(v, numbering)
  return (l.text ?? `${l.sign}${l.num}/${l.den}`).replace(/−/g, '-').replace(/π/g, 'pi')
}

// Math words that aren't words: a cell reading sin(30°) is still math.
const MATH_WORDS = /\b(pi|sqrt|sin|cos|tan|sec|csc|cot|ln|log|abs)\b/g
/** Whether a typed cell is words (Figure 1, Monday), to be written upright rather than as math. */
export const isWords = (t: string) => /\p{L}{2,}/u.test(t.replace(MATH_WORDS, ''))

/** The items in a typed list, split at commas, semicolons or new lines. */
const items = (t: string) => t.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)

/** The rule as y = …: "2x+1" and "f(x)=2x+1" are both read as y = 2x + 1. */
export function ruleAsY(rule: string): string {
  const t = rule.trim()
  if (!t) return ''
  const named = t.match(/^[A-Za-z]\s*\(\s*x\s*\)\s*=(.*)$/)
  if (named) return `y=${named[1]}`
  return /[=<>≤≥]/.test(t) ? t : `y=${t}`
}

type Rule = { f: (x: number) => number | null }

/** The rule read, as y for each x, or what's wrong with it. */
function readRule(rule: string, angle: AngleUnit): Rule | { problem: string } | null {
  const t = ruleAsY(rule)
  if (!t) return null
  const read = parseEquation(t, angle)
  if (!read) return null
  if (read.error) return { problem: read.error }
  const example = 'Type a rule for y, like y = 2x + 1 or y = x^2 − 3.'
  if (read.inequality || read.points) return { problem: `That isn’t a rule. ${example}` }
  if (read.domain) return { problem: 'A table of values doesn’t take a domain. Leave it off and pick the x-values instead.' }
  if (read.line) {
    const { a, b, c }: Line = read.line
    if (Math.abs(b) < 1e-12) return { problem: `That’s an up-and-down line, with no single y for each x. ${example}` }
    return { f: (x) => Number((-(a * x + c) / b).toPrecision(12)) }
  }
  const curve: Curve = read.curve!
  return {
    f: (x) => {
      const y = curve.f(x)
      return y === null || !Number.isFinite(y) ? null : Number(y.toPrecision(12))
    },
  }
}

/** The x-values of a range, From to To by Step, or what's wrong with it. */
function rangeValues(s: Settings): { values: number[]; problem: string | null } {
  const [from, to, step] = [s.from, s.to, s.step].map(parseNumber)
  const name = (t: string, k: string) => (t.trim() ? `“${t.trim()}” isn’t a number, so ${k} is skipped` : `${k} is empty`)
  if (from === null) return { values: [], problem: `${name(s.from, 'From')}. Type a number, like −2 or 1/2.` }
  if (to === null) return { values: [], problem: `${name(s.to, 'To')}. Type a number, like 5 or 3π.` }
  if (step === null) return { values: [], problem: `${name(s.step, 'Step')}. Type a number, like 1 or 1/2.` }
  if (step <= 0) return { values: [], problem: 'Step has to be more than 0.' }
  if (to < from) return { values: [], problem: 'To has to be at least From.' }
  const n = Math.floor((to - from) / step + 1e-9) + 1
  if (n > MAX_VALUES) return { values: [], problem: `That’s ${n} x-values; a table holds up to ${MAX_VALUES}. Make Step bigger or the range shorter.` }
  return { values: Array.from({ length: n }, (_, k) => Number((from + k * step).toPrecision(12))), problem: null }
}

/** A line through the points, when every one is on it: y = mx + b, from two or more different x-values. */
function lineThrough(points: { x: number; y: number }[]): { m: number; b: number } | null {
  const xs = [...new Set(points.map((p) => p.x))]
  if (xs.length < 2) return null
  const p = points[0]
  const q = points.find((r) => r.x !== p.x)!
  const m = (q.y - p.y) / (q.x - p.x)
  const b = p.y - m * p.x
  const near = (u: number, v: number) => Math.abs(u - v) <= 1e-9 * Math.max(1, Math.abs(u), Math.abs(v))
  return points.every((r) => near(r.y, m * r.x + b)) ? { m: Number(m.toPrecision(12)), b: Number(b.toPrecision(12)) } : null
}

/** y = mx + b as plain text: y = 2x + 1, y = −x, y = 3/2x − 4. */
function lineText(m: number, b: number, form: Form, places: number): string {
  const n = (v: number) => plain(writeValue(v, form, places).text)
  const mx = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '−x' : `${n(m)}x`
  if (!mx) return `y = ${n(b)}`
  return b === 0 ? `y = ${mx}` : `y = ${mx} ${b < 0 ? '−' : '+'} ${n(Math.abs(b))}`
}

/**
 * What the table means: the x and y cells (written, valued and blanked), the
 * pattern its values follow, the missing values and what each one is, and
 * anything the teacher should fix.
 */
export function readTable(s: Settings) {
  const problems: { rule: string | null; x: string | null; typed: string | null } = { rule: null, x: null, typed: null }
  const notes: string[] = []
  const clicked = new Set(s.blanks)
  let xs: ReadCell[] = []
  let ys: ReadCell[] = []
  let pi = false

  if (s.source === 'rule') {
    // The x-values, as the range is numbered or as each one was typed.
    let values: (number | null)[] = []
    let texts: string[] = []
    let numbering: Numbering = 'decimal'
    if (s.xFrom === 'range') {
      const r = rangeValues(s)
      problems.x = r.problem
      numbering = numberingOf(s.from, s.to, s.step)
      values = r.values
      texts = values.map((v) => labelText(v!, numbering))
    } else {
      texts = items(s.list).slice(0, MAX_VALUES)
      values = texts.map(parseNumber)
      if (items(s.list).length > MAX_VALUES) problems.x = `A table holds up to ${MAX_VALUES} x-values, so the rest are left off.`
      const bad = texts.filter((t, k) => values[k] === null)
      if (bad.length) problems.x = `${bad.map((t) => `“${t}”`).join(', ')} ${bad.length === 1 ? 'isn’t a number' : 'aren’t numbers'}, so y can’t be worked out there.`
      numbering = numberingOf(...texts)
    }
    pi = numbering === 'pi'
    const angle: AngleUnit = numbering === 'degree' ? 'degrees' : 'radians'
    const rule = readRule(s.rule, angle)
    if (rule && 'problem' in rule) problems.rule = rule.problem
    const f = rule && 'f' in rule ? rule.f : null

    let undefinedAt = 0
    let roundedAny = false
    xs = texts.map((t, k) => ({ key: `x${k}`, written: t, words: false, value: values[k], blank: clicked.has(`x${k}`) }))
    ys = values.map((x, k) => {
      const key = `y${k}`
      const y = f && x !== null ? f(x) : null
      if (f && x !== null && y === null) undefinedAt++
      const w = y === null ? null : writeValue(y, s.form, s.places, pi)
      if (w?.rounded) roundedAny = true
      const written = w ? w.text : f && x !== null ? 'undefined' : ''
      return { key, written, words: written === 'undefined', value: y, blank: clicked.has(key) }
    })
    if (undefinedAt) notes.push(`The rule has no value at ${undefinedAt === 1 ? 'one x-value' : `${undefinedAt} x-values`}, written as undefined.`)
    if (roundedAny) notes.push(`Values that aren’t ${s.form === 'exact' ? 'fractions' : 'exact'} are rounded to ${s.places === 0 ? 'whole numbers' : `${s.places} decimal place${s.places === 1 ? '' : 's'}`}.`)
  } else {
    // Typed pairs, written as typed; an empty cell is a blank.
    const rows = filledRows(s.rows).slice(0, MAX_VALUES)
    if (filledRows(s.rows).length > MAX_VALUES) problems.typed = `A table holds up to ${MAX_VALUES} pairs, so the rest are left off.`
    const cell = (key: string, typed: string): ReadCell => {
      const t = typed.trim()
      return { key, written: t, words: isWords(t), value: t ? parseNumber(t) : null, blank: !t || clicked.has(key) }
    }
    xs = rows.map((r, k) => cell(`x${k}`, r.name))
    ys = rows.map((r, k) => cell(`y${k}`, r.cells[0].value))
  }

  // The pattern: whether every pair with both values given is on one line.
  // A blank's value counts too, when it was typed or worked out by the rule.
  const pairs = xs.flatMap((x, k) => (x.value !== null && ys[k].value !== null ? [{ x: x.value, y: ys[k].value! }] : []))
  // A typed table with an x twice, with different ys, isn't a function.
  const twice = pairs.find((p) => pairs.some((q) => q.x === p.x && q.y !== p.y))
  const line = twice ? null : lineThrough(pairs)
  let pattern: string | null = null
  if (twice) pattern = `x = ${plain(writeValue(twice.x, s.form, s.places, pi).text)} has two y-values, so the table isn’t a function.`
  else if (line) {
    const rate = plain(writeValue(line.m, s.form, s.places).text)
    pattern = s.source === 'rule' ? `Linear: the rate of change is ${rate}.` : `Linear: ${lineText(line.m, line.b, s.form, s.places)}, a rate of change of ${rate}.`
  } else if (new Set(pairs.map((p) => p.x)).size >= 3) pattern = 'Not linear: the rate of change isn’t constant.'

  // The missing values and what each one is: what's written under a clicked
  // blank, or for a cell typed empty, the value on the line the rest are on.
  const value = (v: number) => plain(writeValue(v, s.form, s.places, pi).text)
  const shown = (c: ReadCell) => (c.blank || !c.written ? '' : c.words ? c.written : plain(c.written))
  // Each is named by the table's headings: y when x = 3, Output when Input = 5.
  const X = s.xHeading.trim() || 'x'
  const Y = s.yHeading.trim() || 'y'
  const place = s.direction === 'across' ? 'column' : 'row'
  const missing: Missing[] = []
  xs.forEach((x, k) => {
    const y = ys[k]
    if (x.blank) {
      const v = x.written ? plain(x.written) : line && line.m !== 0 && y.value !== null ? value((y.value - line.b) / line.m) : null
      missing.push({ key: x.key, name: shown(y) ? `${X} when ${Y} = ${shown(y)}` : `${X} in ${place} ${k + 1}`, value: v })
    }
    if (y.blank) {
      const v = y.written ? (y.words ? y.written : plain(y.written)) : line && x.value !== null ? value(line.m * x.value + line.b) : null
      missing.push({ key: y.key, name: shown(x) ? `${Y} when ${X} = ${shown(x)}` : `${Y} in ${place} ${k + 1}`, value: v })
    }
  })

  const ruleText = s.source === 'rule' && s.rule.trim() && !problems.rule ? s.rule.trim() : ''
  return { xs, ys, n: xs.length, pi, problems, notes, pattern, line, missing, ruleText }
}

/** The table's pairs as typed rows, to fill the Typed table from the rule when switching to it. */
export function rowsOf(read: ReturnType<typeof readTable>): TableRow[] {
  return read.xs.map((x, k) => ({ name: x.written, cells: [{ value: read.ys[k].words ? '' : read.ys[k].written, error: '' }] }))
}
