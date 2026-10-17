import { describe, expect, it } from 'vitest'
import { textBox, textWidth, type Box } from '$shared/graph/labels'
import { buildPhotosynthesis, niceAxis, readoutOf, type Label } from './figure'
import { lightCompensation } from './model'
import { autoTitles, photosynthesisSettings, retitled } from './settings'
import { SETUPS, settingsFor } from './setups'

const settingsOf = (query: string) => photosynthesisSettings.fromParams(new URLSearchParams(query))
const build = (query: string) => buildPhotosynthesis(settingsOf(query))
const setup = (id: string) => settingsFor(SETUPS.find((x) => x.id === id)!, photosynthesisSettings.defaults, photosynthesisSettings.defaults)

const pathPoints = (d: string) => [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
/** The box a label takes up on the figure. */
function boxOf(l: Label, fs: number): Box {
  if (l.blank) return { x0: l.blank.x1, y0: l.y - fs, x1: l.blank.x2, y1: l.y + 2 }
  return textBox(l, textWidth(l.text!, fs), fs)
}
const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const ALL_MARKS = 'markSat=1&markLimit=1&letters=1'

describe('a photosynthesis rate graph', () => {
  it('starts as the classic three limiting-factor curves, shape only, with a key', () => {
    const g = build('')
    expect(g.curves.map((c) => [c.name, c.dash])).toEqual([
      ['0.1 % CO₂, 25 °C', undefined], ['0.1 % CO₂, 15 °C', '12 7'], ['0.04 % CO₂, 15 °C', '3 5'],
    ])
    expect(g.keyEntries.map((k) => k.text.text)).toEqual(g.curves.map((c) => c.name))
    expect(g.numbers).toEqual([])
    expect(g.vLines).toEqual([])
    expect(g.labels.map((l) => l.text)).toEqual(['Light intensity', 'Rate of photosynthesis'])
  })

  it('draws the curves rising together, then levelling off higher with more CO₂ or warmth', () => {
    const g = build('')
    const [top, middle, low] = g.curves.map((c) => c.paths.flatMap(pathPoints))
    // Up the page is a smaller y: the plateaus, highest first.
    const plateau = (pts: { y: number }[]) => Math.min(...pts.map((p) => p.y))
    expect(plateau(top)).toBeLessThan(plateau(middle))
    expect(plateau(middle)).toBeLessThan(plateau(low))
    // Early on they're one line.
    const early = (pts: { x: number; y: number }[]) => pts.find((p) => p.x > g.grid.x + g.grid.w * 0.05)!
    expect(Math.abs(early(top).y - early(low).y)).toBeLessThan(1.5)
  })

  it('marks where each curve levels off, with dashed lines to both axes', () => {
    const g = build('markSat=1')
    expect(g.dots).toHaveLength(3)
    expect(g.guides).toHaveLength(6)
    for (const d of g.dots) {
      expect(g.guides).toContainEqual({ x1: d.x, y1: d.y, x2: d.x, y2: g.xAxis.y })
      expect(g.guides).toContainEqual({ x1: g.yAxis.x, y1: d.y, x2: d.x, y2: d.y })
    }
    expect(g.markLabels.map((l) => l.text)).toEqual(['Saturation point', 'Saturation point', 'Saturation point'])
  })

  it('says what limits the rate, for the factors the curves differ by', () => {
    expect(build('markLimit=1').markLabels.map((l) => l.text)).toEqual(['Light is limiting', 'CO₂ or temperature is limiting'])
    expect(build('markLimit=1&co22=0.04&temp2=25&show3=0').markLabels.map((l) => l.text)).toEqual(['Light is limiting', 'CO₂ is limiting'])
    const co2 = buildPhotosynthesis({ ...setup('co2-light'), markLimit: true })
    expect(co2.markLabels.map((l) => l.text)).toEqual(['CO₂ is limiting', 'Light is limiting'])
    expect(build('markLimit=1&highLabel=Something+else').markLabels[1].text).toBe('Something else')
  })

  it('letters points A on the shared rise, then one on each plateau', () => {
    const g = build('letters=1')
    expect(g.letters.map((l) => l.text.text)).toEqual(['A', 'B', 'C', 'D'])
    // B, C and D at one light intensity, past where every curve levels off.
    const [, ...plateaus] = g.letters
    expect(new Set(plateaus.map((l) => l.at.x)).size).toBe(1)
    expect(g.letters[0].at.x).toBeLessThan(plateaus[0].at.x)
  })

  it('keeps labels off each other and inside the grid', () => {
    const queries = [
      ALL_MARKS, `${ALL_MARKS}&rate=net`, `${ALL_MARKS}&labelSize=large`, `${ALL_MARKS}&lightAxis=distance`,
      `${ALL_MARKS}&lightAxis=distance&rate=net&show2=0&show3=0`, 'graph=temperature&letters=1&light2=15&show3=0',
      `graph=co2&light2=30&show3=0&${ALL_MARKS}`, `${ALL_MARKS}&axes=numbered&gridlines=1`,
      'markSat=1&satLabelMode=blank&markLimit=1&lowLabelMode=blank&highLabelMode=blank',
    ]
    for (const query of queries) {
      const g = build(query)
      const boxes = [...g.markLabels, ...g.letters.map((l) => l.text)].map((l) => boxOf(l, g.labelFs))
      for (const [k, a] of boxes.entries()) for (const b of boxes.slice(k + 1)) expect(overlap(a, b), query).toBe(false)
      for (const b of boxes) {
        expect(b.x0, query).toBeGreaterThanOrEqual(g.grid.x)
        expect(b.x1, query).toBeLessThanOrEqual(g.grid.x + g.grid.w)
        expect(b.y0, query).toBeGreaterThanOrEqual(g.grid.y)
        expect(b.y1, query).toBeLessThanOrEqual(g.grid.y + g.grid.h)
      }
    }
  })

  it('leaves labels as blank write-on lines for students, or off', () => {
    const blank = build('markSat=1&satLabelMode=blank&markLimit=1&lowLabelMode=blank&highLabelMode=none&show2=0&show3=0')
    expect(blank.markLabels).toHaveLength(2)
    for (const l of blank.markLabels) {
      expect(l.text).toBeUndefined()
      expect(l.blank!.y1).toBe(l.blank!.y2)
      expect(l.blank!.x2 - l.blank!.x1).toBeGreaterThan(40)
    }
    expect(build('markSat=1&satLabelMode=none').markLabels).toEqual([])
  })

  it('starts a net rate below 0, crossing it at the compensation point', () => {
    const g = build('rate=net&show2=0&show3=0')
    const pts = g.curves[0].paths.flatMap(pathPoints)
    // The x-axis runs across the grid at 0, with the curve starting under it.
    expect(g.xAxis.y).toBeLessThan(g.grid.y + g.grid.h)
    expect(pts[0].y).toBeGreaterThan(g.xAxis.y)
    expect(g.dots).toHaveLength(1)
    expect(g.dots[0].y).toBe(g.xAxis.y)
    expect(g.markLabels.map((l) => l.text)).toEqual(['Compensation point'])
    const at = g.grid.x + (lightCompensation(0.1, 25) / Number(g.fitted.xTo)) * g.grid.w
    expect(g.dots[0].x).toBeCloseTo(at, 6)
  })

  it('falls with distance from the lamp', () => {
    const g = build('lightAxis=distance&show2=0&show3=0')
    const pts = g.curves[0].paths.flatMap(pathPoints)
    expect(pts[0].y).toBeLessThan(pts.at(-1)!.y)
    expect(g.fitted.xTo).toBe('50')
  })

  it('ends a temperature curve where the enzymes have denatured, flatter in dim light', () => {
    const g = buildPhotosynthesis(setup('temperature-light'))
    const [bright, dim] = g.curves.map((c) => c.paths.flatMap(pathPoints))
    const axis = g.grid.y + g.grid.h
    expect(bright.at(-1)!.y).toBeCloseTo(axis, 0)
    expect(Math.max(...bright.map((p) => p.x))).toBeLessThan(g.grid.x + g.grid.w * 0.85)
    const height = (pts: { y: number }[]) => axis - Math.min(...pts.map((p) => p.y))
    expect(height(dim)).toBeLessThan(height(bright) * 0.6)
    // One optimum, both peaks at 30 °C.
    expect(g.dots).toHaveLength(1)
    expect(g.dots[0].x).toBeCloseTo(g.grid.x + (30 / 50) * g.grid.w, 0)
  })

  it('draws the closed chamber in dark, dim and bright light', () => {
    const g = buildPhotosynthesis(setup('chamber'))
    const [dark, dim, bright] = g.curves.map((c) => c.paths.flatMap(pathPoints))
    expect(dark.at(-1)!.y).toBeLessThan(dark[0].y)
    expect(Math.abs(dim.at(-1)!.y - dim[0].y)).toBeLessThan(1)
    expect(bright.at(-1)!.y).toBeGreaterThan(bright[0].y)
    expect(g.labels.map((l) => l.text)).toEqual(['Time (minutes)', 'CO₂ concentration (%)'])
  })

  it('shades the dark after the light goes off', () => {
    const g = buildPhotosynthesis(setup('gases'))
    expect(g.dark!.x).toBeCloseTo(g.grid.x + g.grid.w / 2, 6)
    expect(g.periods.map((l) => l.text)).toEqual(['Light', 'Dark'])
    expect(g.curves.map((c) => c.name)).toEqual(['CO₂', 'O₂'])
    expect(g.right!.title!.text).toBe('O₂ concentration (%)')
  })

  it('draws CO₂ against O₂ as one straight falling line, with no right-hand axis', () => {
    const g = buildPhotosynthesis({ ...setup('gases'), view: 'against', ...autoTitles({ ...setup('gases'), view: 'against' }) })
    expect(g.right).toBeNull()
    expect(g.keyEntries).toEqual([])
    const pts = g.curves[0].paths.flatMap(pathPoints)
    const slope = (a: { x: number; y: number }, b: { x: number; y: number }) => (b.y - a.y) / (b.x - a.x)
    const first = slope(pts[0], pts[Math.floor(pts.length / 3)])
    for (const p of pts.slice(5)) if (Math.abs(p.x - pts[0].x) > 5) expect(slope(pts[0], p)).toBeCloseTo(first, 1)
  })

  it('scatters points about the curves, the same for the same seed, or draws them alone', () => {
    const on = build('points=on&show2=0&show3=0')
    expect(on.curves[0].points.length).toBeGreaterThan(5)
    expect(on.curves[0].paths.length).toBeGreaterThan(0)
    expect(build('points=on&show2=0&show3=0').curves[0].points).toEqual(on.curves[0].points)
    expect(build('points=on&show2=0&show3=0&seed=2').curves[0].points).not.toEqual(on.curves[0].points)
    const only = build('points=only&show2=0&show3=0')
    expect(only.curves[0].paths).toEqual([])
    expect(only.curves[0].points.length).toBe(on.curves[0].points.length)
    expect(build('points=on&noise=0&show2=0&show3=0').curves[0].points.length).toBe(on.curves[0].points.length)
  })

  it('draws blank axes when no curve is shown', () => {
    const g = build('show1=0&show2=0&show3=0&markSat=1&letters=1')
    expect(g.curves).toEqual([])
    expect(g.dots).toEqual([])
    expect(g.letters).toEqual([])
  })
})

describe('numbered axes', () => {
  it('are fitted to the curves on graph paper, or as typed', () => {
    const g = build('axes=numbered&gridlines=1')
    expect(g.numbers.length).toBeGreaterThan(10)
    expect(g.vLines.length).toBeGreaterThan(5)
    expect(g.fitted.xFrom).toBe('0')
    const typed = build('axes=numbered&xFit=0&xFrom=0&xTo=200&xStep=20')
    expect(typed.numbers.some((n) => n.text === '200')).toBe(true)
  })

  it('count by nice steps', () => {
    expect(niceAxis(0, 100)).toEqual({ from: '0', to: '100', step: '10' })
    expect(niceAxis(0, 0.5)).toEqual({ from: '0', to: '0.5', step: '0.05' })
    expect(niceAxis(0, 60)).toEqual({ from: '0', to: '60', step: '5' })
  })

  it('give the O₂ a right-hand axis counted by the same step as the CO₂', () => {
    const g = buildPhotosynthesis({ ...setup('gases'), axes: 'numbered' })
    expect(g.fitted.y2Step).toBe(g.fitted.yStep)
    expect(g.right!.numbers.length).toBeGreaterThan(3)
    expect(Number(g.right!.numbers[0].text.replace('−', '-'))).toBeGreaterThan(20)
  })

  it('number a crowded fitted x-axis every other line', () => {
    const g = buildPhotosynthesis({ ...setup('gases'), view: 'against', axes: 'numbered' })
    const xs = g.numbers.filter((n) => n.anchor === 'middle' || n.anchor === undefined)
    expect(xs.length).toBeLessThan(8)
  })
})

describe('the settings', () => {
  it('leave defaults out of the address, and read back what they wrote, numbered or shape only', () => {
    expect(photosynthesisSettings.toQuery(photosynthesisSettings.defaults)).toBe('')
    for (const query of ['axes=numbered&gridlines=1&xFit=0&xTo=120&yFrom=-2', 'graph=co2&co2Unit=ppm&co21=0.08&name2=Dim', 'graph=gases&view=against&lightsOff=1']) {
      const s = settingsOf(query)
      expect(photosynthesisSettings.fromParams(new URLSearchParams(photosynthesisSettings.toQuery(s))), query).toEqual(s)
    }
  })

  it('swap the axis titles this page wrote when the graph changes, and keep ones the teacher typed', () => {
    const before = photosynthesisSettings.defaults
    expect(retitled(before, { ...before, graph: 'temperature' })).toEqual({ xTitle: 'Temperature (°C)', yTitle: 'Rate of photosynthesis', y2Title: 'O₂ concentration (%)' })
    expect(retitled({ ...before, xTitle: 'Light (lux)' }, { ...before, graph: 'temperature' })).not.toHaveProperty('xTitle')
    expect(retitled(before, { ...before, rate: 'net' }).yTitle).toBe('Net rate of photosynthesis')
    expect(retitled({ ...before, graph: 'co2', xTitle: 'CO₂ concentration (%)' }, { ...before, graph: 'co2', co2Unit: 'ppm' }).xTitle).toBe('CO₂ concentration (ppm)')
  })

  it('has setups that keep their own settings and titles, and draw without problems', () => {
    for (const x of SETUPS) {
      const s = setup(x.id)
      expect(photosynthesisSettings.tidy(s), x.id).toEqual(s)
      expect(s.xTitle, x.id).toBe(autoTitles(s).xTitle)
      const g = buildPhotosynthesis(s)
      expect(Object.values(g.problems).filter(Boolean), x.id).toEqual([])
      expect(readoutOf(s).length, x.id).toBeGreaterThan(0)
    }
  })
})

describe('the readout', () => {
  it('says where each curve levels off and what limits it', () => {
    expect(readoutOf(settingsOf(''))[0]).toMatch(/^0\.1 % CO₂, 25 °C: light is limiting up to a light intensity of about \d+, then the rate levels off at [\d.]+$/)
    expect(readoutOf(setup('chamber'))).toEqual([
      expect.stringMatching(/^Dark: CO₂ rises in a straight line/),
      expect.stringMatching(/^Dim light \(compensation point\): CO₂ stays level/),
      expect.stringMatching(/^Bright light: CO₂ falls and levels off at about 0\.0\d+ %, the CO₂ compensation point$/),
    ])
    expect(readoutOf(setup('gases'))[0]).toMatch(/^In the light, CO₂ falls from 0\.04 % to/)
    expect(readoutOf(setup('temperature-light'))[0]).toMatch(/fastest at about 30 °C/)
  })
})
