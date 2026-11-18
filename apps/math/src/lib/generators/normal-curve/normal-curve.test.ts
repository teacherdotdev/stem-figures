import { describe, expect, test } from 'vitest'
import { EXAMPLES } from '$lib/examples/examples'
import { buildCurve, type Box } from './layout.js'
import { areaText, cleanSettings, percentileText, readCurve, sectionPercent, settingsFromParams, settingsToQuery, type RawSettings } from './settings.js'

const read = (s: RawSettings) => readCurve(cleanSettings(s))
const region = (r: RawSettings) => ({ kind: 'right', by: 'value', a: '', b: '', area: 'probability', bounds: 'value', fill: '', ...r })

describe('the page address', () => {
  test('the defaults make an empty address', () => {
    expect(settingsToQuery(cleanSettings({}))).toBe('')
  })

  test('regions, marks and choices round-trip', () => {
    const s = cleanSettings({
      mean: '100', sd: '15', reach: 4, numbers: 'z', second: 'symbols', ticks: '92, 108', sdLines: 'solid', percents: 'exact',
      regions: [region({ kind: 'between', a: '85', b: '115', area: 'percent', bounds: 'blank', fill: 'hatch' }), region({ by: 'area', a: '0.1' })],
      marks: [{ at: '130', label: 'text', text: 'Jo' }], look: 'bw', density: true, title: 'IQ', titleMode: 'text', labelSize: 'large',
    })
    expect(settingsFromParams(new URLSearchParams(settingsToQuery(s)))).toEqual(s)
  })

  test('bars typed in a box can’t break the address', () => {
    const s = cleanSettings({ regions: [region({ a: '1|2' })], marks: [{ at: '3', label: 'text', text: 'a|b' }] })
    expect(s.regions[0].a).toBe('12')
    expect(settingsFromParams(new URLSearchParams(settingsToQuery(s)))).toEqual(s)
  })

  test('anything unknown falls back to its default', () => {
    const s = settingsFromParams(new URLSearchParams('reach=7&numbers=roman&reg=sideways%7Cfeel%7C1%7C%7Cloud%7C%7Cplaid'))
    expect(s.reach).toBe(3)
    expect(s.numbers).toBe('values')
    expect(s.regions[0]).toEqual(region({ a: '1' }))
  })
})

describe('reading the curve', () => {
  test('areas typed as values or z-scores', () => {
    expect(read({ mean: '100', sd: '15', regions: [region({ a: '130' })] }).regions[0].area).toBeCloseTo(0.02275, 5)
    expect(read({ regions: [region({ kind: 'left', by: 'z', a: '1.96' })] }).regions[0].area).toBeCloseTo(0.975, 4)
    expect(read({ mean: '500', sd: '100', regions: [region({ kind: 'between', a: '400', b: '600' })] }).regions[0].area).toBeCloseTo(0.6827, 4)
    expect(read({ regions: [region({ kind: 'outside', a: '-2', b: '2' })] }).regions[0].area).toBeCloseTo(0.0455, 4)
  })

  test('bounds worked out from an area, as invNorm does', () => {
    const top = read({ mean: '100', sd: '15', regions: [region({ by: 'area', a: '0.1' })] }).regions[0]
    expect(top.bounds[0]).toBeCloseTo(1.2816, 4)
    expect(top.sentence).toBe('Top 10%: X > 119.22 (z = 1.28)')
    const middle = read({ regions: [region({ kind: 'between', by: 'area', a: '95%' })] }).regions[0]
    expect(middle.bounds.map((z) => z.toFixed(2))).toEqual(['-1.96', '1.96'])
    expect(middle.area).toBeCloseTo(0.95, 10)
    const tails = read({ regions: [region({ kind: 'outside', by: 'area', a: '0.05' })] }).regions[0]
    expect(tails.spans.map(([a, b]) => [a, b].map((z) => (Number.isFinite(z) ? z.toFixed(2) : z)))).toEqual([[-Infinity, '-1.96'], ['1.96', Infinity]])
  })

  test('what each region says', () => {
    const r = read({ mean: '100', sd: '15', regions: [region({ kind: 'between', a: '85', b: '115' }), region({ kind: 'left', by: 'z', a: '-1' })] })
    expect(r.regions.map((x) => x.sentence)).toEqual(['P(85 < X < 115) = 0.6827', 'P(Z < −1) = 0.1587'])
  })

  test('problems', () => {
    const r = read({
      mean: 'x', sd: '0',
      regions: [region({ kind: 'between', a: '2', b: '1' }), region({ a: '' }), region({ by: 'area', a: '1.5' }), region({ a: '9' })],
      marks: [{ at: 'big', label: 'value', text: '' }],
      ticks: '1, nine',
    })
    expect(r.problems.mean).toMatch(/mean as a number/)
    expect(r.problems.sd).toMatch(/bigger than 0/)
    expect(r.problems.regions[0]).toMatch(/bigger than 2/)
    expect(r.problems.regions[1]).toMatch(/Type the bound/)
    expect(r.problems.regions[2]).toMatch(/between 0 and 1/)
    expect(r.problems.regions[3]).toMatch(/off the curve/)
    expect(r.problems.marks[0]).toMatch(/as a number/)
    expect(r.problems.ticks).toMatch(/as a number/)
    // Meanwhile the standard normal is drawn.
    expect([r.mu, r.sigma]).toEqual([0, 1])
    expect(r.ticks).toEqual([1])
  })
})

describe('the writing', () => {
  test('areas', () => {
    expect(areaText(0.02275, 'probability')).toBe('0.0228')
    expect(areaText(0.95, 'probability')).toBe('0.95')
    expect(areaText(0.00001, 'probability')).toBe('<0.0001')
    expect(areaText(0.1, 'percent')).toBe('10%')
    expect(areaText(0.68269, 'percent')).toBe('68.27%')
  })

  test('percentile ranks', () => {
    expect([-2, -1, 0, 1, 2, -3, 3].map(percentileText)).toEqual(['2nd', '16th', '50th', '84th', '98th', '<1st', '>99th'])
    expect(percentileText(-0.84)).toBe('20th')
  })

  test('section percents', () => {
    expect([0, 1, 2, -1, -2, -3].map((k) => sectionPercent(k, 'rule'))).toEqual(['34%', '13.5%', '2.35%', '34%', '13.5%', '2.35%'])
    expect([0, 1, 2, 3].map((k) => sectionPercent(k, 'exact'))).toEqual(['34.13%', '13.59%', '2.14%', '0.13%'])
  })
})

describe('the figure', () => {
  const textsBoxes = (fig: ReturnType<typeof buildCurve>): Box[] =>
    fig.texts.map((t) => {
      const w = 0.55 * (t.size ?? fig.fs) * t.text.length
      const x0 = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2
      return { x0, y0: t.y - 0.7 * fig.fs, x1: x0 + w, y1: t.y }
    })

  test('everything is inside the figure', () => {
    for (const ex of EXAMPLES.filter((e) => e.generator === 'normal-curve')) {
      const fig = buildCurve(cleanSettings(ex.settings))
      for (const b of textsBoxes(fig)) {
        expect(b.x0 + fig.shift.x, ex.slug).toBeGreaterThanOrEqual(0)
        expect(b.x1 + fig.shift.x, ex.slug).toBeLessThanOrEqual(fig.width)
        expect(b.y0 + fig.shift.y, ex.slug).toBeGreaterThanOrEqual(0)
        expect(b.y1 + fig.shift.y, ex.slug).toBeLessThanOrEqual(fig.height)
      }
    }
  })

  test('labels over the curve don’t overlap', () => {
    const fig = buildCurve(
      cleanSettings({ percents: 'exact', regions: [region({ kind: 'outside', by: 'area', a: '0.05' }), region({ kind: 'between', a: '-0.5', b: '0.5', area: 'percent' })], marks: [{ at: '2', label: 'percentile', text: '' }] }),
    )
    const above = textsBoxes(fig).filter((b) => b.y1 < 0)
    for (const [i, a] of above.entries()) for (const b of above.slice(i + 1)) expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1).toBe(false)
  })

  test('a bound replaces the SD number it lands on', () => {
    const fig = buildCurve(cleanSettings({ mean: '100', sd: '15', regions: [region({ a: '130', bounds: 'blank' })] }))
    expect(fig.texts.map((t) => t.text)).not.toContain('130')
    expect(fig.blanks).toHaveLength(1)
  })

  test('the axis reaches far enough for what’s typed', () => {
    const near = buildCurve(cleanSettings({}))
    const far = buildCurve(cleanSettings({ marks: [{ at: '4.5', label: 'value', text: '' }] }))
    expect(far.width).toBe(near.width)
    // The same width, so the curve is squeezed to fit 4.5 SDs.
    expect(far.ticks[1].x1 - far.ticks[0].x1).toBeLessThan(near.ticks[1].x1 - near.ticks[0].x1)
  })

  test('the screen reader hears the regions', () => {
    expect(buildCurve(cleanSettings({ mean: '100', sd: '15', regions: [region({ a: '130' })] })).description).toBe(
      'normal curve with mean 100 and standard deviation 15; shaded P(X > 130) = 0.0228',
    )
  })
})
