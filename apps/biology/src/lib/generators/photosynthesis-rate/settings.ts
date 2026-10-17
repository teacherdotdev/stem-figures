// Photosynthesis Rate's settings, as they appear in the page address. Each
// of the three curves has the light intensity, CO₂ concentration and
// temperature it's drawn at (each graph uses the two it isn't against) and
// a name for the key (empty for the one this page gives it). The axes are a
// $shared/graph grid, shape only (no numbers, fitted to the curves) or
// numbered, fitted or typed as Predator–Prey Cycles' are; the right-hand
// axis, for O₂, is this generator's.

import { TITLE_MODES, gridFields } from '$shared/graph/axes'
import { bool, choice, defineSettings, number, text, type Field } from '$shared/settings'
import { AIR } from './model'

/**
 * What's graphed: the rate against light intensity, CO₂ concentration or
 * temperature; the CO₂ in a closed chamber over time, at up to three light
 * intensities; or the CO₂ and O₂ around one plant.
 */
export const GRAPHS = ['light', 'co2', 'temperature', 'chamber', 'gases'] as const
export type Graph = (typeof GRAPHS)[number]
export const GRAPH_NAMES: Record<Graph, string> = {
  light: 'Rate against light intensity',
  co2: 'Rate against CO₂ concentration',
  temperature: 'Rate against temperature',
  chamber: 'CO₂ in a closed chamber',
  gases: 'CO₂ and O₂ over time',
}
/** The graphs of a rate against a factor, rather than gases over time. */
export const isRate = (g: Graph) => g === 'light' || g === 'co2' || g === 'temperature'

/** The light graph's x-axis: the light intensity, or how far the plant is from the lamp. */
export const LIGHT_AXES = ['intensity', 'distance'] as const
export const CO2_UNITS = ['percent', 'ppm'] as const
export type Co2Unit = (typeof CO2_UNITS)[number]
/** The rate in arbitrary units, or as bubbles of O₂ counted from pondweed. */
export const RATE_UNITS = ['au', 'bubbles'] as const
/** Gross photosynthesis, or net: less respiration, as gas exchange measures it. */
export const RATES = ['gross', 'net'] as const
/** Points measured off the curves: none, on the curves, or alone for students to draw the line. */
export const POINTS = ['none', 'on', 'only'] as const
export const POINT_NAMES = { none: 'None', on: 'On the curves', only: 'Points only' }
/** The two gases over time, or CO₂ against O₂. */
export const VIEWS = ['time', 'against'] as const
/** Shape only, with no numbers on the axes, or numbered. */
export const AXES = ['shape', 'numbered'] as const

/** The most curves on one graph. */
export const CURVES = [0, 1, 2] as const
export type CurveIndex = (typeof CURVES)[number]

/** How many bubbles a minute pondweed gives off at a rate of 1. */
export const BUBBLES = 4

/** A CO₂ concentration in the unit shown, from %. */
export const co2In = (c: number, unit: Co2Unit) => (unit === 'ppm' ? Math.round(c * 10_000 * 1e6) / 1e6 : c)
export const CO2_UNIT_TEXT: Record<Co2Unit, string> = { percent: '%', ppm: 'ppm' }

/** The titles this page writes for these settings, which it swaps when they change unless the teacher typed their own. */
export function autoTitles(s: {
  graph: Graph; view: (typeof VIEWS)[number]; lightAxis: (typeof LIGHT_AXES)[number]; co2Unit: Co2Unit
  rateUnit: (typeof RATE_UNITS)[number]; rate: (typeof RATES)[number]
}) {
  const co2 = `CO₂ concentration (${CO2_UNIT_TEXT[s.co2Unit]})`
  const rate = s.rateUnit === 'bubbles' ? 'Bubbles of oxygen per minute' : s.rate === 'net' ? 'Net rate of photosynthesis' : 'Rate of photosynthesis'
  if (s.graph === 'gases') {
    return s.view === 'against'
      ? { xTitle: co2, yTitle: 'O₂ concentration (%)', y2Title: 'O₂ concentration (%)' }
      : { xTitle: 'Time (minutes)', yTitle: co2, y2Title: 'O₂ concentration (%)' }
  }
  const xTitle =
    s.graph === 'light' ? (s.lightAxis === 'distance' ? 'Distance from lamp (cm)' : 'Light intensity')
    : s.graph === 'co2' ? co2
    : s.graph === 'temperature' ? 'Temperature (°C)'
    : 'Time (minutes)'
  return { xTitle, yTitle: s.graph === 'chamber' ? co2 : rate, y2Title: 'O₂ concentration (%)' }
}

type TitleKey = 'xTitle' | 'yTitle' | 'y2Title'
/**
 * The axis titles to write after a change from `before` to `after`: each
 * title still the one this page wrote for `before` becomes the one it
 * writes for `after`; a title the teacher typed stays.
 */
export function retitled(before: Parameters<typeof autoTitles>[0] & Record<TitleKey, string>, after: Parameters<typeof autoTitles>[0]) {
  const was = autoTitles(before)
  const now = autoTitles(after)
  const out: Partial<Record<TitleKey, string>> = {}
  for (const key of ['xTitle', 'yTitle', 'y2Title'] as const) if (before[key].trim() === was[key]) out[key] = now[key]
  return out
}

const DEFAULT_LOOK = { graph: 'light', view: 'time', lightAxis: 'intensity', co2Unit: 'percent', rateUnit: 'au', rate: 'gross' } as const
const TITLES = autoTitles(DEFAULT_LOOK)

const labels = <K extends string>(defaults: Record<K, string>) =>
  Object.fromEntries(
    Object.entries(defaults).flatMap(([k, v]) => [[k, text(v as string, 40)], [`${k}Mode`, choice(TITLE_MODES, 'text')]]),
  ) as Record<K, Field<string>> & Record<`${K}Mode`, Field<(typeof TITLE_MODES)[number]>>

/** One curve's fields, numbered from 1 in the address: light1, co21… */
function curve<N extends 1 | 2 | 3>(n: N, d: { show: boolean; light: number; co2: number; temp: number }) {
  return {
    [`show${n}`]: bool(d.show),
    /** its name in the key; empty for the one this page gives it */
    [`name${n}`]: text('', 40),
    /** light intensity, in arbitrary units */
    [`light${n}`]: number({ min: 0, max: 1000, fallback: d.light }),
    /** CO₂ concentration, in % */
    [`co2${n}`]: number({ min: 0.001, max: 5, fallback: d.co2 }),
    /** temperature, in °C */
    [`temp${n}`]: number({ min: 0, max: 60, fallback: d.temp }),
  } as Record<`show${N}`, Field<boolean>> & Record<`name${N}`, Field<string>> & Record<`light${N}` | `co2${N}` | `temp${N}`, Field<number>>
}

export const photosynthesisSettings = defineSettings(
  {
    graph: choice(GRAPHS, 'light'),
    // The classic exam graph: three curves, each with its own CO₂ and temperature.
    ...curve(1, { show: true, light: 60, co2: 0.1, temp: 25 }),
    ...curve(2, { show: true, light: 20, co2: 0.1, temp: 15 }),
    ...curve(3, { show: true, light: 40, co2: 0.04, temp: 15 }),
    lightAxis: choice(LIGHT_AXES, 'intensity'),
    co2Unit: choice(CO2_UNITS, 'percent'),
    rate: choice(RATES, 'gross'),
    rateUnit: choice(RATE_UNITS, 'au'),
    /** the closed chamber: the CO₂ it starts with (%), and how many minutes the graph shows */
    co2Start: number({ min: 0.005, max: 1, fallback: AIR.co2 }),
    minutes: number({ min: 1, max: 600, fallback: 60 }),
    /** the light goes off this many minutes in, with the dark shaded */
    lightsOff: bool(false),
    offAt: number({ min: 0, max: 600, fallback: 30 }),
    view: choice(VIEWS, 'time'),

    points: choice(POINTS, 'none'),
    /** about how far off each point is, in percent */
    noise: number({ min: 0, max: 30, fallback: 5 }),
    seed: number({ min: 1, max: 999_999, fallback: 1 }),

    markSat: bool(false),
    markLimit: bool(false),
    letters: bool(false),
    markOpt: bool(true),
    markComp: bool(true),
    // An empty limiting-factor label is written for the graph (see figure.ts).
    ...labels({ satLabel: 'Saturation point', lowLabel: '', highLabel: '', optLabel: 'Optimum', compLabel: 'Compensation point' }),

    color: bool(true),
    gridlines: bool(false),
    axes: choice(AXES, 'shape'),
    /** fit each axis to the curves, rather than use the range typed */
    xFit: bool(true),
    yFit: bool(true),
    /** the right-hand axis, for O₂; it has as many blocks as the left */
    y2From: text('20.95'),
    y2Step: text('0.005'),
    y2Title: text(TITLES.y2Title),
    y2TitleMode: choice(TITLE_MODES, 'text'),
    ...gridFields({
      xFrom: '0', xTo: '100', xStep: '10', xEvery: 1,
      yFrom: '0', yTo: '12', yStep: '1', yEvery: 1,
      title: '', titleMode: 'none',
      xTitle: TITLES.xTitle, xTitleMode: 'text',
      yTitle: TITLES.yTitle, yTitleMode: 'text',
      xLabel: '', xLabelMode: 'none', yLabel: '', yLabelMode: 'none',
      xStartCap: 'none', xEndCap: 'none', yStartCap: 'none', yEndCap: 'none',
      minor: 0,
    }),
  },
  (s) => ({ ...s, seed: Math.round(s.seed) }),
)

export type PhotosynthesisSettings = typeof photosynthesisSettings.defaults

/** One curve's settings, by its index (0 to 2). */
export function curveOf(s: PhotosynthesisSettings, i: CurveIndex) {
  const n = (i + 1) as 1 | 2 | 3
  return { show: s[`show${n}`], name: s[`name${n}`], light: s[`light${n}`], co2: s[`co2${n}`], temp: s[`temp${n}`] }
}

export type CurveSettings = ReturnType<typeof curveOf>
