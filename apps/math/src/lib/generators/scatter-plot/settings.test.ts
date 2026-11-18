import { describe, expect, test } from 'vitest'
import {
  DEFAULT_SETTINGS, autoAxis, cleanSettings, equationText, listOf, readLine, readPairs, readScatter, settingsFromParams,
  settingsToQuery, tableOf,
} from './settings'

const list = (data: string, more: Record<string, unknown> = {}) => cleanSettings({ input: 'list', data, ...more })

describe('the page address', () => {
  test('defaults write nothing', () => {
    expect(settingsToQuery(DEFAULT_SETTINGS)).toBe('')
  })

  test('round trips the list or the table, whichever is in use', () => {
    const s = list('1, 2\n3, 4', { fit: 'best', r: 'r2', xFrom: '0', title: 'Heights', titleMode: 'text' })
    expect(settingsFromParams(new URLSearchParams(settingsToQuery(s)))).toEqual(s)
    const t = cleanSettings({ rows: [{ name: '1', cells: [{ value: '2' }] }, { name: '3', cells: [{ value: '4' }] }], mark: 'cross' })
    expect(settingsToQuery(t)).toBe('mark=cross&row=1%7C2&row=3%7C4')
    expect(settingsFromParams(new URLSearchParams(settingsToQuery(t)))).toEqual(t)
  })

  test('unknown values fall back to the defaults', () => {
    const s = cleanSettings({ fit: 'cubic', places: 9, gridlines: 'neon', r: 'toString', xEvery: 3 })
    expect(s.fit).toBe('none')
    expect(s.places).toBe(2)
    expect(s.gridlines).toBe('standard')
    expect(s.r).toBe('none')
    expect(s.xEvery).toBe(1)
  })
})

describe('reading pairs', () => {
  test('one pair a line, split by commas, tabs or spaces', () => {
    expect(readPairs('1, 2\n3\t4\n5 6\n−1, −2.5')).toEqual({
      points: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }, { x: -1, y: -2.5 }],
      bad: null,
    })
  })

  test('pairs in brackets', () => {
    expect(readPairs('(1, 2), (3, 4)\n(5,6)').points).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }])
  })

  test('a heading row is skipped', () => {
    expect(readPairs('Hours\tScore\n1\t50\n2\t60')).toEqual({ points: [{ x: 1, y: 50 }, { x: 2, y: 60 }], bad: null })
  })

  test('the first line that isn’t a pair', () => {
    expect(readPairs('1, 2\n3\n4, 5').bad).toBe('3')
    expect(readPairs('(1, 2), (a, 4)').bad).toBe('(a, 4)')
  })

  test('the table and the list turn into each other', () => {
    const points = [{ x: 1, y: 2.5 }, { x: -3, y: 4 }]
    expect(readPairs(listOf(points)).points).toEqual(points)
    expect(tableOf(points)[1]).toEqual({ name: '-3', cells: [{ value: '4', error: '' }] })
  })
})

describe('reading a typed line', () => {
  test.each([
    ['y = 2x + 1', 2, 1],
    ['y=-0.5x+3', -0.5, 3],
    ['y = −x − 4', -1, -4],
    ['y = 3 + 1/2x', 0.5, 3],
    ['y = 7', 0, 7],
    ['2x', 2, 0],
  ])('%s', (typed, slope, intercept) => {
    expect(readLine(typed)).toEqual({ slope, intercept })
  })

  test.each(['', 'y = 2x + 3x', 'y = x^2', 'hello', 'y = 2x = 3'])('not a line: %s', (typed) => {
    expect(readLine(typed)).toBeNull()
  })
})

describe('the equation as written', () => {
  test.each([
    [{ slope: 0.6, intercept: 2.2 }, 2, 'y = 0.6x + 2.2'],
    [{ slope: -1.234, intercept: -5.678 }, 1, 'y = −1.2x − 5.7'],
    [{ slope: 1, intercept: 0 }, 2, 'y = x'],
    [{ slope: 0, intercept: 4 }, 2, 'y = 4'],
    [{ slope: 0.0012, intercept: 3 }, 2, 'y = 0.0012x + 3'],
  ])('%o to %d places', (line, places, text) => {
    expect(equationText(line, places)).toBe(text)
  })
})

describe('axes fitted to the data', () => {
  test('from 0 when the data starts near it, a step past the data at the end', () => {
    expect(autoAxis([1, 4, 9])).toEqual({ from: 0, to: 10, step: 1 })
    expect(autoAxis([3, 4])).toEqual({ from: 0, to: 5, step: 1 })
  })

  test('a step of room each side of the data when it starts far from 0', () => {
    expect(autoAxis([52, 60, 71, 95])).toEqual({ from: 45, to: 100, step: 5 })
  })

  test('never below 0 for data that isn’t, and a step of room below negative data', () => {
    expect(autoAxis([-5, -3, 0, 4, 6])).toEqual({ from: -6, to: 7, step: 1 })
  })

  test('whole numbers count by whole numbers', () => {
    expect(autoAxis([2, 3, 5, 8])).toEqual({ from: 0, to: 9, step: 1 })
    expect(autoAxis([0.2, 0.9, 1.4])).toEqual({ from: 0, to: 1.6, step: 0.2 })
  })

  test('an axis past 0 gets a break block before it', () => {
    const r = readScatter(list('1, 52\n2, 60\n3, 71\n4, 95'))
    expect(r.x).toMatchObject({ start: 0, broken: false })
    expect(r.y).toMatchObject({ start: 45, axisStart: 40, broken: true, end: 100 })
  })

  test('no data: blank axes from 0 to 10', () => {
    const r = readScatter(DEFAULT_SETTINGS)
    expect(r.x).toMatchObject({ start: 0, end: 10, step: 1, broken: false })
    expect(r.y).toMatchObject({ start: 0, end: 10, step: 1, broken: false })
  })

  test('a typed start keeps the data on the axis', () => {
    const r = readScatter(list('1, 52\n2, 60\n3, 71\n4, 95', { yFrom: '0', yStep: '10' }))
    expect(r.y).toMatchObject({ start: 0, end: 100, step: 10, broken: false })
  })

  test('points off a typed range are told about', () => {
    const r = readScatter(list('1, 2\n12, 4', { xTo: '10', xFrom: '0', xStep: '1' }))
    expect(r.points).toEqual([{ x: 1, y: 2 }])
    expect(r.problems.past).toMatch(/\(12, 4\) is off the graph/)
  })

  test('a bad range says why and falls back to the data’s', () => {
    const r = readScatter(list('1, 2\n5, 6', { xFrom: '8', xTo: '2' }))
    expect(r.problems.xTo).toMatch(/end after it starts/)
    expect(r.x.start).toBe(0)
  })
})

describe('the line', () => {
  test('least squares through every point', () => {
    const r = readScatter(list('1, 2\n2, 4\n3, 5\n4, 4\n5, 5', { fit: 'best' }))
    expect(r.line!.slope).toBeCloseTo(0.6)
    expect(r.line!.intercept).toBeCloseTo(2.2)
    expect(r.r).toBeCloseTo(0.7746, 4)
  })

  test('needs two different x values', () => {
    expect(readScatter(list('3, 1\n3, 5', { fit: 'best' })).problems.fit).toMatch(/two points/)
  })

  test('the teacher’s own', () => {
    expect(readScatter(list('1, 2', { fit: 'own', line: 'y = 2x' })).line).toEqual({ slope: 2, intercept: 0 })
    expect(readScatter(list('1, 2', { fit: 'own', line: 'y = x²' })).problems.line).toMatch(/Type a line/)
  })
})
