import { describe, expect, it } from 'vitest'
import { readAxes } from '$shared/graph/axes'
import { CELL } from '$shared/graph/grid'
import { answerLines, buildHalfLife, fittedAxes, halfOn, labelOf, sciText } from './figure'
import { ISOTOPES } from './isotopes'
import { drawnIsotopes, halfLifeSettings } from './settings'

const settings = (query: string) => halfLifeSettings.fromParams(new URLSearchParams(query))
const build = (query: string) => buildHalfLife(settings(query))

describe('a half-life graph', () => {
  it('draws carbon-14’s decay as percent remaining, with no key for one curve', () => {
    const g = build('')
    expect(g.curves).toHaveLength(1)
    expect(g.curves[0].paths).toHaveLength(1)
    expect(g.keyEntries).toHaveLength(0)
    expect(g.guides).toHaveLength(0)
    expect(Object.values(g.problems).filter(Boolean)).toEqual([])
    const s = settings('')
    expect([s.xTitle, s.yTitle]).toEqual(['Time (years)', 'Percent remaining (%)'])
  })

  it('runs every guide line to the curve, at the right time on the axis', () => {
    const s = settings('guides=4')
    const g = buildHalfLife(s)
    const { x, y } = readAxes(s)
    const px = (t: number, v: number) => ({
      x: g.grid.x + ((t - x.start) / x.step) * CELL,
      y: g.grid.y + g.grid.h - ((v - y.start) / y.step) * CELL,
    })
    expect(g.guides).toHaveLength(8)
    for (let k = 1; k <= 4; k++) {
      const [across, down] = g.guides.slice(2 * k - 2, 2 * k)
      const corner = px(k * 5730, 100 * 0.5 ** k)
      // Across from the y-axis at 50%, 25%… to the curve, then down to the time axis at kT½.
      expect(across.x1).toBeCloseTo(g.yAxis.x, 9)
      expect([across.x2, across.y2]).toEqual([corner.x, corner.y].map((v) => expect.closeTo(v, 9)))
      expect(across.y1).toBeCloseTo(corner.y, 9)
      expect([down.x1, down.y1, down.x2]).toEqual([corner.x, corner.y, corner.x].map((v) => expect.closeTo(v, 9)))
      expect(down.y2).toBeCloseTo(g.xAxis.y, 9)
    }
    expect(g.guideLabels.map((l) => l.text)).toEqual(['5,730 years', '11,460 years', '17,190 years', '22,920 years'])
  })

  it('labels the guide lines T½, 2T½…, with blank lines, or not at all', () => {
    expect(build('guides=3&guideLabels=halves').guideLabels.map((l) => l.text)).toEqual(['T½', '2T½', '3T½'])
    const blank = build('guides=2&guideLabels=blank').guideLabels
    expect(blank.map((l) => !!l.blank && !l.text)).toEqual([true, true])
    expect(build('guides=2&guideLabels=none').guideLabels).toHaveLength(0)
  })

  it('places guide labels where they touch nothing else', () => {
    const boxes = build('guides=4').guideLabels.map((l) => ({ x: l.x, y: l.y, anchor: l.anchor }))
    expect(new Set(boxes.map((b) => `${b.x},${b.y}`)).size).toBe(4)
  })

  it('says when guide lines run off the grid', () => {
    const g = build('guides=4&xTo=12000&xStep=1000')
    expect(g.guides).toHaveLength(4)
    expect(g.problems.guides).toContain('Only 2 of the 4')
  })

  it('leaves dots at the start and each half-life for students to join, with the curves hidden', () => {
    const g = build('curve=0&dots=1')
    expect(g.curves[0].paths).toHaveLength(0)
    expect(g.curves[0].points).toHaveLength(6) // 0 to 5 half-lives, up to 30,000 years
  })

  it('says when the curve starts above the y-axis or the x-axis ends before a half-life', () => {
    expect(build('quantity=mass&start=150').problems.fit).toContain('starts at 150 g')
    expect(build('xTo=5000&xStep=500').problems.fit).toContain('before carbon-14’s first half-life (5,730 years)')
  })
})

describe('more than one isotope', () => {
  it('reads three curves apart in black and white: solid, dashed and dotted, each with its own marker, in a key', () => {
    const g = build('count=3&color=0&dots=1&iso1=h3&iso2=cs137&iso3=co60&xTo=150&xStep=10')
    expect(g.curves.map((c) => c.color)).toEqual(['#111827', '#111827', '#111827'])
    expect(new Set(g.curves.map((c) => c.dash)).size).toBe(3)
    expect(new Set(g.curves.map((c) => c.marker)).size).toBe(3)
    expect(g.keyEntries.map((k) => k.text.text)).toEqual(['Hydrogen-3', 'Cesium-137', 'Cobalt-60'])
    expect(g.height).toBeGreaterThan(build('').height)
  })

  it('converts each half-life into the time axis’s unit', () => {
    const s = settings('count=2&iso1=i131&iso2=tc99m&xUnit=h')
    const [i131, tc] = drawnIsotopes(s)
    expect(halfOn(s, i131)).toBeCloseTo(8.02 * 24, 9)
    expect(halfOn(s, tc)).toBeCloseTo(6.01, 9)
    expect(s.xTitle).toBe('Time (hours)')
  })

  it('never puts hidden names in the figure or its screen-reader label, only the answer key', () => {
    const s = settings('count=3&names=0&guides=2&dots=1')
    const g = buildHalfLife(s)
    expect(g.keyEntries.map((k) => k.text.text)).toEqual(['Isotope A', 'Isotope B', 'Isotope C'])
    const shown = JSON.stringify(g) + labelOf(s)
    for (const name of ['Carbon', 'Cesium', 'Cobalt', 'carbon', 'cesium', 'cobalt']) expect(shown).not.toContain(name)
    expect(labelOf(s)).toBe('Half-life graph of Isotope A, Isotope B and Isotope C')
    expect(answerLines(s).slice(0, 3).map((l) => l.split(':')[0])).toEqual(['Isotope A is carbon-14', 'Isotope B is cesium-137', 'Isotope C is cobalt-60'])
  })

  it('keeps hidden names out with the daughter too', () => {
    const s = settings('names=0&daughter=1')
    expect(buildHalfLife(s).keyEntries.map((k) => k.text.text)).toEqual(['Parent isotope', 'Daughter isotope'])
    expect(labelOf(s)).not.toMatch(/carbon|nitrogen/i)
  })
})

describe('the daughter', () => {
  it('rises as the parent falls, dashed, named in the key, and the y-axis says atoms', () => {
    const s = settings('daughter=1')
    const g = buildHalfLife(s)
    expect(g.curves.map((c) => [c.name, c.dash])).toEqual([['Carbon-14', undefined], ['Nitrogen-14', '12 7']])
    expect(s.yTitle).toBe('Percent of atoms (%)')
    expect(labelOf(s)).toBe('Half-life graph of carbon-14, decaying to nitrogen-14')
  })

  it('is drawn only for one isotope with a stable daughter, in an amount of atoms', () => {
    expect(build('daughter=1&iso1=sr90').curves).toHaveLength(1)
    expect(build('daughter=1&quantity=mass').curves).toHaveLength(1)
    expect(build('daughter=1&quantity=activity').curves).toHaveLength(1)
    expect(build('daughter=1&count=2').curves).toHaveLength(2)
    expect(build('daughter=1&quantity=nuclei&start=1000&yTo=1000&yStep=100').curves).toHaveLength(2)
    expect(build('daughter=1&iso1=custom&daughterName=Element+Z').curves[1].name).toBe('Element Z')
  })
})

describe('the axes', () => {
  it('fit 5 half-lives of the longest isotope drawn, in tidy steps', () => {
    const cases = ['', 'iso1=u238&xUnit=Gy', 'count=3&iso1=h3&iso2=cs137&iso3=co60', 'count=2&iso1=i131&iso2=p32&xUnit=d', 'iso1=f18&xUnit=min', 'iso1=x']
    for (const q of cases) {
      const s = settings(q)
      const fit = fittedAxes(s)
      const longest = Math.max(...drawnIsotopes(s).map((iso) => halfOn(s, iso)))
      const [from, to, step] = [fit.xFrom, fit.xTo, fit.xStep].map(Number)
      expect(from, q).toBe(0)
      expect(to, q).toBeGreaterThanOrEqual(5 * longest - 1e-9)
      const blocks = Math.round((to - from) / step)
      expect(blocks, q).toBeLessThanOrEqual(20)
      expect(Math.abs(blocks * step - (to - from)), q).toBeLessThan(1e-9 * to)
      const mantissa = Number((step / 10 ** Math.floor(Math.log10(step))).toPrecision(6))
      expect([1, 2, 2.5, 5], q).toContain(mantissa)
      // and no axis it fits leaves a curve off the grid
      expect(Object.values(buildHalfLife(halfLifeSettings.tidy({ ...s, ...fit })).problems).filter(Boolean), q).toEqual([])
    }
  })

  it('fits carbon-14 to 30,000 years by 2,000, numbered every other line', () => {
    expect(fittedAxes(settings(''))).toMatchObject({ xFrom: '0', xTo: '30000', xStep: '2000', xEvery: 2, yTo: '100', yStep: '10' })
  })

  it('fits the y-axis to a starting mass, number of nuclei or activity', () => {
    expect(fittedAxes(settings('quantity=mass&start=80'))).toMatchObject({ yFrom: '0', yTo: '80', yStep: '10' })
    expect(fittedAxes(settings('quantity=fraction'))).toMatchObject({ yTo: '1', yStep: '0.1' })
  })

  it('titles the y-axis after what’s up the side, unless the teacher typed their own', () => {
    expect(settings('quantity=mass').yTitle).toBe('Mass remaining (g)')
    expect(settings('quantity=activity&activityUnit=cpm').yTitle).toBe('Count rate (counts/min)')
    expect(settings('quantity=mass&yTitle=Grams+left').yTitle).toBe('Grams left')
  })
})

describe('the answer key', () => {
  it('gives each isotope’s half-life, decay constant and daughter, and what’s left at each guide line', () => {
    expect(answerLines(settings('guides=3'))).toEqual([
      'Carbon-14: half-life 5,730 years, λ = 1.21 × 10⁻⁴ per year; beta decay to nitrogen-14',
      'After 1 half-life (5,730 years): 50%',
      'After 2 half-lives (11,460 years): 25%',
      'After 3 half-lives (17,190 years): 12.5%',
    ])
    expect(answerLines(settings('iso1=i131&xUnit=d&quantity=mass&start=80&guides=2'))).toEqual([
      'Iodine-131: half-life 8.02 days, λ = 0.0864 per day; beta decay to xenon-131',
      'After 1 half-life (8.02 days): 40 g',
      'After 2 half-lives (16.04 days): 20 g',
    ])
  })

  it('writes small and large decay constants in scientific notation', () => {
    expect(sciText(Math.LN2 / 4.47e9)).toBe('1.55 × 10⁻¹⁰')
    expect(sciText(0.0864)).toBe('0.0864')
    expect(sciText(123456)).toBe('1.23 × 10⁵')
  })

  it('has every setup ready to draw', () => {
    for (const x of ISOTOPES) expect(answerLines(settings(`iso1=${x.id}&xUnit=${x.unit}`))[0], x.id).toContain(x.name)
  })
})
