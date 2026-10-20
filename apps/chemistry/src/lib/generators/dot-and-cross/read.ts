// From what the teacher typed to what's drawn: one atom or ion, a binary
// ionic compound, or a covalent molecule (CONTEXT.md "Dot-and-cross
// diagrams"). A formula of one element alone is its atom or ion; one with a
// metal is ionic; anything else is a molecule. Common names work too:
// "water", "magnesium chloride", "sodium", "chloride ion", "ethene".

import { ELEMENTS as NAMED } from '../bohr-model/elements'
import type { Listed } from '../lewis-structures/listed'
import { isListedName, readMolecule, type Molecule } from './covalent'
import {
  MAX_ATOM_Z,
  METALS,
  atomicNumber,
  balancedCounts,
  chargeText,
  ionCharge,
  ionName,
  readCompound,
  readFormula,
  shellsOf,
  type Compound,
} from './ionic'

export interface Atom {
  symbol: string
  z: number
  /** the element's name, lower case: "sodium" */
  element: string
  charge: number
  /** its electrons per shell, as an atom or ion */
  shells: number[]
  /** the neutral atom's */
  atomShells: number[]
}

export type Species = { kind: 'atom'; atom: Atom } | { kind: 'ionic'; compound: Compound } | { kind: 'covalent'; molecule: Molecule }

export type Read =
  | { ok: true; species: Species; name: string }
  /** with the listed molecules sharing the formula, when there are several */
  | { ok: false; message: string; request: boolean; choices?: Listed[]; listed?: Listed }

/** Element names as teachers write them, British spellings included. */
const ELEMENT_NAMES = new Map<string, string>([
  ...NAMED.map((e) => [e.name.toLowerCase(), e.symbol] as [string, string]),
  ['aluminium', 'Al'],
  ['sulphur', 'S'],
  ['caesium', 'Cs'],
])

/** Names of the non-metals' ions. */
const ANION_NAMES: Record<string, string> = {
  nitride: 'N',
  phosphide: 'P',
  oxide: 'O',
  sulfide: 'S',
  sulphide: 'S',
  fluoride: 'F',
  chloride: 'Cl',
  bromide: 'Br',
  iodide: 'I',
}

/** Molecules by name. The diatomic elements' names mean their molecules;
 *  "chlorine atom" is the atom. */
const MOLECULE_NAMES: Record<string, string> = {
  water: 'H2O',
  methane: 'CH4',
  ammonia: 'NH3',
  hydrogen: 'H2',
  nitrogen: 'N2',
  oxygen: 'O2',
  fluorine: 'F2',
  chlorine: 'Cl2',
  bromine: 'Br2',
  iodine: 'I2',
  'carbon dioxide': 'CO2',
  'hydrogen chloride': 'HCl',
  'hydrogen fluoride': 'HF',
  'hydrogen bromide': 'HBr',
  'hydrogen iodide': 'HI',
  'hydrogen sulfide': 'H2S',
  'hydrogen sulphide': 'H2S',
  'hydrogen cyanide': 'HCN',
  'carbon disulfide': 'CS2',
  'carbon disulphide': 'CS2',
  'tetrachloromethane': 'CCl4',
  'carbon tetrachloride': 'CCl4',
  'phosphorus trichloride': 'PCl3',
  'boron trifluoride': 'BF3',
  'nitrogen trichloride': 'NCl3',
  silane: 'SiH4',
  phosphine: 'PH3',
}

const ion = (symbol: string) => `${symbol}${(chargeText(ionCharge(symbol)!).length > 1 ? ' ' : '') + chargeText(ionCharge(symbol)!).replace('−', '-')}`

/** The formula a name stands for, or undefined when it isn't one. */
export function formulaOfName(typed: string): string | undefined {
  const name = typed.trim().toLowerCase().replace(/\s+/g, ' ')
  if (MOLECULE_NAMES[name]) return MOLECULE_NAMES[name]
  const words = name.split(' ')
  const element = ELEMENT_NAMES.get(words[0])
  if (words.length === 1) return element ?? (ANION_NAMES[name] && ion(ANION_NAMES[name]))
  if (words.length !== 2) return undefined
  if (words[1] === 'atom' && element) return element
  if (words[1] === 'ion') {
    const symbol = element ?? ANION_NAMES[words[0]]
    return symbol && ionCharge(symbol) ? ion(symbol) : undefined
  }
  const anion = ANION_NAMES[words[1]]
  if (element && anion && METALS.includes(element)) {
    const [m, x] = balancedCounts(ionCharge(element)!, ionCharge(anion)!)
    return `${element}${m > 1 ? m : ''}${anion}${x > 1 ? x : ''}`
  }
  return undefined
}

function readAtom(symbol: string, charge: number): Read {
  const fail = (message: string, request = false): Read => ({ ok: false, message, request })
  const z = atomicNumber(symbol)!
  if (z > MAX_ATOM_Z) return fail(`Atoms and ions past calcium aren’t drawn on their own yet.`, true)
  const usual = ionCharge(symbol)
  if (charge && charge !== usual)
    return fail(usual ? `${symbol} forms the ${ionName(symbol, usual)} ion. Type ${ion(symbol)}.` : `${symbol} isn’t drawn as an ion.`)
  const element = NAMED[z - 1].name.toLowerCase()
  return {
    ok: true,
    species: { kind: 'atom', atom: { symbol, z, element, charge, shells: shellsOf(symbol, charge), atomShells: shellsOf(symbol) } },
    name: ionName(symbol, charge),
  }
}

/** What a typed formula or name draws, or why it can't be drawn. */
export function readSpecies(typed: string, which: string): Read {
  if (isListedName(typed)) return molecule(typed, which)
  const text = formulaOfName(typed) ?? typed
  const f = readFormula(text)
  if (!f.ok) return f
  const { tokens, charge } = f
  if (tokens.length === 1 && tokens[0].count === 1) return readAtom(tokens[0].symbol, charge)
  if (tokens.some((t) => METALS.includes(t.symbol))) {
    const c = readCompound(tokens, charge)
    return c.ok ? { ok: true, species: { kind: 'ionic', compound: c.compound }, name: c.compound.name } : c
  }
  return molecule(text, which)
}

function molecule(text: string, which: string): Read {
  const m = readMolecule(text, which)
  return m.ok ? { ok: true, species: { kind: 'covalent', molecule: m.molecule }, name: m.molecule.name } : m
}
