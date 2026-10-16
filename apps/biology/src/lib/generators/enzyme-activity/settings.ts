// Enzyme Activity's settings, as they appear in the page address. Each of
// the three curves has an enzyme, a name for the key (empty for the one this
// page gives it), an optimum and width of its own for an unknown enzyme,
// and, against substrate concentration, an inhibitor. The axes are a
// $shared/graph grid fitted to the curves, with no numbers: the graphs show
// shape only.

import { CAPS, type Cap } from '$shared/graph/caps'
import { MINOR, TITLE_MODES } from '$shared/graph/axes'
import { LABEL_SIZES, type LabelSize } from '$shared/labelSize'
import { bool, choice, defineSettings, number, text, type Field } from '$shared/settings'
import { ENZYME_IDS } from './enzymes'
import { INHIBITORS } from './model'

/** What the rate is graphed against. */
export const GRAPHS = ['temperature', 'ph', 'substrate'] as const
export type Graph = (typeof GRAPHS)[number]
export const GRAPH_NAMES: Record<Graph, string> = { temperature: 'Temperature', ph: 'pH', substrate: 'Substrate concentration' }

export const INHIBITOR_NAMES = { none: 'No inhibitor', competitive: 'Competitive inhibitor', noncompetitive: 'Non-competitive inhibitor' }

/** The most curves on one graph. */
export const CURVES = [0, 1, 2] as const
export type CurveIndex = (typeof CURVES)[number]

/** The axis titles this page writes for each graph, which it swaps when the graph changes. */
export function autoTitles(graph: Graph) {
  return {
    xTitle: graph === 'temperature' ? 'Temperature (°C)' : graph === 'ph' ? 'pH' : 'Substrate concentration',
    yTitle: 'Rate of reaction',
  }
}

const TITLES = autoTitles('temperature')

function numberChoice(options: readonly number[], fallback: number): Field<number> {
  const accept = (v: unknown) => (options.includes(Number(v)) && String(v).trim() !== '' ? Number(v) : undefined)
  return { fallback, accept, parse: accept, format: (v) => String(v) }
}
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

const cap = (v: Cap) => choice(Object.keys(CAPS) as Cap[], v)

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
  minor: numberChoice(MINOR, 0),
  xEndCap: cap('none'),
  yEndCap: cap('none'),
  title: text(''),
  titleMode: choice(TITLE_MODES, 'none'),
  xTitle: text(TITLES.xTitle),
  xTitleMode: choice(TITLE_MODES, 'text'),
  yTitle: text(TITLES.yTitle),
  yTitleMode: choice(TITLE_MODES, 'text'),
  labelSize: choice(Object.keys(LABEL_SIZES) as LabelSize[], 'medium'),
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
