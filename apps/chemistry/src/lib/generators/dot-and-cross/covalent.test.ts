import { describe, expect, it } from 'vitest'
import { octetOf } from '../lewis-structures/elements'
import { neighbours } from '../lewis-structures/structure'
import { drawMolecule, innerShells, readMolecule, type Molecule } from './covalent'
import { markOf } from './marks'
import { BOND_SPACING, MARK, OUTER_R, ROW_GAP, innerRadius, moleculeRadius } from './shells'

const CAMBRIDGE = ['H2', 'Cl2', 'HCl', 'H2O', 'CH4', 'NH3', 'O2', 'N2', 'CO2', 'C2H4', 'CH3OH']
const OTHERS = ['HF', 'HCN', 'PCl3', 'H2S', 'BF3', 'CCl4', 'C2H2', 'CH2O', 'NCl3', 'SiH4', 'OF2', 'H2O2', 'CH3OCH3', 'HBr', 'Br2', 'I2', 'CS2']

function molecule(formula: string): Molecule {
  const r = readMolecule(formula, '')
  if (!r.ok) throw new Error(`${formula}: ${r.message}`)
  return r.molecule
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

/** Every check a drawn molecule must pass, with or without inner shells. */
function checkDrawing(formula: string, all: boolean) {
  const m = molecule(formula)
  const s = m.structure
  const d = drawMolecule(m, all)
  const R = d.radius
  const inner = new Set(d.rings.flatMap((ring) => d.marks.filter((k) => Math.abs(dist(k, ring) - ring.r) < 0.01)))
  const outerMarks = d.marks.filter((k) => !inner.has(k))
  const onCircle = (k: { x: number; y: number }, i: number) => Math.abs(dist(k, d.atoms[i]) - R) < 0.01
  const inside = (k: { x: number; y: number }, i: number) => dist(k, d.atoms[i]) + MARK <= R + 0.01

  // each overlap holds its bond order's pairs, each pair one mark from each atom
  for (const b of s.bonds) {
    const lens = outerMarks.filter((k) => inside(k, b.a) && inside(k, b.b))
    expect(lens, `${formula} ${b.a}–${b.b}`).toHaveLength(2 * b.order)
    expect(lens.filter((k) => k.owner === m.owners[b.a]), `${formula} ${b.a}–${b.b}`).toHaveLength(b.order)
    expect(lens.filter((k) => k.owner === m.owners[b.b]), `${formula} ${b.a}–${b.b}`).toHaveLength(b.order)
    expect(markOf(m.owners[b.a], false), `${formula}: a pair is two different marks`).not.toBe(markOf(m.owners[b.b], false))
  }
  // every electron sits on its own atom's circle or inside an overlap
  for (const k of outerMarks) {
    const atom = s.atoms.findIndex((_, i) => onCircle(k, i))
    const lens = s.bonds.some((b) => inside(k, b.a) && inside(k, b.b))
    expect(atom >= 0 || lens, `${formula}: mark at ${k.x}, ${k.y}`).toBe(true)
    if (atom >= 0) expect(k.owner, `${formula}: a lone electron is its atom’s`).toBe(m.owners[atom])
    // and never inside the circle of an atom it doesn't belong to
    s.atoms.forEach((_, i) => {
      if (atom >= 0 && i !== atom && !neighbours(s, atom).includes(i)) expect(dist(k, d.atoms[i]), `${formula}: lone mark in atom ${i}`).toBeGreaterThan(R + MARK)
    })
  }
  // every atom ends with a full outer shell: its lone electrons and its bonds' pairs
  s.atoms.forEach((a, i) => {
    const own = outerMarks.filter((k) => onCircle(k, i)).length
    const shared = s.bonds.filter((b) => b.a === i || b.b === i).reduce((n, b) => n + 2 * b.order, 0)
    if (!['B', 'Be', 'Al'].includes(a.element)) expect(own + shared, `${formula} atom ${i} (${a.element})`).toBe(octetOf(a.element))
  })
  // no two unbonded circles overlap
  s.atoms.forEach((_, i) =>
    s.atoms.forEach((__, j) => {
      if (j > i && !neighbours(s, i).includes(j)) expect(dist(d.atoms[i], d.atoms[j]), `${formula} ${i} and ${j}`).toBeGreaterThan(2 * R)
    }),
  )
  // inner rings stay clear of every overlap
  for (const ring of d.rings) expect(ring.r + MARK, `${formula} ring ${ring.r}`).toBeLessThan((BOND_SPACING - 1) * R)
  return { m, d }
}

describe('the Cambridge list', () => {
  for (const formula of CAMBRIDGE)
    it(`draws ${formula} correctly`, () => {
      checkDrawing(formula, false)
      checkDrawing(formula, true)
    })
})

describe('other molecules', () => {
  for (const formula of OTHERS)
    it(`draws ${formula} correctly`, () => {
      checkDrawing(formula, false)
      checkDrawing(formula, true)
    })
})

describe('molecules that can’t be drawn yet', () => {
  it('give a message for a dative bond, not a wrong drawing', () => {
    for (const formula of ['CO', 'SO2', 'O3', 'N2O', 'HNO3'])
      expect(readMolecule(formula, ''), formula).toMatchObject({ ok: false, request: true, message: expect.stringContaining('dative bond') })
  })

  it('give a message for polyatomic ions and expanded octets', () => {
    expect(readMolecule('NH4+', '')).toMatchObject({ ok: false, message: expect.stringContaining('Polyatomic ions') })
    expect(readMolecule('SF6', '')).toMatchObject({ ok: false, message: expect.stringContaining('more than eight electrons around S') })
    expect(readMolecule('PCl5', '')).toMatchObject({ ok: false })
  })

  it('give a message where two circles would overlap in a flat drawing', () => {
    expect(readMolecule('C2H6', '')).toMatchObject({ ok: false, message: 'In C₂H₆, two H atoms’ circles would overlap, so it can’t be drawn flat yet.' })
  })

  it('pick the first listed molecule sharing a formula that can be drawn, keeping the choice', () => {
    expect(readMolecule('C2H6O', '')).toMatchObject({ ok: true, molecule: { listed: { id: 'dimethyl-ether' } } })
    const ethanol = readMolecule('C2H6O', 'ethanol')
    expect(ethanol).toMatchObject({ ok: false, listed: { id: 'ethanol' } })
    expect(!ethanol.ok && ethanol.choices?.map((l) => l.id)).toEqual(['ethanol', 'dimethyl-ether'])
  })
})

describe('marks', () => {
  const marksOf = (formula: string) => {
    const m = molecule(formula)
    return Object.fromEntries(m.structure.atoms.map((a, i) => [a.element + (m.structure.atoms.filter((b) => b.element === a.element).length > 1 ? i : ''), markOf(m.owners[i], false)]))
  }

  it('are dots for the central atom and crosses for the outer atoms', () => {
    expect(marksOf('H2O')).toEqual({ O: 'dot', H0: 'cross', H1: 'cross' })
    expect(marksOf('NH3')).toMatchObject({ N: 'dot' })
    expect(new Set(Object.values(marksOf('CH4')))).toEqual(new Set(['dot', 'cross']))
  })

  it('give a third kind of atom open circles', () => {
    expect(marksOf('HCN')).toEqual({ H: 'cross', C: 'dot', N: 'circle' })
    const methanol = molecule('CH3OH')
    const by = (el: string) => new Set(methanol.structure.atoms.flatMap((a, i) => (a.element === el ? [markOf(methanol.owners[i], false)] : [])))
    expect([by('C'), by('H'), by('O')]).toEqual([new Set(['dot']), new Set(['cross']), new Set(['circle'])])
  })

  it('tell two bonded atoms of one element apart', () => {
    expect(marksOf('Cl2')).toEqual({ Cl0: 'dot', Cl1: 'cross' })
    expect(marksOf('N2')).toEqual({ N0: 'dot', N1: 'cross' })
    const ethene = molecule('C2H4')
    const carbons = ethene.structure.atoms.flatMap((a, i) => (a.element === 'C' ? [ethene.owners[i]] : []))
    expect(new Set(carbons).size).toBe(2)
  })

  it('swap dots and crosses, leaving open circles', () => {
    expect([markOf(0, true), markOf(1, true), markOf(2, true)]).toEqual(['cross', 'dot', 'circle'])
  })
})

describe('the geometry', () => {
  it('has room in a triple bond’s overlap for its three pairs', () => {
    const R = OUTER_R
    const d = BOND_SPACING * R
    // the overlap's half-width at the outer rows, beside the pair's marks
    const t = ROW_GAP
    expect(Math.sqrt(R * R - t * t) - d / 2).toBeGreaterThan(5.5 + MARK)
    expect(2 * Math.sqrt(R * R - (d / 2) ** 2)).toBeGreaterThan(2 * (t + MARK))
  })

  it('keeps atoms at right angles clear of each other', () => {
    expect(Math.SQRT2 * BOND_SPACING).toBeGreaterThan(2.05)
  })

  it('grows the circles so inner shells fit inside the overlaps', () => {
    expect(moleculeRadius(0)).toBe(OUTER_R)
    for (const symbol of ['C', 'Cl', 'Br', 'I']) {
      const n = innerShells(symbol).length
      expect(innerRadius(n - 1) + MARK, symbol).toBeLessThan((BOND_SPACING - 1) * moleculeRadius(n))
    }
  })
})
