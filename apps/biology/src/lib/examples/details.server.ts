// What an example page says about its figure beyond the caption: the
// generator address that draws it and, where the generator works one out,
// its answer key, both from the generator's own code (its settings
// definition and answer lines), so they can't drift from the figure.
// Server-only, so example pages don't ship every generator to the browser.
//
// It also checks each example: a setting the generator doesn't take as
// written (a volume the pipette can't be set to, a misspelled choice) fails
// the build.

import { populationSettings } from '$lib/generators/population-growth/settings'
import { punnettSettings, readNames, squareOf } from '$lib/generators/punnett-square/settings'
import { genotypeLine, phenotypeLines, type SummaryLine } from '$lib/generators/punnett-square/summary'
import type { Run } from '$lib/generators/punnett-square/text'
import { answerText, pedigreeFigure } from '$lib/generators/pedigree/figure'
import { tellsMode, type Mode } from '$lib/generators/pedigree/genetics'
import { familyOf, pedigreeSettings } from '$lib/generators/pedigree/settings'
import { buildPredatorPrey, timeText } from '$lib/generators/predator-prey/figure'
import { pairNamed } from '$lib/generators/predator-prey/pairs'
import { predatorPreySettings } from '$lib/generators/predator-prey/settings'
import { answerItems as foodWebAnswer } from '$lib/generators/food-web/figure'
import { foodWebSettings } from '$lib/generators/food-web/settings'
import { readoutOf } from '$lib/generators/enzyme-activity/figure'
import { enzymeSettings } from '$lib/generators/enzyme-activity/settings'
import { answerLines as dnaAnswer } from '$lib/generators/dna-protein-synthesis/rows'
import { dnaSettings } from '$lib/generators/dna-protein-synthesis/settings'
import { readoutOf as photosynthesisReadout } from '$lib/generators/photosynthesis-rate/figure'
import { photosynthesisSettings } from '$lib/generators/photosynthesis-rate/settings'
import { answerLines as osmosisAnswer } from '$lib/generators/osmosis/figure'
import { osmosisSettings } from '$lib/generators/osmosis/settings'
import { answerLines as gelAnswer } from '$lib/generators/gel-electrophoresis/figure'
import { gelSettings } from '$lib/generators/gel-electrophoresis/settings'
import { answerLine as pipetteAnswerLine, pipetteSettings } from '$lib/generators/micropipette-reading/settings'
import type { Example, ExampleGeneratorId, SettingsById } from './types'

export interface ExampleDetails {
  /** the generator page drawing this figure, e.g. "/micropipette-reading?volume=154" */
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

/** Figures a generator draws but doesn't work out an answer for. */
const none = () => null

/** JSON with every object's keys sorted, so a setting compares alike however its example writes it. */
const canonical = (value: unknown) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  )

// Superscript letters, for alleles like Xᴮ and Iᴬ written in plain text.
// Unicode has none for C, F, Q, S, X, Y, Z or q; those keep a caret (C^F).
const SUPERSCRIPTS: Record<string, string> = Object.fromEntries(
  [...'ABDEGHIJKLMNOPRTUVW'].map((c, i) => [c, 'ᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ'[i]]).concat(
    [...'abcdefghijklmnoprstuvwxyz0123456789+-'].map((c, i) => [c, [...'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻'][i]]),
  ),
)
const superscript = (text: string) => ([...text].every((c) => c in SUPERSCRIPTS) ? [...text].map((c) => SUPERSCRIPTS[c]).join('') : `^${text}`)

/** A Punnett summary line as text with its superscripts, XᴮXᵇ (the generator's
 *  own plainLine runs them together, XBXb, for screen readers). */
const runsText = (runs: Run[]) => runs.map((r) => (r.style === 'sup' ? superscript(r.text) : r.text)).join('')
const summaryText = (line: SummaryLine) => `${line.heading} ${line.content.map(runsText).join(' ')}`

/** The genotype and phenotype lines the square prints under it (daughters and sons for an X-linked cross). */
function punnettSquareAnswer(s: SettingsById['punnett-square']): ExampleDetails['answer'] {
  const sq = squareOf(s)
  const summary = [genotypeLine(sq, s.form), ...phenotypeLines(sq, readNames(s.names), s.form)]
  return { heading: 'Answer key', lines: summary.map(summaryText) }
}

/** Pedigree's answer key: the inheritance mode, as its own answer key line
 *  prints it, and, when the figure has a genotype row, each person's genotype
 *  as the generator works it out (a blank, as in H_, where it can't be told),
 *  written with superscripts, XᴮXᵇ, where the figure has them. */
function pedigreeAnswer(s: SettingsById['pedigree']): ExampleDetails['answer'] {
  const mode = s.mode as Mode
  const family = familyOf(s)
  const carriersShown = s.carriers !== 'none'
  const fig = pedigreeFigure({ ...s, genotypes: 'answers' }, family)
  if (!fig.fits) throw new Error(`The pedigree example’s family can’t be ${answerText(mode)}`)
  if (!tellsMode(family, mode, carriersShown)) throw new Error(`Students can’t tell the pedigree example is ${answerText(mode)}`)
  const lines = [answerText(mode)]
  if (s.genotypes !== 'none') {
    // In the order the generator lists them: by generation, then left to right.
    const people = [...fig.layout.people].sort((a, b) => a.generation - b.generation || a.x - b.x)
    for (const g of [...new Set(people.map((p) => p.generation))]) {
      lines.push(
        people
          .filter((p) => p.generation === g)
          .map((p) => {
            const label = fig.labels.get(p.key)
            return `${p.name} ${label ? label.map((a) => a.text + (a.sup ? superscript(a.sup) : '')).join('') : 'can’t be told'}`
          })
          .join(', '),
      )
    }
  }
  return { heading: 'Answer key', lines }
}

/** The cycle as the settings panel's readout gives it: its period, the lag and, for smooth curves, each population's range. */
function predatorPreyAnswer(s: SettingsById['predator-prey']): ExampleDetails['answer'] {
  const r = buildPredatorPrey(s).readout
  if (r.still) throw new Error('The predator–prey example starts at the averages, so nothing cycles')
  const count = (v: number) => (v >= 100 ? String(Math.round(v)) : String(Number(v.toPrecision(3))))
  const prey = s.preyName.trim() || 'Prey'
  const predators = s.predatorName.trim() || 'Predators'
  const unit = pairNamed(s.preyName, s.predatorName)?.count
  const range = (name: string, e: { low: number; high: number }, average: number) =>
    `${name}${unit ? ` (${unit})` : ''}: ${count(e.low)} to ${count(e.high)}, averaging ${count(average)}`
  return {
    heading: 'Answer key',
    lines: [
      `Period: a cycle every ${timeText(r.period, s.units)}`,
      `Lag: the ${predators.toLowerCase()} peak ${timeText(r.lag, s.units)} after the ${prey.toLowerCase()}`,
      // A census's counts are scattered about the model, so only the curves' ranges can be read off exactly.
      ...(s.data === 'curves' ? [range(prey, r.prey, r.balance.prey), range(predators, r.predators, r.balance.predators)] : []),
    ],
  }
}

/** Where each enzyme works best and stops, or how each inhibitor changes Vmax and Km, as the settings panel's readout says. */
function enzymeActivityAnswer(s: SettingsById['enzyme-activity']): ExampleDetails['answer'] {
  const lines = readoutOf(s)
  return lines.length ? { heading: 'Answer key', lines } : null
}

/** DNA and Protein Synthesis's own answer key: every row written out in full and where each mistake is, or the chart's start and stop codons. */
function dnaProteinSynthesisAnswer(s: SettingsById['dna-protein-synthesis']): ExampleDetails['answer'] {
  return { heading: 'Answer key', lines: dnaAnswer(s) }
}

/** Where each curve levels off and what limits it, or what the CO₂ does in the chamber, as the settings panel's readout says. */
function photosynthesisRateAnswer(s: SettingsById['photosynthesis-rate']): ExampleDetails['answer'] {
  const lines = photosynthesisReadout(s)
  return lines.length ? { heading: 'Answer key', lines } : null
}

/** Gel Electrophoresis's own answer key lines: each sample lane's band sizes, and the ladder's when its sizes are blank. */
function gelElectrophoresisAnswer(s: SettingsById['gel-electrophoresis']): ExampleDetails['answer'] {
  const lines = gelAnswer(s)
  return lines.length ? { heading: 'Answer key', lines } : null
}

const GENERATORS: { [G in ExampleGeneratorId]: { definition: Definition<SettingsById[G]>; answer: Answer<SettingsById[G]> } } = {
  'population-growth': { definition: populationSettings, answer: none },
  'punnett-square': { definition: punnettSettings, answer: punnettSquareAnswer },
  pedigree: { definition: pedigreeSettings, answer: pedigreeAnswer },
  'predator-prey': { definition: predatorPreySettings, answer: predatorPreyAnswer },
  // Each trophic level and what is at it (so any blank name), the chain in order, or each pyramid level's energy.
  'food-web': { definition: foodWebSettings, answer: (s) => ({ heading: 'Answer key', lines: foodWebAnswer(s) }) },
  'enzyme-activity': { definition: enzymeSettings, answer: enzymeActivityAnswer },
  'dna-protein-synthesis': { definition: dnaSettings, answer: dnaProteinSynthesisAnswer },
  'photosynthesis-rate': { definition: photosynthesisSettings, answer: photosynthesisRateAnswer },
  osmosis: { definition: osmosisSettings, answer: (s) => ({ heading: 'Answer key', lines: osmosisAnswer(s) }) },
  'gel-electrophoresis': { definition: gelSettings, answer: gelElectrophoresisAnswer },
  'micropipette-reading': { definition: pipetteSettings, answer: (s) => ({ heading: 'Answer key', lines: [pipetteAnswerLine(s)] }) },
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
