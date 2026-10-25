import { describe, expect, test } from 'vitest'
import { EXAMPLES } from '$lib/examples/examples'
import { textWidth } from '$shared/graph/labels'
import { across, buildCumulative, ordinal, up } from './layout.js'
import { cleanSettings, parseBound, readGraph, settingsFromParams, settingsToQuery, type RawSettings } from './settings.js'

const row = (name: string, value = '') => ({ name, cells: [{ value }] })
const graph = (s: RawSettings) => buildCumulative(cleanSettings(s))
// 50 heights in five bins: running totals 4, 14, 32, 44, 50.
const HEIGHTS = [row('10', '4'), row('20', '10'), row('30', '18'), row('40', '12'), row('50', '6')]

/** The drawn path's corners, back from its "M1,2L3,4" form. */
const corners = (d: string) => [...d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
/** How far a point is from the nearest piece of a path. */
function distance(p: { x: number; y: number }, path: { x: number; y: number }[]) {
  let best = Infinity
  for (let k = 0; k < path.length - 1; k++) {
    const a = path[k]
    const b = path[k + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
    best = Math.min(best, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy))
  }
  return best
}

describe('the page address', () => {
  test('the tables, readings and settings round-trip', () => {
    const s = cleanSettings({
      rows: HEIGHTS,
      totals: [row('≤ 10', '4'), row('≤ 20', '14')],
      lowest: '5',
      data: '1, 2, 3',
      mode: 'cumulative',
      join: 'straight',
      scale: 'percent',
      median: 'blank',
      readings: [{ kind: 'up', at: '35', show: 'lines' }, { kind: 'percentile', at: '90', show: 'value' }],
      xTo: '60',
    })
    const q = settingsToQuery(s)
    expect(q).toContain('row=10%7C4')
    expect(q).toContain('read=up%7C35%7Clines')
    expect(settingsFromParams(new URLSearchParams(q))).toEqual(s)
  })

  test('the defaults make an empty address', () => {
    expect(settingsToQuery(cleanSettings({}))).toBe('')
  })

  test('unknown choices fall back to the defaults', () => {
    const s = cleanSettings({ mode: 'pie', join: 'wiggly', median: 'loud', readings: [{ kind: 'mode', at: '3', show: 'off' }] })
    expect([s.mode, s.join, s.median, s.readings]).toEqual(['frequency', 'smooth', 'off', [{ kind: 'percentile', at: '3', show: 'value' }]])
  })

  test('every example round-trips', () => {
    const examples = EXAMPLES.filter((e) => e.generator === 'cumulative-frequency')
    expect(examples.length).toBeGreaterThan(3)
    for (const e of examples) {
      const s = cleanSettings(e.settings)
      const q = settingsToQuery(s)
      expect(settingsToQuery(settingsFromParams(new URLSearchParams(q)))).toBe(q)
      const read = readGraph(s)
      expect(Object.values(read.problems).filter(Boolean)).toEqual([])
      expect(buildCumulative(s).problems.readings.filter(Boolean)).toEqual([])
    }
  })
})

describe('points', () => {
  test('sit at each upper bound, after the lowest bound with 0, and end at n', () => {
    const g = graph({ rows: HEIGHTS })
    expect(g.read.points).toEqual([
      { x: 0, cf: 0 }, { x: 10, cf: 4 }, { x: 20, cf: 14 }, { x: 30, cf: 32 }, { x: 40, cf: 44 }, { x: 50, cf: 50 },
    ])
    expect(g.read.n).toBe(50)
    g.read.points.forEach((p, i) => {
      const q = g.layout.px({ x: p.x, y: p.cf })
      expect(g.points[i].x).toBeCloseTo(q.x, 1)
      expect(g.points[i].y).toBeCloseTo(q.y, 1)
    })
  })

  test('without the start, the first point is the first upper bound', () => {
    expect(graph({ rows: HEIGHTS, start: false }).read.points[0]).toEqual({ x: 10, cf: 4 })
  })

  test('a percent axis plots each total as a percent of n, from 0 to 100', () => {
    const g = graph({ rows: HEIGHTS, scale: 'percent' })
    expect(g.join!.at(-1)!.y).toBeCloseTo(100)
    expect(g.read.y.range).toEqual({ from: 0, to: 100, step: 10 })
  })

  test('a data set is binned and totaled', () => {
    const g = graph({ mode: 'data', data: '3, 7, 12, 15, 18, 22, 25, 31', binStart: '0', binWidth: '10' })
    expect(g.read.totals).toEqual([{ x: 10, cf: 2 }, { x: 20, cf: 5 }, { x: 30, cf: 7 }, { x: 40, cf: 8 }])
    expect(g.read.points[0]).toEqual({ x: 0, cf: 0 })
  })

  test('a value on an edge goes in the bin the edge choice says', () => {
    const left = graph({ mode: 'data', data: '10, 20', binStart: '0', binWidth: '10' }).read.totals
    const right = graph({ mode: 'data', data: '10, 20', binStart: '0', binWidth: '10', edges: 'right' }).read.totals
    expect(left).toEqual([{ x: 10, cf: 0 }, { x: 20, cf: 1 }, { x: 30, cf: 2 }])
    expect(right).toEqual([{ x: 10, cf: 1 }, { x: 20, cf: 2 }])
  })

  test('a cumulative table starts from the first bin’s lower end', () => {
    const g = graph({ mode: 'cumulative', totals: [row('0 < h ≤ 10', '4'), row('0 < h ≤ 20', '14'), row('0 < h ≤ 30', '32')] })
    expect(g.read.points).toEqual([{ x: 0, cf: 0 }, { x: 10, cf: 4 }, { x: 20, cf: 14 }, { x: 30, cf: 32 }])
  })

  test('the first bin starts where typed, or as far below its upper end as the next bin is wide', () => {
    const totals = [row('10', '4'), row('20', '14')]
    expect(readGraph(cleanSettings({ mode: 'cumulative', totals })).points[0]).toEqual({ x: 0, cf: 0 })
    expect(readGraph(cleanSettings({ mode: 'cumulative', totals, lowest: '5' })).points[0]).toEqual({ x: 5, cf: 0 })
    expect(readGraph(cleanSettings({ rows: [row('150', '4'), row('160', '12')] })).points[0]).toEqual({ x: 140, cf: 0 })
  })

  test('a pasted whole bin gives the start, and one plain upper bound alone gives none, with a message', () => {
    expect(readGraph(cleanSettings({ rows: [row('140 < h ≤ 150', '4'), row('150 < h ≤ 170', '9')] })).points[0]).toEqual({ x: 140, cf: 0 })
    const one = readGraph(cleanSettings({ mode: 'cumulative', totals: [row('≤ 10', '4')] }))
    expect(one.points[0]).toEqual({ x: 10, cf: 4 })
    expect(one.problems.start).toBeTruthy()
  })

  test('a start at or past the first upper bound gets a message', () => {
    expect(readGraph(cleanSettings({ rows: [row('10', '4'), row('20', '3')], lowest: '10' })).problems.table).toContain('start before 10')
  })

  test('upper bounds are read as typed', () => {
    for (const t of ['20', '≤ 20', 'x < 20', 'under 20', '10–20', '0 < h ≤ 20', 'h <= 20']) expect(parseBound(t)).toMatchObject({ hi: 20 })
    expect(parseBound('twenty')).toHaveProperty('problem')
  })
})

describe('problems', () => {
  test('a cumulative table that goes down gets a message', () => {
    const read = readGraph(cleanSettings({ mode: 'cumulative', totals: [row('10', '4'), row('20', '14'), row('30', '12')] }))
    expect(read.problems.table).toContain('go down')
  })

  test('upper ends that don’t go up get a message', () => {
    expect(readGraph(cleanSettings({ rows: [row('20', '4'), row('10', '3')] })).problems.table).toContain('have to go up')
  })

  test('a bin with no frequency, or a frequency with no bin, gets a message', () => {
    expect(readGraph(cleanSettings({ rows: [row('10', '4'), row('20')] })).problems.table).toContain('Type the frequency up to 20')
    expect(readGraph(cleanSettings({ rows: [row('', '4')] })).problems.table).toContain('goes up to')
  })

  test('readings with no join are off, with a message', () => {
    const g = graph({ rows: HEIGHTS, join: 'none', median: 'value' })
    expect(g.guides).toEqual([])
    expect(g.problems.join).toBeTruthy()
  })

  test('a reading that misses the curve says so', () => {
    const g = graph({ rows: HEIGHTS, readings: [{ kind: 'up', at: '70' }, { kind: 'across', at: '60' }, { kind: 'percentile', at: '120' }] })
    expect(g.problems.readings.every(Boolean)).toBe(true)
    expect(g.readings).toEqual([null, null, null])
  })

  test('an empty reading draws nothing and asks nothing', () => {
    const g = graph({ rows: HEIGHTS, readings: [{ kind: 'percentile', at: '' }] })
    expect(g.readings).toEqual([null])
    expect(g.problems.readings).toEqual([null])
  })
})

describe('the join', () => {
  test('the smooth curve passes through every point and never goes down', () => {
    for (const rows of [HEIGHTS, [row('0–10', '1'), row('10–20', '0'), row('20–30', '30'), row('30–40', '0'), row('40–60', '2')]]) {
      const g = graph({ rows })
      const join = g.join!
      for (const p of g.read.points) expect(join.some((q) => Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y - p.cf) < 1e-9)).toBe(true)
      for (let k = 1; k < join.length; k++) {
        expect(join[k].x).toBeGreaterThan(join[k - 1].x)
        expect(join[k].y).toBeGreaterThanOrEqual(join[k - 1].y - 1e-9)
      }
      // Level where the frequency is 0.
      const flat = join.filter((q) => q.x >= 30 && q.x <= 40)
      if (rows !== HEIGHTS) expect(new Set(flat.map((q) => q.y.toFixed(9))).size).toBe(1)
    }
  })

  test('straight lines join the points and nothing else', () => {
    const g = graph({ rows: HEIGHTS, join: 'straight' })
    expect(g.join).toEqual(g.read.points.map((p) => ({ x: p.x, y: p.cf })))
  })

  test('no join for students to draw: the points alone', () => {
    const g = graph({ rows: HEIGHTS, join: 'none' })
    expect(g.paths).toEqual([])
    expect(g.points).toHaveLength(6)
  })
})

describe('readings', () => {
  for (const join of ['smooth', 'straight'] as const) {
    test(`${join}: up from the median gives n/2, and the quartiles a quarter and three quarters`, () => {
      const g = graph({ rows: HEIGHTS, join, median: 'value', lower: 'value', upper: 'value' })
      const { median, lower, upper } = g.quartiles
      expect(up(g.join!, median!.at.x)).toBeCloseTo(25, 9)
      expect(up(g.join!, lower!.at.x)).toBeCloseTo(12.5, 9)
      expect(up(g.join!, upper!.at.x)).toBeCloseTo(37.5, 9)
      expect(lower!.value).toBeLessThan(median!.value)
      expect(median!.value).toBeLessThan(upper!.value)
    })

    test(`${join}: each reading meets the drawn path, to the pixel`, () => {
      const g = graph({
        rows: HEIGHTS, join, median: 'value', lower: 'lines', upper: 'blank',
        readings: [{ kind: 'percentile', at: '90' }, { kind: 'across', at: '40' }, { kind: 'up', at: '35' }],
      })
      const path = corners(g.paths.join(''))
      const all = [g.quartiles.median, g.quartiles.lower, g.quartiles.upper, ...g.readings]
      expect(all.every(Boolean)).toBe(true)
      for (const r of all) expect(distance(g.layout.px(r!.at), path)).toBeLessThan(0.05)
    })
  }

  test('straight lines read as a straight line between two points would', () => {
    // n/2 = 25 is between 14 (at 20) and 32 (at 30): 20 + 10 × 11/18.
    const g = graph({ rows: HEIGHTS, join: 'straight', xStep: '1', xTo: '50' })
    expect(g.quartiles.median!.at.x).toBeCloseTo(20 + (10 * 11) / 18, 9)
    expect(g.quartiles.median!.value).toBe(26.1)
  })

  test('values are read to a tenth of a block', () => {
    const g = graph({ rows: HEIGHTS, join: 'straight' }) // the x-axis counts by 5
    expect(g.quartiles.median!.value).toBe(26)
  })

  test('across and up agree on the same curve', () => {
    const g = graph({ rows: HEIGHTS })
    for (const y of [5, 20, 33, 49]) expect(up(g.join!, across(g.join!, y)!)).toBeCloseTo(y, 9)
  })

  test('a percentile on a percent axis is read across from itself', () => {
    const count = graph({ rows: HEIGHTS, readings: [{ kind: 'percentile', at: '90' }] }).readings[0]!
    const percent = graph({ rows: HEIGHTS, scale: 'percent', readings: [{ kind: 'percentile', at: '90' }] }).readings[0]!
    expect(percent.at.y).toBeCloseTo(90)
    expect(percent.at.x).toBeCloseTo(count.at.x, 9)
  })

  test('reading lines run across to the y-axis and down to the x-axis', () => {
    const g = graph({ rows: HEIGHTS, median: 'lines' })
    const p = g.layout.px(g.quartiles.median!.at)
    expect(g.guides).toHaveLength(2)
    expect(g.guides.some((l) => l.x2 === g.layout.yAxis.x && Math.abs(l.y1 - p.y) < 0.01)).toBe(true)
    expect(g.guides.some((l) => l.y2 === g.layout.xAxis.y && Math.abs(l.x1 - p.x) < 0.01)).toBe(true)
  })

  test('values go under the x-axis numbers, apart, and blanks are lines', () => {
    const g = graph({ rows: HEIGHTS, median: 'value', lower: 'value', upper: 'blank', readings: [{ kind: 'percentile', at: '55' }] })
    expect(g.labels.map((l) => l.text)).toEqual([g.quartiles.median!.text, g.quartiles.lower!.text, g.readings[0]!.text].sort((a, b) => Number(a) - Number(b)))
    expect(g.blanks).toHaveLength(1)
    for (const l of g.labels) expect(l.y).toBeGreaterThan(g.layout.xAxis.y + g.fs + 6)
    const boxes = g.labels.map((l) => ({ x0: l.x - textWidth(l.text, g.fs) / 2, x1: l.x + textWidth(l.text, g.fs) / 2, y: l.y }))
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const same = Math.abs(boxes[i].y - boxes[j].y) < 1
        if (same) expect(boxes[i].x1 <= boxes[j].x0 || boxes[j].x1 <= boxes[i].x0).toBe(true)
      }
    // The x-axis title, if any, goes past them.
    expect(g.layout.height).toBeGreaterThan(Math.max(...g.labels.map((l) => l.y)))
  })

  test('an up reading writes its value left of the y-axis numbers', () => {
    const g = graph({ rows: HEIGHTS, readings: [{ kind: 'up', at: '35' }] })
    const l = g.labels[0]
    expect(l.anchor).toBe('end')
    const yNumbers = g.layout.numbers.filter((t) => t.anchor === 'end' && t.x === g.layout.yAxis.x - 6)
    for (const t of yNumbers) expect(l.x).toBeLessThan(t.x - textWidth(t.text, g.fs))
    expect(l.x - textWidth(l.text, g.fs)).toBeGreaterThan(0)
  })

  test('ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 90, 2.5].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '90th', '2.5th'])
  })
})

describe('the axes', () => {
  test('fit the points, and 0 to n', () => {
    const r = readGraph(cleanSettings({ rows: HEIGHTS }))
    expect(r.x.range).toEqual({ from: 0, to: 50, step: 5 })
    expect(r.y.range).toEqual({ from: 0, to: 50, step: 5 })
  })

  test('a typed range too short for the graph says so', () => {
    expect(readGraph(cleanSettings({ rows: HEIGHTS, xTo: '30' })).problems.xTo).toContain('past the end')
  })

  test('where the axes meet away from 0, each first number is written with the others', () => {
    const g = graph({ rows: [row('150–160', '5'), row('160–170', '12'), row('170–180', '8')] })
    const corner = g.layout.numbers.filter((t) => t.text === '150' || t.text === '0')
    expect(corner).toHaveLength(2)
    expect(corner.find((t) => t.text === '150')!.x).toBeCloseTo(g.layout.grid.x, 5)
  })

  test('an empty table draws 0 to 10 on both axes', () => {
    const r = readGraph(cleanSettings({}))
    expect([r.x.range, r.y.range]).toEqual([{ from: 0, to: 10, step: 1 }, { from: 0, to: 10, step: 1 }])
  })
})
