// Nuclide Notation's settings, as they appear in the page address. Only the
// atomic number, mass number and charge are stored; the protons, neutrons
// and electrons boxes are worked out from them and set them (CONTEXT.md
// "Nuclide notation").

import { choice, defineSettings, number, text } from '$lib/shared/settings'
import { figureTextFields } from '$lib/shared/figureText'
import { MAX_Z, element, massNumber } from '../bohr-model/elements'
import { ISOTOPES } from '../mass-spectrum/isotopes'
import type { BlankStyle, Font } from './layout'
import { PARTICLES, PARTICLE_SYMBOLS, particleSymbol } from './particles'

/** What the symbol is: an element, the teacher's own symbol, or a nuclear particle. */
export const KINDS = ['element', 'custom', 'particle'] as const
export type Kind = (typeof KINDS)[number]

/** How each position is drawn: its value, a blank for students, or not at all. */
export const SHOWS = ['shown', 'blank', 'off'] as const
export type Show = (typeof SHOWS)[number]

/** The symbol with its numbers, hyphen notation (carbon-14), or both, the hyphen notation under the symbol. */
export const NOTATIONS = ['symbol', 'hyphen', 'both'] as const
export type Notation = (typeof NOTATIONS)[number]

/** What hyphen notation starts with: the element's name (carbon-14) or its symbol (C-14). */
export const HYPHEN_NAMES = ['name', 'symbol'] as const
export type HyphenName = (typeof HYPHEN_NAMES)[number]

export const FONTS: readonly Font[] = ['sans', 'serif']
export const BLANKS: readonly BlankStyle[] = ['box', 'line']

/** The symbol's font size. */
export const SYMBOL_SIZE = 80

/** The largest mass number, and the largest atomic number of your own symbol. */
export const MAX_MASS = 300
export const MIN_CHARGE = -8
export const MAX_CHARGE = 8
export const MAX_SYMBOL = 3

export const nuclideSettings = defineSettings(
  {
    kind: choice(KINDS, 'element'),
    z: number({ min: 0, max: MAX_MASS, fallback: 6 }),
    mass: number({ min: 0, max: MAX_MASS, fallback: 12 }),
    charge: number({ min: MIN_CHARGE, max: MAX_CHARGE, fallback: 0 }),
    symbol: text('X', MAX_SYMBOL),
    particle: choice(PARTICLES, 'alpha'),
    particleSymbol: choice(PARTICLE_SYMBOLS, 'He'),
    massPart: choice(SHOWS, 'shown'),
    zPart: choice(SHOWS, 'shown'),
    symbolPart: choice(SHOWS, 'shown'),
    chargePart: choice(SHOWS, 'shown'),
    blank: choice(BLANKS, 'box'),
    notation: choice(NOTATIONS, 'symbol'),
    hyphenName: choice(HYPHEN_NAMES, 'name'),
    font: choice(FONTS, 'sans'),
    ...figureTextFields(),
  },
  (s) => {
    // An element's atomic number is one of the 118; your own symbol's can be 0.
    const z = s.kind === 'element' ? Math.min(MAX_Z, Math.max(1, Math.round(s.z))) : Math.round(s.z)
    // Never fewer than 0 neutrons, nor fewer than 0 electrons.
    const mass = Math.max(z, Math.round(s.mass))
    const charge = Math.min(z, Math.round(s.charge))
    return { ...s, z, mass, charge, particleSymbol: particleSymbol(s.particle, s.particleSymbol) }
  },
)

export type NuclideSettings = typeof nuclideSettings.defaults

/** The protons, neutrons and electrons the boxes show. */
export interface Counts {
  protons: number
  neutrons: number
  electrons: number
}

export const countsOf = (s: Pick<NuclideSettings, 'z' | 'mass' | 'charge'>): Counts => ({
  protons: s.z,
  neutrons: s.mass - s.z,
  electrons: s.z - s.charge,
})

/** The atomic number, mass number and charge counts set. */
export const fromCounts = ({ protons, neutrons, electrons }: Counts) => ({ z: protons, mass: protons + neutrons, charge: protons - electrons })

/** Why the atomic number, mass number and charge can't be these, or null
 *  when they can: a nuclide is never given fewer than 0 neutrons. */
export function numbersProblem(s: NuclideSettings, next: { z: number; mass: number; charge: number }): string | null {
  const lowest = s.kind === 'element' ? 1 : 0
  const highest = s.kind === 'element' ? MAX_Z : MAX_MASS
  if (next.z < lowest || next.z > highest) return `The atomic number can be ${lowest} to ${highest}.`
  if (next.mass < next.z) return `A mass number below the atomic number (${next.z}) would mean fewer than 0 neutrons.`
  if (next.mass > MAX_MASS) return `Mass numbers go up to ${MAX_MASS}.`
  if (next.charge < MIN_CHARGE || next.charge > MAX_CHARGE) return `The charge can be ${MIN_CHARGE} to ${MAX_CHARGE}.`
  if (next.charge > next.z) return `A charge above the atomic number (${next.z}) would mean fewer than 0 electrons.`
  return null
}

/** The settings with new numbers, or the same settings and why not. The
 *  page uses this for every box, so a number it refuses changes nothing. */
export function withNumbers(
  s: NuclideSettings,
  change: Partial<{ z: number; mass: number; charge: number }>,
): { settings: NuclideSettings; problem: string | null } {
  const next = { z: s.z, mass: s.mass, charge: s.charge, ...change }
  const problem = numbersProblem(s, next)
  return problem ? { settings: s, problem } : { settings: { ...s, ...next }, problem: null }
}

/** An element picked from the list: its usual mass number (CONTEXT.md
 *  "Element"), keeping the charge when the element can have it. */
export function withElement(s: NuclideSettings, z: number): NuclideSettings {
  return { ...s, z, mass: massNumber(z) ?? z, charge: Math.min(z, s.charge) }
}

/** The element's naturally occurring isotopes' mass numbers, lightest first,
 *  for the elements Mass Spectrum has data for (H to Xe, Pt, Au, Hg, Pb and U). */
export const naturalIsotopes = (z: number): number[] | undefined => ISOTOPES[z]?.map(([mass]) => mass)

/** Says when an element's mass number isn't one of its naturally abundant
 *  isotopes, such as a trace one (C-14) or one made in a lab. It is drawn all
 *  the same. */
export function unnaturalNote(s: NuclideSettings): string | null {
  if (s.kind !== 'element') return null
  const natural = naturalIsotopes(s.z)
  const el = element(s.z)
  if (!natural || !el || natural.includes(s.mass)) return null
  const list = natural.map((m) => `${el.symbol}-${m}`)
  const named = list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`
  return `${el.name}’s naturally abundant ${natural.length === 1 ? 'isotope is' : 'isotopes are'} ${named}. ${el.symbol}-${s.mass} is drawn all the same.`
}

/** Whether the figure is hyphen notation alone, both, or the symbol. A
 *  particle has no hyphen name, so it's always the symbol. */
export const notationOf = (s: NuclideSettings): Notation => (s.kind === 'particle' ? 'symbol' : s.notation)

/** Whether a position is shown in the figure at all: hyphen notation alone has no atomic number or charge. */
export function positionUsed(s: NuclideSettings, position: 'mass' | 'z' | 'symbol' | 'charge'): boolean {
  if (s.kind === 'particle' && position === 'charge') return false
  return notationOf(s) !== 'hyphen' || position === 'mass' || position === 'symbol'
}

/** The page's file name: the chart title, or "nuclide-notation". */
export const fileName = (s: NuclideSettings) =>
  (s.titleMode === 'text' && s.title.trim() ? s.title.trim() : 'nuclide-notation')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'nuclide-notation'

