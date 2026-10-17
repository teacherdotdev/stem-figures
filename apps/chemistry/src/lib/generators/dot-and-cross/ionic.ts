// Reading what the teacher types, and the chemistry of ions: each element's
// usual ion from its group (Na⁺, Mg²⁺, Al³⁺, N³⁻, O²⁻, Cl⁻), and binary ionic
// compounds of the metals and non-metals school courses use, which must
// balance. Lewis Structures' parseFormula refuses ionic metals, so formulas
// are read here with the same element table.

import { ionMeant } from '../lewis-structures/formula'
import { ELEMENTS as LEWIS_ELEMENTS, TRANSITION_METALS, UNDRAWN } from '../lewis-structures/elements'
import { ELEMENTS as NAMED, groundStateShells } from '../bohr-model/elements'

export interface Token {
  symbol: string
  count: number
}

export type ReadFormula = { ok: true; tokens: Token[]; charge: number } | { ok: false; message: string; request: boolean }

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'
const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** Plain ASCII: subscripts become digits, a run of superscripts becomes "^"
 *  and what it says, and minus signs become hyphens. (As Lewis Structures
 *  reads a formula.) */
function plain(text: string) {
  let out = ''
  let superscript = false
  for (const ch of text.replace(/[−–]/g, '-')) {
    const sub = SUBSCRIPTS.indexOf(ch)
    const sup = SUPERSCRIPTS.indexOf(ch)
    const sign = ch === '⁺' ? '+' : ch === '⁻' ? '-' : ''
    if (sup >= 0 || sign) {
      out += (superscript ? '' : '^') + (sign || String(sup))
      superscript = true
      continue
    }
    superscript = false
    out += sub >= 0 ? String(sub) : ch
  }
  return out
}

const CHARGE_PATTERNS: [RegExp, (m: RegExpMatchArray) => [string, string]][] = [
  [/\(\s*(\d*)\s*([+-])\s*\)$/, (m) => [m[1], m[2]]],
  [/\(\s*([+-])\s*(\d*)\s*\)$/, (m) => [m[2], m[1]]],
  [/(?:\^|\s)\s*(\d*)\s*([+-])$/, (m) => [m[1], m[2]]],
  [/(?:\^|\s)\s*([+-])\s*(\d+)$/, (m) => [m[2], m[1]]],
  [/([+-])$/, (m) => ['', m[1]]],
]

/** The charge written at the end, and what comes before it. Digits right
 *  after an element are its count, so a charge of 2 or more needs a space,
 *  ^ or parentheses before it ("Mg 2+"). */
function splitCharge(text: string): [string, number] {
  for (const [pattern, parts] of CHARGE_PATTERNS) {
    const m = text.match(pattern)
    if (!m) continue
    const [digits, sign] = parts(m)
    const size = digits ? Number(digits) : 1
    return [text.slice(0, m.index), sign === '-' ? -size : size]
  }
  return [text, 0]
}

const MAX_ATOMS = 60

/** The elements and counts in a formula, as written, and its charge. */
export function readFormula(typed: string): ReadFormula {
  const fail = (message: string, request = false): ReadFormula => ({ ok: false, message, request })
  const [before, charge] = splitCharge(plain(typed).trim())
  const body = before.replace(/\s+/g, '')
  if (!body) return fail('Type a formula, like H2O or MgCl2, or one element, like Na.')
  if (/^[a-z]/.test(body)) return fail('Start each element with a capital letter, like CO2.')
  if (!/^([A-Z][a-z]?\d*)+$/.test(body)) return fail(`Dot-and-Cross Diagram can’t read “${typed.trim()}”. Type a formula like H2O or MgCl2.`)
  const tokens: Token[] = []
  for (const [, symbol, digits] of body.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    if (TRANSITION_METALS.has(symbol)) return fail(`Dot-and-Cross Diagram doesn’t draw transition metals like ${symbol} yet.`, true)
    if (UNDRAWN.has(symbol)) return fail(`Dot-and-Cross Diagram doesn’t draw ${symbol}.`)
    if (!LEWIS_ELEMENTS[symbol]) return fail(`“${symbol}” isn’t an element. Check the capital letters.`)
    const count = digits ? Number(digits) : 1
    if (count < 1) return fail(`“${symbol}${digits}” needs a count of at least 1.`)
    tokens.push({ symbol, count })
  }
  if (tokens.reduce((n, t) => n + t.count, 0) > MAX_ATOMS) return fail('That’s too many atoms for a dot-and-cross diagram.')
  return { ok: true, tokens, charge }
}

// ---- Elements and their ions -----------------------------------------------

/** An element's atomic number, by symbol. */
export const atomicNumber = (symbol: string) => NAMED.find((e) => e.symbol === symbol)?.z

/** An atom or ion on its own is drawn up to calcium, where shells fill 2, 8, 8. */
export const MAX_ATOM_Z = 20

/** The metals and non-metals of the binary ionic compounds drawn. */
export const METALS = ['Li', 'Na', 'K', 'Rb', 'Mg', 'Ca', 'Sr', 'Al']
export const NON_METALS = ['N', 'O', 'F', 'S', 'Cl', 'Br', 'I']

/** Each element's usual ion charge from its group: 1+, 2+ and 3+ for groups
 *  1, 2 and 13, and 3−, 2− and 1− for groups 15, 16 and 17. Elements of
 *  group 14, the noble gases, hydrogen and boron have none drawn. */
const ION_CHARGES: Record<string, number> = {
  Li: 1, Na: 1, K: 1, Rb: 1,
  Be: 2, Mg: 2, Ca: 2, Sr: 2,
  Al: 3,
  N: -3, P: -3,
  O: -2, S: -2,
  F: -1, Cl: -1, Br: -1, I: -1,
}

/** An element's usual ion charge, or undefined when it has none drawn. */
export const ionCharge = (symbol: string): number | undefined => ION_CHARGES[symbol]

const toScript = (digits: string, script: string) => [...digits].map((d) => script[Number(d)]).join('')

/** A charge as written after an ion: "+", "2−" (no 1, a true minus sign). */
export const chargeText = (charge: number) =>
  charge === 0 ? '' : `${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge < 0 ? '−' : '+'}`

/** A charge in superscripts: "²⁻". */
export const chargeScript = (charge: number) =>
  toScript(chargeText(charge).replace(/\D/g, ''), SUPERSCRIPTS) + (charge < 0 ? '⁻' : charge > 0 ? '⁺' : '')

/** An ion's or atom's name in text: "Mg²⁺", "Cl⁻", "Na". */
export const ionName = (symbol: string, charge: number) => symbol + chargeScript(charge)

/** A formula in text with real subscripts: "MgCl₂". */
export const formulaText = (tokens: Token[]) =>
  tokens.map(({ symbol, count }) => symbol + (count > 1 ? toScript(String(count), SUBSCRIPTS) : '')).join('')

/** A charge with its sign: "+2", "−1". */
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

/** The electrons per shell of an element's atom or ion, innermost first. */
export const shellsOf = (symbol: string, charge = 0) => groundStateShells(atomicNumber(symbol)!, charge)!

// ---- Ionic compounds --------------------------------------------------------

export interface Ion {
  symbol: string
  charge: number
  /** how many of it the formula has */
  count: number
  /** its electrons per shell as an ion */
  shells: number[]
  /** the neutral atom's, which the gained or lost electrons differ from */
  atomShells: number[]
}

export interface Compound {
  metal: Ion
  nonMetal: Ion
  /** the formula with real subscripts, metal first: "MgCl₂" */
  name: string
}

export type ReadCompound = { ok: true; compound: Compound } | { ok: false; message: string; request: boolean }

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** The counts that balance two ions' charges: Mg²⁺ and Cl⁻ give [1, 2]. */
export function balancedCounts(metalCharge: number, nonMetalCharge: number): [number, number] {
  const g = gcd(metalCharge, -nonMetalCharge)
  return [-nonMetalCharge / g, metalCharge / g]
}

const ionOf = (symbol: string, count: number): Ion => {
  const charge = ionCharge(symbol)!
  return { symbol, charge, count, shells: shellsOf(symbol, charge), atomShells: shellsOf(symbol) }
}

/** A binary ionic compound from a formula's elements and counts: a metal
 *  and a non-metal from the lists, written either way round, whose ions'
 *  charges balance. */
export function readCompound(tokens: Token[], charge: number): ReadCompound {
  const fail = (message: string, request = false): ReadCompound => ({ ok: false, message, request })
  const counts = new Map<string, number>()
  for (const t of tokens) counts.set(t.symbol, (counts.get(t.symbol) ?? 0) + t.count)
  const elements = [...counts.keys()]
  const metal = elements.find((e) => METALS.includes(e))
  if (elements.length > 2)
    return fail(`Ionic compounds with polyatomic ions, like NaOH or MgSO₄, aren’t drawn yet. Type two elements, like NaCl or MgCl2.`, true)
  if (elements.length === 1) {
    const meant = ionMeant(tokens, charge)
    const [symbol] = elements
    const ion = chargeText(ionCharge(symbol)!).replace('−', '-')
    return fail(meant ? `For the ${meant.name} ion, type ${meant.typed}.` : `That’s ${counts.get(symbol)} ${symbol} atoms. Type ${symbol} for one atom, or ${symbol}${ion.length > 1 ? ' ' : ''}${ion} for its ion.`)
  }
  if (charge) return fail(`An ionic compound has no overall charge. Type it without one, like MgCl2.`)
  const other = elements.find((e) => e !== metal)!
  if (METALS.includes(other)) return fail(`${metal} and ${other} are both metals, so they don’t form an ionic compound.`)
  if (!NON_METALS.includes(other))
    return fail(`Ionic compounds of ${metal} with ${other} aren’t drawn yet. The non-metal can be ${NON_METALS.slice(0, -1).join(', ')} or ${NON_METALS.at(-1)}.`, true)
  const m = ionOf(metal!, counts.get(metal!)!)
  const x = ionOf(other, counts.get(other)!)
  if (m.count * m.charge + x.count * x.charge !== 0) {
    const [mc, xc] = balancedCounts(m.charge, x.charge)
    const written = formulaText([{ symbol: m.symbol, count: m.count }, { symbol: x.symbol, count: x.count }])
    const balanced = formulaText([{ symbol: m.symbol, count: mc }, { symbol: x.symbol, count: xc }])
    return fail(`${written} has charges ${signed(m.charge)} and ${signed(x.charge)}; ${balanced} balances.`)
  }
  return { ok: true, compound: { metal: m, nonMetal: x, name: formulaText([{ symbol: m.symbol, count: m.count }, { symbol: x.symbol, count: x.count }]) } }
}

/** How many ions a compound has in all. */
export const ionCount = (c: Compound) => c.metal.count + c.nonMetal.count
