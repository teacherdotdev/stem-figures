// Business Cycle's settings, as they appear in the page address: the wave's
// shape (how many cycles, where it starts, how big its swings are, how
// steep the trend, how irregular, and the seed that varies it), which terms
// are labeled and whether in words or letters for a quiz, the recession
// bands and dots at the turning points, and every label's words.

import { bool, choice, defineSettings, number } from '$shared/settings'
import { labels, lookFields } from '$lib/graph/settings'
import { STARTS } from './model'

/** Labels in words, or letters A, B, C… along the wave for a quiz. */
export const STYLES = ['words', 'letters'] as const
export type Style = (typeof STYLES)[number]
export const STYLE_NAMES: Record<Style, string> = { words: 'Words', letters: 'Letters A, B, C…' }

/** How many cycles the wave runs, peak to peak: 1 to 4, in halves. */
export const CYCLES = [1, 1.5, 2, 2.5, 3, 3.5, 4] as const

export const MAX_SEED = 999999

export const businessCycleSettings = defineSettings(
  {
    cycles: number({ min: 1, max: 4, fallback: 1.5 }),
    start: choice(STARTS, 'rising'),
    /** how far real GDP swings above and below the trend, in the graph's units */
    amplitude: number({ min: 0.3, max: 2.5, fallback: 1.5 }),
    /** how steeply the trend rises: the graph's units up for each across */
    trend: number({ min: 0, max: 0.6, fallback: 0.3 }),
    /** 0 for even cycles, up to 1 for heights and lengths that vary the most */
    irregularity: number({ min: 0, max: 1, fallback: 0 }),
    seed: number({ min: 1, max: MAX_SEED, fallback: 1 }),

    style: choice(STYLES, 'words'),
    /** label each phase in every cycle, rather than once */
    every: bool(false),
    dots: bool(false),
    shade: bool(false),
    ...labels({
      peakLabel: 'Peak',
      troughLabel: 'Trough',
      expansionLabel: 'Expansion',
      contractionLabel: 'Contraction',
      recessionLabel: ['Recession', 'none'],
      recoveryLabel: ['Recovery', 'none'],
      trendLabel: ['Long-run trend', 'none'],
    }),
    ...lookFields({
      xTitle: 'Time', yTitle: 'Real GDP',
      range: { xFrom: '0', xTo: '15', xStep: '1', yFrom: '0', yTo: '10', yStep: '1' },
    }),
  },
  (s) => ({ ...s, cycles: Math.round(s.cycles * 2) / 2, seed: Math.round(s.seed) }),
)

export type BusinessCycleSettings = typeof businessCycleSettings.defaults

/** The label keys, in the order they're listed. */
export const LABEL_KEYS = ['peakLabel', 'troughLabel', 'expansionLabel', 'contractionLabel', 'recessionLabel', 'recoveryLabel', 'trendLabel'] as const
export type LabelKey = (typeof LABEL_KEYS)[number]
export const LABEL_NAMES: Record<LabelKey, string> = {
  peakLabel: 'Peaks',
  troughLabel: 'Troughs',
  expansionLabel: 'Expansion',
  contractionLabel: 'Contraction',
  recessionLabel: 'Recession',
  recoveryLabel: 'Recovery',
  trendLabel: 'Trend line',
}

/** A new seed for the irregular cycles, not the one there is. */
export const newSeed = (old: number) => {
  const seed = 1 + Math.floor(Math.random() * MAX_SEED)
  return seed === old ? (seed % MAX_SEED) + 1 : seed
}
