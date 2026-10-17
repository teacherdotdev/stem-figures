// A Nuclide Notation figure from its settings: what each position holds
// (its value, a blank or nothing), the symbol laid out by layoutNuclide with
// the hyphen notation under it or alone, the answer key lines and what a
// screen reader hears. A blank's value is only ever in the answer key.

import { chargeText, superscript } from '../orbital-diagram/configuration'
import { element } from '../bohr-model/elements'
import {
  FONT_FAMILY,
  layoutHyphen,
  layoutNuclide,
  textWidth,
  type HyphenLayout,
  type NuclideLayout,
  type NuclideParts,
  type Part,
} from './layout'
import { PARTICLE_INFO, SYMBOL_TEXT } from './particles'
import { SYMBOL_SIZE, countsOf, notationOf, positionUsed, type NuclideSettings, type Show } from './settings'

/** Hyphen notation's size, as a fraction of the symbol's: under the symbol, and alone. */
const HYPHEN_UNDER = 0.36
const HYPHEN_ALONE = 0.7
/** between the symbol and the hyphen notation under it */
const HYPHEN_GAP = 0.06
/** FigureFrame's chart title and answer key sizes, so a long one widens the figure */
const TITLE_SIZE = 22
const KEY_SIZE = 18

/** Each position's value as written: "37", "17", "Cl", "−". The charge is
 *  "" for a neutral atom, and a particle has none. */
export function valuesOf(s: NuclideSettings): { mass: string; z: string; symbol: string; charge: string } {
  if (s.kind === 'particle') {
    const p = PARTICLE_INFO[s.particle]
    return { mass: String(p.mass), z: p.zText, symbol: SYMBOL_TEXT[s.particleSymbol], charge: '' }
  }
  const symbol = s.kind === 'element' ? (element(s.z)?.symbol ?? '') : s.symbol.trim()
  return { mass: String(s.mass), z: String(s.z), symbol, charge: chargeText(s.charge) }
}

const partOf = (show: Show, value: string): Part => (show === 'off' ? null : show === 'blank' ? 'blank' : value ? { text: value } : null)

/** What the symbol's four positions hold. */
export function partsOf(s: NuclideSettings): NuclideParts {
  const v = valuesOf(s)
  return {
    mass: partOf(s.massPart, v.mass),
    z: partOf(s.zPart, v.z),
    symbol: partOf(s.symbolPart, v.symbol),
    charge: positionUsed(s, 'charge') ? partOf(s.chargePart, v.charge) : null,
  }
}

/** What hyphen notation starts with: "carbon" or "C", or the teacher's symbol. */
export function hyphenNameOf(s: NuclideSettings): string {
  const el = s.kind === 'element' ? element(s.z) : undefined
  return el && s.hyphenName === 'name' ? el.name.toLowerCase() : valuesOf(s).symbol
}

export interface NuclideFigure {
  width: number
  height: number
  fontFamily: string
  /** the symbol with its numbers, placed at (x, y) */
  nuclide?: { x: number; y: number; layout: NuclideLayout }
  /** hyphen notation, placed at (x, y) */
  hyphen?: { x: number; y: number; layout: HyphenLayout }
  /** the answer key's lines, when it's on */
  answerKey: string[]
  label: string
}

/** The figure, centered across the width the chart title and answer key need. */
export function buildFigure(s: NuclideSettings): NuclideFigure {
  const size = SYMBOL_SIZE[s.size]
  const notation = notationOf(s)
  const parts = partsOf(s)
  const nuclide = notation === 'hyphen' ? undefined : layoutNuclide(parts, { font: s.font, size })
  const wideName = s.kind === 'element' && s.hyphenName === 'name'
  const hyphen =
    notation === 'symbol'
      ? undefined
      : layoutHyphen(partOf(s.symbolPart, hyphenNameOf(s)), partOf(s.massPart, String(s.mass)), size * (nuclide ? HYPHEN_UNDER : HYPHEN_ALONE), s.font, wideName)

  const answerKey = s.answerKey ? answerLines(s) : []
  const title = s.titleMode === 'text' ? s.title : ''
  const width = Math.max(
    nuclide?.width ?? 0,
    hyphen?.width ?? 0,
    title ? textWidth(title, TITLE_SIZE) * 1.08 : 0,
    ...answerKey.map((line) => textWidth(line, KEY_SIZE)),
  )
  const gap = nuclide && hyphen ? HYPHEN_GAP * size : 0
  return {
    width,
    height: (nuclide?.height ?? 0) + gap + (hyphen?.height ?? 0),
    fontFamily: FONT_FAMILY[s.font],
    nuclide: nuclide && { x: (width - nuclide.width) / 2, y: 0, layout: nuclide },
    hyphen: hyphen && { x: (width - hyphen.width) / 2, y: (nuclide?.height ?? 0) + gap, layout: hyphen },
    answerKey,
    label: figureLabel(s),
  }
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

/** A charge said in full, as the answer key and screen readers give it: "1−", "2+", "0". */
const fullCharge = (charge: number) => (charge ? `${Math.abs(charge)}${charge > 0 ? '+' : '−'}` : '0')

/** "Carbon-14 atom", "Chlorine-37 ion, Cl⁻", "Alpha particle, a helium-4 nucleus". */
export function nameLine(s: NuclideSettings): string {
  if (s.kind === 'particle') {
    const p = PARTICLE_INFO[s.particle]
    return p.what ? `${p.name}, ${p.what}` : p.name
  }
  const el = element(s.z)
  const ion = (symbol: string) => (s.charge ? ` ion, ${symbol}${superscript(chargeText(s.charge).replace('−', '-'))}` : ' atom')
  const real = el ? `${el.name}-${s.mass}${ion(el.symbol)}` : ''
  if (s.kind === 'element') return real
  const symbol = s.symbol.trim() || '?'
  return el ? `${symbol} is ${real.charAt(0).toLowerCase()}${real.slice(1)}` : `${symbol}-${s.mass}${s.charge ? ' ion' : ''}`
}

/** "17 protons, 20 neutrons, 18 electrons", or a particle's numbers. */
export function countsLine(s: NuclideSettings): string {
  if (s.kind === 'particle') {
    const p = PARTICLE_INFO[s.particle]
    return `Mass number ${p.mass}, atomic number (charge) ${p.zText}`
  }
  const c = countsOf(s)
  return `${plural(c.protons, 'proton')}, ${plural(c.neutrons, 'neutron')}, ${plural(c.electrons, 'electron')}`
}

const POSITION_NAMES = { mass: 'mass number', z: 'atomic number', symbol: 'symbol', charge: 'charge' } as const

/** Each blank position the figure draws, with its value: [["atomic number", "92"]]. */
export function blanksOf(s: NuclideSettings): [string, string][] {
  const v = valuesOf(s)
  const shows = { mass: s.massPart, z: s.zPart, symbol: s.symbolPart, charge: s.chargePart }
  return (['mass', 'z', 'symbol', 'charge'] as const)
    .filter((p) => shows[p] === 'blank' && positionUsed(s, p))
    .map((p) => {
      if (p === 'charge') return [POSITION_NAMES.charge, fullCharge(s.charge)]
      if (p === 'symbol' && notationOf(s) === 'hyphen') return [s.hyphenName === 'name' && s.kind === 'element' ? 'name' : 'symbol', hyphenNameOf(s)]
      return [POSITION_NAMES[p], v[p]]
    })
}

/** The answer key's lines: what it is, its particles, and each blank's value. */
export function answerLines(s: NuclideSettings): string[] {
  const blanks = blanksOf(s)
  const out = [nameLine(s), countsLine(s)]
  if (blanks.length) out.push(`${blanks.length === 1 ? 'Blank' : 'Blanks'}: ${blanks.map(([name, value]) => `${name} ${value}`).join(', ')}`)
  return out
}

/** What the figure shows, for screen readers: every value it draws, and
 *  only "a blank" for a blank. */
export function figureLabel(s: NuclideSettings): string {
  const notation = notationOf(s)
  const v = valuesOf(s)
  const said = (show: Show, name: string, value: string) => (show === 'blank' ? `a blank for the ${name}` : show === 'shown' && value ? `${name} ${value}` : '')
  const out: string[] = []
  if (notation !== 'hyphen') {
    const parts = [
      said(s.symbolPart, 'symbol', v.symbol),
      said(s.massPart, 'mass number', v.mass),
      said(s.zPart, 'atomic number', v.z),
      positionUsed(s, 'charge') ? said(s.chargePart, 'charge', v.charge && fullCharge(s.charge)) : '',
    ].filter(Boolean)
    out.push(`Nuclide notation: ${parts.join(', ') || 'nothing shown'}`)
  }
  if (notation !== 'symbol') {
    const name = s.symbolPart === 'blank' ? '(blank)' : s.symbolPart === 'shown' ? hyphenNameOf(s) : ''
    const mass = s.massPart === 'blank' ? '(blank)' : s.massPart === 'shown' ? v.mass : ''
    out.push(`Hyphen notation: ${[name, mass].filter(Boolean).join('-') || 'nothing shown'}`)
  }
  return out.join('. ')
}
