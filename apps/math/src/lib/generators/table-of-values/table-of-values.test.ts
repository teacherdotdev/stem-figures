import { describe, expect, test } from 'vitest'
import { render } from 'svelte/server'
import TableOfValues from './TableOfValues.svelte'
import { buildTable } from './layout.js'
import { cleanSettings, readTable, ruleAsY, rowsOf, settingsFromParams, settingsToQuery, writeValue, type RawSettings } from './settings.js'

const pair = (x: string, y: string) => ({ name: x, cells: [{ value: y }] })
const read = (s: RawSettings) => readTable(cleanSettings(s))
const written = (s: RawSettings) => {
  const r = read(s)
  return { x: r.xs.map((c) => c.written), y: r.ys.map((c) => c.written) }
}

describe('the page address', () => {
  test('defaults write nothing', () => {
    expect(settingsToQuery(cleanSettings({}))).toBe('')
  })
  test('a rule, a list, typed pairs and blanks round-trip', () => {
    const s = cleanSettings({
      rule: 'y=x^2-3', xFrom: 'list', list: '-2, 0, 1/2', rows: [pair('1', '4'), pair('2', '')], blanks: ['y1', 'x0'],
      direction: 'down', showRule: 'blank', xHeading: 'Input', yHeading: 'Output', places: 3,
    })
    const q = settingsToQuery(s)
    expect(q).toContain('row=1%7C4')
    expect(q).toContain('blank=y1%2Cx0')
    expect(settingsFromParams(new URLSearchParams(q))).toEqual(s)
  })
  test('nonsense is tidied away', () => {
    const s = cleanSettings({ source: 'magic', blanks: ['y1', 'z3', 'y1', 7], places: 9, direction: 'sideways' })
    expect(s.source).toBe('rule')
    expect(s.blanks).toEqual(['y1'])
    expect(s.places).toBe(2)
    expect(s.direction).toBe('across')
  })
})

describe('a rule', () => {
  test('with no rule, the x-values from −2 to 2 and the ys empty', () => {
    expect(written({})).toEqual({ x: ['-2', '-1', '0', '1', '2'], y: ['', '', '', '', ''] })
    expect(read({}).missing).toEqual([])
  })
  test('y = 2x + 1', () => {
    expect(written({ rule: 'y=2x+1' }).y).toEqual(['-3', '-1', '1', '3', '5'])
    expect(read({ rule: 'y=2x+1' }).pattern).toBe('Linear: the rate of change is 2.')
  })
  test('y = is optional, and f(x) = reads as y =', () => {
    expect(ruleAsY('2x+1')).toBe('y=2x+1')
    expect(ruleAsY('f(x)=x^2')).toBe('y=x^2')
    expect(written({ rule: 'x^2' }).y).toEqual(['4', '1', '0', '1', '4'])
    expect(written({ rule: 'f(x)=x^2' }).y).toEqual(['4', '1', '0', '1', '4'])
    expect(read({ rule: 'x^2' }).pattern).toBe('Not linear: the rate of change isn’t constant.')
  })
  test('fractions in lowest terms, or decimals', () => {
    expect(written({ rule: 'y=x/4', from: '0', to: '4' }).y).toEqual(['0', '1/4', '1/2', '3/4', '1'])
    expect(written({ rule: 'y=x/4', from: '0', to: '4', form: 'decimal' }).y).toEqual(['0', '0.25', '0.5', '0.75', '1'])
    expect(written({ rule: 'y=x/3', from: '1', to: '1', form: 'decimal', places: 2 }).y).toEqual(['0.33'])
  })
  test('irrational values are rounded, with a note', () => {
    const r = read({ rule: 'y=sqrt(x)', from: '1', to: '3' })
    expect(r.ys.map((c) => c.written)).toEqual(['1', '1.41', '1.73'])
    expect(r.notes.join(' ')).toContain('rounded to 2 decimal places')
  })
  test('no value is written as undefined', () => {
    const r = read({ rule: 'y=1/x', from: '-1', to: '1' })
    expect(r.ys.map((c) => c.written)).toEqual(['-1', 'undefined', '1'])
    expect(r.ys[1].words).toBe(true)
    expect(r.notes.join(' ')).toContain('no value at one x-value')
  })
  test('a range numbered as typed: fractions, π and degrees', () => {
    expect(written({ from: '0', to: '1', step: '1/2' }).x).toEqual(['0', '1/2', '1'])
    expect(written({ rule: 'y=sin(x)', from: '0', to: '90°', step: '30°' })).toEqual({ x: ['0°', '30°', '60°', '90°'], y: ['0', '1/2', '0.87', '1'] })
    expect(written({ rule: 'y=2x', from: '0', to: 'pi', step: 'pi/2' })).toEqual({ x: ['0', 'pi/2', 'pi'], y: ['0', 'pi', '2pi'] })
  })
  test('a list of x-values, written as typed', () => {
    expect(written({ rule: 'y=3x', xFrom: 'list', list: '-2, 1/2, 4' })).toEqual({ x: ['-2', '1/2', '4'], y: ['-6', '3/2', '12'] })
    expect(read({ rule: 'y=3x', xFrom: 'list', list: '1, a' }).problems.x).toContain('“a” isn’t a number')
  })
  test('problems with the rule and the range', () => {
    expect(read({ rule: 'x=4' }).problems.rule).toContain('up-and-down line')
    expect(read({ rule: 'y>2x' }).problems.rule).toContain('isn’t a rule')
    expect(read({ rule: 'y=2x, x>0' }).problems.rule).toContain('domain')
    expect(read({ step: '0' }).problems.x).toBe('Step has to be more than 0.')
    expect(read({ from: '3', to: '1' }).problems.x).toBe('To has to be at least From.')
    expect(read({ from: '0', to: '100' }).problems.x).toContain('up to 20')
  })
  test('clicked blanks are missing values with their answers', () => {
    const r = read({ rule: 'y=2x+1', blanks: ['y1', 'x3'] })
    expect(r.ys[1].blank).toBe(true)
    expect(r.missing).toEqual([
      { key: 'y1', name: 'y when x = −1', value: '−1' },
      { key: 'x3', name: 'x when y = 3', value: '1' },
    ])
  })
})

describe('typed pairs', () => {
  const STEPS = [pair('1', '4'), pair('2', '7'), pair('3', ''), pair('', '13')]
  test('written as typed, with the line they follow', () => {
    const r = read({ source: 'typed', rows: STEPS })
    expect(r.xs.map((c) => c.written)).toEqual(['1', '2', '3', ''])
    expect(r.pattern).toBe('Linear: y = 3x + 1, a rate of change of 3.')
  })
  test('cells typed empty are blanks, worked out from the line', () => {
    expect(read({ source: 'typed', rows: STEPS }).missing).toEqual([
      { key: 'y2', name: 'y when x = 3', value: '10' },
      { key: 'x3', name: 'x when y = 13', value: '4' },
    ])
  })
  test('blanks that can’t be worked out', () => {
    const r = read({ source: 'typed', rows: [pair('1', '1'), pair('2', '4'), pair('3', '9'), pair('4', '')] })
    expect(r.pattern).toBe('Not linear: the rate of change isn’t constant.')
    expect(r.missing).toEqual([{ key: 'y3', name: 'y when x = 4', value: null }])
  })
  test('an x twice with different ys isn’t a function', () => {
    expect(read({ source: 'typed', rows: [pair('1', '2'), pair('1', '3')] }).pattern).toBe('x = 1 has two y-values, so the table isn’t a function.')
  })
  test('words are written upright', () => {
    const r = read({ source: 'typed', rows: [pair('Figure 1', '3'), pair('Figure 2', '5')] })
    expect(r.xs[0].words).toBe(true)
    expect(r.ys[0].words).toBe(false)
  })
  test('switching from a rule fills the pairs', () => {
    const rows = rowsOf(read({ rule: 'y=x/2', from: '0', to: '2' }))
    expect(rows.map((r) => [r.name, r.cells[0].value])).toEqual([['0', '0'], ['1', '1/2'], ['2', '1']])
  })
})

describe('writing a value', () => {
  test('whole numbers, fractions, π and decimals', () => {
    expect(writeValue(-3.5, 'exact', 2).text).toBe('-7/2')
    expect(writeValue(0.1 + 0.2, 'exact', 2).text).toBe('3/10')
    expect(writeValue(Math.PI * 1.5, 'exact', 2, true).text).toBe('3pi/2')
    expect(writeValue(Math.PI, 'exact', 2, false)).toEqual({ text: '3.14', rounded: true })
    expect(writeValue(2.5, 'decimal', 0).text).toBe('3')
  })
})

describe('the figure', () => {
  test('across: a heading cell and a cell per value in each of two rows', () => {
    const t = buildTable(cleanSettings({ rule: 'y=2x' }))
    expect(t.cells).toHaveLength(10)
    expect(new Set(t.cells.map((c) => c.y)).size).toBe(2)
  })
  test('down: two columns', () => {
    const t = buildTable(cleanSettings({ rule: 'y=2x', direction: 'down' }))
    expect(new Set(t.cells.map((c) => c.x)).size).toBe(2)
  })
  test('blanks and the rule line render', () => {
    const { body } = render(TableOfValues, { props: { settings: cleanSettings({ rule: 'y=2x', blanks: ['y2'], showRule: 'blank', titleMode: 'text', title: 'Pattern' }) } })
    expect(body).toContain('<svg')
    expect(body).toContain('Pattern')
  })
})
