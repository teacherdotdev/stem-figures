// Dot-and-Cross Diagram's settings, as they appear in the page address.

import { figureTextFields } from '$lib/shared/figureText'
import { bool, choice, defineSettings, text } from '$lib/shared/settings'
import { ionCount } from './ionic'
import { readSpecies, type Read } from './read'

/** Outer shells only, or every shell. */
export const SHELLS = ['outer', 'all'] as const
export type Shells = (typeof SHELLS)[number]

/** An ionic compound's ions: every one drawn, or one of each with its
 *  number in front ("2[Cl]⁻"); auto draws every ion up to three. */
export const LAYOUTS = ['auto', 'every', 'numbered'] as const
export type Layout = (typeof LAYOUTS)[number]

/** An ion's charge: written, a blank for students, or left off. */
export const CHARGE_MODES = ['show', 'blank', 'none'] as const
export type ChargeMode = (typeof CHARGE_MODES)[number]

export const MAX_FORMULA = 40
/** Up to this many ions, every ion is drawn unless the teacher says otherwise. */
export const MAX_EVERY = 3

export const dotCrossSettings = defineSettings({
  formula: text('H2O', MAX_FORMULA),
  which: text('', MAX_FORMULA),
  shells: choice(SHELLS, 'outer'),
  atomShells: choice(SHELLS, 'all'),
  layout: choice(LAYOUTS, 'auto'),
  swap: bool(false),
  color: bool(false),
  blank: bool(false),
  charges: choice(CHARGE_MODES, 'show'),
  ...figureTextFields(),
})

export type DotCrossSettings = typeof dotCrossSettings.defaults

/** The last few things read, since every setting redraws the figure but
 *  only these two change what's drawn. */
const found = new Map<string, Read>()
export function readOnce(formula: string, which: string) {
  const key = JSON.stringify([formula, which])
  let r = found.get(key)
  if (!r) {
    r = readSpecies(formula, which)
    if (found.size >= 8) found.delete(found.keys().next().value!)
    found.set(key, r)
  }
  return r
}

/** Whether every shell is drawn: an atom or ion on its own has its own
 *  setting, all shells to start with. */
export const allShells = (s: DotCrossSettings, r: Read) => (r.ok && r.species.kind === 'atom' ? s.atomShells : s.shells) === 'all'

/** How an ionic compound's ions are laid out, auto worked out. */
export function layoutOf(s: DotCrossSettings, r: Read): Exclude<Layout, 'auto'> {
  if (s.layout !== 'auto') return s.layout
  return r.ok && r.species.kind === 'ionic' && ionCount(r.species.compound) > MAX_EVERY ? 'numbered' : 'every'
}
