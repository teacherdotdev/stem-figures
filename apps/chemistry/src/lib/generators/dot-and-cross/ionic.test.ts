import { describe, expect, it } from 'vitest'
import { METALS, NON_METALS, balancedCounts, ionCharge, readCompound, readFormula, type Token } from './ionic'
import { formulaOfName, readSpecies } from './read'

const compound = (formula: string) => {
  const f = readFormula(formula)
  if (!f.ok) throw new Error(f.message)
  return readCompound(f.tokens, f.charge)
}

describe('reading a formula', () => {
  it('takes pasted subscripts and superscripts', () => {
    expect(readFormula('MgCl₂')).toEqual({ ok: true, tokens: [{ symbol: 'Mg', count: 1 }, { symbol: 'Cl', count: 2 }], charge: 0 })
    expect(readFormula('Mg²⁺')).toMatchObject({ ok: true, charge: 2 })
    expect(readFormula('Mg 2+')).toMatchObject({ ok: true, charge: 2 })
  })

  it('says what’s wrong with one it can’t read', () => {
    expect(readFormula('mgcl2')).toMatchObject({ ok: false, message: expect.stringContaining('capital letter') })
    expect(readFormula('Xy')).toMatchObject({ ok: false, message: expect.stringContaining('isn’t an element') })
    expect(readFormula('FeCl3')).toMatchObject({ ok: false, request: true, message: expect.stringContaining('transition metals') })
    expect(readFormula('')).toMatchObject({ ok: false })
  })
})

describe('ions', () => {
  it('take their charges from their groups', () => {
    const charges = Object.fromEntries(['Na', 'K', 'Mg', 'Ca', 'Al', 'N', 'O', 'S', 'F', 'Cl', 'Br', 'I'].map((e) => [e, ionCharge(e)]))
    expect(charges).toEqual({ Na: 1, K: 1, Mg: 2, Ca: 2, Al: 3, N: -3, O: -2, S: -2, F: -1, Cl: -1, Br: -1, I: -1 })
    for (const e of [...METALS, ...NON_METALS]) expect(ionCharge(e), e).toBeDefined()
    for (const e of ['C', 'Si', 'He', 'Ne', 'Ar', 'H', 'B']) expect(ionCharge(e), e).toBeUndefined()
  })

  it('balance by the smallest whole numbers', () => {
    expect(balancedCounts(2, -1)).toEqual([1, 2])
    expect(balancedCounts(3, -2)).toEqual([2, 3])
    expect(balancedCounts(2, -2)).toEqual([1, 1])
    expect(balancedCounts(1, -3)).toEqual([3, 1])
  })
})

describe('ionic compounds', () => {
  it('read MgCl₂ as one Mg²⁺ and two Cl⁻, balanced', () => {
    const c = compound('MgCl2')
    expect(c).toMatchObject({
      ok: true,
      compound: { name: 'MgCl₂', metal: { symbol: 'Mg', charge: 2, count: 1, shells: [2, 8] }, nonMetal: { symbol: 'Cl', charge: -1, count: 2, shells: [2, 8, 8] } },
    })
  })

  it('read every compound on the Cambridge list', () => {
    for (const f of ['NaCl', 'MgO', 'CaF2', 'MgCl2', 'Na2O', 'Li2O', 'K2S', 'Al2O3', 'AlF3', 'Mg3N2', 'RbI', 'SrBr2']) expect(compound(f).ok, f).toBe(true)
  })

  it('read a compound written non-metal first, and name it metal first', () => {
    expect(compound('Cl2Mg')).toMatchObject({ ok: true, compound: { name: 'MgCl₂' } })
  })

  it('refuse MgCl and say what would balance', () => {
    expect(compound('MgCl')).toEqual({ ok: false, message: 'MgCl has charges +2 and −1; MgCl₂ balances.', request: false })
    expect(compound('Al2O')).toMatchObject({ ok: false, message: expect.stringContaining('Al₂O₃ balances') })
    expect(compound('NaCl2')).toMatchObject({ ok: false, message: expect.stringContaining('NaCl balances') })
  })

  it('refuse metals and non-metals outside the lists', () => {
    expect(compound('NaH')).toMatchObject({ ok: false, request: true, message: expect.stringContaining('N, O, F, S, Cl, Br or I') })
    expect(compound('Na3P')).toMatchObject({ ok: false, request: true })
    expect(compound('NaK')).toMatchObject({ ok: false, message: expect.stringContaining('both metals') })
    expect(compound('NaOH')).toMatchObject({ ok: false, request: true, message: expect.stringContaining('polyatomic') })
    expect(compound('NaCl-')).toMatchObject({ ok: false, message: expect.stringContaining('no overall charge') })
  })

  it('point a count read as a charge to the ion', () => {
    expect(compound('Mg2+')).toMatchObject({ ok: false, message: 'For the Mg²⁺ ion, type Mg 2+.' })
  })
})

describe('names', () => {
  it('stand for formulas', () => {
    const names: Record<string, string> = {
      water: 'H2O',
      Methane: 'CH4',
      chlorine: 'Cl2',
      'chlorine atom': 'Cl',
      sodium: 'Na',
      'sodium ion': 'Na+',
      'magnesium ion': 'Mg 2+',
      'chloride ion': 'Cl-',
      oxide: 'O 2-',
      'magnesium chloride': 'MgCl2',
      'aluminium oxide': 'Al2O3',
      'aluminum oxide': 'Al2O3',
      'sodium oxide': 'Na2O',
      'calcium fluoride': 'CaF2',
    }
    for (const [name, formula] of Object.entries(names)) expect(formulaOfName(name), name).toBe(formula)
    expect(formulaOfName('H2O')).toBeUndefined()
    expect(formulaOfName('carbon ion')).toBeUndefined()
  })

  it('draw what they stand for, and listed molecules by name', () => {
    expect(readSpecies('magnesium chloride', '')).toMatchObject({ ok: true, name: 'MgCl₂', species: { kind: 'ionic' } })
    expect(readSpecies('ethene', '')).toMatchObject({ ok: true, name: 'C₂H₄', species: { kind: 'covalent' } })
    expect(readSpecies('sodium', '')).toMatchObject({ ok: true, name: 'Na', species: { kind: 'atom' } })
  })
})

describe('atoms and ions on their own', () => {
  it('are any element from H to Ca, as an atom or its usual ion', () => {
    expect(readSpecies('Ca', '')).toMatchObject({ ok: true, species: { kind: 'atom', atom: { shells: [2, 8, 8, 2], charge: 0 } } })
    expect(readSpecies('K+', '')).toMatchObject({ ok: true, name: 'K⁺', species: { atom: { shells: [2, 8, 8] } } })
    expect(readSpecies('Al 3+', '')).toMatchObject({ ok: true, species: { atom: { shells: [2, 8] } } })
    expect(readSpecies('N 3-', '')).toMatchObject({ ok: true, name: 'N³⁻', species: { atom: { shells: [2, 8], atomShells: [2, 5] } } })
    expect(readSpecies('H', '')).toMatchObject({ ok: true, species: { atom: { shells: [1] } } })
  })

  it('refuse other charges and elements past calcium', () => {
    expect(readSpecies('Na 2+', '')).toMatchObject({ ok: false, message: 'Na forms the Na⁺ ion. Type Na+.' })
    expect(readSpecies('O-', '')).toMatchObject({ ok: false, message: 'O forms the O²⁻ ion. Type O 2-.' })
    expect(readSpecies('C 4+', '')).toMatchObject({ ok: false, message: 'C isn’t drawn as an ion.' })
    expect(readSpecies('Br', '')).toMatchObject({ ok: false, request: true })
  })

  it('are read from one element, never two of it', () => {
    const tokens: Token[] = [{ symbol: 'Na', count: 2 }]
    expect(readCompound(tokens, 0)).toMatchObject({ ok: false, message: expect.stringContaining('2 Na atoms') })
  })
})
