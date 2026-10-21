// What an example page says about its figure beyond the caption: the
// generator address that draws it and, where the generator works one out,
// its values or answer key, both from the generator's own code (its
// settings definition and readout), so they can't drift from the figure.
// Server-only, so example pages don't ship every generator to the browser.
//
// It also checks each example: a setting the generator doesn't take as
// written (a misspelled choice, a value out of range) fails the build.

import { buildAdAs } from '$lib/generators/ad-as/figure'
import { adAsSettings } from '$lib/generators/ad-as/settings'
import { buildBusinessCycle } from '$lib/generators/business-cycle/figure'
import { LABEL_NAMES, businessCycleSettings } from '$lib/generators/business-cycle/settings'
import { costRevenueSettings } from '$lib/generators/cost-revenue-curves/settings'
import { moneyMarketsSettings } from '$lib/generators/money-markets/settings'
import { buildPhillips } from '$lib/generators/phillips-curve/figure'
import { phillipsSettings } from '$lib/generators/phillips-curve/settings'
import { buildPpc } from '$lib/generators/production-possibilities/figure'
import { ppcSettings } from '$lib/generators/production-possibilities/settings'
import { buildSupplyDemand } from '$lib/generators/supply-demand/figure'
import { supplyDemandSettings } from '$lib/generators/supply-demand/settings'
import type { Example, ExampleGeneratorId, SettingsById } from './types'

export interface ExampleDetails {
  /** the generator page drawing this figure, e.g. "/supply-demand?shift=demand" */
  editPath: string
  /** the values or answer key's heading and lines, for a generator that works them out */
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

/** Figures a generator draws but doesn't work out values for. */
const none = () => null

/** A numbered graph's values, as the settings panel's readout gives them. */
const values = (lines: string[]): ExampleDetails['answer'] => (lines.length ? { heading: 'Values', lines } : null)

/** JSON with every object's keys sorted, so a setting compares alike however its example writes it. */
const canonical = (value: unknown) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  )

/** Business Cycle's quiz letters and what each stands for, as its settings panel lists them. */
function businessCycleAnswer(s: SettingsById['business-cycle']): ExampleDetails['answer'] {
  const { answers } = buildBusinessCycle(s)
  return answers.length ? { heading: 'Answer key', lines: answers.map((a) => `${a.letter}: ${s[a.key] || LABEL_NAMES[a.key]}`) } : null
}

const GENERATORS: { [G in ExampleGeneratorId]: { definition: Definition<SettingsById[G]>; answer: Answer<SettingsById[G]> } } = {
  'supply-demand': { definition: supplyDemandSettings, answer: (s) => values(buildSupplyDemand(s).readout) },
  'ad-as': { definition: adAsSettings, answer: (s) => values(buildAdAs(s).readout) },
  'money-markets': { definition: moneyMarketsSettings, answer: none },
  'business-cycle': { definition: businessCycleSettings, answer: businessCycleAnswer },
  'production-possibilities': { definition: ppcSettings, answer: (s) => values(buildPpc(s).readout) },
  'phillips-curve': { definition: phillipsSettings, answer: (s) => values(buildPhillips(s).readout) },
  'cost-revenue-curves': { definition: costRevenueSettings, answer: none },
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
