// Enzyme Activity's settings, as they appear in the page address. Each of
// the three curves has an enzyme, a name for the key (empty for the one this
// page gives it), an optimum and width of its own for an unknown enzyme,
// and, against substrate concentration, an inhibitor. The axes are a
// $shared/graph grid, shape only (no numbers, fitted to the curves) or
// numbered, fitted or typed as Photosynthesis Rate's are, the rate in
// arbitrary units or as a percentage of the fastest.

import { TITLE_MODES, gridFields } from '$shared/graph/axes'
import { bool, choice, defineSettings, number, text, type Field } from '$shared/settings'
import { ENZYME_IDS } from './enzymes'
import { INHIBITORS } from './model'

/** What the rate is graphed against. */
export const GRAPHS = ['temperature', 'ph', 'substrate'] as const
export type Graph = (typeof GRAPHS)[number]
export const GRAPH_NAMES: Record<Graph, string> = { temperature: 'Temperature', ph: 'pH', substrate: 'Substrate concentration' }

export const INHIBITOR_NAMES = { none: 'No inhibitor', competitive: 'Competitive inhibitor', noncompetitive: 'Non-competitive inhibitor' }

/** Shape only, with no numbers on the axes, or numbered. */
export const AXES = ['shape', 'numbered'] as const
export type Axes = (typeof AXES)[number]

/** On numbered axes, the rate in arbitrary units, 10 at its fastest, or as a percentage of the fastest. */
export const RATE_UNITS = ['au', 'percent'] as const
export type RateUnit = (typeof RATE_UNITS)[number]

/** The most curves on one graph. */
export const CURVES = [0, 1, 2] as const
export type CurveIndex = (typeof CURVES)[number]

/**
 * The axis titles this page writes for each graph, which it swaps when the
 * graph, axes or units change: numbered, substrate concentration is in
 * arbitrary units, and the rate in those or as a percentage of the fastest.
 */
export function autoTitles({ graph, axes, rateUnit }: { graph: Graph; axes: Axes; rateUnit: RateUnit }) {
  const au = axes === 'numbered' ? ' (arbitrary units)' : ''
  const rate = axes === 'numbered' && rateUnit === 'percent' ? ' (% of maximum)' : au
  return {
    xTitle: graph === 'temperature' ? 'Temperature (°C)' : graph === 'ph' ? 'pH' : `Substrate concentration${au}`,
    yTitle: `Rate of reaction${rate}`,
  }
}

/** The axis titles to write after a change: each still the one this page wrote before becomes the one it writes now. */
export function retitled(before: Parameters<typeof autoTitles>[0] & { xTitle: string; yTitle: string }, after: Parameters<typeof autoTitles>[0]) {
  const was = autoTitles(before)
  const now = autoTitles(after)
  const out: { xTitle?: string; yTitle?: string } = {}
  for (const key of ['xTitle', 'yTitle'] as const) if (before[key].trim() === was[key]) out[key] = now[key]
  return out
}

const TITLES = autoTitles({ graph: 'temperature', axes: 'shape', rateUnit: 'au' })
const label = (words: string, mode: (typeof TITLE_MODES)[number] = 'text') => ({ words: text(words, 40), mode: choice(TITLE_MODES, mode) })
const labels = <K extends string>(defaults: Record<K, string>) =>
  Object.fromEntries(
    Object.entries(defaults).flatMap(([k, v]) => {
      const l = label(v as string)
      return [[k, l.words], [`${k}Mode`, l.mode]]
    }),
  ) as Record<K, Field<string>> & Record<`${K}Mode`, Field<(typeof TITLE_MODES)[number]>>

/** One curve's fields, numbered from 1 in the address: enzyme1, show1… */
function curve<N extends 1 | 2 | 3>(n: N, d: { show: boolean; enzyme: string; inhibitor: (typeof INHIBITORS)[number] }) {
  return {
    [`show${n}`]: bool(d.show),
    [`enzyme${n}`]: choice(ENZYME_IDS, d.enzyme),
    /** its name in the key; empty for the enzyme's or inhibitor's own */
    [`name${n}`]: text('', 40),
    /** an unknown enzyme's optimum and width, against temperature (°C) and pH */
    [`tOpt${n}`]: number({ min: 0, max: 110, fallback: 40 }),
    [`tWidth${n}`]: number({ min: 2, max: 40, fallback: 10 }),
    [`pOpt${n}`]: number({ min: 0, max: 14, fallback: 7 }),
    [`pWidth${n}`]: number({ min: 0.5, max: 7, fallback: 3 }),
    [`inhibitor${n}`]: choice(INHIBITORS, d.inhibitor),
  } as Record<`show${N}`, Field<boolean>> &
    Record<`enzyme${N}`, Field<string>> &
    Record<`name${N}`, Field<string>> &
    Record<`tOpt${N}` | `tWidth${N}` | `pOpt${N}` | `pWidth${N}`, Field<number>> &
    Record<`inhibitor${N}`, Field<(typeof INHIBITORS)[number]>>
}

export const enzymeSettings = defineSettings({
  graph: choice(GRAPHS, 'temperature'),
  // The second and third curves start as the comparisons teachers make
  // most: a thermophile's enzyme, and the two kinds of inhibitor.
  ...curve(1, { show: true, enzyme: 'human', inhibitor: 'none' }),
  ...curve(2, { show: false, enzyme: 'taq', inhibitor: 'competitive' }),
  ...curve(3, { show: false, enzyme: 'pepsin', inhibitor: 'noncompetitive' }),
  /** against substrate concentration, Km on an x-axis running 0 to 10 */
  km: number({ min: 0.2, max: 5, fallback: 1 }),
  /** how much an inhibitor raises Km or lowers Vmax: 1 + [I]/Ki */
  strength: number({ min: 1.2, max: 10, fallback: 2.5 }),

  markOpt: bool(true),
  markDen: bool(false),
  markVmax: bool(true),
  markKm: bool(false),
  ...labels({ optLabel: 'Optimum', denLabel: 'Denatured', vmaxLabel: 'Vmax', halfLabel: '½Vmax', kmLabel: 'Km' }),

  color: bool(true),
  gridlines: bool(false),
  axes: choice(AXES, 'shape'),
  rateUnit: choice(RATE_UNITS, 'au'),
  /** fit each axis to the curves, rather than use the range typed */
  xFit: bool(true),
  yFit: bool(true),
  ...gridFields({
    xFrom: '0', xTo: '60', xStep: '5', xEvery: 1,
    yFrom: '0', yTo: '12', yStep: '1', yEvery: 1,
    title: '', titleMode: 'none',
    xTitle: TITLES.xTitle, xTitleMode: 'text',
    yTitle: TITLES.yTitle, yTitleMode: 'text',
    xLabel: '', xLabelMode: 'none', yLabel: '', yLabelMode: 'none',
    xStartCap: 'none', xEndCap: 'none', yStartCap: 'none', yEndCap: 'none',
    minor: 0,
  }),
})

export type EnzymeSettings = typeof enzymeSettings.defaults

/** One curve's settings, by its index (0 to 2). */
export function curveOf(s: EnzymeSettings, i: CurveIndex) {
  const n = (i + 1) as 1 | 2 | 3
  return {
    show: s[`show${n}`],
    enzyme: s[`enzyme${n}`],
    name: s[`name${n}`],
    tOpt: s[`tOpt${n}`],
    tWidth: s[`tWidth${n}`],
    pOpt: s[`pOpt${n}`],
    pWidth: s[`pWidth${n}`],
    inhibitor: s[`inhibitor${n}`],
  }
}

export type CurveSettings = ReturnType<typeof curveOf>
