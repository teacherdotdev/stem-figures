import { describe, expect, it } from 'vitest'
import { areaOf } from '$lib/graph/curves'
import { overlaps } from '$lib/graph/testing'
import { buildBusinessCycle } from './figure'
import { STARTS, waveOf } from './model'
import { CYCLES, LABEL_KEYS, businessCycleSettings, type BusinessCycleSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const build = (over: Partial<BusinessCycleSettings> = {}) => buildBusinessCycle(businessCycleSettings.tidy({ ...businessCycleSettings.defaults, ...over }))
const panel = (over: Partial<BusinessCycleSettings> = {}) => build(over).figure.panels[0]
const texts = (over: Partial<BusinessCycleSettings>) => panel(over).labels.map((l) => l.runs?.map((r) => r.text).join('') ?? '____')
const kinds = (over: Partial<BusinessCycleSettings>) => build(over).wave.turns.map((t) => t.kind)
const SPAN = { x0: 0.4, x1: 14.2, lo: 1.5, hi: 8.7 }

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
    expect(kinds({ start: 'peak', cycles: 1, trend: 0 })).toEqual(['trough'])
    expect(kinds({ start: 'trough', cycles: 1, trend: 0 })).toEqual(['peak'])
    expect(kinds({ start: 'falling', cycles: 1 })).toEqual(['trough', 'peak'])
    for (const cycles of CYCLES) expect(kinds({ cycles, start: 'rising' }).filter((k) => k === 'peak')).toHaveLength(Math.ceil(cycles))
  })

  it('keeps the wave and trend on the graph whatever the shape', () => {
    for (const start of STARTS) {
      for (const amplitude of [0.3, 1.5, 2.5]) {
        for (const trend of [0, 0.3, 0.6]) {
          const g = build({ start, amplitude, trend, cycles: 4, irregularity: 1, seed: 5 })
          const ys = Array.from({ length: 101 }, (_, k) => g.wave.y(0.4 + (13.8 * k) / 100))
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
    const every = texts({ cycles: 3, every: true })
    expect(every.filter((t) => t === 'Contraction').length).toBeGreaterThanOrEqual(3)
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

  it('says when naming every phase in every cycle is too crowded', () => {
    const all = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'text']))
    expect(build({ cycles: 4, every: true, ...all, labelSize: 'large' }).notes.join(' ')).toMatch(/crowded/)
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
})
