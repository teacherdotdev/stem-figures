import { describe, expect, test } from 'vitest'
import { cleanRows, columnsFromParam, columnsToParam, parsePasted, readTable, readValue, rowFromParam, rowToParam } from './table'

const cell = (value: string, error = '') => ({ value, error })

describe('a table in the page address', () => {
  test('a row is its name, then each cell, ± included', () => {
    const row = { name: 'Apples', cells: [cell('12'), cell('15', '1.5'), cell('')] }
    const p = rowToParam(row)
    expect(p).toBe('Apples|12|15±1.5|')
    expect(rowFromParam(p, 3)).toEqual(row)
  })

  test('missing cells are empty, extra ones dropped', () => {
    expect(rowFromParam('A|1', 3).cells).toEqual([cell('1'), cell(''), cell('')])
    expect(rowFromParam('A|1|2|3', 2).cells).toEqual([cell('1'), cell('2')])
  })

  test('typed | and ± cannot break the address', () => {
    const [r] = cleanRows([{ name: 'A|B', cells: [{ value: '1|2±', error: '±3' }] }], 1)
    expect(r.name).toBe('AB')
    expect(r.cells[0]).toEqual(cell('12', '3'))
  })

  test('headings', () => {
    expect(columnsToParam(['Boys', 'Girls'])).toBe('Boys|Girls')
    expect(columnsFromParam('Boys|Girls')).toEqual(['Boys', 'Girls'])
    expect(columnsFromParam(null)).toEqual([''])
  })
})

describe('reading values', () => {
  test('decimals, minus signs and thousands', () => {
    expect(['12', '−3', '2.5', '.5', '1,200', '1,234,567.5', '+4'].map((t) => readValue(t).value)).toEqual([12, -3, 2.5, 0.5, 1200, 1234567.5, 4])
  })

  test('words and empty cells', () => {
    expect(readValue('abc')).toEqual({ value: null, bad: 'abc' })
    expect(readValue(' ')).toEqual({ value: null, bad: null })
    expect(readValue('12,5').bad).toBe('12,5')
  })

  test('the first problem is reported, empty rows left out', () => {
    const rows = cleanRows([{ name: 'A', cells: [{ value: 'x' }] }, { name: '', cells: [{ value: '' }] }, { name: 'B', cells: [{ value: '2', error: '-1' }] }], 1)
    const t = readTable(rows)
    expect(t.rows.map((r) => r.name)).toEqual(['A', 'B'])
    expect(t.problem).toContain('“x”')
    expect(t.rows[1].errors).toEqual([null])
  })
})

describe('pasting from a spreadsheet', () => {
  test('tabs, with a heading row', () => {
    const t = parsePasted('Fruit\tBoys\tGirls\nApples\t12\t15\nBananas\t8\t10\n')!
    expect(t.columns).toEqual(['Boys', 'Girls'])
    expect(t.rows.map((r) => [r.name, ...r.cells.map((c) => c.value)])).toEqual([['Apples', '12', '15'], ['Bananas', '8', '10']])
  })

  test('commas, without headings, read the same values', () => {
    const t = parsePasted('Apples, 12, 15\nBananas, 8, 10')!
    expect(t.columns).toEqual(['', ''])
    expect(t.rows.map((r) => [r.name, ...r.cells.map((c) => c.value)])).toEqual([['Apples', '12', '15'], ['Bananas', '8', '10']])
  })

  test('a column headed SEM or ± is the error of the one before it', () => {
    const t = parsePasted('Light\tRate\tSEM\tControl\t± SD\nLow\t4\t0.5\t3\t0.2\nHigh\t9\t1.1\t3\t0.3')!
    expect(t.columns).toEqual(['Rate', 'Control'])
    expect(t.rows[1].cells).toEqual([cell('9', '1.1'), cell('3', '0.3')])
  })

  test('one line without tabs is pasted into its box as usual', () => {
    expect(parsePasted('12, 15')).toBeNull()
    expect(parsePasted('Apples')).toBeNull()
  })
})
