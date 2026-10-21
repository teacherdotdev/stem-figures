import { describe, expect, it } from 'vitest'
import { areaOf } from '$lib/graph/curves'
import { labelBoxes, overlaps } from '$lib/graph/testing'
import { buildBusinessCycle } from './figure'
import { STARTS, waveOf } from './model'
import { CYCLES, LABEL_KEYS, businessCycleSettings, type BusinessCycleSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const build = (over: Partial<BusinessCycleSettings> = {}) => buildBusinessCycle(businessCycleSettings.tidy({ ...businessCycleSettings.defaults, ...over }))
const panel = (over: Partial<BusinessCycleSettings> = {}) => build(over).figure.panels[0]
const texts = (over: Partial<BusinessCycleSettings>) => panel(over).labels.map((l) => l.runs?.map((r) => r.text).join('') ?? '____')
const kinds = (over: Partial<BusinessCycleSettings>) => build(over).wave.turns.map((t) => t.kind)
const SPAN = { x0: 0.4, x1: 14.2, lo: 1.5, hi: 8.7 }
/** Every label written in every mode. */
const ALL = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'text'])) as Partial<BusinessCycleSettings>

type Seg = { x1: number; y1: number; x2: number; y2: number }
const side = (s: Seg, x: number, y: number) => Math.sign((s.x2 - s.x1) * (y - s.y1) - (s.y2 - s.y1) * (x - s.x1))
const cross = (a: Seg, b: Seg) => side(a, b.x1, b.y1) * side(a, b.x2, b.y2) < 0 && side(b, a.x1, a.y1) * side(b, a.x2, a.y2) < 0
/** An arrow without the last of it, where it meets the wave. */
const shortOf = (l: Seg): Seg => {
  const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1)
  const f = Math.max(0, (len - 8) / len)
  return { ...l, x2: l.x1 + (l.x2 - l.x1) * f, y2: l.y1 + (l.y2 - l.y1) * f }
}
/** The wave and the trend on the drawing, as segments. */
function linesOf(g: ReturnType<typeof build>) {
  const p = g.figure.panels[0]
  const wave = Array.from({ length: 401 }, (_, k) => p.px({ x: SPAN.x0 + ((SPAN.x1 - SPAN.x0) * k) / 400, y: g.wave.y(SPAN.x0 + ((SPAN.x1 - SPAN.x0) * k) / 400) }))
  const segs = wave.slice(1).map((q, k) => ({ x1: wave[k].x, y1: wave[k].y, x2: q.x, y2: q.y }))
  const [a, b] = [p.px({ x: 0, y: g.wave.trend(0) }), p.px({ x: 14.8, y: g.wave.trend(14.8) })]
  return { wave: segs, trend: { x1: a.x, y1: a.y, x2: b.x, y2: b.y } }
}
/** Labels one over the other, near enough and lined up enough to read as one label. */
function stackedPairs(f: ReturnType<typeof build>['figure'], fs: number) {
  const boxes = labelBoxes(f)
  const out: string[] = []
  for (const a of boxes) {
    for (const b of boxes) {
      const across = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
      if (a !== b && a.y1 <= b.y0 && b.y0 - a.y1 < fs * 0.5 && across > 0.3 * Math.min(a.x1 - a.x0, b.x1 - b.x0)) out.push(`${a.text} / ${b.text}`)
    }
  }
  return out
}

describe('business cycle', () => {
  it('draws the classic St. Louis Fed wave: peak, trough, peak, around a rising trend', () => {
    const g = build()
    expect(kinds({})).toEqual(['peak', 'trough', 'peak'])
    expect(texts({})).toEqual(expect.arrayContaining(['Peak', 'Trough', 'Expansion', 'Contraction', 'Real GDP', 'Time']))
    expect(texts({}).filter((t) => t === 'Peak')).toHaveLength(2)
    // The second peak is higher, the trend carrying it up.
    const [p1, , p2] = g.wave.turns
    expect(p2.y).toBeGreaterThan(p1.y)
    expect(g.notes).toEqual([])
  })

  it('finds the turning points where real GDP stops rising or falling', () => {
    const w = waveOf({ cycles: 2, start: 'rising', amplitude: 1.5, trend: 0.3, irregularity: 0, seed: 1 }, SPAN)
    for (const t of w.turns) {
      const h = 0.05
      const [before, after] = [w.y(t.x - h), w.y(t.x + h)]
      if (t.kind === 'peak') expect(Math.max(before, after)).toBeLessThan(t.y)
      else expect(Math.min(before, after)).toBeGreaterThan(t.y)
    }
    // Peaks and troughs take turns, and the phases between them rise and fall in turn.
    expect(w.turns.map((t) => t.kind)).toEqual(['peak', 'trough', 'peak', 'trough'])
    expect(w.phases.map((p) => p.rising)).toEqual([true, false, true, false, true])
  })

  it('makes an even, flat wave a sine: peaks evenly spaced, all as high', () => {
    const w = waveOf({ cycles: 2, start: 'trough', amplitude: 1.5, trend: 0, irregularity: 0, seed: 1 }, SPAN)
    const peaks = w.turns.filter((t) => t.kind === 'peak')
    expect(peaks).toHaveLength(2)
    expect(peaks[0].y).toBeCloseTo(peaks[1].y, 6)
    expect(peaks[1].x - peaks[0].x).toBeCloseTo((SPAN.x1 - SPAN.x0) / 2, 3)
    expect(peaks[0].y - w.trend(peaks[0].x)).toBeCloseTo(1.5, 3)
  })

  it('starts where it is asked to, and runs as many cycles', () => {
    expect(kinds({ start: 'peak', cycles: 1, trend: 0 })).toEqual(['peak', 'trough', 'peak'])
    expect(kinds({ start: 'trough', cycles: 1, trend: 0 })).toEqual(['trough', 'peak', 'trough'])
    expect(kinds({ start: 'peak', cycles: 1.5 })).toEqual(['peak', 'trough', 'peak', 'trough'])
    expect(kinds({ start: 'falling', cycles: 1 })).toEqual(['trough', 'peak'])
    for (const cycles of CYCLES) expect(kinds({ cycles, start: 'rising' }).filter((k) => k === 'peak')).toHaveLength(Math.ceil(cycles))
  })

  it('starts and ends right at a peak or trough when asked to, whatever the trend', () => {
    for (const start of ['peak', 'trough'] as const) {
      for (const trend of [0, 0.3, 0.6]) {
        for (const irregularity of [0, 1]) {
          const w = build({ start, cycles: 2, trend, irregularity, seed: 3 }).wave
          // Level at both ends, turning there: no part rise or fall cut off by the graph's edge.
          const slope = (x: number) => (w.y(x + 1e-4) - w.y(x - 1e-4)) / 2e-4
          expect(Math.abs(slope(SPAN.x0 + 1e-4))).toBeLessThan(0.01)
          expect(Math.abs(slope(SPAN.x1 - 1e-4))).toBeLessThan(0.01)
          expect([w.turns[0].kind, w.turns.at(-1)!.kind]).toEqual([start, start])
          expect([w.turns[0].x, w.turns.at(-1)!.x]).toEqual([SPAN.x0, SPAN.x1])
          expect(w.phases.every((p) => p.whole)).toBe(true)
        }
      }
    }
    // Unless the trend is so steep that real GDP never falls.
    expect(build({ start: 'peak', trend: 0.6, amplitude: 0.3 }).wave.turns).toEqual([])
  })

  it('draws one whole cycle, every term placed, for "One cycle, every term"', () => {
    const s = settingsFor(SETUPS.find((x) => x.id === 'one-cycle')!, businessCycleSettings.defaults, businessCycleSettings.defaults)
    const g = buildBusinessCycle(s)
    expect(g.wave.turns.map((t) => t.kind)).toEqual(['peak', 'trough', 'peak'])
    const t = g.figure.panels[0].labels.map((l) => l.runs?.map((r) => r.text).join(''))
    for (const term of ['Contraction', 'Recession', 'Trough', 'Recovery', 'Expansion', 'Long-run trend']) expect(t.filter((x) => x === term)).toHaveLength(1)
    expect(t.filter((x) => x === 'Peak')).toHaveLength(2)
    expect(g.notes).toEqual([])
  })

  it('keeps the wave and trend on the graph whatever the shape', () => {
    for (const start of STARTS) {
      for (const amplitude of [0.3, 1.5, 2.5]) {
        for (const trend of [0, 0.3, 0.6]) {
          const w = waveOf(businessCycleSettings.tidy({ ...businessCycleSettings.defaults, start, amplitude, trend, cycles: 4, irregularity: 1, seed: 5 }), SPAN)
          const ys = Array.from({ length: 101 }, (_, k) => w.y(0.4 + (13.8 * k) / 100))
          expect(Math.min(...ys)).toBeGreaterThanOrEqual(1.5 - 1e-9)
          expect(Math.max(...ys)).toBeLessThanOrEqual(8.7 + 1e-9)
        }
      }
    }
  })

  it('draws the same irregular wave for the same seed, and another for another seed', () => {
    const a = build({ irregularity: 0.6, seed: 4, cycles: 3 }).wave.turns
    const b = build({ irregularity: 0.6, seed: 4, cycles: 3 }).wave.turns
    const c = build({ irregularity: 0.6, seed: 5, cycles: 3 }).wave.turns
    expect(a).toEqual(b)
    expect(a.map((t) => t.x)).not.toEqual(c.map((t) => t.x))
    // Even waves don't change with the seed.
    expect(build({ seed: 4 }).wave.turns).toEqual(build({ seed: 5 }).wave.turns)
  })

  it('says when a steep trend leaves real GDP never falling', () => {
    const g = build({ trend: 0.6, amplitude: 0.3 })
    expect(g.wave.falls).toBe(false)
    expect(g.wave.turns).toEqual([])
    expect(g.notes[0]).toMatch(/never falls/)
  })

  it('shades each recession from its peak to its trough, each with some area', () => {
    const g = build({ shade: true, cycles: 3 })
    const p = g.figure.panels[0]
    const falls = g.wave.phases.filter((f) => !f.rising)
    expect(p.regions).toHaveLength(falls.length)
    for (const r of p.regions) expect(areaOf(r.poly)).toBeGreaterThan(0)
    const peaks = g.wave.turns.filter((t) => t.kind === 'peak')
    expect(falls[0].x0).toBeCloseTo(peaks[0].x, 9)
    expect(panel({ shade: false }).regions).toHaveLength(0)
  })

  it('names each phase once, or in every cycle when asked', () => {
    const once = texts({ cycles: 3 })
    expect(once.filter((t) => t === 'Expansion')).toHaveLength(1)
    expect(once.filter((t) => t === 'Contraction')).toHaveLength(1)
    const every = texts({ cycles: 2, every: true })
    expect(every.filter((t) => t === 'Contraction')).toHaveLength(2)
    // Each with an arrow to the wave.
    expect(panel({}).leaders).toHaveLength(2)
  })

  it('letters every label along the wave for a quiz, and keeps the answers', () => {
    const g = build({ style: 'letters', dots: true })
    const t = g.figure.panels[0].labels.map((l) => l.runs?.map((r) => r.text).join(''))
    expect(t).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'E']))
    expect(t).not.toContain('Peak')
    expect(g.answers.map((a) => `${a.letter} ${a.key}`)).toEqual(['A peakLabel', 'B contractionLabel', 'C troughLabel', 'D expansionLabel', 'E peakLabel'])
    expect(g.figure.panels[0].dots).toHaveLength(3)
  })

  it('draws every label as a blank line when asked', () => {
    const blanks = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'blank']))
    const labels = panel(blanks).labels.filter((l) => !(l.runs && ['Real GDP', 'Time'].includes(l.runs[0].text)))
    expect(labels.length).toBe(8)
    expect(labels.every((l) => l.blank)).toBe(true)
  })

  it('never overlaps two labels, in any setup or start', () => {
    for (const setup of SETUPS) {
      const s = settingsFor(setup, businessCycleSettings.defaults, businessCycleSettings.defaults)
      const g = buildBusinessCycle(s)
      expect([setup.id, overlaps(g.figure), g.notes]).toEqual([setup.id, [], []])
    }
    for (const start of STARTS) {
      for (const cycles of [1, 2, 2.5]) {
        const f = build({ start, cycles, recessionLabelMode: 'text', recoveryLabelMode: 'text', trendLabelMode: 'text' }).figure
        expect([start, cycles, overlaps(f)]).toEqual([start, cycles, []])
      }
    }
  })

  it('keeps a phase named once close to the wave on steep, narrow irregular cycles', () => {
    // Each of these once put Recession far under its trough, with a long arrow up to the wave.
    const g = build({ cycles: 3, irregularity: 0.6, seed: 17, shade: true, recessionLabelMode: 'text', recoveryLabelMode: 'text', trendLabelMode: 'text' })
    const p = g.figure.panels[0]
    const name = p.labels.find((l) => l.runs?.[0].text === 'Recession')!
    const arrow = p.leaders.reduce((a, b) => (Math.hypot(a.x1 - name.x, a.y1 - name.y) < Math.hypot(b.x1 - name.x, b.y1 - name.y) ? a : b))
    expect(Math.hypot(arrow.x2 - arrow.x1, arrow.y2 - arrow.y1)).toBeLessThan(50)
    expect(p.crowded).toBe(0)
  })

  it('leaves off a name with no clear place, and says which', () => {
    const g = build({ cycles: 4, every: true, ...ALL, labelSize: 'large' })
    expect(g.notes.join(' ')).toMatch(/no room to name .*in every cycle/)
    // Named once, a left-off name is listed by what it is.
    const once = build({ cycles: 4 })
    expect(texts({ cycles: 4 })).not.toContain('Contraction')
    expect(once.notes).toEqual(['There’s no room to name contraction clear of the other labels, so it’s left off. Use fewer cycles, fewer terms or smaller labels.'])
  })

  it('never crosses two arrows, or an arrow with the wave or the trend', () => {
    // Each of these once crossed Expansion's and Contraction's arrows, sent an
    // arrow across the wave or the trend, or ran one through another label.
    const cases: Partial<BusinessCycleSettings>[] = [
      { trend: 0, cycles: 4 }, { trend: 0, cycles: 4, shade: true }, { cycles: 3 }, { cycles: 3.5, start: 'trough' }, { trend: 0, cycles: 3 },
      { cycles: 4, ...ALL }, { cycles: 3, ...ALL }, { cycles: 3, labelSize: 'large', ...ALL }, { cycles: 3, every: true, ...ALL },
      { irregularity: 1, cycles: 2.5, seed: 3, every: true, ...ALL }, { trend: 0.5, cycles: 3, amplitude: 2, ...ALL }, { cycles: 4, every: true },
    ]
    for (const over of cases) {
      const g = build(over)
      const p = g.figure.panels[0]
      const { wave, trend } = linesOf(g)
      const arrows = p.leaders.map(shortOf)
      const crossings = arrows.flatMap((a, i) => [
        ...arrows.slice(i + 1).filter((b) => cross(a, b)).map(() => 'arrow'),
        ...wave.filter((w) => cross(a, w)).map(() => 'wave'),
        ...(cross(a, trend) ? ['trend'] : []),
      ])
      expect([over, crossings, overlaps(g.figure), p.crowded]).toEqual([over, [], [], 0])
    }
  })

  it('points each phase’s arrow at the wave clear of the trend', () => {
    // These once pointed Contraction from under the trend to where the wave crosses it.
    for (const over of [{ cycles: 3 }, { cycles: 3.5, start: 'trough' as const }, { trend: 0, cycles: 3 }, { cycles: 1, start: 'falling' as const }]) {
      const g = build(over)
      const p = g.figure.panels[0]
      const { trend } = linesOf(g)
      for (const l of p.leaders) {
        // How far the arrow's tip is from the trend, on the drawing.
        const len = Math.hypot(trend.x2 - trend.x1, trend.y2 - trend.y1)
        const off = Math.abs((trend.x2 - trend.x1) * (l.y2 - trend.y1) - (trend.y2 - trend.y1) * (l.x2 - trend.x1)) / len
        expect([over, off > 6]).toEqual([over, true])
        expect(Math.hypot(l.x2 - l.x1, l.y2 - l.y1)).toBeLessThan(70)
      }
    }
  })

  it('names a recovery only on a rise from a trough, and no phase when real GDP never falls', () => {
    for (const over of [{ cycles: 1, ...ALL }, { cycles: 1, irregularity: 1, seed: 99, ...ALL }, { cycles: 1, start: 'peak' as const, ...ALL }]) {
      const g = build(over)
      const p = g.figure.panels[0]
      const trough = g.wave.turns.find((t) => t.kind === 'trough')!
      const recovery = p.labels.find((l) => l.runs?.[0].text === 'Recovery')!
      // Its arrow is the one starting nearest its words, and points after the trough.
      const arrow = p.leaders.reduce((a, b) => (Math.hypot(a.x1 - recovery.x, a.y1 - recovery.y) < Math.hypot(b.x1 - recovery.x, b.y1 - recovery.y) ? a : b))
      expect(arrow.x2).toBeGreaterThan(p.px(trough).x)
    }
    const flat = build({ trend: 0.6, amplitude: 0.8, ...ALL })
    expect(flat.wave.falls).toBe(false)
    expect(texts({ trend: 0.6, amplitude: 0.8, ...ALL }).filter((t) => ['Expansion', 'Contraction', 'Recession', 'Recovery'].includes(t))).toEqual([])
  })

  it('names contraction and recession on the same fall, one from above and one from below', () => {
    const g = buildBusinessCycle(settingsFor(SETUPS.find((x) => x.id === 'one-cycle')!, businessCycleSettings.defaults, businessCycleSettings.defaults))
    const p = g.figure.panels[0]
    const [peak, trough] = g.wave.turns.map((t) => p.px(t))
    for (const [name, above] of [['Contraction', true], ['Recession', false]] as const) {
      const words = p.labels.find((l) => l.runs?.[0].text === name)!
      const arrow = p.leaders.reduce((a, b) => (Math.hypot(a.x1 - words.x, a.y1 - words.y) < Math.hypot(b.x1 - words.x, b.y1 - words.y) ? a : b))
      expect(arrow.x2).toBeGreaterThan(peak.x)
      expect(arrow.x2).toBeLessThan(trough.x)
      expect(arrow.y1 < arrow.y2).toBe(above)
    }
  })

  it('never writes a name over or under a peak’s or trough’s as if one label, or past the end of the time axis', () => {
    // Each of these once read as one label (Trough / Long-run trend, a blank
    // line over a peak's) or ran a name past the axis's end.
    const blanks = { peakLabelMode: 'blank', troughLabelMode: 'blank', expansionLabelMode: 'blank', contractionLabelMode: 'blank' } as const
    for (const over of [{ cycles: 2, ...ALL }, { cycles: 2.5, every: true, dots: true, ...blanks }, { labelSize: 'large' as const, ...ALL }, { cycles: 2, every: true }]) {
      const g = build(over)
      const p = g.figure.panels[0]
      expect([over, stackedPairs(g.figure, p.labelFs)]).toEqual([over, []])
      const past = labelBoxes(g.figure).filter((b) => b.text !== 'Time' && b.x1 > p.xAxis.x2)
      expect([over, past]).toEqual([over, []])
    }
  })

  it('keeps a rise’s name out of the recession bands, and the hatching off the lines in black and white', () => {
    for (const ink of ['color', 'bw'] as const) {
      const g = build({ cycles: 3, irregularity: 0.6, seed: 8, shade: true, ink, ...ALL })
      const p = g.figure.panels[0]
      const bands = g.wave.phases.filter((f) => !f.rising).map((f) => [p.px({ x: f.x0, y: 0 }).x, p.px({ x: f.x1, y: 0 }).x])
      for (const b of labelBoxes(g.figure).filter((b) => b.text === 'Expansion' || b.text === 'Recovery')) {
        const inBands = bands.reduce((sum, [x0, x1]) => sum + Math.max(0, Math.min(b.x1, x1) - Math.max(b.x0, x0)), 0)
        expect(inBands / (b.x1 - b.x0)).toBeLessThan(0.6)
      }
      // White under the wave, the trend and the arrows, over the hatching, in black and white only.
      expect(p.curves.filter((c) => c.color === '#fff').length).toBe(ink === 'bw' ? 3 : 0)
    }
  })

  it('joins irregular swings without corners, the wave turning as sharply either side of each join', () => {
    const w = waveOf({ cycles: 3, start: 'rising', amplitude: 1.5, trend: 0.3, irregularity: 1, seed: 1 }, SPAN)
    const h = 0.002
    const bend = (x: number) => (w.y(x + h) - 2 * w.y(x) + w.y(x - h)) / h ** 2
    const xs = Array.from({ length: 2000 }, (_, k) => SPAN.x0 + 0.05 + ((SPAN.x1 - SPAN.x0 - 0.1) * k) / 1999)
    const bends = xs.map(bend)
    const most = Math.max(...bends.map(Math.abs))
    const jump = Math.max(...bends.slice(1).map((b, k) => Math.abs(b - bends[k])))
    expect(jump / most).toBeLessThan(0.05)
  })

  it('counts only the peaks and troughs it names in its words for screen readers', () => {
    const g = build({ cycles: 3.5, start: 'trough' })
    const t = g.figure.panels[0].labels.map((l) => l.runs?.map((r) => r.text).join(''))
    const peaks = t.filter((x) => x === 'Peak').length
    const troughs = t.filter((x) => x === 'Trough').length
    expect(g.label).toContain(`${peaks} peaks and ${troughs} troughs`)
  })

  it('swings at least far enough to fall into a cycle at the default trend', () => {
    const s = businessCycleSettings.tidy({ ...businessCycleSettings.defaults, amplitude: 0.3 })
    expect(s.amplitude).toBe(0.5)
    expect(build({ amplitude: 0.5 }).wave.turns.length).toBeGreaterThanOrEqual(2)
  })

  it('keeps the defaults out of the address, and reads back what it wrote', () => {
    expect(businessCycleSettings.toQuery(businessCycleSettings.defaults)).toBe('')
    const s = businessCycleSettings.tidy({
      ...businessCycleSettings.defaults, cycles: 2.5, start: 'peak', irregularity: 0.4, seed: 1234, style: 'letters', shade: true, trendLabel: 'Potential GDP', trendLabelMode: 'text',
    })
    expect(businessCycleSettings.fromParams(new URLSearchParams(businessCycleSettings.toQuery(s)))).toEqual(s)
    // Cycles come in halves.
    expect(businessCycleSettings.fromParams(new URLSearchParams('cycles=2.3')).cycles).toBe(2.5)
  })

  it('ignores numbered axes in an address, the graph being only ever schematic', () => {
    const s = businessCycleSettings.fromParams(new URLSearchParams('look=numeric&gridlines=0&xTo=30&yStep=2&xEvery=2&minor=4&xStartCap=arrow'))
    expect(s).toEqual(businessCycleSettings.defaults)
    expect(businessCycleSettings.toQuery(s)).toBe('')
    expect(businessCycleSettings.keyOf(businessCycleSettings.tidy({ ...s, look: 'numeric' }))).toBe(businessCycleSettings.keyOf(businessCycleSettings.defaults))
  })
})
