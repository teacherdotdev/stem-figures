import { describe, expect, test } from 'vitest'
import { render } from 'svelte/server'
import { textWidth } from '$shared/graph/labels'
import { parsePastedTotals } from '$lib/stats/table'
import TwoWayTable from './TwoWayTable.svelte'
import { buildTable } from './layout.js'
import { cleanSettings, readTwoWay, settingsFromParams, settingsToQuery, workOutTotals, type RawSettings } from './settings.js'

const row = (name: string, ...values: string[]) => ({ name, cells: values.map((value) => ({ value })) })
const table = (s: RawSettings) => cleanSettings(s)
const read = (s: RawSettings) => readTwoWay(table(s))
/** The figure's text in each cell, by row and column, '' for a blank one. */
const writtenText = (s: RawSettings) =>
  read(s).written.map((r) => r.map((w) => (w === null ? '' : 'text' in w ? w.text : `${w.num}/${w.den}`)))

// How students travel to school: every count typed, totals left empty.
const TRAVEL = {
  columns: ['Walk', 'Bus', 'Car'],
  rows: [row('Year 7', '12', '10', '8'), row('Year 8', '15', '8', '6'), row('Year 9', '9', '14', '5')],
}
const FULL = { ...TRAVEL, rowTotals: ['30', '29', '28'], columnTotals: ['36', '32', '19'], grand: '87' }

describe('the page address', () => {
  test('the table, its totals and settings round-trip', () => {
    const s = table({ ...FULL, show: 'relative', relativeTo: 'row', form: 'fraction', columnTitle: 'Transport', rowTitle: 'Year', corner: 'diagonal' })
    const q = settingsToQuery(s)
    expect(q).toContain('cols=Walk%7CBus%7CCar')
    expect(q).toContain('row=Year+7%7C12%7C10%7C8%7C30')
    expect(q).toContain('tot=36%7C32%7C19%7C87')
    expect(settingsFromParams(new URLSearchParams(q))).toEqual(s)
  })

  test('the defaults make an empty address', () => {
    expect(settingsToQuery(table({}))).toBe('')
  })

  test('without a Total column, rows have no total and the Total row no grand total', () => {
    const s = table({ ...FULL, totalColumn: false })
    expect(s.rowTotals).toEqual(['', '', ''])
    expect(s.grand).toBe('')
    const q = settingsToQuery(s)
    expect(q).toContain('row=Year+7%7C12%7C10%7C8&')
    expect(q).toContain('tot=36%7C32%7C19')
    expect(settingsFromParams(new URLSearchParams(q))).toEqual(s)
  })

  test('empty cells and letters round-trip', () => {
    const s = table({ columns: ['A', 'B'], rows: [row('X', '', 'x'), row('Y', '4', '')], rowTotals: ['', '9'], columnTotals: ['a', ''], grand: '' })
    expect(settingsFromParams(new URLSearchParams(settingsToQuery(s)))).toEqual(s)
  })

  test('unknown choices fall back to the defaults', () => {
    const s = table({ show: 'tallies', form: 'roman', places: 7, rules: 'none' })
    expect([s.show, s.form, s.places, s.rules]).toEqual(['counts', 'decimal', 2, 'all'])
  })
})

describe('totals', () => {
  test('Work out totals fills every empty total', () => {
    expect(workOutTotals(table(TRAVEL))).toEqual({ rowTotals: ['30', '29', '28'], columnTotals: ['36', '32', '19'], grand: '87' })
  })

  test('… through a missing count, and leaves typed totals alone', () => {
    const s = table({ ...TRAVEL, rows: [row('Year 7', '12', '', '8'), ...TRAVEL.rows.slice(1)], columnTotals: ['', '32', ''] })
    expect(workOutTotals(s)).toEqual({ rowTotals: ['30', '29', '28'], columnTotals: ['36', '32', '19'], grand: '87' })
  })

  test('… and the ones it can’t stay empty', () => {
    const s = table({ ...TRAVEL, rows: [row('Year 7', '12', '', '8'), ...TRAVEL.rows.slice(1)] })
    expect(workOutTotals(s)).toEqual({ rowTotals: ['', '29', '28'], columnTotals: ['36', '', '19'], grand: '' })
  })

  test('totals that don’t add up are reported', () => {
    expect(read(FULL).problems.sums).toBeNull()
    expect(read({ ...FULL, rowTotals: ['31', '29', '28'] }).problems.sums).toBe('Year 7’s cells add up to 30, but its total is 31.')
    expect(read({ ...FULL, grand: '90' }).problems.sums).toBe('The column totals add up to 87, but the grand total is 90.')
  })

  test('relative frequencies add up across and down', () => {
    const num = (w: unknown) => Number((w as { text: string }).text)
    for (const relativeTo of ['total', 'row', 'column'] as const) {
      const { written: w } = read({ ...FULL, show: 'relative', relativeTo, places: 4 })
      // Each row's cells to its total, unless they're shares of each column.
      if (relativeTo !== 'column') for (let i = 0; i < 4; i++) expect(num(w[i][0]) + num(w[i][1]) + num(w[i][2])).toBeCloseTo(num(w[i][3]), 3)
      if (relativeTo !== 'row') for (let j = 0; j < 4; j++) expect(num(w[0][j]) + num(w[1][j]) + num(w[2][j])).toBeCloseTo(num(w[3][j]), 3)
    }
  })

  test('row relative frequencies: each row totals 1, the Total row is each column’s share', () => {
    const t = writtenText({ ...FULL, show: 'relative', relativeTo: 'row' })
    expect(t[0]).toEqual(['0.40', '0.33', '0.27', '1.00'])
    expect(t[3]).toEqual(['0.41', '0.37', '0.22', '1.00'])
    const p = writtenText({ ...FULL, show: 'relative', relativeTo: 'row', form: 'percent', places: 0 })
    expect(p[1]).toEqual(['52%', '28%', '21%', '100%'])
  })

  test('column relative frequencies: each column totals 1, the Total column is each row’s share', () => {
    const t = writtenText({ ...FULL, show: 'relative', relativeTo: 'column', places: 3 })
    expect(t.map((r) => r[0])).toEqual(['0.333', '0.417', '0.250', '1.000'])
    expect(t.map((r) => r[3])).toEqual(['0.345', '0.333', '0.322', '1.000'])
  })

  test('joint relative frequencies: the grand total is 1', () => {
    const t = writtenText({ ...FULL, show: 'relative', relativeTo: 'total', form: 'percent', places: 1 })
    expect(t[0][0]).toBe('13.8%')
    expect(t[3][3]).toBe('100.0%')
  })

  test('relative frequencies work from totals left empty, as long as they can be worked out', () => {
    expect(writtenText({ ...TRAVEL, show: 'relative', relativeTo: 'row' })[0]).toEqual(['0.40', '0.33', '0.27', ''])
  })
})

describe('writing values', () => {
  test('fractions are in lowest terms', () => {
    const t = writtenText({ ...FULL, show: 'relative', relativeTo: 'row', form: 'fraction' })
    expect(t[0]).toEqual(['2/5', '1/3', '4/15', '1'])
    expect(t[3][0]).toBe('12/29')
  })

  test('rounding is exactly as chosen, trailing zeros kept', () => {
    const s = { columns: ['A', 'B'], rows: [row('X', '1', '7')], rowTotals: ['8'], show: 'relative', relativeTo: 'row' }
    expect(writtenText({ ...s, places: 0 })[0]).toEqual(['0', '1', '1'])
    expect(writtenText({ ...s, places: 3 })[0]).toEqual(['0.125', '0.875', '1.000'])
    expect(writtenText({ ...s, places: 2 })[0]).toEqual(['0.13', '0.88', '1.00'])
    expect(writtenText({ ...s, places: 1, form: 'percent' })[0]).toEqual(['12.5%', '87.5%', '100.0%'])
  })

  test('counts are written as typed, letters too', () => {
    const t = writtenText({ columns: ['A', 'B'], rows: [row('X', '1,200', 'x'), row('Y', '-3', '')] })
    expect(t[0].slice(0, 2)).toEqual(['1,200', 'x'])
    expect(t[1].slice(0, 2)).toEqual(['−3', ''])
  })
})

describe('the missing values', () => {
  const missing = (s: RawSettings) => read(s).missing.map((m) => [m.name, m.typed, m.value])

  test('a solvable gap-fill gives each value', () => {
    // A blank in each row and column, each the only one in its row or column.
    const s = { ...FULL, rows: [row('Year 7', '', '10', '8'), row('Year 8', '15', '', '6'), row('Year 9', '9', '14', 'x')] }
    expect(missing(s)).toEqual([
      ['Year 7, Walk', '', '12'],
      ['Year 8, Bus', '', '8'],
      ['Year 9, Car', 'x', '5'],
    ])
  })

  test('one needing two passes', () => {
    // Year 7's Walk and Bus are both missing: Walk comes from its column first,
    // then Bus from Year 7's row.
    const s = {
      ...FULL,
      rows: [row('Year 7', '', '', '8'), row('Year 8', '15', '8', '6'), row('Year 9', '9', '14', '5')],
      columnTotals: ['36', '', '19'],
    }
    expect(missing(s)).toEqual([
      ['Year 7, Walk', '', '12'],
      ['Year 7, Bus', '', '10'],
      ['Total, Bus', '', '32'],
    ])
  })

  test('an unsolvable one says which can’t be worked out', () => {
    // Four blanks in a square: each row and column has two.
    const s = { ...FULL, rows: [row('Year 7', '', '', '8'), row('Year 8', '', '', '6'), row('Year 9', '9', '14', '5')] }
    expect(missing(s).map(([, , v]) => v)).toEqual([null, null, null, null])
  })

  test('in relative frequencies, the values students would write', () => {
    const s = { ...FULL, rows: [row('Year 7', '', '10', '8'), ...FULL.rows.slice(1)], rowTotals: ['', '29', '28'], show: 'relative', relativeTo: 'row' }
    // A row's relative frequencies add to 1, so Year 7's Walk comes from its row.
    expect(missing(s)).toEqual([['Year 7, Walk', '', '0.40'], ['Year 7, Total', '', '1.00']])
  })

  test('an empty table has nothing missing', () => {
    expect(read({}).missing).toEqual([])
  })
})

describe('the figure', () => {
  test('empty cells are blank in the exported SVG, letters written as typed', () => {
    const s = table({ ...FULL, rows: [row('Year 7', '', '10', '8'), row('Year 8', '15', 'x', '6'), row('Year 9', '9', '14', '5')], grand: '' })
    const { body } = render(TwoWayTable, { props: { settings: s } })
    const texts = [...body.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1])
    expect(texts).toContain('10')
    expect(texts).toContain('x')
    expect(texts).not.toContain('12')
    expect(texts).not.toContain('87')
    // As many value cells as the table has, blank or not.
    expect(buildTable(s).cells).toHaveLength(16)
  })

  test('long category names widen their column, not overflow it', () => {
    const t = buildTable(table({ columns: ['Strawberry milkshake', 'Extraordinarily', 'C'], rows: [row('A very long row category name', '1', '2', '3')] }))
    for (const c of t.columns) for (const line of c.lines) expect(textWidth(line, t.fs)).toBeLessThan(c.w)
    expect(t.columns[0].lines).toEqual(['Strawberry', 'milkshake'])
    expect(textWidth('A very long row category name', t.fs)).toBeLessThan(t.names.w)
    const plain = buildTable(table({ columns: ['A', 'B', 'C'], rows: [row('X', '1', '2', '3')] }))
    expect(t.columns[0].w).toBeGreaterThan(plain.columns[0].w)
  })

  test('values sit inside their cells', () => {
    const t = buildTable(table({ ...FULL, show: 'relative', form: 'percent', places: 2 }))
    for (const x of t.texts.filter((x) => x.anchor === 'end')) {
      const cell = t.cells.find((c) => x.x > c.x && x.x <= c.x + c.w && x.y > c.y && x.y < c.y + c.h)!
      expect(x.x - textWidth(x.text, t.fs)).toBeGreaterThan(cell.x)
    }
  })

  test('the diagonal corner keeps its titles on either side of the line', () => {
    const t = buildTable(table({ ...FULL, columnTitle: 'Transport', rowTitle: 'Year group', corner: 'diagonal' }))
    const [line] = t.rules
    const at = (x: number) => line.y1 + ((x - line.x1) * (line.y2 - line.y1)) / (line.x2 - line.x1)
    const top = t.texts.find((x) => x.text === 'Transport')!
    const side = t.texts.find((x) => x.text === 'Year group')!
    // The column title's bottom-left corner is above the line, the row title's top-right below it.
    expect(top.y + t.fs * 0.25).toBeLessThan(at(top.x - textWidth('Transport', t.fs)))
    expect(side.y - t.fs * 0.78).toBeGreaterThan(at(side.x + textWidth('Year group', t.fs)))
  })

  test('the title down the side fits beside the rows', () => {
    const t = buildTable(table({ columns: ['A', 'B'], rows: [row('X', '1', '2'), row('Y', '3', '4')], rowTitle: 'Favorite subject at school' }))
    const side = t.rects.find((r) => r.w < r.h && r.x === 14)!
    expect(side.h).toBeGreaterThan(textWidth('Favorite subject at school', t.fs))
  })
})

describe('pasting with totals', () => {
  test('a Total column and a Total row become the totals', () => {
    const p = parsePastedTotals('\tWalk\tBus\tTotal\nYear 7\t12\t10\t22\nYear 8\t15\t\t23\nTotal\t27\t18\t45')!
    expect(p.columns).toEqual(['Walk', 'Bus'])
    expect(p.rows.map((r) => [r.name, ...r.cells.map((c) => c.value)])).toEqual([['Year 7', '12', '10'], ['Year 8', '15', '']])
    expect(p.rowTotals).toEqual(['22', '23'])
    expect(p.columnTotals).toEqual(['27', '18'])
    expect(p.grand).toBe('45')
  })

  test('a table without totals has none', () => {
    const p = parsePastedTotals('\tWalk\tBus\nYear 7\t12\t10')!
    expect([p.rowTotals, p.columnTotals, p.grand]).toEqual([null, null, ''])
  })
})
