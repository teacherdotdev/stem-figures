// What an example page says about its figure beyond the caption: the
// generator address that draws it and, where the generator works one out,
// its answer key, both from the generator's own code (its settings
// definition, answer line and sums), so they can't drift from the figure.
// Server-only, so example pages don't ship every generator to the browser.
//
// It also checks each example: a setting the generator doesn't take as
// written (a force past the scale, a misspelled choice) fails the build.

import { circuitAnswer } from '$lib/generators/circuit-diagram/circuit'
import { circuitSettings } from '$lib/generators/circuit-diagram/settings'
import { fbdSettings } from '$lib/generators/free-body-diagram/settings'
import { inclineSettings } from '$lib/generators/inclined-plane/settings'
import { motionOf, numberText, segmentLines, tangentAt } from '$lib/generators/motion-graphs/motion'
import { motionSettings, viewsOf } from '$lib/generators/motion-graphs/settings'
import { mapAnswer } from '$lib/generators/motion-map/map'
import { mapSettings } from '$lib/generators/motion-map/settings'
import { projectileSettings } from '$lib/generators/projectile-motion/settings'
import { pulleySettings } from '$lib/generators/pulley/settings'
import { answerLines as rayAnswer, raySettings } from '$lib/generators/ray-diagram/settings'
import { answerLines as springScaleAnswer, springScaleSettings } from '$lib/generators/spring-scale/settings'
import { resultantOf } from '$lib/generators/vector-diagram/vd'
import { vectorSettings } from '$lib/generators/vector-diagram/settings'
import { answerLines as waveAnswer, waveSettings } from '$lib/generators/waves/settings'
import type { Label } from '$lib/shared/label'
import type { SettingsDef } from '$lib/shared/settings'
import type { Example, ExampleGeneratorId, SettingsById } from './types'

export interface ExampleDetails {
  /** the generator page drawing this figure, e.g. "/spring-scale?force=6.25" */
  editPath: string
  /** the answer key's heading and lines, for a generator that works one out */
  answer: { heading: string; lines: string[] } | null
}

interface Definition<S> {
  defaults: S
  tidy(stored: unknown): S
  toQuery(s: S): string
  fromParams(params: URLSearchParams): S
  keyOf(s: S): string
}

type Answer<S> = (s: S) => ExampleDetails['answer']

/** A generator on Physics' own settings ($lib/shared/settings), read the way
 *  its page reads it (see $lib/shared/generator.svelte). */
const physics = <S,>(def: SettingsDef<S>): Definition<S> => ({
  defaults: def.defaults,
  tidy: def.clean,
  toQuery: def.toQuery,
  fromParams: def.fromParams,
  keyOf: def.toQuery,
})

/** Figures a generator draws but doesn't work out an answer for. */
const none = () => null

/** JSON with every object's keys sorted, so a setting compares alike however its example writes it. */
const canonical = (value: unknown) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  )

const round = (n: number, places: number) => String(Math.round(n * 10 ** places) / 10 ** places || 0).replace('-', '−')
const squares = (n: number) => `${round(n, 2)} square${n === 1 ? '' : 's'}`
const named = (l: Label, fallback: string) => (l.mode === 'text' && l.text ? l.text : fallback)

/** The resultant, as the generator shows it, and the components of every
 *  arrow drawn with them, in grid squares (right and up are positive). */
function vectorAnswer(s: SettingsById['vector-diagram']): ExampleDetails['answer'] {
  const parts = (magnitude: number, angle: number) => {
    const a = (angle * Math.PI) / 180
    return `x-component ${round(magnitude * Math.cos(a), 2)} and y-component ${round(magnitude * Math.sin(a), 2)} squares`
  }
  const out = s.vectors.map((v, i) => `${named(v.label, `Vector ${i + 1}`)}: ${squares(v.magnitude)} at ${v.angle}°${v.parts ? `; ${parts(v.magnitude, v.angle)}` : ''}`)
  const sum = resultantOf(s)
  if (s.vectors.length > 1) {
    out.push(
      sum.magnitude
        ? `Resultant ${named(s.resultantLabel, '')}: ${squares(sum.magnitude)} at ${round(sum.angle, 1)}°${s.resultantParts ? `; ${parts(sum.magnitude, sum.angle)}` : ''}`.replace('  ', ' ')
        : 'Resultant: zero (the vectors cancel)',
    )
  }
  return { heading: 'Answer key (angles counterclockwise from the right)', lines: out }
}

/** What each segment does, in numbers, and the tangent's slope where one is drawn. */
function motionAnswer(s: SettingsById['motion-graphs']): ExampleDetails['answer'] {
  const m = motionOf(s.segments, s.start)
  const lines = segmentLines(m)
  if (s.tangent && viewsOf(s).includes('x') && m.pieces.length) {
    const t = tangentAt(m, s.tangentAt)
    lines.push(`Tangent at ${numberText(t.t)} s: it touches at ${numberText(t.x)} m, and its slope, the instantaneous velocity, is ${numberText(t.slope)} m/s`)
  }
  return { heading: 'Answer key', lines }
}

const GENERATORS: { [G in ExampleGeneratorId]: { definition: Definition<SettingsById[G]>; answer: Answer<SettingsById[G]> } } = {
  'free-body-diagram': { definition: physics(fbdSettings), answer: none },
  'vector-diagram': { definition: physics(vectorSettings), answer: vectorAnswer },
  'inclined-plane': { definition: physics(inclineSettings), answer: none },
  'pulley': { definition: physics(pulleySettings), answer: none },
  'projectile-motion': { definition: physics(projectileSettings), answer: none },
  'motion-graphs': { definition: physics(motionSettings), answer: motionAnswer },
  'motion-map': { definition: physics(mapSettings), answer: (s) => ({ heading: 'Answer key', lines: mapAnswer(s) }) },
  'spring-scale': { definition: springScaleSettings, answer: (s) => ({ heading: 'Answer key', lines: springScaleAnswer(s).split('\n') }) },
  'waves': { definition: waveSettings, answer: (s) => ({ heading: 'Answer key', lines: waveAnswer(s) }) },
  'circuit-diagram': {
    definition: physics(circuitSettings),
    answer: (s) => {
      const lines = circuitAnswer(s)
      return lines && { heading: 'Answer key', lines }
    },
  },
  'ray-diagram': { definition: raySettings, answer: (s) => ({ heading: 'Answer key (real is positive)', lines: rayAnswer(s) }) },
}

function detailsOf<G extends ExampleGeneratorId>(generator: G, example: Example): ExampleDetails {
  const { definition, answer } = GENERATORS[generator]
  const s = definition.tidy({ ...definition.defaults, ...example.settings })
  // Every setting as written, or the figure isn't the one described.
  for (const [name, value] of Object.entries(example.settings)) {
    const kept = (s as Record<string, unknown>)[name]
    if (canonical(kept) !== canonical(value)) {
      throw new Error(`Example ${example.path}: ${name} is ${JSON.stringify(kept)}, not ${JSON.stringify(value)}`)
    }
  }
  const query = definition.toQuery(s)
  if (definition.keyOf(definition.fromParams(new URLSearchParams(query))) !== definition.keyOf(s)) {
    throw new Error(`Example ${example.path}: its address doesn't draw the same figure`)
  }
  return { editPath: `/${generator}${query ? `?${query}` : ''}`, answer: answer(s) }
}

export const exampleDetails = (example: Example) => detailsOf(example.generator, example)
