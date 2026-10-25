// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a two-way table can be bookmarked or shared.
//
// The table is kept as typed (see $lib/stats/table): its headings are the
// column categories and each row a row category, and the totals are typed too,
// one per row, one per column and the grand total. A cell left empty is blank
// on the figure, and a cell typed as a letter (x, a) is written as typed.
// readTwoWay() works out what it all means: the counts it can, the relative
// frequencies, and which of the missing values can be worked out.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { TITLE_MODES, type TitleMode } from '$shared/graph/axes'
import { fmt } from '$shared/graph/numbering'
import { cleanColumns, cleanRows, columnsFromParam, columnsToParam, readValue, type TableRow } from '$lib/stats/table'

export { fmt }

export const SHOWS = { counts: 'Counts', relative: 'Relative frequencies' } as const
export const RELATIVE_TO = { total: 'Grand total', row: 'Each row', column: 'Each column' } as const
export const FORMS = { decimal: 'Decimal', percent: 'Percent', fraction: 'Fraction' } as const
export const PLACES = [0, 1, 2, 3, 4] as const
export const CORNERS = { empty: 'Empty', diagonal: 'Split by a diagonal' } as const
export const HEADERS = { gray: 'Gray', plain: 'Plain' } as const
export const RULES = { all: 'Every cell', some: 'Header and totals' } as const

export type Show = keyof typeof SHOWS
export type RelativeTo = keyof typeof RELATIVE_TO
export type Form = keyof typeof FORMS
export type Corner = keyof typeof CORNERS
export type Headers = keyof typeof HEADERS
export type Rules = keyof typeof RULES

export type Settings = {
  /** the column categories' headings, like Walk, Bus and Car */
  columns: string[]
  /** the row categories, like Year 7, each with a count per column */
  rows: TableRow[]
  /** each row's total, one per row, as typed */
  rowTotals: string[]
  /** each column's total, one per column, as typed */
  columnTotals: string[]
  grand: string
  /** a Total column (each row's total) at the right */
  totalColumn: boolean
  /** a Total row (each column's total) along the bottom */
  totalRow: boolean
  show: Show
  relativeTo: RelativeTo
  form: Form
  places: number
  title: string
  titleMode: TitleMode
  /** the variable across the top, like Transport */
  columnTitle: string
  /** the variable down the side, like Year */
  rowTitle: string
  corner: Corner
  headers: Headers
  totalsBold: boolean
  rules: Rules
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  columns: [''],
  rows: [],
  rowTotals: [],
  columnTotals: [''],
  grand: '',
  totalColumn: true,
  totalRow: true,
  show: 'counts',
  relativeTo: 'total',
  form: 'decimal',
  places: 2,
  title: '',
  titleMode: 'none',
  columnTitle: '',
  rowTitle: '',
  corner: 'empty',
  headers: 'gray',
  totalsBold: false,
  rules: 'all',
  labelSize: 'medium',
}

const LISTS = ['columns', 'rows', 'rowTotals', 'columnTotals', 'grand'] as const
type Scalar = Exclude<keyof Settings, (typeof LISTS)[number]>
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k): k is Scalar => !(LISTS as readonly string[]).includes(k))

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)
const numberOf = (list: readonly number[], v: any, fallback: number) => (list.includes(Number(v)) && String(v).trim() !== '' ? Number(v) : fallback)
const bool = (v: unknown, fallback: boolean) => (v === undefined || v === null ? fallback : v === true || v === '1' || v === 'true')
const titleMode = (v: unknown, fallback: TitleMode) => ((TITLE_MODES as readonly unknown[]).includes(v) ? (v as TitleMode) : fallback)
// A total is written into the page address between "|".
const tidyTotal = (v: unknown) => text(v, '').replace(/\|/g, '')
/** `n` totals from a list, empty where it has none (or while they're not shown). */
const totalsOf = (list: unknown, n: number, shown: boolean) =>
  Array.from({ length: n }, (_, k) => (shown && Array.isArray(list) ? tidyTotal(list[k]) : ''))

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  const columns = cleanColumns(s.columns)
  const rows = cleanRows(s.rows, columns.length).map((r) => ({ ...r, cells: r.cells.map((c) => ({ ...c, error: '' })) }))
  const totalColumn = bool(s.totalColumn, d.totalColumn)
  const totalRow = bool(s.totalRow, d.totalRow)
  return {
    columns,
    rows,
    // Totals that aren't shown aren't kept.
    rowTotals: totalsOf(s.rowTotals, rows.length, totalColumn),
    columnTotals: totalsOf(s.columnTotals, columns.length, totalRow),
    grand: totalRow && totalColumn ? tidyTotal(s.grand) : '',
    totalColumn,
    totalRow,
    show: oneOf(SHOWS, s.show, d.show),
    relativeTo: oneOf(RELATIVE_TO, s.relativeTo, d.relativeTo),
    form: oneOf(FORMS, s.form, d.form),
    places: numberOf(PLACES, s.places, d.places),
    title: text(s.title, d.title),
    titleMode: titleMode(s.titleMode, d.titleMode),
    columnTitle: text(s.columnTitle, d.columnTitle),
    rowTitle: text(s.rowTitle, d.rowTitle),
    corner: oneOf(CORNERS, s.corner, d.corner),
    headers: oneOf(HEADERS, s.headers, d.headers),
    totalsBold: bool(s.totalsBold, d.totalsBold),
    rules: oneOf(RULES, s.rules, d.rules),
    labelSize: cleanLabelSize(s.labelSize),
  }
}

/** The rows with something in them, each with its index in the settings and its total. */
export function filledRows(s: Settings) {
  return s.rows
    .map((r, index) => ({ index, name: r.name, cells: r.cells.map((c) => c.value), total: s.totalColumn ? (s.rowTotals[index] ?? '') : '' }))
    .filter((r) => r.name.trim() || r.total.trim() || r.cells.some((c) => c.trim()))
}

// In the page address: the headings once (cols=Walk|Bus|Car), then one row=
// per row, its name, cells and (with a Total column) its total
// (row=Year 7|12|10|8|30), and the Total row with the grand total at its end
// (tot=36|32|19|87).
export function settingsToQuery(s: Settings): string {
  const params = new URLSearchParams()
  for (const key of SCALARS) {
    const v = s[key]
    if (v === DEFAULT_SETTINGS[key] || v === null || v === undefined) continue
    params.set(key, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  if (s.columns.length > 1 || s.columns[0].trim()) params.set('cols', columnsToParam(s.columns))
  for (const r of filledRows(s)) {
    params.append('row', [r.name.trim(), ...r.cells.map((c) => c.trim()), ...(s.totalColumn ? [r.total.trim()] : [])].join('|'))
  }
  const totals = [...s.columnTotals, ...(s.totalColumn ? [s.grand] : [])].map((t) => t.trim())
  if (s.totalRow && totals.some(Boolean)) params.set('tot', totals.join('|'))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const columns = columnsFromParam(params.get('cols'))
  const n = columns.length
  const totalColumn = bool(params.get('totalColumn'), DEFAULT_SETTINGS.totalColumn)
  const rows = params.getAll('row').map((p) => p.split('|'))
  const tot = (params.get('tot') ?? '').split('|')
  const s: RawSettings = {
    columns,
    rows: rows.map(([name = '', ...cells]) => ({ name, cells: Array.from({ length: n }, (_, j) => ({ value: cells[j] ?? '' })) })),
    rowTotals: rows.map((r) => (totalColumn ? (r[n + 1] ?? '') : '')),
    columnTotals: tot.slice(0, n),
    grand: tot[n] ?? '',
  }
  for (const key of SCALARS) {
    if (!params.has(key)) continue
    const raw = params.get(key)
    s[key] = typeof DEFAULT_SETTINGS[key] === 'number' ? Number(raw) : raw
  }
  return cleanSettings(s)
}

// ——— Reading the table ———

/** A place in the table: row i and column j, where row R is the Total row and column C the Total column. */
export type Place = { i: number; j: number }
/** What a cell holds: nothing (blank on the figure), a number, or anything else (a letter, written as typed). */
export type Kind = 'blank' | 'number' | 'letter'
/** One cell as typed and read. */
export type ReadCell = Place & { typed: string; kind: Kind; count: number | null }
/** A value as the figure writes it: plain text, or a fraction stacked over its bar. */
export type Written = { text: string } | { num: string; den: string }
/** One missing value (a blank or a letter), and what it is when it can be worked out. */
export type Missing = Place & { name: string; typed: string; value: string | null }

/** Rows and columns drawn when the table is still empty. */
const EMPTY_SLOTS = 2

/** n rounded to p places, exactly as typed by hand (0.125 to 2 places is 0.13). */
function fixed(n: number, p: number): string {
  const k = 10 ** p
  const r = Math.round(Number((Math.abs(n) * k).toPrecision(12))) / k
  return `${n < 0 && r !== 0 ? '−' : ''}${r.toFixed(p)}`
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
/** p/q in lowest terms, or null unless both are whole numbers. */
function lowest(p: number, q: number): { num: string; den: string } | null {
  if (!Number.isInteger(p) || !Number.isInteger(q) || q === 0) return null
  const g = gcd(p, q) || 1
  const [a, b] = q < 0 ? [-p / g, -q / g] : [p / g, q / g]
  return { num: fmt(a), den: fmt(b) }
}

/**
 * What the table means: each cell read; the counts worked out from the rows
 * and columns that have one value missing, repeated until nothing changes;
 * what the figure writes in each cell (the typed count, or its relative
 * frequency); which missing values can be worked out from the cells shown, and
 * what they are; and anything the teacher should fix.
 */
export function readTwoWay(s: Settings) {
  const filled = filledRows(s)
  const empty = !filled.length
  const R = empty ? EMPTY_SLOTS : filled.length
  const C = empty ? Math.max(EMPTY_SLOTS, s.columns.length) : s.columns.length
  const tc = s.totalColumn
  const tr = s.totalRow
  const relative = s.show === 'relative'

  const rowNames = Array.from({ length: R }, (_, i) => filled[i]?.name.trim() ?? '')
  const columnNames = Array.from({ length: C }, (_, j) => s.columns[j]?.trim() ?? '')
  const rowLabel = (i: number) => (i === R ? 'Total' : rowNames[i] || `Row ${i + 1}`)
  const columnLabel = (j: number) => (j === C ? 'Total' : columnNames[j] || `Column ${j + 1}`)
  const nameOf = ({ i, j }: Place) => (i === R && j === C ? 'Grand total' : `${rowLabel(i)}, ${columnLabel(j)}`)

  /** Whether the table has a cell at (i, j): the Total row and column only while they're on. */
  const has = (i: number, j: number) => (i < R || tr) && (j < C || tc)
  const typedAt = (i: number, j: number) =>
    (i < R ? (j < C ? filled[i]?.cells[j] : filled[i]?.total) : j < C ? s.columnTotals[j] : s.grand)?.trim() ?? ''
  const cells: (ReadCell | null)[][] = Array.from({ length: R + 1 }, (_, i) =>
    Array.from({ length: C + 1 }, (_, j) => {
      if (!has(i, j)) return null
      const typed = typedAt(i, j)
      const v = readValue(typed)
      const kind: Kind = !typed ? 'blank' : v.value !== null ? 'number' : 'letter'
      return { i, j, typed, kind, count: v.value }
    }),
  )
  const present = cells.flat().filter((c): c is ReadCell => !!c)

  // The rows and columns that add up: each row's cells to its total, each
  // column's to its total, and the totals to the grand total.
  type Line = { parts: Place[]; target: Place | number; name: string }
  const across = (i: number, to: number) => Array.from({ length: to }, (_, j) => ({ i, j }))
  const down = (j: number, to: number) => Array.from({ length: to }, (_, i) => ({ i, j }))
  const countLines: Line[] = [
    ...(tc ? rowNames.map((_, i) => ({ parts: across(i, C), target: { i, j: C }, name: rowLabel(i) })) : []),
    ...(tr ? columnNames.map((_, j) => ({ parts: down(j, R), target: { i: R, j }, name: columnLabel(j) })) : []),
    ...(tc && tr ? [{ parts: across(R, C), target: { i: R, j: C }, name: 'the Total row' }, { parts: down(C, R), target: { i: R, j: C }, name: 'the Total column' }] : []),
  ]

  /** Fill each line that has one value missing, until nothing changes. */
  function solve(known: (number | null)[][], lines: Line[]) {
    const values = known.map((r) => [...r])
    const at = (p: Place) => values[p.i][p.j]
    for (let changed = true; changed; ) {
      changed = false
      for (const { parts, target } of lines) {
        const places = typeof target === 'number' ? parts : [...parts, target]
        const missing = places.filter((p) => at(p) === null)
        if (missing.length !== 1) continue
        const sum = parts.reduce((t, p) => t + (at(p) ?? 0), 0)
        const m = missing[0]
        const total = typeof target === 'number' ? target : at(target)
        values[m.i][m.j] = Number((typeof target !== 'number' && m === target ? sum : total! - sum).toPrecision(12))
        changed = true
      }
    }
    return values
  }

  const counts = solve(cells.map((r) => r.map((c) => c?.count ?? null)), countLines)
  const count = (i: number, j: number) => (has(i, j) ? counts[i][j] : null)

  // A typed total that doesn't match its cells.
  let sums: string | null = null
  for (const { parts, target, name } of countLines) {
    const t = count((target as Place).i, (target as Place).j)
    const values = parts.map((p) => count(p.i, p.j))
    if (sums || t === null || values.some((v) => v === null)) continue
    const sum = values.reduce<number>((a, v) => a + v!, 0)
    if (Math.abs(sum - t) <= 1e-9 * Math.max(1, Math.abs(t))) continue
    const what = name === 'the Total row' ? 'The column totals add' : name === 'the Total column' ? 'The row totals add' : `${name}’s cells add`
    const total = name.startsWith('the ') ? 'the grand total' : 'its total'
    sums = `${what} up to ${fmt(sum)}, but ${total} is ${fmt(t)}.`
  }

  // Each row's, column's and the whole table's count, from its total or its cells.
  const sumOf = (places: Place[]) => {
    const v = places.map((p) => count(p.i, p.j))
    return v.every((x) => x !== null) ? v.reduce<number>((a, x) => a + x!, 0) : null
  }
  const rowSum = (i: number) => count(i, C) ?? sumOf(across(i, C))
  const columnSum = (j: number) => count(R, j) ?? sumOf(down(j, R))
  const rowSums = rowNames.map((_, i) => rowSum(i))
  const columnSums = columnNames.map((_, j) => columnSum(j))
  const grandSum =
    count(R, C) ??
    (rowSums.every((v) => v !== null) ? rowSums.reduce<number>((a, v) => a + v!, 0) : null) ??
    (columnSums.every((v) => v !== null) ? columnSums.reduce<number>((a, v) => a + v!, 0) : null)

  // What each cell is divided by for its relative frequency, and the cells
  // that are always 1 (100%): a row's total, of each row, and so on.
  const always1 = (i: number, j: number) =>
    relative && ((i === R && j === C) || (s.relativeTo === 'row' && j === C) || (s.relativeTo === 'column' && i === R))
  const denominator = (i: number, j: number): number | null => {
    if (s.relativeTo === 'row' && j < C && i < R) return rowSums[i]
    if (s.relativeTo === 'column' && i < R && j < C) return columnSums[j]
    return grandSum
  }
  /** The exact value the figure writes in a cell, when it can be worked out. */
  const valueAt = (i: number, j: number): number | null => {
    if (!relative) return count(i, j)
    if (always1(i, j)) return 1
    const c = count(i, j)
    const d = denominator(i, j)
    return c === null || !d ? null : c / d
  }

  let fractions: string | null = null
  /** A value written as the figure writes it, by the teacher's choices. */
  function write(v: number, i: number, j: number): Written {
    if (!relative) return { text: fmt(v) }
    if (s.form === 'percent') return { text: `${fixed(v * 100, s.places)}%` }
    if (s.form === 'fraction') {
      if (always1(i, j)) return { text: '1' }
      const d = denominator(i, j)
      const f = d === null ? null : lowest(Math.round(Number((v * d).toPrecision(12))), d)
      if (f) return f.den === '1' ? { text: f.num } : f
      fractions ??= 'Fractions need whole-number counts, so these are written as decimals.'
    }
    return { text: fixed(v, s.places) }
  }

  // What's written in each cell: a number as typed (counts) or its relative
  // frequency, a letter as typed, and nothing in a blank.
  let unwritten = 0
  const written: (Written | null)[][] = cells.map((r) =>
    r.map((c) => {
      if (!c || c.kind === 'blank') return null
      if (c.kind === 'letter' || !relative) return { text: c.typed.replace(/^-/, '−') }
      const v = valueAt(c.i, c.j)
      if (v === null) unwritten++
      return v === null ? null : write(v, c.i, c.j)
    }),
  )
  const problems = {
    sums,
    relative: unwritten
      ? `${unwritten === 1 ? 'One cell' : `${unwritten} cells`} can’t be written as relative frequencies, since the totals they need can’t be worked out from the table, so ${unwritten === 1 ? 'it’s' : 'they’re'} blank. Type more of the table.`
      : null,
    fractions,
  }

  // Which missing values students can work out from the cells shown, using
  // the rows and columns that add up as the figure is written: counts and
  // joint relative frequencies both ways, a row's relative frequencies
  // across to 1, and a column's down to 1.
  const shownLines: Line[] = !relative || s.relativeTo === 'total'
    ? [
        ...countLines,
        ...(relative && tr && !tc ? [{ parts: across(R, C), target: 1, name: '' }] : []),
        ...(relative && tc && !tr ? [{ parts: down(C, R), target: 1, name: '' }] : []),
        ...(relative && !tc && !tr ? [{ parts: rowNames.flatMap((_, i) => across(i, C)), target: 1, name: '' }] : []),
      ]
    : s.relativeTo === 'row'
      ? [...rowNames.map((_, i) => ({ parts: across(i, C), target: 1, name: '' })), ...(tr ? [{ parts: across(R, C), target: 1, name: '' }] : [])]
      : [...columnNames.map((_, j) => ({ parts: down(j, R), target: 1, name: '' })), ...(tc ? [{ parts: down(C, R), target: 1, name: '' }] : [])]
  const shown = solve(
    cells.map((r) => r.map((c) => (!c ? null : always1(c.i, c.j) ? 1 : c.kind === 'number' ? valueAt(c.i, c.j) : null))),
    shownLines,
  )
  const missing: Missing[] = empty
    ? []
    : present
        .filter((c) => c.kind !== 'number')
        .map((c) => {
          const v = shown[c.i][c.j]
          const w = v === null ? null : write(v, c.i, c.j)
          return { i: c.i, j: c.j, name: nameOf(c), typed: c.kind === 'letter' ? c.typed : '', value: w && ('text' in w ? w.text : `${w.num}/${w.den}`) }
        })

  // The totals "Work out totals" can fill: those left empty whose count is known.
  const fillable = present.filter((c) => (c.i === R || c.j === C) && c.kind === 'blank' && count(c.i, c.j) !== null)

  return { R, C, empty, rowNames, columnNames, cells, counts, written, missing, fillable, problems }
}

/**
 * The totals filled in where they were left empty and can be worked out,
 * for the "Work out totals" button; the rest are left as they were.
 */
export function workOutTotals(s: Settings): Pick<Settings, 'rowTotals' | 'columnTotals' | 'grand'> {
  const read = readTwoWay(s)
  const rows = filledRows(s)
  const rowTotals = s.rows.map((_, k) => s.rowTotals[k] ?? '')
  const columnTotals = s.columns.map((_, j) => s.columnTotals[j] ?? '')
  let grand = s.grand
  if (read.empty) return { rowTotals, columnTotals, grand }
  for (const { i, j } of read.fillable) {
    const v = fmt(read.counts[i][j]!)
    if (i === read.R && j === read.C) grand = v
    else if (i === read.R) columnTotals[j] = v
    else rowTotals[rows[i].index] = v
  }
  return { rowTotals, columnTotals, grand }
}
