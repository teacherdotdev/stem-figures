import { describe, expect, test } from 'vitest'
import { addPoint, cleanSettings, DEFAULT_SETTINGS, newPart, newSpan, removePoint, settingsFromParams, settingsToQuery } from './settings.js'
import { readLinear, solve } from './solve.js'
import { buildSegments } from './layout.js'

const roundTrip = (s: ReturnType<typeof cleanSettings>) => settingsFromParams(new URLSearchParams(settingsToQuery(s)))
const pts = (...names: string[]) => names.map((name) => ({ name, dot: true }))

describe('the page address', () => {
  test('defaults write nothing', () => {
    expect(settingsToQuery(cleanSettings({}))).toBe('')
    expect(cleanSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  test('points, parts and spans round-trip, labels with | and = included', () => {
    const s = cleanSettings({
      points: [{ name: 'A', dot: false }, { name: 'M', dot: true }, { name: 'B', dot: true }],
      parts: [{ ...newPart('4x-3'), ticks: 1 }, { ...newPart('|x|=2'), mode: 'blank', size: '3' }],
      spans: [newSpan(0, 2, '')],
      cross: 1,
      crossName: 'ℓ',
      turn: 30,
    })
    expect(roundTrip(s)).toEqual(s)
  })

  test('no spans is written, so it doesn’t open with the default’s', () => {
    const s = cleanSettings({ ...DEFAULT_SETTINGS, spans: [] })
    expect(roundTrip(s).spans).toEqual([])
  })

  test('there is one part between each pair of points, and spans stay on the line', () => {
    const s = cleanSettings({ points: pts('A', 'B', 'C', 'D'), parts: [newPart('1')], spans: [newSpan(2, 0), newSpan(1, 9)] })
    expect(s.parts.map((p) => p.label)).toEqual(['1', '', ''])
    expect(s.spans).toEqual([newSpan(0, 2)])
  })

  test('removing a middle point joins its two parts and keeps spans on their points', () => {
    const s = cleanSettings({ points: pts('A', 'B', 'C', 'D'), parts: [newPart('1'), newPart('2'), newPart('3')], spans: [newSpan(0, 3, '6'), newSpan(1, 2)], cross: 3 })
    const after = cleanSettings({ ...s, ...removePoint(s, 1) })
    expect(after.points.map((p) => p.name)).toEqual(['A', 'C', 'D'])
    expect(after.parts.map((p) => p.label)).toEqual(['', '3'])
    expect(after.spans).toEqual([newSpan(0, 2, '6')])
    expect(after.cross).toBe(2)
    expect(cleanSettings({ ...s, ...addPoint(s) }).points.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })
})

describe('reading labels', () => {
  test.each([
    ['12', { a: 0, b: 12, letter: null }],
    ['2x+3', { a: 2, b: 3, letter: 'x' }],
    ['3x-4', { a: 3, b: -4, letter: 'x' }],
    ['−x+10', { a: -1, b: 10, letter: 'x' }],
    ['x/2-1', { a: 0.5, b: -1, letter: 'x' }],
    ['3(y-2)', { a: 3, b: -6, letter: 'y' }],
    ['(1/2)x', { a: 0.5, b: 0, letter: 'x' }],
    ['4.5', { a: 0, b: 4.5, letter: null }],
  ])('%s', (text, want) => expect(readLinear(text)).toEqual(want))

  test.each(['x^2', 'x+y', 'sqrt(x)', '2x+', '?', 'x*x'])('%s is not linear in one letter', (text) => expect(readLinear(text)).toBeNull())
})

describe('solving', () => {
  test('the default: 2x + 1 + 3x − 4 = 27', () => {
    const r = solve(DEFAULT_SETTINGS)
    expect(r).toMatchObject({ letter: 'x', value: 6, parts: [13, 14], spans: [27], problem: '' })
    expect(r.equations).toEqual(['AB + BC = AC'])
  })

  test('a midpoint: equal ticks give the equation', () => {
    const s = cleanSettings({ points: pts('A', 'M', 'B'), parts: [{ ...newPart('4x-3'), ticks: 1 }, { ...newPart('2x+9'), ticks: 1 }], spans: [newSpan(0, 2)] })
    expect(solve(s)).toMatchObject({ value: 6, parts: [21, 21], spans: [42], equations: ['AM + MB = AB', 'AM = MB'], problem: '' })
  })

  test('a blank part follows from its span', () => {
    const s = cleanSettings({ points: pts('A', 'B', 'C'), parts: [newPart('8'), newPart('')], spans: [newSpan(0, 2, '15')] })
    expect(solve(s)).toMatchObject({ letter: null, parts: [8, 7], spans: [15], problem: '' })
  })

  test('says when lengths don’t add up, or come out too small', () => {
    const wrong = cleanSettings({ points: pts('A', 'B', 'C'), parts: [newPart('8'), newPart('6')], spans: [newSpan(0, 2, '15')] })
    expect(solve(wrong).problem).toBe('AB + BC = AC doesn’t hold with these lengths.')
    const negative = cleanSettings({ points: pts('A', 'B', 'C'), parts: [newPart('x-10'), newPart('x')], spans: [newSpan(0, 2, '8')] })
    expect(solve(negative).problem).toBe('AB would be −1, and a length has to be more than 0.')
    const two = cleanSettings({ points: pts('A', 'B', 'C'), parts: [newPart('x'), newPart('y')], spans: [newSpan(0, 2, '12')] })
    expect(solve(two).problem).toMatch(/more than one letter/)
  })
})

describe('the drawing', () => {
  test('parts are drawn to the solved lengths', () => {
    const g = buildSegments(DEFAULT_SETTINGS)
    const [a, b, c] = [g.lines[0][0][0], g.dots[1][0], g.dots[2][0]]
    expect((b - a) / (c - b)).toBeCloseTo(13 / 14)
    expect(g.braces).toHaveLength(1)
    expect(g.labels.map((l) => l.part)).toEqual(['part:0', 'part:1', 'point:0', 'point:1', 'point:2', 'span:0'])
    expect(g.description).toBe('Points A, B, C in order on a segment. AB is 2x+1; BC is 3x-4; a brace under AC labeled 27.')
  })

  test('overlapping spans go in separate rows', () => {
    const s = cleanSettings({ points: pts('A', 'B', 'C', 'D'), spans: [newSpan(0, 2, 'a'), newSpan(1, 3, 'b'), newSpan(0, 1, 'c')] })
    const g = buildSegments(s)
    const y = (k: number) => g.labels.find((l) => l.part === `span:${k}`)!.cy
    expect(y(2)).toBeCloseTo(y(1)) // c and b don't overlap
    expect(y(0)).toBeGreaterThan(y(2))
  })
})

test('a span over one part gives its length but no equation to write', () => {
  const s = cleanSettings({ points: pts('A', 'C', 'D'), parts: [newPart(''), newPart('x+2')], spans: [newSpan(0, 1, '27'), newSpan(0, 2, '40')] })
  expect(solve(s)).toMatchObject({ equations: ['AC + CD = AD'], value: 11, parts: [27, 13], problem: '' })
})
