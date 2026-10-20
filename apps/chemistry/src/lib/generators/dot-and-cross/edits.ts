// The teacher's edits by hand to a dot-and-cross figure, for a "find the
// mistake" question (CONTEXT.md "Edit"): an electron's mark changed or taken
// away, an element symbol left blank, an ion's charge shown, left as a blank
// box or left off. Each is keyed by the item's place in the figure's marks,
// symbols or brackets, which stay the same for one formula, choice, layout
// and shells, so the page clears the edits when any of those change.
//
// In the address they're one field, tokens joined by underscores:
//   e3x  electron 3 is a cross (d dot, x cross, o open circle, s open square, n none)
//   s1   symbol 1 is left blank
//   c0b  charge 0 is blank (s shown, b blank box, n left off)
// so edits=e3x_e7n_s1_c0b. Electrons' dots and crosses are as before Swap,
// which still trades them.

import type { Field } from '$lib/shared/settings'
import type { MarkKind } from './marks'
import type { ChargeMode } from './settings'

/** What an electron is edited to: another mark, or none (not drawn). */
export type ElectronEdit = MarkKind | 'gone'

export interface Edits {
  electrons: Map<number, ElectronEdit>
  /** symbols left blank */
  symbols: Set<number>
  charges: Map<number, ChargeMode>
}

const ELECTRON_LETTERS: Record<ElectronEdit, string> = { dot: 'd', cross: 'x', circle: 'o', square: 's', gone: 'n' }
const CHARGE_LETTERS: Record<ChargeMode, string> = { show: 's', blank: 'b', none: 'n' }
const ELECTRON_OF = Object.fromEntries(Object.entries(ELECTRON_LETTERS).map(([k, v]) => [v, k])) as Record<string, ElectronEdit>
const CHARGE_OF = Object.fromEntries(Object.entries(CHARGE_LETTERS).map(([k, v]) => [v, k])) as Record<string, ChargeMode>

/** No figure has anywhere near this many electrons, symbols or ions. */
export const MAX_INDEX = 999
/** Edits kept, at most. */
export const MAX_EDITS = 200

export const noEdits = (): Edits => ({ electrons: new Map(), symbols: new Set(), charges: new Map() })

/** The edits in an address value. Anything not understood is skipped; a
 *  later token for the same item wins. */
export function readEdits(text: string): Edits {
  const e = noEdits()
  for (const token of text.split('_')) {
    const m = /^([esc])(\d{1,3})([a-z]?)$/.exec(token.trim())
    if (!m) continue
    const [, kind, digits, letter] = m
    const i = Number(digits)
    if (kind === 'e' && ELECTRON_OF[letter]) e.electrons.set(i, ELECTRON_OF[letter])
    else if (kind === 's' && !letter) e.symbols.add(i)
    else if (kind === 'c' && CHARGE_OF[letter]) e.charges.set(i, CHARGE_OF[letter])
  }
  return e
}

/** The edits as written in the address: electrons, then symbols, then
 *  charges, each in order, so equal edits are always written alike. */
export function writeEdits(e: Edits): string {
  const byIndex = <T>(m: Iterable<[number, T]>) => [...m].filter(([i]) => i <= MAX_INDEX).sort(([a], [b]) => a - b)
  const tokens = [
    ...byIndex(e.electrons).map(([i, v]) => `e${i}${ELECTRON_LETTERS[v]}`),
    ...byIndex([...e.symbols].map((i) => [i, true] as [number, boolean])).map(([i]) => `s${i}`),
    ...byIndex(e.charges).map(([i, v]) => `c${i}${CHARGE_LETTERS[v]}`),
  ]
  return tokens.slice(0, MAX_EDITS).join('_')
}

/** The settings field: the edits, always written the one way. None is an
 *  empty value, which leaves the address alone. */
export function editsField(): Field<string> {
  const accept = (v: unknown) => (typeof v === 'string' ? writeEdits(readEdits(v)) : undefined)
  return {
    fallback: '',
    accept,
    parse: accept,
    format: (v) => v,
    about: {
      type: 'format',
      syntax:
        'edits joined by underscores, each a letter, the item’s index from 0 and what it becomes: e3x electron 3 a cross (d dot, x cross, o open circle, s open square, n not drawn); s1 symbol 1 left blank; c0b charge 0 a blank box (s shown, b blank, n left off)',
    },
  }
}

// ---- Clicking -----------------------------------------------------------------

/** What clicking an electron does to what's drawn: the next mark, then none, then a dot again. */
export const ELECTRON_CYCLE: ElectronEdit[] = ['dot', 'cross', 'circle', 'square', 'gone']
/** And to a charge. */
export const CHARGE_CYCLE: ChargeMode[] = ['show', 'blank', 'none']

/** Dots and crosses traded when swapped; open circles and squares stay. */
export const swapped = <K extends ElectronEdit>(kind: K, swap: boolean): K =>
  (swap && kind === 'dot' ? 'cross' : swap && kind === 'cross' ? 'dot' : kind) as K

export type EditTarget = { kind: 'electron' | 'symbol' | 'charge'; index: number }

/** What the click changes, from what's drawn now. */
export interface Clicked {
  /** the electron as drawn (after Swap and edits), and its own mark before Swap */
  electron?: { drawn: ElectronEdit; own: MarkKind }
  /** the charge as drawn, and as the charges setting shows it */
  charge?: { drawn: ChargeMode; setting: ChargeMode }
}

/** The edits after clicking `target`: an electron takes the next mark after
 *  the one drawn, a symbol is blanked or shown again, a charge takes the next
 *  of shown, blank and left off. An item back to how it's drawn unedited has
 *  no edit, so going all the way round undoes it. */
export function clickEdits(text: string, target: EditTarget, now: Clicked, swap: boolean): string {
  const e = readEdits(text)
  const { index } = target
  if (target.kind === 'symbol') {
    if (e.symbols.has(index)) e.symbols.delete(index)
    else e.symbols.add(index)
  } else if (target.kind === 'electron' && now.electron) {
    const next = ELECTRON_CYCLE[(ELECTRON_CYCLE.indexOf(now.electron.drawn) + 1) % ELECTRON_CYCLE.length]
    const stored = swapped(next, swap)
    if (stored === now.electron.own) e.electrons.delete(index)
    else e.electrons.set(index, stored)
  } else if (target.kind === 'charge' && now.charge) {
    const next = CHARGE_CYCLE[(CHARGE_CYCLE.indexOf(now.charge.drawn) + 1) % CHARGE_CYCLE.length]
    if (next === now.charge.setting) e.charges.delete(index)
    else e.charges.set(index, next)
  }
  return writeEdits(e)
}
