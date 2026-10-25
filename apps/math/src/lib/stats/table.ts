// A table of data as a teacher types or pastes it: a name on each row (a
// category, like Apples), then one value per column (a series, like Boys and
// Girls), each column with a heading. Shared by Math's data displays that
// start from a table (Bar Graph first). Everything is kept as typed; reading
// it as numbers is readTable()'s job.
//
// In the page address each row is one repeated parameter and the headings
// another, as Box Plot writes its data sets:
//   cols=Boys|Girls
//   row=Apples|12|15±1.5|
// A cell is its value, then ±error if it has one; an empty cell is no value.

/** One value as typed, and its ± error as typed. */
export type Cell = { value: string; error: string }
export type TableRow = { name: string; cells: Cell[] }

export const MAX_COLUMNS = 6
export const MAX_ROWS = 30

export const blankCell = (): Cell => ({ value: '', error: '' })
export const blankRow = (columns: number): TableRow => ({ name: '', cells: Array.from({ length: columns }, blankCell) })

const text = (v: unknown) => (v === undefined || v === null ? '' : String(v))
// Written into the page address between "|", around a "±".
const tidyName = (v: unknown) => text(v).replace(/\|/g, '')
const tidyValue = (v: unknown) => text(v).replace(/[|±]/g, '')

/** Headings tidied: at least one column, at most MAX_COLUMNS. */
export function cleanColumns(columns: unknown): string[] {
  const list = Array.isArray(columns) ? columns.map(tidyName).slice(0, MAX_COLUMNS) : []
  return list.length ? list : ['']
}

/** Rows tidied to `columns` cells each. */
export function cleanRows(rows: unknown, columns: number): TableRow[] {
  const list: any[] = Array.isArray(rows) ? rows.slice(0, MAX_ROWS) : []
  return list.map((r) => {
    const cells: any[] = Array.isArray(r?.cells) ? r.cells : []
    return {
      name: tidyName(r?.name),
      cells: Array.from({ length: columns }, (_, c) => ({ value: tidyValue(cells[c]?.value), error: tidyValue(cells[c]?.error) })),
    }
  })
}

const isEmpty = (r: TableRow) => !r.name.trim() && r.cells.every((c) => !c.value.trim() && !c.error.trim())
/** The rows with something in them: empty ones change nothing. */
export const filledRows = (rows: TableRow[]) => rows.filter((r) => !isEmpty(r))

const cellToParam = (c: Cell) => `${c.value.trim()}${c.error.trim() ? `±${c.error.trim()}` : ''}`
export const rowToParam = (r: TableRow) => [r.name.trim(), ...r.cells.map(cellToParam)].join('|')

/** A row from the page address, with any cells it's missing left empty. */
export function rowFromParam(p: string, columns: number): TableRow {
  const [name = '', ...cells] = p.split('|')
  return {
    name,
    cells: Array.from({ length: columns }, (_, c) => {
      const [value, error = ''] = (cells[c] ?? '').split('±')
      return { value, error }
    }),
  }
}

export const columnsToParam = (columns: string[]) => columns.map((c) => c.trim()).join('|')
export const columnsFromParam = (p: string | null) => cleanColumns(p === null ? [] : p.split('|'))

/** A value read: a number, nothing typed, or what was typed that isn't a number. */
export type Read = { value: number | null; bad: string | null }

/** A number as typed or pasted: 12, −3, 2.5, .5 or 1,200 (commas between thousands). */
export function readValue(typed: string): Read {
  const t = typed.trim()
  if (!t) return { value: null, bad: null }
  const plain = t.replace(/[−–]/g, '-').replace(/^(-?\d{1,3}(,\d{3})+)(\.\d+)?$/, (_, whole: string, _g, dec = '') => whole.replace(/,/g, '') + dec)
  const v = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(plain) ? Number(plain) : NaN
  return Number.isFinite(v) ? { value: v, bad: null } : { value: null, bad: t }
}

/** One row as numbers. */
export type ReadRow = {
  name: string
  values: (number | null)[]
  errors: (number | null)[]
}

/**
 * The table as numbers, with a message for the first value or error in it
 * that isn't a number, or an error below 0. Empty rows are left out.
 */
export function readTable(rows: TableRow[]): { rows: ReadRow[]; problem: string | null } {
  let problem: string | null = null
  const out = filledRows(rows).map((r) => {
    const values: (number | null)[] = []
    const errors: (number | null)[] = []
    for (const c of r.cells) {
      const v = readValue(c.value)
      const e = readValue(c.error)
      if (!problem && v.bad) problem = `“${v.bad}” isn't a number. Type numbers like 12, 2.5 or −3.`
      if (!problem && e.bad) problem = `The ± “${e.bad}” isn't a number. Type numbers like 1.5.`
      if (!problem && e.value !== null && e.value < 0) problem = `A ± can't be below 0, so make ${c.error.trim()} positive.`
      values.push(v.value)
      errors.push(e.value !== null && e.value >= 0 ? e.value : null)
    }
    return { name: r.name.trim(), values, errors }
  })
  return { rows: out, problem }
}

// A heading for a ± column, as a spreadsheet might title it.
const ERROR_HEADING = /^\s*(±|\+\/-|\+-|error|err|sd|s\.d\.|sem|se|s\.e\.|standard (deviation|error)|uncertainty)(?![a-z])/i

/**
 * A block pasted from a spreadsheet (tab-separated) or typed with commas: the
 * first column is the rows' names, the rest their values. A first row whose
 * values aren't numbers is the headings. A column headed ±, SD, SEM or error
 * is the ± of the column before it. Returns null for text that isn't a table
 * (one line with no tabs, which is pasted into a cell as usual).
 */
export function parsePasted(
  text: string,
  limits: { columns: number; rows: number } = { columns: MAX_COLUMNS, rows: MAX_ROWS },
): { columns: string[] | null; rows: TableRow[] } | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim())
  if (!lines.length) return null
  const sep = text.includes('\t') ? '\t' : lines.length > 1 && lines.some((l) => l.includes(',')) ? ',' : null
  if (!sep) return null
  const grid = lines.map((l) => l.split(sep).map((c) => c.trim()))
  const wide = Math.max(...grid.map((r) => r.length))
  const looksNumeric = (c: string) => !c || readValue(c).value !== null
  const header = grid.length > 1 && grid[0].slice(1).some((c) => !looksNumeric(c))
  const head = header ? grid[0] : []
  const body = header ? grid.slice(1) : grid

  // Which pasted columns are values and which are the ± of the one before.
  const kinds: ('value' | 'error')[] = []
  for (let c = 1; c < wide; c++) kinds.push(c > 1 && kinds.at(-1) === 'value' && ERROR_HEADING.test(head[c] ?? '') ? 'error' : 'value')
  const valueCols = kinds.flatMap((k, i) => (k === 'value' ? [i + 1] : [])).slice(0, limits.columns)

  const rows = body.slice(0, limits.rows).map((r) => ({
    name: tidyName(r[0]),
    cells: valueCols.map((c) => ({ value: tidyValue(r[c]), error: kinds[c] === 'error' ? tidyValue(r[c + 1]) : '' })),
  }))
  const columns = header ? valueCols.map((c) => tidyName(head[c])) : null
  return { columns: columns && columns.length ? columns : valueCols.length ? valueCols.map(() => '') : null, rows }
}

const TOTAL = /^\s*(grand\s+)?totals?\s*:?\s*$/i

/**
 * A block pasted with its totals (a two-way table's): a last column headed
 * Total holds each row's total, and a last row named Total each column's,
 * with the grand total where they meet. Either is null when the block has
 * none. Returns null for text that isn't a table, as parsePasted() does.
 */
export function parsePastedTotals(text: string): {
  columns: string[] | null
  rows: TableRow[]
  rowTotals: string[] | null
  columnTotals: string[] | null
  grand: string
} | null {
  // One more column and row than fit, in case they're the totals.
  const pasted = parsePasted(text, { columns: MAX_COLUMNS + 1, rows: MAX_ROWS + 1 })
  if (!pasted) return null
  let { columns, rows } = pasted
  const last = rows.at(-1)
  const totalRow = rows.length > 1 && last && TOTAL.test(last.name) ? last : null
  if (totalRow) rows = rows.slice(0, -1)
  const totalColumn = !!columns && columns.length > 1 && TOTAL.test(columns.at(-1)!)
  const n = totalColumn ? columns!.length - 1 : Math.min(MAX_COLUMNS, Math.max(columns?.length ?? 0, ...rows.map((r) => r.cells.length)))
  return {
    columns: columns ? columns.slice(0, Math.min(n, MAX_COLUMNS)) : null,
    rows: rows.slice(0, MAX_ROWS).map((r) => ({ name: r.name, cells: r.cells.slice(0, Math.min(n, MAX_COLUMNS)) })),
    rowTotals: totalColumn ? rows.slice(0, MAX_ROWS).map((r) => r.cells[n]?.value ?? '') : null,
    columnTotals: totalRow ? totalRow.cells.slice(0, Math.min(n, MAX_COLUMNS)).map((c) => c.value) : null,
    grand: totalRow && totalColumn ? (totalRow.cells[n]?.value ?? '') : '',
  }
}
