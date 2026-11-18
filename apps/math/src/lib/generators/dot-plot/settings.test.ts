import { describe, expect, test } from 'vitest'
import { autoRange, cleanSettings, listOf, readList, readPlot, sameFigure, settingsFromParams, settingsToQuery, tableOf } from './settings.js'

const row = (value: string, count: string) => ({ name: value, cells: [{ value: count, error: '' }] })
const roundTrip = (s: ReturnType<typeof cleanSettings>) => settingsFromParams(new URLSearchParams(settingsToQuery(s)))

describe('the page address', () => {
  test('defaults write nothing', () => {
    expect(settingsToQuery(cleanSettings({}))).toBe('')
  })

  test('a list goes in data=', () => {
    const s = cleanSettings({ data: '3, 4, 4, 5', mark: 'x' })
    expect(settingsToQuery(s)).toBe('mark=x&data=3%2C+4%2C+4%2C+5')
    expect(roundTrip(s)).toEqual(s)
  })

  test('a table goes in one row= per value', () => {
    const s = cleanSettings({ input: 'table', rows: [row('0', '4'), row('', ''), row('1', '6')] })
    expect(settingsToQuery(s)).toBe('input=table&row=0%7C4&row=1%7C6')
    expect(roundTrip(s).rows).toEqual([row('0', '4'), row('1', '6')])
  })

  test('only the data in use goes in the address', () => {
    const both = { data: '1, 2', rows: [row('5', '1')] }
    expect(settingsToQuery(cleanSettings(both))).toBe('data=1%2C+2')
    expect(settingsToQuery(cleanSettings({ ...both, input: 'table' }))).toBe('input=table&row=5%7C1')
  })

  test('unknown choices fall back to the defaults', () => {
    const s = cleanSettings({ mark: 'star', input: 'chart', every: 3, startCap: 'nope' })
    expect(s.mark).toBe('dot')
    expect(s.input).toBe('list')
    expect(s.every).toBe(1)
    expect(s.startCap).toBe('triangle')
  })

  test('empty table rows do not change the figure', () => {
    expect(sameFigure({ input: 'table', rows: [row('1', '2')] }, { input: 'table', rows: [row('1', '2'), row('', '')] })).toBe(true)
  })
})

describe('reading a list', () => {
  test('commas, spaces, semicolons and new lines all separate values', () => {
    expect(readList('1, 2 3;4\n5').values).toEqual([1, 2, 3, 4, 5])
  })

  test('fractions and mixed numbers', () => {
    expect(readList('1/2, 3/4, 1 1/4, −2')).toEqual({ values: [0.5, 0.75, 1.25, -2], fraction: true, bad: null })
    expect(readList('1 1/4').values).toEqual([1, 0.25])
  })

  test('the first piece that is not a number', () => {
    expect(readList('1, 2, two, 3').bad).toBe('two')
    expect(readPlot(cleanSettings({ data: '1, x' })).problems.data).toMatch('“x” isn')
  })
})

describe('both inputs mean the same plot', () => {
  test('a list and a table of the same data stack alike', () => {
    const list = readPlot(cleanSettings({ data: '0, 0, 1, 2, 2, 2' }))
    const table = readPlot(cleanSettings({ input: 'table', rows: [row('2', '3'), row('0', '2'), row('1', '1')] }))
    expect(table.stacks).toEqual(list.stacks)
    expect(list.stacks).toEqual([{ value: 0, count: 2 }, { value: 1, count: 1 }, { value: 2, count: 3 }])
    expect(table.range).toEqual(list.range)
  })

  test('equal values stack together however they are written', () => {
    expect(readPlot(cleanSettings({ data: '2.5, 2.50, 5/2' })).stacks).toEqual([{ value: 2.5, count: 3 }])
  })

  test('a value typed twice in the table adds its counts', () => {
    expect(readPlot(cleanSettings({ input: 'table', rows: [row('3', '2'), row('3', '4')] })).stacks).toEqual([{ value: 3, count: 6 }])
  })

  test('an empty count is no dots, but the value still widens the line', () => {
    const plot = readPlot(cleanSettings({ input: 'table', rows: [row('1', '2'), row('5', '')] }))
    expect(plot.stacks).toEqual([{ value: 1, count: 2 }, { value: 5, count: 0 }])
    expect(plot.range).toEqual({ from: 1, to: 5, step: 1 })
    expect(plot.total).toBe(2)
  })

  test('a count has to be a whole number', () => {
    for (const count of ['2.5', '-1', 'lots']) {
      expect(readPlot(cleanSettings({ input: 'table', rows: [row('1', count)] })).problems.table).toBe('The count for 1 has to be a whole number, like 0, 3 or 12.')
    }
  })

  test('a count needs a value', () => {
    expect(readPlot(cleanSettings({ input: 'table', rows: [row('', '4')] })).problems.table).toMatch('Give the count 4 a value')
  })

  test('switching fills the other side', () => {
    const { stacks } = readPlot(cleanSettings({ data: '1, 1, 2, -3' }))
    expect(tableOf(stacks)).toEqual([row('-3', '1'), row('1', '2'), row('2', '1')])
    expect(listOf(stacks)).toBe('-3, 1, 1, 2')
  })

  test('fractions stay fractions when switching', () => {
    const { stacks, numbering } = readPlot(cleanSettings({ data: '1/4, 1/2, 1/2' }))
    expect(tableOf(stacks, numbering)).toEqual([row('1/4', '1'), row('1/2', '2')])
    expect(listOf(stacks, numbering)).toBe('1/4, 1/2, 1/2')
    const mixed = readPlot(cleanSettings({ data: '1 1/4, -2 1/2' }))
    expect(listOf(mixed.stacks, mixed.numbering)).toBe('-2 1/2, 1 1/4')
  })
})

describe('the number line', () => {
  test('whole numbers count by 1 from the smallest to the largest', () => {
    expect(autoRange([3, 7, 4, 4])).toEqual({ from: 3, to: 7, step: 1 })
    expect(autoRange([0, 2, 4])).toEqual({ from: 0, to: 4, step: 1 })
  })

  test('data in steps counts by its step', () => {
    expect(autoRange([10, 20, 40])).toEqual({ from: 0, to: 40, step: 10 })
    expect(autoRange([1.5, 2, 3.5])).toEqual({ from: 1.5, to: 3.5, step: 0.5 })
    expect(autoRange([1 / 8, 3 / 8, 1])).toEqual({ from: 0.125, to: 1, step: 0.125 })
  })

  test('a short line is widened to at least 4 steps, not below 0', () => {
    expect(autoRange([4, 4])).toEqual({ from: 2, to: 6, step: 1 })
    expect(autoRange([1, 2])).toEqual({ from: 0, to: 4, step: 1 })
    expect(autoRange([0, 1])).toEqual({ from: 0, to: 4, step: 1 })
    expect(autoRange([-1, 0])).toEqual({ from: -3, to: 1, step: 1 })
    expect(autoRange([0.5, 1])).toEqual({ from: 0, to: 2, step: 0.5 })
  })

  test('spread out data gets a tidy line it falls along', () => {
    expect(autoRange([1, 99])).toEqual({ from: 0, to: 100, step: 10 })
  })

  test('fractions number the line in fractions', () => {
    expect(readPlot(cleanSettings({ data: '1/4, 1/2, 1/2' })).numbering).toBe('fraction')
    expect(readPlot(cleanSettings({ data: '1, 2' })).numbering).toBe('decimal')
  })

  test('a typed range is used, and values past it are left off and named', () => {
    const plot = readPlot(cleanSettings({ data: '1, 2, 12', from: '0', to: '10' }))
    expect(plot.range).toEqual({ from: 0, to: 10, step: 1 })
    expect(plot.stacks.map((st) => st.value)).toEqual([1, 2])
    expect(plot.problems.past).toBe('12 is past the end of the line, so not drawn. Widen the range to show it.')
  })

  test('a range that cannot be used falls back to the data', () => {
    const plot = readPlot(cleanSettings({ data: '1, 2, 3', from: '5', to: '2', step: '0' }))
    expect(plot.problems.to).toMatch('bigger than 5')
    expect(plot.problems.step).toBe('Count by a number bigger than 0.')
    expect(plot.range).toEqual({ from: 0, to: 4, step: 1 })
  })

  test('too many ticks', () => {
    expect(readPlot(cleanSettings({ from: '0', to: '1000', step: '1' })).problems.step).toMatch('1000 ticks')
  })
})
