// Works out a business cycle graph from its settings, as a panel for the
// econ graph library to lay out: real GDP's wave around a dashed long-run
// trend, its peaks and troughs named over and under them, the phases
// (expansion, contraction, recession, recovery) named with arrows to the
// wave, recessions shaded from peak to trough, and every label in words or
// as letters along the wave for a quiz.

import type { Axes } from '$shared/graph/axes'
import { plainOf } from '$shared/graph/runs'
import { graphOf } from '$lib/graph/curves'
import { buildFigure } from '$lib/graph/figure'
import { inks, type CalloutSpec, type CurveSpec, type PointSpec, type RegionSpec, type Words } from '$lib/graph/panel'
import { panelBase, wordsOf } from '$lib/graph/settings'
import { waveOf, type Phase } from './model'
import type { BusinessCycleSettings, LabelKey } from './settings'

/** The hidden grid the graph is drawn on: wider than tall, as time runs on. */
export const AXES: Axes = {
  x: { start: 0, step: 1, blocks: 15, numbering: 'decimal' },
  y: { start: 0, step: 1, blocks: 10, numbering: 'decimal' },
}
/** Where the wave runs across the graph, and the trend under it. */
const WAVE = { x0: 0.4, x1: 14.2 }
const TREND = { x0: 0, x1: 14.8 }
/** How high up the graph the wave and trend fit, leaving room for names over the peaks and under the troughs. */
const FIT = { lo: 1.5, hi: 8.7 }

/**
 * Where along a rise or a fall (by time, from its start) each phase's arrow
 * points, and whether its name sits over the wave (near a peak) or under it
 * (near a trough).
 */
const PHASE_AT: Record<'expansionLabel' | 'recoveryLabel' | 'contractionLabel' | 'recessionLabel', { rising: boolean; at: number; over: boolean }> = {
  recoveryLabel: { rising: true, at: 0.3, over: false },
  expansionLabel: { rising: true, at: 0.7, over: true },
  contractionLabel: { rising: false, at: 0.3, over: true },
  recessionLabel: { rising: false, at: 0.7, over: false },
}
type PhaseKey = keyof typeof PHASE_AT

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function buildBusinessCycle(s: BusinessCycleSettings) {
  const ink = inks(s.ink === 'bw')
  const wave = waveOf(s, { ...WAVE, ...FIT, trendFrom: TREND.x0, trendTo: TREND.x1 })
  const notes: string[] = []
  if (!wave.falls) notes.push('With the trend this steep and the swings this small, real GDP never falls: there are no peaks, troughs or contractions. Make the swings bigger or the trend flatter.')

  // Everything labeled, in order along the wave, so a quiz's letters run left to right.
  type Item = { x: number; key: LabelKey; name: Words; place: (name: Words) => void }
  const items: Item[] = []
  const word = (key: LabelKey) => wordsOf(s, key)
  const shown = (key: LabelKey) => s[`${key}Mode`] !== 'none'

  const points: PointSpec[] = []
  for (const t of wave.turns) {
    const key = t.kind === 'peak' ? 'peakLabel' : 'troughLabel'
    const point: PointSpec = { at: t, dot: s.dots, side: t.kind === 'peak' ? 'above' : 'below' }
    points.push(point)
    if (shown(key)) items.push({ x: t.x, key, name: word(key), place: (name) => (point.name = name) })
  }

  const callouts: CalloutSpec[] = []
  for (const key of Object.keys(PHASE_AT) as PhaseKey[]) {
    if (!shown(key)) continue
    const { rising, at, over } = PHASE_AT[key]
    const phases = wave.phases.filter((p) => p.rising === rising)
    for (const phase of phasesFor(phases, s.every)) {
      const x = anchorOf(phase, at, wave.phases, !s.every)
      if (x === null) continue
      // Out from the wave, square to it; a little nearer the middle of the stretch, or further from it, if there's no room.
      const onWave = (x: number) => {
        const slope = (wave.y(x + 0.01) - wave.y(x - 0.01)) / 0.02
        return { at: { x, y: wave.y(x) }, toward: over ? { x: -slope, y: 1 } : { x: slope, y: -1 } }
      }
      const span = phase.x1 - phase.x0
      const inward = at < 0.5 ? 1 : -1
      const or = [0.08, -0.08, 0.15]
        .map((d) => x + inward * d * span)
        .filter((t) => t > phase.x0 + span * 0.1 && t < phase.x1 - span * 0.1)
        .map(onWave)
      const callout: CalloutSpec = { ...onWave(x), name: word(key), or }
      callouts.push(callout)
      items.push({ x, key, name: word(key), place: (name) => (callout.name = name) })
    }
  }

  const trend: CurveSpec = { pts: [{ x: TREND.x0, y: wave.trend(TREND.x0) }, { x: TREND.x1, y: wave.trend(TREND.x1) }], color: ink.black, dash: '9 6', width: 2 }
  // The trend's name, with an arrow to it late on where the wave is furthest
  // from it (or, if there's no room there, the next furthest), on the far side from the wave.
  if (shown('trendLabel')) {
    const gap = (t: number) => Math.abs(wave.y(t) - wave.trend(t))
    const spots: number[] = []
    for (let t = WAVE.x1 - 0.4; t >= WAVE.x1 - 6; t -= 0.1) spots.push(t)
    spots.sort((a, b) => gap(b) - gap(a))
    const picks: number[] = []
    for (const t of spots) if (picks.length < 6 && picks.every((u) => Math.abs(u - t) > 0.6)) picks.push(t)
    const rise = wave.trend(1) - wave.trend(0)
    const onTrend = (t: number) => ({ at: { x: t, y: wave.trend(t) }, toward: wave.y(t) > wave.trend(t) ? { x: rise, y: -1 } : { x: -rise, y: 1 } })
    const x = picks[0]
    const callout: CalloutSpec = { ...onTrend(x), name: word('trendLabel'), or: picks.slice(1).map(onTrend) }
    callouts.push(callout)
    items.push({ x, key: 'trendLabel', name: word('trendLabel'), place: (name) => (callout.name = name) })
  }

  // Written labels become letters for a quiz; blank lines stay blank.
  items.sort((a, b) => a.x - b.x)
  let letter = 0
  const answers: { letter: string; key: LabelKey }[] = []
  for (const item of items) {
    if (s.style === 'letters' && item.name.mode === 'text') {
      const l = LETTERS[letter++ % LETTERS.length]
      answers.push({ letter: l, key: item.key })
      item.place({ text: l, mode: 'text' })
    } else item.place(item.name)
  }

  // Recessions shaded, from each peak down to the trough after it.
  const regions: RegionSpec[] = []
  if (s.shade) {
    for (const p of wave.phases.filter((p) => !p.rising)) {
      regions.push({ poly: [{ x: p.x0, y: 0 }, { x: p.x1, y: 0 }, { x: p.x1, y: 10 }, { x: p.x0, y: 10 }], color: ink.region.gray, hatch: 45 })
    }
  }

  const gdp: CurveSpec = { pts: graphOf(wave.y, WAVE.x0, WAVE.x1, 400), color: ink.demand }

  const spec = {
    ...panelBase({ ...s, look: 'schematic' }, AXES),
    regions,
    curves: [trend, gdp],
    points,
    callouts,
  }

  const figure = buildFigure([spec])
  if (figure.panels[0].crowded) {
    notes.push(s.every ? 'Some labels are crowded. Name each phase once, or use fewer cycles, fewer terms or smaller labels.' : 'Some labels are crowded. Use fewer cycles, fewer terms or smaller labels.')
  }

  return {
    figure,
    wave,
    notes,
    /** each letter on a quiz and the term it stands for */
    answers,
    label: labelOf(s, wave.turns.filter((t) => t.kind === 'peak').length, wave.turns.filter((t) => t.kind === 'trough').length),
  }
}

export type BusinessCycleFigure = ReturnType<typeof buildBusinessCycle>

/**
 * The rises (or falls) a phase is named on: every one long enough to hold
 * a label, or just one, the longest that runs from turn to turn (the first
 * of any about as long), else the longest there is.
 */
function phasesFor(phases: Phase[], every: boolean): Phase[] {
  if (!phases.length) return []
  const length = (p: Phase) => p.x1 - p.x0
  const longest = Math.max(...phases.map(length))
  if (every) return phases.filter((p) => length(p) >= longest * 0.4)
  const whole = phases.filter((p) => p.whole)
  const pick = whole.length ? whole : phases
  const most = Math.max(...pick.map(length))
  return [pick.find((p) => length(p) >= most * 0.95)!]
}

/**
 * Where on a rise or fall a phase's arrow points: `at` of the way along it.
 * A stretch cut off by the graph's edge is measured as if it were a whole
 * one, from the turn it has, so the arrow lands where it would on a whole
 * one; if that's off the graph it's left out, or (`clamp`) kept on the part
 * there is.
 */
function anchorOf(phase: Phase, at: number, all: Phase[], clamp: boolean): number | null {
  const span = phase.x1 - phase.x0
  if (phase.whole) return phase.x0 + span * at
  const whole = all.filter((p) => p.whole).map((p) => p.x1 - p.x0)
  const full = whole.length ? whole.reduce((a, b) => a + b, 0) / whole.length : span
  if (full <= span) return phase.x0 + span * at
  const first = all[0] === phase
  // Cut off at the left, it ends at a turn; cut off at the right, it starts at one.
  let x = first && all.length > 1 ? phase.x1 - full * (1 - at) : phase.x0 + full * at
  const lo = phase.x0 + span * 0.15
  const hi = phase.x1 - span * 0.15
  if (x < lo || x > hi) {
    if (!clamp) return null
    x = Math.max(lo, Math.min(hi, x))
  }
  return x
}

/** The figure in words, for screen readers. */
function labelOf(s: BusinessCycleSettings, peaks: number, troughs: number) {
  if (s.titleMode === 'text' && s.title.trim()) return plainOf(s.title.trim())
  const trend = s.trend > 0 ? 'a rising long-run trend' : 'a flat long-run trend'
  const turns = [peaks && `${peaks} ${peaks === 1 ? 'peak' : 'peaks'}`, troughs && `${troughs} ${troughs === 1 ? 'trough' : 'troughs'}`].filter(Boolean)
  const parts = [`real GDP rises and falls around ${trend}`]
  if (turns.length) parts.push(`with ${turns.join(' and ')}`)
  if (s.shade) parts.push('recessions shaded')
  if (s.style === 'letters') parts.push('points lettered for a quiz')
  return `Business cycle graph: ${parts.join(', ')}`
}
