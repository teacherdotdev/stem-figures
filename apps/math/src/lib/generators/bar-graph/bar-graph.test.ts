import { describe, expect, test } from 'vitest'
import { textBox, textWidth, type Box } from '$shared/graph/labels'
import { buildBarGraph } from './layout.js'
import { cleanSettings, readGraph, settingsFromParams, settingsToQuery, type RawSettings } from './settings.js'

const row = (name: string, ...values: (string | { value: string; error?: string })[]) => ({
  name,
  cells: values.map((v) => (typeof v === 'string' ? { value: v } : v)),
})
const graph = (s: RawSettings) => buildBarGraph(cleanSettings(s))
const SPORTS = [row('Soccer', '8'), row('Basketball', '6'), row('Swimming', '5'), row('Tennis', '3'), row('Running', '4')]
const PETS = { columns: ['Boys', 'Girls'], rows: [row('Dog', '9', '7'), row('Cat', '5', '8'), row('Fish', '3', '2')] }

/** Where value v falls along the value axis, as the grid's own px() puts it. */
function valueAt(g: ReturnType<typeof graph>, v: number) {
  return g.lines === 'horizontal' ? g.layout.px({ x: 0, y: v }).y : g.layout.px({ x: v, y: 0 }).x
}
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

describe('the page address', () => {
  test('the table, headings and settings round-trip', () => {
    const s = cleanSettings({ ...PETS, direction: 'bars', stacking: 'stacked', look: 'bw', fills: ['', 'hatch'], values: 'end' })
    const q = settingsToQuery(s)
    expect(q).toContain('cols=Boys%7CGirls')
    expect(q).toContain('row=Dog%7C9%7C7')
    expect(settingsFromParams(new URLSearchParams(q))).toEqual(s)
  })

  test('the defaults make an empty address, and one series needs no headings', () => {
    expect(settingsToQuery(cleanSettings({}))).toBe('')
    expect(settingsToQuery(cleanSettings({ rows: [row('A', '1')] }))).toBe('row=A%7C1')
  })

  test('error bars and empty values round-trip', () => {
    const s = cleanSettings({ errorBars: true, rows: [row('A', { value: '4', error: '0.5' }), row('B', ''), row('', '3')] })
    expect(settingsFromParams(new URLSearchParams(settingsToQuery(s)))).toEqual(s)
  })

  test('unknown choices fall back to the defaults', () => {
    const s = cleanSettings({ direction: 'diagonal', look: 'neon', fills: ['plaid'], every: 3 })
    expect([s.direction, s.look, s.fills, s.every]).toEqual(['columns', 'color', [], 1])
  })
})

describe('the value axis', () => {
  test('fits the data from 0', () => {
    expect(readGraph(cleanSettings({ rows: SPORTS })).range).toEqual({ from: 0, to: 8, step: 1 })
  })

  test('reaches below 0 for negative values', () => {
    const r = readGraph(cleanSettings({ rows: [row('Jan', '-4'), row('Feb', '6')] })).range
    expect(r.from).toBeLessThanOrEqual(-4)
    expect(r.to).toBeGreaterThanOrEqual(6)
  })

  test('takes in stacked totals and error bars', () => {
    expect(readGraph(cleanSettings({ ...PETS, stacking: 'stacked' })).range.to).toBeGreaterThanOrEqual(16)
    expect(readGraph(cleanSettings({ errorBars: true, rows: [row('A', { value: '10', error: '3' })] })).range.to).toBeGreaterThanOrEqual(13)
  })

  test('leaves room above the tallest bar for its value', () => {
    expect(readGraph(cleanSettings({ rows: SPORTS, values: 'end' })).range.to).toBe(9)
  })

  test('says when a bar runs past a typed range', () => {
    expect(readGraph(cleanSettings({ rows: SPORTS, to: '5' })).problems.to).toContain('8 is past the end')
  })

  test('an empty table draws 0 to 10', () => {
    expect(readGraph(cleanSettings({})).range).toEqual({ from: 0, to: 10, step: 1 })
  })
})

describe('bars', () => {
  for (const direction of ['columns', 'bars'] as const) {
    test(`${direction}: each bar ends at its value on the axis`, () => {
      const g = graph({ rows: [...SPORTS, row('Golf', '-2')], direction })
      expect(g.bars).toHaveLength(6)
      g.bars.forEach((b, i) => {
        const v = [8, 6, 5, 3, 4, -2][i]
        const [lo, hi] = direction === 'columns' ? [b.y, b.y + b.h] : [b.x, b.x + b.w]
        const ends = [valueAt(g, 0), valueAt(g, v)].sort((a, c) => a - c)
        expect(lo).toBeCloseTo(ends[0], 1)
        expect(hi).toBeCloseTo(ends[1], 1)
      })
    })
  }

  test('bars stand apart, never touching', () => {
    const b = graph({ rows: SPORTS }).bars
    for (let i = 1; i < b.length; i++) expect(b[i].x).toBeGreaterThan(b[i - 1].x + b[i - 1].w + 4)
  })

  test('side-by-side bars stay inside their own category', () => {
    for (const m of [2, 3, 4]) {
      const columns = Array.from({ length: m }, (_, j) => `S${j}`)
      const rows = ['A', 'B', 'C'].map((name) => row(name, ...columns.map(() => '5')))
      const g = graph({ columns, rows })
      const byRow = [0, 1, 2].map((i) => g.bars.filter((b) => b.row === i))
      for (let i = 1; i < 3; i++) {
        const prevEnd = Math.max(...byRow[i - 1].map((b) => b.x + b.w))
        expect(Math.min(...byRow[i].map((b) => b.x))).toBeGreaterThan(prevEnd)
      }
      expect(new Set(g.bars.map((b) => b.fill)).size).toBe(m)
    }
  })

  test('stacked parts sit end to end and add up to the total', () => {
    const g = graph({ ...PETS, stacking: 'stacked' })
    const dog = g.bars.filter((b) => b.row === 0).sort((a, b) => b.y - a.y)
    expect(dog[0].y).toBeCloseTo(dog[1].y + dog[1].h, 1)
    expect(dog[1].y).toBeCloseTo(valueAt(g, 16), 1)
  })
})

describe('error bars', () => {
  const s = { errorBars: true, rows: [row('A', { value: '10', error: '2' }), row('B', { value: '6' })] }

  test('run from the value minus e to the value plus e', () => {
    const g = graph(s)
    expect(g.errorBars).toHaveLength(1)
    const e = g.errorBars[0]
    expect([e.y1, e.y2].sort((a, b) => a - b)).toEqual([valueAt(g, 12), valueAt(g, 8)])
    expect(e.caps).toHaveLength(2)
  })

  test('no crossbars when they are turned off', () => {
    expect(graph({ ...s, crossbars: 'none' }).errorBars[0].caps).toEqual([])
  })

  test('are off for stacked bars, with a message', () => {
    const g = graph({ ...PETS, errorBars: true, stacking: 'stacked', rows: [row('Dog', { value: '9', error: '1' }, '7')] })
    expect(g.errorBars).toEqual([])
    expect(g.read.problems.errors).toBeTruthy()
  })

  test('a value at the end clears its error bar', () => {
    const g = graph({ ...s, values: 'end' })
    expect(g.values[0].y).toBeLessThan(valueAt(g, 12))
  })
})

describe('labels', () => {
  test('values are written as typed', () => {
    expect(graph({ rows: [row('A', '12.50')], values: 'end' }).values[0].text).toBe('12.50')
  })

  test('category names never overlap, wrapping or slanting as needed', () => {
    const long = ['Strawberry milkshake', 'Hot chocolate', 'Orange juice', 'Sparkling water', 'Lemonade', 'Apple cider']
    for (const rows of [SPORTS, long.map((n) => row(n, '3')), Array.from({ length: 20 }, (_, i) => row(`Category ${i + 1}`, String(i)))]) {
      for (const direction of ['columns', 'bars'] as const) {
        const g = graph({ rows, direction })
        const boxes = g.categories.map((c) => {
          const w = Math.max(...c.lines.map((l) => textWidth(l, g.fs)))
          // A slanted name is checked along its slant: its start and end must clear its neighbors'.
          return c.slant ? { x0: c.x - w * Math.SQRT1_2, x1: c.x, y0: c.y, y1: c.y + 1 } : textBox({ x: c.x, y: c.y, anchor: c.anchor }, w, g.fs)
        })
        for (let i = 1; i < boxes.length; i++) {
          if (g.categories[i].slant) continue
          expect(overlaps(boxes[i - 1], { ...boxes[i], y1: boxes[i].y1 + (g.categories[i].lines.length - 1) * g.lineH })).toBe(false)
        }
        // And every name is clear of the graph itself.
        for (const b of boxes) expect(direction === 'columns' ? b.y0 >= g.layout.grid.y + g.layout.grid.h - 1 : b.x1 <= g.layout.grid.x).toBe(true)
      }
    }
  })

  test('two or more series get a key, one series none', () => {
    expect(graph(PETS).key?.items.map((i) => i.text)).toEqual(['Boys', 'Girls'])
    expect(graph({ rows: SPORTS }).key).toBeNull()
  })

  test('the key on the right fits inside the figure', () => {
    const g = graph(PETS)
    expect(g.key!.x + g.key!.width).toBeLessThanOrEqual(g.layout.width)
  })
})

describe('left for students', () => {
  test('an empty value draws no bar, keeping its category and name', () => {
    const g = graph({ rows: [row('Mon', '4'), row('Tue', ''), row('Wed', '2')], values: 'end' })
    expect(g.bars.map((b) => b.row)).toEqual([0, 2])
    expect(g.values.map((v) => v.text)).toEqual(['4', '2'])
    expect(g.categories.flatMap((c) => c.lines)).toEqual(['Mon', 'Tue', 'Wed'])
  })

  test('an empty value in a stack leaves the other parts end to end', () => {
    const g = graph({ columns: ['A', 'B', 'C'], rows: [row('X', '2', '', '4')], stacking: 'stacked' })
    const top = g.bars.find((b) => b.series === 2)!
    expect(top.y + top.h).toBeCloseTo(valueAt(g, 2), 1)
  })
})
