// What an example page says about its figure beyond the caption: the
// generator address that draws it and its answer key, both worked out by the
// generator's own code (its settings definition and answer lines), so they
// can't drift from the figure. Server-only, so example pages don't ship every
// generator's chemistry to the browser.
//
// It also checks each example: a setting the generator doesn't take as
// written (a reading off the scale, a misspelled choice) fails the build.

import { chargeOf, bohrSettings } from '$lib/generators/bohr-model/settings'
import { element } from '$lib/generators/bohr-model/elements'
import { syringeSettings, answerLine as syringeAnswer } from '$lib/generators/gas-syringe/settings'
import { buildCurve, degrees, segmentName } from '$lib/generators/heating-cooling-curve/figure'
import { curveSettings, temperaturesOf, setupOf } from '$lib/generators/heating-cooling-curve/settings'
import { lengthSettings, answerLine as lengthAnswer } from '$lib/generators/length-reading/settings'
import { chargeText } from '$lib/generators/lewis-structures/formula'
import { electronGroups } from '$lib/generators/lewis-structures/layout'
import { figureOf, lewisSettings } from '$lib/generators/lewis-structures/settings'
import { formalCharge, valenceElectrons, type Structure } from '$lib/generators/lewis-structures/structure'
import { answerLines as spectrumAnswer, buildSpectrum } from '$lib/generators/line-spectrum/figure'
import { spectrumSettings } from '$lib/generators/line-spectrum/settings'
import { stripName } from '$lib/generators/line-spectrum/strips'
import { massSettings, answerLine as massAnswer } from '$lib/generators/mass-reading/settings'
import { answerLines as massSpectrumAnswer, massSpectrumSettings, workingLine } from '$lib/generators/mass-spectrum/settings'
import { answerLines as orbitalAnswer, orbitalSettings } from '$lib/generators/orbital-diagram/settings'
import { boxContents, keyKinds, particleSettings } from '$lib/generators/particle-diagram/settings'
import { answerLines as pesAnswer, pesSettings } from '$lib/generators/photoelectron-spectrum/settings'
import { energyText, peaksOf } from '$lib/generators/photoelectron-spectrum/spectrum'
import { phSettings, answerLine as phAnswer } from '$lib/generators/ph-reading/settings'
import { temperatureSettings, answerLine as temperatureAnswer } from '$lib/generators/temperature-reading/settings'
import { buildTitration } from '$lib/generators/titration-curve/figure'
import { titrationSettings } from '$lib/generators/titration-curve/settings'
import { displacementSettings, answerLine as displacementAnswer } from '$lib/generators/volume-by-displacement/settings'
import { volumeSettings, answerLine as volumeAnswer } from '$lib/generators/volume-reading/settings'
import { keyLabel } from '$shared/particles/key'
import { plainText } from '$shared/particles/keyText'
import { afterCount, describeKind, describeParticle } from '$shared/particles/particles'
import type { Example, ExampleGeneratorId, SettingsById } from './types'

export interface ExampleDetails {
  /** the generator page drawing this figure, e.g. "/volume-reading?reading=34.5" */
  editPath: string
  /** the answer key's heading and lines */
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

/** Answer key lines from a generator's own "A · B · C" answer line. */
const lines = (line: string) => ({ heading: 'Answer key', lines: line.split(' · ') })

const two = (v: number) => String(Math.round(v * 100) / 100)
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

function lewisAnswer(s: SettingsById['lewis-structures']): ExampleDetails['answer'] {
  const figure = figureOf(s)
  if (!figure.resolved.ok) throw new Error(`Lewis Structures can't draw ${s.formula}: ${figure.resolved.message}`)
  const structure: Structure = figure.shown[0]
  const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
  if (structure.atoms.length === 1) {
    const groups = electronGroups(structure, 0)
    const pairs = groups.filter((g) => g.electrons === 2).length
    const singles = groups.length - pairs
    const { charge } = structure
    const out = [
      `${figure.resolved.name}: ${valenceElectrons(structure)} valence electrons`,
      groups.length ? [pairs && count(pairs, 'pair'), singles && count(singles, 'single electron')].filter(Boolean).join(', ') : 'No dots',
    ]
    if (charge) out.push(`${charge < 0 ? 'Gained' : 'Lost'} ${count(Math.abs(charge), 'electron')}; in brackets with its ${chargeText(charge)} charge`)
    return { heading: 'Answer key', lines: out }
  }
  const orders = [0, 0, 0, 0]
  for (const b of structure.bonds) orders[b.order]++
  const bonds = [
    orders[1] && count(orders[1], 'single bond'),
    orders[2] && count(orders[2], 'double bond'),
    orders[3] && count(orders[3], 'triple bond'),
  ].filter(Boolean)
  const lonePairs = structure.atoms.reduce((n, a) => n + Math.floor(a.lone / 2), 0)
  const out = [`${figure.resolved.name}: ${valenceElectrons(structure)} valence electrons`, `${bonds.join(', ')}; ${count(lonePairs, 'lone pair')}`]
  if (figure.shown.length > 1) out.push(`${figure.shown.length} resonance structures`)
  if (s.formalCharges) {
    const charged = structure.atoms.map((a, i) => ({ element: a.element, charge: formalCharge(structure, i) })).filter((a) => a.charge)
    const groups = new Map<string, number>()
    for (const a of charged) groups.set(`${a.element} ${signed(a.charge)}`, (groups.get(`${a.element} ${signed(a.charge)}`) ?? 0) + 1)
    out.push(
      charged.length
        ? `Formal charges: ${[...groups].map(([what, n]) => (n > 1 ? `${what} (×${n})` : what)).join(', ')}; all other atoms 0`
        : 'Formal charges: 0 on every atom',
    )
  }
  return { heading: 'Answer key', lines: out }
}

function bohrAnswer(s: SettingsById['bohr-model']): ExampleDetails['answer'] {
  const charge = chargeOf(s)
  const name = element(s.protons)?.name ?? `${s.protons} protons`
  const total = s.electrons.reduce((n, e) => n + e, 0)
  return {
    heading: 'Answer key',
    lines: [
      `${name}${charge ? ` ion, charge ${charge > 0 ? `${charge}+` : `${-charge}−`}` : ' atom, neutral'}`,
      `Protons: ${s.protons} · Neutrons: ${s.neutrons} · Mass number: ${s.protons + s.neutrons}`,
      `Electrons: ${total} (${s.electrons.join(', ')} by shell)`,
    ],
  }
}

function particleAnswer(s: SettingsById['particle-diagram']): ExampleDetails['answer'] {
  const box = boxContents(s)
  if (box.missing || box.after?.missing) throw new Error(`Particles don't fit in the particle diagram example`)
  const lines = box.after
    ? box.kinds.map((k) => `${k.name ? `${plainText(k.name)}, ` : ''}${describeParticle(k)}: ${k.count} before, ${afterCount(k)} after`)
    : box.kinds.map((k) => `${describeKind(k)}${k.name ? `: ${plainText(k.name)}` : ''}`)
  if (s.layout === 'scattered' && s.keyList === 'atoms') lines.push(keyLabel(keyKinds(s, box), ''))
  return { heading: 'What’s in the box', lines }
}

function titrationAnswer(s: SettingsById['titration-curve']): ExampleDetails['answer'] {
  const g = buildTitration(s)
  if (!g.eq || g.startPH === null) throw new Error('The titration curve example can’t be drawn')
  const out = [`Starting pH: ${g.startPH.toFixed(2)}`, `Equivalence point: ${two(g.eq.ml)} mL, pH ${g.eq.ph.toFixed(2)}`]
  if (g.half) out.push(`Half-equivalence point: ${two(g.half.ml)} mL, pH ${g.half.ph.toFixed(2)}`)
  return { heading: 'Answer key', lines: out }
}

function curveAnswer(s: SettingsById['heating-cooling-curve']): ExampleDetails['answer'] {
  const g = buildCurve(s)
  if (!g.rows.length) throw new Error('The heating or cooling curve example can’t be drawn')
  const heat = s.source === 'properties'
  const out = g.rows.map((r) => {
    const at = r.t0 === r.t1 ? `at ${degrees(r.t0)}` : `from ${degrees(r.t0)} to ${degrees(r.t1)}`
    return `${r.from}–${r.to}: ${segmentName(s.direction, r.key)} ${at}${heat ? `, ${two(r.heat)} kJ` : ''}`
  })
  const { mp, bp } = temperaturesOf(s)
  const name = setupOf(s)?.name ?? 'The substance'
  return { heading: 'Answer key', lines: [`${name}: melting point ${degrees(mp)}, boiling point ${degrees(bp)}`, ...out] }
}

function lineSpectrumAnswer(s: SettingsById['line-spectrum']): ExampleDetails['answer'] {
  const layout = buildSpectrum(s)
  const out = s.strips.flatMap((strip, i) => {
    if (strip.type === 'mixture') return []
    const drawn = layout.strips[i].lines
    if (!drawn.length) throw new Error(`The line spectrum example draws no lines for ${stripName(strip)}`)
    return [`${stripName(strip)}: ${drawn.map((l) => l.nm.toFixed(1)).join(', ')} nm`]
  })
  return { heading: 'Answer key', lines: [...out, ...spectrumAnswer(s)] }
}

function pesAnswerKey(s: SettingsById['photoelectron-spectrum']): ExampleDetails['answer'] {
  const peaks = peaksOf(s.z, s.unit).map((p) => `${p.sublevel} ${energyText(p.energy)}`)
  return { heading: 'Answer key', lines: [...pesAnswer(s), `Peaks (${s.unit}, left to right): ${peaks.join(', ')}`] }
}

function massSpectrumAnswerKey(s: SettingsById['mass-spectrum']): ExampleDetails['answer'] {
  const working = workingLine(s)
  if (!working) throw new Error('The mass spectrum example has no abundances')
  return { heading: 'Answer key', lines: [...massSpectrumAnswer(s), `Relative atomic mass: ${working}`] }
}

const GENERATORS: { [G in ExampleGeneratorId]: { definition: Definition<SettingsById[G]>; answer: Answer<SettingsById[G]> } } = {
  'volume-reading': { definition: volumeSettings, answer: (s) => lines(volumeAnswer(s)) },
  'volume-by-displacement': { definition: displacementSettings, answer: (s) => lines(displacementAnswer(s)) },
  'gas-syringe': { definition: syringeSettings, answer: (s) => lines(syringeAnswer(s)) },
  'length-reading': { definition: lengthSettings, answer: (s) => lines(lengthAnswer(s)) },
  'mass-reading': { definition: massSettings, answer: (s) => lines(massAnswer(s)) },
  'temperature-reading': { definition: temperatureSettings, answer: (s) => lines(temperatureAnswer(s)) },
  'ph-reading': { definition: phSettings, answer: (s) => lines(phAnswer(s)) },
  'titration-curve': { definition: titrationSettings, answer: titrationAnswer },
  'heating-cooling-curve': { definition: curveSettings, answer: curveAnswer },
  'particle-diagram': { definition: particleSettings, answer: particleAnswer },
  'bohr-model': { definition: bohrSettings, answer: bohrAnswer },
  'lewis-structures': { definition: lewisSettings, answer: lewisAnswer },
  'orbital-diagram': { definition: orbitalSettings, answer: (s) => ({ heading: 'Answer key', lines: orbitalAnswer(s) }) },
  'line-spectrum': { definition: spectrumSettings, answer: lineSpectrumAnswer },
  'photoelectron-spectrum': { definition: pesSettings, answer: pesAnswerKey },
  'mass-spectrum': { definition: massSpectrumSettings, answer: massSpectrumAnswerKey },
}

function detailsOf<G extends ExampleGeneratorId>(generator: G, example: Example): ExampleDetails {
  const { definition, answer } = GENERATORS[generator]
  const s = definition.tidy({ ...definition.defaults, ...example.settings })
  // Every setting as written, or the figure isn't the one described.
  for (const [name, value] of Object.entries(example.settings)) {
    const kept = (s as Record<string, unknown>)[name]
    if (JSON.stringify(kept) !== JSON.stringify(value)) {
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
