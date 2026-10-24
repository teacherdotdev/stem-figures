// A table of data as a teacher types or pastes it: a name on each row (a
// category, like Apples), then one value per column (a series, like Boys and
// Girls), each column with a heading. Shared by Math's data displays that
// start from a table (Bar Graph first). Everything is kept as typed; reading
// it as numbers is readTable()'s job.
//
// In the page address each row is one repeated parameter and the headings
// another, as Box Plot writes its data sets:
//   cols=Boys|Girls
//   row=Apples|12|15±1.5|!9
// A cell is its value, then ±error if it has one; a leading ! marks a value
// (or a row's name) left for students.

/** One value as typed, its ± error as typed, and whether it's left for students. */
export type Cell = { value: string; error: string; hidden: boolean }
export type TableRow = { name: string; hideName: boolean; cells: Cell[] }

export const MAX_COLUMNS = 6
export const MAX_ROWS = 30

export const blankCell = (): Cell => ({ value: '', error: '', hidden: false })
export const blankRow = (columns: number): TableRow => ({ name: '', hideName: false, cells: Array.from({ length: columns }, blankCell) })

const text = (v: unknown) => (v === undefined || v === null ? '' : String(v))
const bool = (v: unknown) => v === true || v === '1' || v === 'true'
// Written into the page address between "|", after a possible "!", around a "±".
const tidyName = (v: unknown) => text(v).replace(/\|/g, '').replace(/^!+/, '')
const tidyValue = (v: unknown) => text(v).replace(/[|±!]/g, '')

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
      hideName: bool(r?.hideName),
      cells: Array.from({ length: columns }, (_, c) => ({
        value: tidyValue(cells[c]?.value),
        error: tidyValue(cells[c]?.error),
        hidden: bool(cells[c]?.hidden),
      })),
    }
  })
}

const isEmpty = (r: TableRow) => !r.name.trim() && r.cells.every((c) => !c.value.trim() && !c.error.trim())
/** The rows with something in them: empty ones change nothing. */
export const filledRows = (rows: TableRow[]) => rows.filter((r) => !isEmpty(r))

const cellToParam = (c: Cell) => `${c.hidden ? '!' : ''}${c.value.trim()}${c.error.trim() ? `±${c.error.trim()}` : ''}`
export const rowToParam = (r: TableRow) => [`${r.hideName ? '!' : ''}${r.name.trim()}`, ...r.cells.map(cellToParam)].join('|')

/** A row from the page address, with any cells it's missing left empty. */
export function rowFromParam(p: string, columns: number): TableRow {
  const [name = '', ...cells] = p.split('|')
  return {
    name: name.replace(/^!/, ''),
    hideName: name.startsWith('!'),
    cells: Array.from({ length: columns }, (_, c) => {
      const raw = cells[c] ?? ''
      const [value, error = ''] = raw.replace(/^!/, '').split('±')
      return { value, error, hidden: raw.startsWith('!') }
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
  hideName: boolean
  values: (number | null)[]
  errors: (number | null)[]
  hidden: boolean[]
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
    return { name: r.name.trim(), hideName: r.hideName, values, errors, hidden: r.cells.map((c) => c.hidden) }
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
export function parsePasted(text: string): { columns: string[] | null; rows: TableRow[] } | null {
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
  const valueCols = kinds.flatMap((k, i) => (k === 'value' ? [i + 1] : [])).slice(0, MAX_COLUMNS)

  const rows = body.slice(0, MAX_ROWS).map((r) => ({
    name: tidyName(r[0]),
    hideName: false,
    cells: valueCols.map((c) => ({
      value: tidyValue(r[c]),
      error: kinds[c] === 'error' ? tidyValue(r[c + 1]) : '',
      hidden: false,
    })),
  }))
  const columns = header ? valueCols.map((c) => tidyName(head[c])) : null
  return { columns: columns && columns.length ? columns : valueCols.length ? valueCols.map(() => '') : null, rows }
}
