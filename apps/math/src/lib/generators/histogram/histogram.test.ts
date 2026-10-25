import { render } from 'svelte/server'
import { describe, expect, test } from 'vitest'
import { round } from '$shared/graph/grid'
import { textWidth } from '$shared/graph/labels'
import Histogram from './Histogram.svelte'
import { buildHistogram } from './layout.js'
import { cleanSettings, readHistogram, settingsFromParams, settingsToQuery, type RawSettings } from './settings.js'

const row = (name: string, f = '') => ({ name, cells: [{ value: f }] })
const table = (...rows: [string, string?][]) => ({ source: 'table', rows: rows.map(([n, f]) => row(n, f)) })
const read = (s: RawSettings) => readHistogram(cleanSettings(s))
const build = (s: RawSettings) => buildHistogram(cleanSettings(s))
/** The figure as it's downloaded. */
const drawn = (s: RawSettings) => render(Histogram, { props: { settings: cleanSettings(s) } }).body

const HEIGHTS = table(['150–155', '2'], ['155–160', '5'], ['160–165', '9'], ['165–170', '7'], ['170–175', '4'])
// A GCSE table with unequal bins, 0 < t ≤ 10, 10 < t ≤ 15…
const TIMES = table(['0 < t ≤ 10', '8'], ['10 < t ≤ 15', '12'], ['15 < t ≤ 20', '15'], ['20 < t ≤ 30', '10'], ['30 < t ≤ 50', '6'])

describe('the page address', () => {
  test('a data set and its choices round-trip', () => {
    const s = cleanSettings({ data: '12, 15, 20, 31', binStart: '10', binWidth: '5', edges: 'right', polygon: 'over', values: true })
    expect(settingsFromParams(new URLSearchParams(settingsToQuery(s)))).toEqual(s)
  })

  test('a frequency table round-trips, an empty frequency included', () => {
    const s = cleanSettings({ ...TIMES, rows: [...TIMES.rows, row('50 < t ≤ 60')], columns: ['Students'], measure: 'frequency', yTitleMode: 'none' })
    const q = settingsToQuery(s)
    expect(q).toContain('source=table')
    expect(settingsFromParams(new URLSearchParams(q))).toEqual(s)
  })

  test('the defaults make an empty address', () => {
    expect(settingsToQuery(cleanSettings({}))).toBe('')
  })

  test('unknown choices fall back to the defaults, and the table keeps one column', () => {
    const s = cleanSettings({ source: 'pie', measure: 'mass', fill: 'plaid', edges: 'middle', columns: ['A', 'B'] })
    expect([s.source, s.measure, s.fill, s.edges, s.columns]).toEqual(['data', 'auto', 'blue', 'left', ['A']])
  })
})

describe('binning a data set', () => {
  const data = '10, 12, 19, 20, 25, 30, 30, 39.5, 40'

  test('every value lands in exactly one bin', () => {
    for (const edges of ['left', 'right']) {
      for (const binWidth of ['', '5', '10', '3']) {
        const r = read({ data, edges, binWidth })
        expect(r.n).toBe(9)
        // Bins run on, end to end.
        r.bins.slice(1).forEach((b, i) => expect(b.lo).toBeCloseTo(r.bins[i].hi, 9))
      }
    }
  })

  test('a value on an edge goes in the bin that starts there', () => {
    const r = read({ data, binStart: '10', binWidth: '10' })
    expect(r.bins.map((b) => [b.lo, b.hi, b.frequency])).toEqual([[10, 20, 3], [20, 30, 2], [30, 40, 3], [40, 50, 1]])
  })

  test('or, picked, in the bin that ends there, the first edge too', () => {
    const r = read({ data, binStart: '10', binWidth: '10', edges: 'right' })
    expect(r.bins.map((b) => [b.lo, b.hi, b.frequency])).toEqual([[0, 10, 1], [10, 20, 3], [20, 30, 3], [30, 40, 2]])
  })

  test('the start and width fit the data when left empty', () => {
    const r = read({ data: '152, 158, 161, 163, 167, 171, 188' })
    expect(r.binAuto).toEqual({ binStart: 150, binWidth: 5 })
    expect(r.bins[0].lo).toBe(150)
  })

  test('numbers that aren’t, and widths that can’t be, get messages', () => {
    expect(read({ data: '1, 2, two' }).problems.data).toContain('“two”')
    expect(read({ data: '1, 2', binWidth: '0' }).problems.binWidth).toBeTruthy()
    expect(read({ data: '1, 2, 300', binWidth: '1' }).problems.binWidth).toContain('more than')
  })
})

describe('a frequency table', () => {
  test('reads bins typed every way', () => {
    const r = read(table(['10–20', '3'], ['20 - 30', '5'], ['30 to 40', '2'], ['40 ≤ x < 50', '1']))
    expect(r.bins.map((b) => [b.lo, b.hi])).toEqual([[10, 20], [20, 30], [30, 40], [40, 50]])
    expect(r.problems.table).toBeNull()
    expect(r.problems.bins).toBeNull()
  })

  test('bins are typed by their upper ends, each starting where the one before it ends', () => {
    const r = read(table(['10', '3'], ['20', '4'], ['40', '2']))
    expect(r.bins.map((b) => [b.lo, b.hi])).toEqual([[0, 10], [10, 20], [20, 40]])
    expect(read({ ...table(['150', '3'], ['160', '4']), lowest: '140' }).bins[0].lo).toBe(140)
    // A worksheet's bins pasted whole give their upper ends, and the first one where it starts.
    expect(read(table(['140 < h ≤ 150', '3'], ['150 < h ≤ 170', '4'])).bins.map((b) => [b.lo, b.hi])).toEqual([[140, 150], [150, 170]])
  })

  test('upper ends that don’t go up, or a start past the first, get a message', () => {
    expect(read(table(['20', '3'], ['10', '4'])).problems.table).toContain('have to go up')
    expect(read({ ...table(['10', '3'], ['20', '4']), lowest: '10' }).problems.bins).toContain('start before 10')
    expect(read(table(['10', '3'])).problems.bins).toContain('first bin starts')
  })

  test('whole-number bins like 10–19 are offered as their edges', () => {
    const r = read(table(['10–19', '3'], ['20–29', '5'], ['30–39', '2']))
    expect(r.problems.bins).toContain('halfway')
    expect(r.fix).toEqual({ lowest: '9.5', ups: ['19.5', '29.5', '39.5'] })
  })

  test('bad bins and frequencies get messages', () => {
    expect(read(table(['ten', '3'])).problems.table).toContain('“ten”')
    expect(read(table(['10', 'x'])).problems.table).toContain('“x”')
    expect(read(table(['10', '-2'])).problems.table).toContain('below 0')
    expect(read({ source: 'table', rows: [{ name: '', cells: [{ value: '4' }] }] }).problems.table).toContain('goes up to')
  })
})

describe('the vertical axis', () => {
  test('frequency for equal bins, frequency density for unequal ones', () => {
    expect(read(HEIGHTS).measure).toBe('frequency')
    expect(read(TIMES).measure).toBe('density')
  })

  test('a frequency axis over unequal bins gets a message', () => {
    expect(read({ ...TIMES, measure: 'frequency' }).problems.measure).toBeTruthy()
    expect(read(TIMES).problems.measure).toBeNull()
  })

  test('relative frequencies add up to 1, percents to 100', () => {
    const sum = (h: (number | null)[]) => h.reduce<number>((t, v) => t + (v ?? 0), 0)
    expect(sum(read({ ...HEIGHTS, measure: 'relative' }).heights)).toBeCloseTo(1, 9)
    expect(sum(read({ ...HEIGHTS, measure: 'percent' }).heights)).toBeCloseTo(100, 9)
  })

  test('fits the tallest bar from 0, with room for its frequency above it', () => {
    expect(read(HEIGHTS).y).toEqual({ from: 0, to: 9, step: 1 })
    expect(read({ ...HEIGHTS, values: true }).y.to).toBe(10)
  })

  test('says when a bar runs past a typed top', () => {
    expect(read({ ...HEIGHTS, yTo: '5' }).problems.yTo).toContain('9 is past the top')
  })

  test('is titled with what it measures unless the teacher types a title', () => {
    expect(build(TIMES).grid.yTitle).toBe('Frequency density')
    expect(build({ ...TIMES, yTitle: 'Density' }).grid.yTitle).toBe('Density')
  })
})

describe('bars', () => {
  test('touch, each standing on its own bin', () => {
    const g = build(HEIGHTS)
    expect(g.bars).toHaveLength(5)
    g.bars.slice(1).forEach((b, i) => expect(b.x).toBeCloseTo(g.bars[i].x + g.bars[i].w, 1))
    g.bars.forEach((b, i) => {
      const bin = g.read.bins[b.bin]
      expect(b.x).toBeCloseTo(g.layout.px({ x: bin.lo, y: 0 }).x, 1)
      expect(b.y).toBeCloseTo(g.layout.px({ x: 0, y: g.read.heights[i]! }).y, 1)
    })
  })

  test('on a frequency density axis, each bar’s area is in proportion to its frequency', () => {
    const g = build(TIMES)
    const perArea = g.bars.map((b) => g.read.bins[b.bin].frequency! / (b.w * b.h))
    for (const p of perArea) expect(p / perArea[0]).toBeCloseTo(1, 2)
  })

  test('a bin with no frequency has no bar, and never reaches the exported SVG', () => {
    const s = table(['10–20', '4'], ['20–30'], ['30–40', '6'])
    const g = build(s)
    expect(g.bars.map((b) => b.bin)).toEqual([0, 2])
    expect(g.xNumbers.map((t) => t.text)).toEqual(['10', '20', '30', '40'])
    const svg = drawn(s)
    expect(svg.match(/<rect x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" fill="#2563eb"/g) ?? []).toHaveLength(2)
    // A blank histogram has its axes set up and no bars.
    expect(build(table(['10–20'], ['20–30'], ['30–40'])).bars).toEqual([])
  })
})

describe('the frequency polygon', () => {
  test('its points sit at the bins’ midpoints, at the bars’ heights', () => {
    const g = build({ ...HEIGHTS, polygon: 'over' })
    expect(g.dots).toHaveLength(5)
    g.dots.forEach((d) => {
      const b = g.read.bins[d.bin]
      const bar = g.bars.find((r) => r.bin === d.bin)!
      expect(d.x).toBeCloseTo(g.layout.px({ x: (b.lo + b.hi) / 2, y: 0 }).x, 1)
      expect(d.x).toBeCloseTo(bar.x + bar.w / 2, 1)
      expect(d.y).toBeCloseTo(bar.y, 1)
    })
  })

  test('closes down to the axis half a bin past each end, or stays open', () => {
    const closed = build({ ...HEIGHTS, polygon: 'alone' })
    expect(closed.bars).toEqual([])
    const start = closed.layout.px({ x: 147.5, y: 0 })
    expect(closed.lines[0].startsWith(`M${round(start.x)},${round(start.y)}`)).toBe(true)
    const open = build({ ...HEIGHTS, polygon: 'alone', closePolygon: false })
    expect(open.lines[0].startsWith(`M${open.dots[0].x},${open.dots[0].y}`)).toBe(true)
  })

  test('breaks where a bin has no frequency', () => {
    expect(build({ ...table(['0–10', '2'], ['10–20'], ['20–30', '4'], ['30–40', '1']), polygon: 'over', closePolygon: false }).lines).toHaveLength(1)
    expect(build({ ...table(['0–10', '2'], ['10–20', '3'], ['20–30'], ['30–40', '1'], ['40–50', '2']), polygon: 'over' }).lines).toHaveLength(2)
  })
})

describe('the horizontal axis', () => {
  test('is numbered at the bin edges, unequal ones included', () => {
    expect(build(TIMES).xNumbers.map((t) => t.text)).toEqual(['0', '10', '15', '20', '30', '50'])
  })

  test('every edge lands on a gridline', () => {
    const g = build(TIMES)
    for (const t of g.xNumbers) expect(g.layout.vLines.some((x) => Math.abs(x - t.x) < 0.01 || Math.abs(x - 8 - t.x) < 0.01)).toBe(true)
  })

  test('breaks with a zig-zag when it starts past 0, and not when it starts at 0', () => {
    const g = build(HEIGHTS)
    expect(g.zig).not.toBeNull()
    expect(g.zig!.cover.x).toBeGreaterThan(g.layout.grid.x)
    expect(g.zig!.cover.x + g.zig!.cover.w).toBeLessThan(g.xNumbers[0].x)
    expect(build(TIMES).zig).toBeNull()
    // A little past 0 starts at 0 instead.
    const near = build(table(...[5, 10, 15, 20, 25, 30].map((v): [string, string] => [`${v}–${v + 5}`, '2'])))
    expect(near.zig).toBeNull()
    expect(near.layout.yAxis.x).toBeCloseTo(near.layout.px({ x: 0, y: 0 }).x, 1)
  })

  test('writes one 0 at the corner when both axes start there', () => {
    const g = build(TIMES)
    const zeros = [...g.layout.numbers, ...g.xNumbers].filter((t) => t.text === '0')
    expect(zeros).toHaveLength(1)
    expect(zeros[0].x).toBeLessThan(g.layout.yAxis.x)
  })

  test('puts the vertical 0 back on its line when the corner has no number under it', () => {
    const g = build(HEIGHTS)
    const zero = g.layout.numbers.find((t) => t.text === '0')!
    expect(zero.y).toBeCloseTo(g.layout.xAxis.y + g.fs * 0.35, 1)
  })

  test('numbered every step of a typed range', () => {
    const g = build({ ...table(['152.5–157.5', '3'], ['157.5–162.5', '6']), xNumbers: 'steps', xFrom: '150', xTo: '165', xStep: '5' })
    expect(g.xNumbers.map((t) => t.text)).toEqual(['150', '155', '160', '165'])
    expect(g.zig).not.toBeNull()
  })

  test('numbers never run into each other', () => {
    const g = build(table(['0–1', '3'], ['1–1.5', '6'], ['1.5–100', '2']))
    g.xNumbers.slice(1).forEach((t, i) => {
      const a = g.xNumbers[i]
      expect(t.x - textWidth(t.text, g.fs) / 2).toBeGreaterThan(a.x + textWidth(a.text, g.fs) / 2)
    })
  })
})

describe('frequencies above the bars', () => {
  test('are written over each bar, none where there is no bar', () => {
    const g = build({ ...table(['10–20', '4'], ['20–30'], ['30–40', '6']), values: true })
    expect(g.values.map((v) => v.text)).toEqual(['4', '6'])
    g.values.forEach((v, i) => expect(v.y).toBeLessThan(g.bars[i].y))
  })
})
