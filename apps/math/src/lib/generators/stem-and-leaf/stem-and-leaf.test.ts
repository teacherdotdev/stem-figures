import { describe, expect, test } from 'vitest'
import { EXAMPLES } from '$lib/examples/examples'
import { buildStemAndLeaf } from './layout.js'
import { cleanSettings, keyText, readPlot, readoutOf, settingsFromParams, settingsToQuery, type RawSettings } from './settings.js'
import { place, readStem, stemText } from './stems.js'

const plot = (s: RawSettings) => readPlot(cleanSettings(s))
/** Each row as "stem | leaves", the way a textbook prints it. */
const printed = (s: RawSettings, set = 0) => plot(s).rows.map((r) => `${r.stem} | ${r.leaves[set].map((q) => q.leaf).join(' ')}`.trim())

describe('stems and leaves', () => {
  test('whole numbers make tens stems', () => {
    expect(printed({ data: '34, 12, 38, 21, 15, 36' })).toEqual(['1 | 2 5', '2 | 1', '3 | 4 6 8'])
  })

  test('decimals make stems of the whole number', () => {
    expect(printed({ data: '2.3, 3.1, 2.8, 4.0' })).toEqual(['2 | 3 8', '3 | 1', '4 | 0'])
    expect(plot({ data: '2.3, 3.1' }).unit).toBe(0.1)
  })

  test('two decimals make decimal stems', () => {
    expect(printed({ data: '1.25, 1.31, 1.38' })).toEqual(['1.2 | 5', '1.3 | 1 8'])
  })

  test('hundreds, at a leaf unit of 10', () => {
    expect(printed({ data: '340, 352, 415, 498', unit: '10' })).toEqual(['3 | 4 5', '4 | 1 9'])
    expect(printed({ data: '120, 135, 210' })).toEqual(['12 | 0', '13 | 5', '14 |', '15 |', '16 |', '17 |', '18 |', '19 |', '20 |', '21 | 0'])
  })

  test('negatives get negative stems, with −0 apart from 0', () => {
    expect(printed({ data: '-12, -4, -7, 3, 8, 15' })).toEqual(['−1 | 2', '−0 | 7 4', '0 | 3 8', '1 | 5'])
    expect(place(-4, 1, 1)).toMatchObject({ negative: true, stem: 0, leaf: 4, row: -1 })
    expect(place(4, 1, 1)).toMatchObject({ negative: false, stem: 0, leaf: 4, row: 0 })
  })

  test('digits past the leaf unit are cut off, not rounded, and listed', () => {
    const p = plot({ data: '23.47, 18.05, 31', unit: '1' })
    expect(p.rows.map((r) => r.leaves[0].map((q) => q.leaf))).toEqual([[8], [3], [1]])
    expect(p.sets[0].cut).toEqual([{ typed: 23.47, value: 23 }, { typed: 18.05, value: 18 }])
    expect(place(-2.39, 0.1, 1)).toMatchObject({ value: -2.3, cut: true })
    expect(place(2.3, 0.1, 1)).toMatchObject({ stem: 2, leaf: 3, cut: false })
  })

  test('the leaf unit is the last digit typed, so 2.30 has a leaf of 0', () => {
    expect(plot({ data: '2.30, 2.41' }).unit).toBe(0.01)
    expect(printed({ data: '2.30, 2.41' })).toEqual(['2.3 | 0', '2.4 | 1'])
  })

  test('a leaf unit making too many rows falls back, with a message', () => {
    const p = plot({ data: '1, 999', unit: '1' })
    expect(p.problems.unit).toContain('rows')
    expect(p.rows.length).toBeLessThanOrEqual(40)
    expect(plot({ data: '1, 999' }).problems.unit).toBeNull()
  })

  test('leaves as typed keep their order', () => {
    expect(printed({ data: '38, 34, 36', order: 'typed' })).toEqual(['3 | 8 4 6'])
  })
})

describe('split stems', () => {
  test('in two: leaves 0–4 on the first row, 5–9 on the second', () => {
    expect(printed({ data: '20, 24, 25, 29, 31, 37', split: 2 })).toEqual(['2 | 0 4', '2 | 5 9', '3 | 1', '3 | 7'])
  })

  test('negative stems run the other way, so values still rise down the plot', () => {
    expect(printed({ data: '-17, -12, 3, 6', split: 2 })).toEqual(['−1 | 7', '−1 | 2', '−0 |', '−0 |', '0 | 3', '0 | 6'])
  })

  test('in five: each pair of digits on its own fifth', () => {
    expect(printed({ data: '40, 43, 44, 47, 49', split: 5 })).toEqual(['4 | 0', '4 | 3', '4 | 4', '4 | 7', '4 | 9'])
    expect(printed({ data: '41, 48', split: 5 })).toEqual(['4 | 1', '4 |', '4 |', '4 |', '4 | 8'])
  })
})

describe('the rows', () => {
  test('empty stems between the lowest and highest appear', () => {
    expect(printed({ data: '12, 45' })).toEqual(['1 | 2', '2 |', '3 |', '4 | 5'])
  })

  test('typed stems widen the plot but never cut the data', () => {
    expect(printed({ data: '23, 34', from: '1', to: '5' })).toEqual(['1 |', '2 | 3', '3 | 4', '4 |', '5 |'])
    const p = plot({ data: '23, 34', from: '3' })
    expect(p.rows[0].stem).toBe('2')
    expect(p.problems.from).toContain('starts at stem 2')
  })

  test('with no data, typed stems make empty rows, and nothing typed makes blank stems', () => {
    expect(printed({ from: '4', to: '7' })).toEqual(['4 |', '5 |', '6 |', '7 |'])
    expect(plot({}).rows.map((r) => r.stem)).toEqual(['', '', '', '', ''])
  })

  test('a typed stem is read at the leaf unit', () => {
    expect(readStem('−0', 1)).toEqual({ negative: true, stem: 0 })
    expect(readStem('2.3', 0.01)).toEqual({ negative: false, stem: 23 })
    expect(readStem('2.3', 1)).toBeNull()
    expect(stemText(true, 0, 1)).toBe('−0')
    expect(plot({ data: '5', from: 'x' }).problems.from).toBeTruthy()
  })
})

describe('back-to-back', () => {
  const s = { layout: 'back', data: '34, 31, 22, 45', name: 'Class A', data2: '36, 28, 41, 43', name2: 'Class B' }

  test('each set keeps its own leaves on the shared stems', () => {
    expect(printed(s, 0)).toEqual(['2 | 2', '3 | 1 4', '4 | 5'])
    expect(printed(s, 1)).toEqual(['2 | 8', '3 | 6', '4 | 1 3'])
  })

  test('leaves line up in columns both ways', () => {
    const g = buildStemAndLeaf(cleanSettings({ ...s, data: '31, 34, 37, 22, 45', data2: '36, 38, 41, 43, 44' }))
    const xs = new Set(g.leaves.map((t) => t.x))
    const left = g.leaves.filter((t) => t.x < g.stems[0].x)
    const right = g.leaves.filter((t) => t.x > g.stems[0].x)
    expect(left.length).toBe(5)
    expect(right.length).toBe(5)
    // Three left columns and three right ones, evenly spaced, mirrored about the stems.
    expect(xs.size).toBe(6)
    const l = [...new Set(left.map((t) => t.x))].sort((a, b) => b - a)
    const r = [...new Set(right.map((t) => t.x))].sort((a, b) => a - b)
    expect(l[0] - l[1]).toBeCloseTo(l[1] - l[2], 1)
    expect(r[1] - r[0]).toBeCloseTo(r[2] - r[1], 1)
    expect(l[0] - l[1]).toBeCloseTo(r[1] - r[0], 1)
    // Each row's first leaf on each side sits in the same column as every other row's.
    expect(g.leaves.filter((t) => t.y === g.stems[1].y).map((t) => t.text)).toEqual(['1', '4', '7', '6', '8'])
  })

  test('the key names both sets', () => {
    const p = plot(s)
    expect(keyText(cleanSettings({ ...s, keyWords: 'means' }), p.key, true, ['Class A', 'Class B'])).toBe('2 | 2 | 8 means 22 for Class A and 28 for Class B')
  })
})

describe('the key', () => {
  test('its example matches the leaf unit', () => {
    const key = (d: RawSettings) => {
      const c = cleanSettings(d)
      const p = readPlot(c)
      return keyText(c, p.key, p.back, [])
    }
    expect(key({ data: '34, 12' })).toBe('1 | 2 = 12')
    expect(key({ data: '2.3, 4.5' })).toBe('2 | 3 = 2.3')
    expect(key({ data: '340, 415', unit: '10' })).toBe('3 | 4 = 340')
    expect(key({ data: '1.25' })).toBe('1.2 | 5 = 1.25')
    expect(key({ data: '-4' })).toBe('−0 | 4 = −4')
    expect(key({ data: '34', keyUnit: 'cm', keyWords: 'means' })).toBe('3 | 4 means 34 cm')
    expect(key({ data: '34', keyValue: '52' })).toBe('5 | 2 = 52')
  })

  test('a key value past the leaf unit is cut, with a message', () => {
    const p = plot({ data: '34', keyValue: '52.7' })
    expect(p.key.values).toEqual(['52'])
    expect(p.problems.key).toBeTruthy()
  })
})

describe('the readout', () => {
  test('n, min, max, range, median, mode, Q1 and Q3 of the values as plotted', () => {
    const p = plot({ data: '12, 15, 15, 18, 22, 27, 34' })
    expect(readoutOf(p.sets[0])).toBe('n 7 · Min 12 · Max 34 · Range 22 · Median 18 · Mode 15 · Q1 15 · Q3 27')
    expect(readoutOf(plot({ data: '1, 2, 3' }).sets[0])).toContain('Mode none')
    expect(plot({ data: '23.47, 23.41', unit: '1' }).sets[0].summary?.median).toBe(23)
  })
})

describe('the page address', () => {
  test('settings round-trip', () => {
    const s = cleanSettings({ layout: 'back', data: '1, 2', data2: '3', name: 'A', split: 5, unit: '0.1', boxes: true, boxCount: '6', keyMode: 'blank', headings: false })
    expect(settingsFromParams(new URLSearchParams(settingsToQuery(s)))).toEqual(s)
  })

  test('the defaults make an empty address, and unknown choices fall back', () => {
    expect(settingsToQuery(cleanSettings({}))).toBe('')
    const s = cleanSettings({ split: 3, unit: '7', layout: 'sideways', keyMode: 'loud' })
    expect([s.split, s.unit, s.layout, s.keyMode]).toEqual([1, 'auto', 'single', 'text'])
  })

  test('every example round-trips and draws without a problem', () => {
    const examples = EXAMPLES.filter((e) => e.generator === 'stem-and-leaf')
    expect(examples.length).toBeGreaterThan(0)
    for (const e of examples) {
      const s = cleanSettings(e.settings)
      expect(settingsFromParams(new URLSearchParams(settingsToQuery(s)))).toEqual(s)
      expect(Object.values(readPlot(s).problems).filter(Boolean)).toEqual([])
    }
  })
})

describe('boxes', () => {
  test('each row has at least the boxes asked for, more where it has more leaves', () => {
    const g = buildStemAndLeaf(cleanSettings({ data: '11, 12, 13, 14, 15, 26', boxes: true, boxCount: '4' }))
    const rows = new Map<number, number>()
    for (const b of g.boxes) rows.set(b.y, (rows.get(b.y) ?? 0) + 1)
    expect([...rows.values()]).toEqual([5, 4])
  })

  test('with no data, typed stems and a count make empty boxes', () => {
    const g = buildStemAndLeaf(cleanSettings({ from: '1', to: '3', boxes: true, boxCount: '6' }))
    expect(g.boxes).toHaveLength(18)
    expect(g.leaves).toHaveLength(0)
  })
})
