import { describe, expect, test } from 'vitest'
import { crosses, type Box } from '$shared/graph/labels'
import { R, buildPieChart, dir, type PieLayout } from './layout.js'
import { cleanSettings, fractionOf, readPie, settingsFromParams, settingsToQuery, type RawSettings } from './settings.js'

const row = (name: string, value = '') => ({ name, cells: [{ value }] })
const pie = (s: RawSettings) => buildPieChart(cleanSettings(s))
const FRUIT = [row('Apples', '12'), row('Bananas', '8'), row('Cherries', '6'), row('Grapes', '4')]
const angles = (p: PieLayout) => p.sectors.map((t) => t.to - t.from)

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5
/** How near the box comes to the center. */
const nearest = (b: Box) => Math.hypot(Math.max(b.x0, Math.min(0, b.x1)), Math.max(b.y0, Math.min(0, b.y1)))
/** How near the segment from a to b comes to the center. */
function offCenter(a: number[], b: number[]) {
  const d = [b[0] - a[0], b[1] - a[1]]
  const len = d[0] ** 2 + d[1] ** 2
  const t = len ? Math.max(0, Math.min(1, -(a[0] * d[0] + a[1] * d[1]) / len)) : 0
  return Math.hypot(a[0] + d[0] * t, a[1] + d[1] * t)
}
const farthest = (b: Box) => Math.hypot(Math.max(-b.x0, b.x1), Math.max(-b.y0, b.y1))

/** Every label is clear of every other, and of every sector but its own. */
function expectClear(p: PieLayout) {
  const all = p.labels
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(overlaps(all[i].box, all[j].box), `${all[i].lines[0]?.text} / ${all[j].lines[0]?.text}`).toBe(false)
  for (const l of all) {
    if (!l.inside) {
      expect(nearest(l.box)).toBeGreaterThanOrEqual(R)
      // Its leader starts in its own sector and then keeps off the circle.
      const [start, ...rest] = l.leader!
      const t = p.sectors[l.sector]
      const at = (Math.atan2(start[0], -start[1]) * 180) / Math.PI
      expect((at + 360) % 360).toBeGreaterThanOrEqual(t.from - 1e-6)
      expect((at + 360) % 360).toBeLessThanOrEqual(t.to + 1e-6)
      rest.forEach((q, k) => k && expect(offCenter(rest[k - 1], q), JSON.stringify([l.lines, l.leader, t.from, t.to])).toBeGreaterThanOrEqual(R))
      continue
    }
    const t = p.sectors[l.sector]
    expect(farthest(l.box)).toBeLessThanOrEqual(R)
    if (t.to - t.from < 359.999) for (const a of [t.from, t.to]) expect(crosses({ x1: 0, y1: 0, x2: dir(a)[0] * R, y2: dir(a)[1] * R }, l.box)).toBe(false)
  }
}

describe('the page address', () => {
  test('the table and settings round-trip', () => {
    const s = cleanSettings({
      rows: FRUIT, values: 'count', total: '40', order: 'largest', labels: 'name-percent', sectorLabels: ['', 'blank', '', 'letter'],
      look: 'bw', fills: ['', 'hatch'], keyAt: 'below', centerDot: 'off', titleMode: 'text', title: 'Fruit',
    })
    const q = settingsToQuery(s)
    expect(q).toContain('row=Apples%7C12')
    expect(q).toContain('lab=%7Cblank%7C%7Cletter')
    expect(settingsFromParams(new URLSearchParams(q))).toEqual(s)
  })

  test('the defaults make an empty address', () => {
    expect(settingsToQuery(cleanSettings({}))).toBe('')
  })

  test('a sector’s own label follows its row when an empty row before it is left out', () => {
    const s = cleanSettings({ rows: [row('A', '1'), row(''), row('B', '2')], sectorLabels: ['', '', 'letter'] })
    const back = settingsFromParams(new URLSearchParams(settingsToQuery(s)))
    expect(back.rows.map((r) => r.name)).toEqual(['A', 'B'])
    expect(back.sectorLabels).toEqual(['', 'letter'])
  })

  test('unknown choices fall back to the defaults', () => {
    const s = cleanSettings({ values: 'grams', labels: 'everything', sectorLabels: ['nope'], fills: ['plaid'] })
    expect([s.values, s.labels, s.sectorLabels, s.fills]).toEqual(['count', 'name', [], []])
  })
})

describe('angles', () => {
  test('counts: each is value ÷ total × 360, and they make 360°', () => {
    const p = pie({ rows: FRUIT })
    expect(angles(p)).toEqual([144, 96, 72, 48])
    expect(p.sectors.at(-1)!.to).toBe(360)
    expect(p.empty).toBeNull()
  })

  test('percents: each is percent × 3.6', () => {
    const p = pie({ values: 'percent', rows: [row('A', '50'), row('B', '25'), row('C', '12.5'), row('D', '12.5')] })
    expect(angles(p)).toEqual([180, 90, 45, 45])
  })

  test('degrees are drawn as typed', () => {
    const p = pie({ values: 'degrees', rows: [row('A', '200'), row('B', '100'), row('C', '60')] })
    expect(angles(p)).toEqual([200, 100, 60])
  })

  test('a typed total leaves the rest empty', () => {
    const p = pie({ total: '60', rows: [row('A', '15'), row('B', '30'), row('C')] })
    expect(angles(p)).toEqual([90, 180])
    expect(p.empty).toMatchObject({ from: 270, to: 360 })
    expect(p.read.problems.sum).toBeNull()
  })

  test('sectors start at 12 o’clock and go clockwise, as typed or largest first', () => {
    expect(pie({ rows: FRUIT }).sectors.map((t) => t.part.name)).toEqual(['Apples', 'Bananas', 'Cherries', 'Grapes'])
    expect(pie({ rows: [row('A', '1'), row('B', '3'), row('C', '2')], order: 'largest' }).sectors.map((t) => t.part.name)).toEqual(['B', 'C', 'A'])
    const first = pie({ rows: FRUIT }).sectors[0]
    expect(first.from).toBe(0)
    expect(first.path).toMatch(/^M0,0 L0,-150 A150,150 0 0 1 /)
  })

  test('the readout’s percents and fractions', () => {
    const r = readPie(cleanSettings({ rows: FRUIT }))
    expect(r.parts.map((p) => p.percent)).toEqual([40, 26.6666666667, 20, 13.3333333333])
    expect(r.parts.map((p) => p.fraction)).toEqual([{ n: 2, d: 5 }, { n: 4, d: 15 }, { n: 1, d: 5 }, { n: 2, d: 15 }])
    expect(fractionOf(12.5, 100)).toEqual({ n: 1, d: 8 })
  })
})

describe('totals that don’t add up', () => {
  test('percents short of 100: the gap is an empty sector, with a message', () => {
    const p = pie({ values: 'percent', rows: [row('A', '50'), row('B', '48')] })
    expect(angles(p)).toEqual([180, 172.8])
    expect(p.empty!.to - p.empty!.from).toBeCloseTo(7.2, 6)
    expect(p.read.problems.sum).toContain('2% short of 100%')
  })

  test('degrees short of 360 likewise', () => {
    const p = pie({ values: 'degrees', rows: [row('A', '200'), row('B', '150')] })
    expect(p.empty!.to - p.empty!.from).toBeCloseTo(10, 6)
    expect(p.read.problems.sum).toContain('10° short of 360°')
  })

  test('past the whole: shrunk to fit, with a message', () => {
    const p = pie({ values: 'percent', rows: [row('A', '60'), row('B', '60')] })
    expect(angles(p)).toEqual([180, 180])
    expect(p.read.problems.sum).toContain('more than 100%')
  })

  test('a value left empty leaves its share empty with no message', () => {
    const p = pie({ values: 'percent', rows: [row('A', '50'), row('B', '30'), row('C')] })
    expect(p.empty!.to - p.empty!.from).toBeCloseTo(72, 6)
    expect(p.read.problems.sum).toBeNull()
  })

  test('counts with a value left empty ask for the total', () => {
    expect(readPie(cleanSettings({ rows: [row('A', '5'), row('B')] })).problems.total).toContain('Type the total')
  })

  test('values that make 100 or 360 are offered as percents or degrees', () => {
    expect(readPie(cleanSettings({ rows: [row('A', '40'), row('B', '60')] })).offer).toBe('percent')
    expect(readPie(cleanSettings({ rows: [row('A', '300'), row('B', '60')] })).offer).toBe('degrees')
    expect(readPie(cleanSettings({ rows: FRUIT })).offer).toBeNull()
  })

  test('a negative or wordy value gets a message', () => {
    expect(readPie(cleanSettings({ rows: [row('A', '-2'), row('B', '3')] })).problems.table).toContain('−2'.replace('−', '-'))
    expect(readPie(cleanSettings({ rows: [row('A', 'lots')] })).problems.table).toContain('“lots”')
  })
})

describe('for students', () => {
  test('an empty table draws a blank circle with a radius to 12 o’clock and a center dot', () => {
    const p = pie({})
    expect(p.sectors).toEqual([])
    expect([p.blankCircle, p.startRadius, p.centerDot]).toEqual([true, true, true])
    expect(p.labels).toEqual([])
  })

  test('names with no values draw a blank circle too, and the key names them', () => {
    const p = pie({ rows: [row('Walk'), row('Bus')], keyAt: 'right' })
    expect(p.blankCircle).toBe(true)
    expect(p.key!.items.map((i) => i.text)).toEqual(['Walk', 'Bus'])
  })

  test('a blank label never writes its numbers, a letter label writes x', () => {
    const p = pie({ rows: FRUIT, labels: 'name-angle', sectorLabels: ['', 'blank', 'letter', 'letter'] })
    const texts = p.labels.flatMap((l) => l.lines.map((x) => x.text))
    expect(texts).not.toContain('96°')
    expect(texts).toContain('x°')
    expect(texts).toContain('y°')
    expect(texts).not.toContain('72°')
    expect(p.labels[1].lines).toEqual([{ text: 'Bananas', blank: false }, { text: '', blank: true }])
  })

  test('the center dot is on by default once something is left for students', () => {
    expect(pie({ rows: FRUIT }).centerDot).toBe(false)
    expect(pie({ rows: FRUIT, sectorLabels: ['', 'letter'] }).centerDot).toBe(true)
    expect(pie({ rows: [...FRUIT, row('Kiwi')], total: '40' }).centerDot).toBe(true)
    expect(pie({ rows: FRUIT, sectorLabels: ['', 'letter'], centerDot: 'off' }).centerDot).toBe(false)
  })
})

describe('labels', () => {
  test('each label mode writes what it says', () => {
    const first = (labels: string) => pie({ rows: FRUIT, labels }).labels[0].lines.map((l) => l.text)
    expect(first('name')).toEqual(['Apples'])
    expect(first('value')).toEqual(['12'])
    expect(first('percent')).toEqual(['40%'])
    expect(first('angle')).toEqual(['144°'])
    expect(first('fraction')).toEqual(['2/5'])
    expect(first('name-percent')).toEqual(['Apples', '40%'])
    expect(first('value-percent')).toEqual(['12 (40%)'])
    expect(pie({ rows: FRUIT, labels: 'none' }).labels).toEqual([])
  })

  test('a sector’s own label overrides the chart’s', () => {
    const p = pie({ rows: FRUIT, labels: 'name', sectorLabels: ['percent', 'none'] })
    expect(p.labels.map((l) => l.lines.map((x) => x.text).join(' '))).toEqual(['40%', 'Cherries', 'Grapes'])
  })

  test('labels fit inside big sectors and go outside thin ones', () => {
    const p = pie({ rows: [row('Most', '90'), row('Thin', '2'), row('Rest', '8')], labels: 'name-percent' })
    expect(p.labels.map((l) => l.inside)).toEqual([true, false, true])
    expect(p.labels[1].leader).not.toBeNull()
    expectClear(p)
  })

  test('labels never overlap each other or another sector, even with many thin sectors', () => {
    const thin = Array.from({ length: 8 }, (_, i) => row(`Thin ${i + 1}`, '1'))
    for (const rows of [FRUIT, [row('Big', '92'), ...thin], [...thin, row('Big', '92')], [row('A', '1'), row('B', '1'), row('C', '200'), row('D', '1'), row('E', '1'), row('F', '150')]]) {
      for (const labels of ['name', 'name-percent', 'value-percent', 'name-fraction'])
        for (const labelSize of ['small', 'medium', 'large']) expectClear(pie({ rows, labels, labelSize }))
    }
  })
})

describe('fills and key', () => {
  test('neighbors never share a fill, the last sector included', () => {
    for (const look of ['color', 'bw'])
      for (let n = 2; n <= 12; n++) {
        const p = pie({ look, rows: Array.from({ length: n }, (_, i) => row(`C${i}`, '1')) })
        const paint = (i: number) => `${p.sectors[i].fill}${p.sectors[i].tint ? ' tint' : ''}`
        p.sectors.forEach((_, i) => expect(paint(i)).not.toBe(paint((i + 1) % n)))
        // In color all 12 are different.
        if (look === 'color') expect(new Set(p.sectors.map((_, i) => paint(i))).size).toBe(n)
      }
  })

  test('a fill picked for a sector is used', () => {
    expect(pie({ rows: FRUIT, fills: ['', 'dots'] }).sectors[1].fill).toBe('dots')
  })

  test('the key on the right fits inside the figure', () => {
    const p = pie({ rows: FRUIT, keyAt: 'right', labels: 'percent' })
    expect(p.key!.items.map((i) => i.text)).toEqual(['Apples', 'Bananas', 'Cherries', 'Grapes'])
    expect(p.cx + p.key!.x + p.key!.width).toBeLessThanOrEqual(p.width)
    expect(p.cy + p.key!.y).toBeGreaterThanOrEqual(0)
  })

  test('the figure holds every label', () => {
    const p = pie({ rows: [row('A very long category name', '1'), row('B', '30')], labels: 'name-percent', titleMode: 'text', title: 'Votes' })
    for (const l of p.labels) {
      expect(p.cx + l.box.x0).toBeGreaterThanOrEqual(0)
      expect(p.cx + l.box.x1).toBeLessThanOrEqual(p.width)
      expect(p.cy + l.box.y0).toBeGreaterThanOrEqual(0)
      expect(p.cy + l.box.y1).toBeLessThanOrEqual(p.height)
    }
  })
})
