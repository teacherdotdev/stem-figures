// A covalent molecule's dot-and-cross diagram from Lewis Structures' correct
// structure: which molecules can be drawn, whose mark each atom's electrons
// are, and where every circle and electron goes.
//
// A molecule is drawn when Lewis Structures draws it (octet rule, flat) with
// no charge, no atom past an octet, and every formal charge 0. Then each
// atom gives exactly `order` electrons to each of its bonds and keeps its
// lone electrons, so which electrons are dots and which crosses follows
// directly. Anything else (CO, SO₂, O₃: a dative bond) gets a message.

import { octetOf } from '../lewis-structures/elements'
import { electronGroups } from '../lewis-structures/layout'
import { LISTED, type Listed } from '../lewis-structures/listed'
import { resolve } from '../lewis-structures/resolve'
import { electronsAround, formalCharge, neighbours, type Structure } from '../lewis-structures/structure'
import { shellsOf } from './ionic'
import { BOND_SPACING, MARK, PAIR_GAP, ROW_GAP, innerRadius, moleculeRadius, ringMarks, round, toXY, type Mark } from './shells'
import { MARK_KINDS } from './marks'

export interface Molecule {
  /** its correct structure, placed flat, positions in bond lengths */
  structure: Structure
  /** each atom's mark, by index into MARK_KINDS before any swap */
  owners: number[]
  /** the formula with real subscripts: "CH₃OH" */
  name: string
  listed?: Listed
  /** listed molecules sharing the typed formula, to choose between */
  choices: Listed[]
}

export type ReadMolecule =
  | { ok: true; molecule: Molecule }
  /** with the listed molecules sharing the formula, when there are several */
  | { ok: false; message: string; request: boolean; choices?: Listed[]; listed?: Listed }

/** Unbonded atoms must be at least this many bond lengths apart, so their
 *  circles don't touch: atoms at right angles are √2 apart. */
const UNBONDED = 2.02 / BOND_SPACING

/** The atom that gets dots: a built structure's central atom, or the first
 *  atom of a listed one bonded to more than one other. */
const centralOf = (s: Structure, central: number | undefined) =>
  central ?? Math.max(0, s.atoms.findIndex((_, i) => neighbours(s, i).length > 1))

/** Each atom's mark: the central atom's are dots, the outer atoms' crosses,
 *  and any other kind open circles, then squares, so two bonded atoms are
 *  never marked alike. Atoms of one element share a mark, except where two
 *  of them bond to each other: Cl₂ is one dots and one crosses, and in
 *  C₂H₄ the other C gets open circles. Undefined past MARK_KINDS. */
export function ownersOf(s: Structure, central: number): number[] | undefined {
  const n = s.atoms.length
  // Atoms of one element bonded to each other alternate between two halves.
  const half = Array<number>(n).fill(-1)
  for (const start of [central, ...s.atoms.map((_, i) => i)]) {
    if (half[start] >= 0) continue
    half[start] = 0
    const queue = [start]
    while (queue.length) {
      const i = queue.shift()!
      for (const j of neighbours(s, i))
        if (half[j] < 0 && s.atoms[j].element === s.atoms[i].element) {
          half[j] = 1 - half[i]
          queue.push(j)
        }
    }
  }
  const kindOf = (i: number) => `${s.atoms[i].element} ${half[i]}`
  const kinds: string[] = []
  const add = (k: string) => kinds.includes(k) || kinds.push(k)
  add(kindOf(central))
  const outer = (k: string) => s.atoms.every((_, i) => kindOf(i) !== k || neighbours(s, i).length === 1)
  for (let i = 0; i < n; i++) if (outer(kindOf(i))) add(kindOf(i))
  for (let i = 0; i < n; i++) add(kindOf(i))
  if (kinds.length > MARK_KINDS.length) return undefined
  return s.atoms.map((_, i) => kinds.indexOf(kindOf(i)))
}

/** Two atoms not bonded to each other that are too close, their circles
 *  overlapping, or undefined when every pair is clear. In C₂H₆ the H atoms
 *  on the two carbons' same side are one bond length apart, so a flat
 *  drawing with every circle the same size can't hold it. */
export function crowdedPair(s: Structure): [number, number] | undefined {
  for (let i = 0; i < s.atoms.length; i++)
    for (let j = i + 1; j < s.atoms.length; j++) {
      if (neighbours(s, i).includes(j)) continue
      if (Math.hypot(s.atoms[i].x - s.atoms[j].x, s.atoms[i].y - s.atoms[j].y) < UNBONDED) return [i, j]
    }
  return undefined
}

/** A molecule from a formula or a listed name, or why it can't be drawn.
 *  Of several listed molecules sharing a formula, the first that can be
 *  drawn, unless `which` picks one (C₂H₆O is dimethyl ether, since ethanol
 *  can't be drawn flat). */
export function readMolecule(typed: string, which: string): ReadMolecule {
  const first = checkMolecule(typed, which)
  if (first.ok || which || !first.choices) return first
  for (const l of first.choices) {
    const m = checkMolecule(typed, l.id)
    if (m.ok) return m
  }
  return first
}

function checkMolecule(typed: string, which: string): ReadMolecule {
  const r = resolve({ formula: typed, which, rule: 'octet', shape: 'flat' })
  if (!r.ok) return { ok: false, message: r.message.replace('a correct Lewis structure', 'a correct structure'), request: r.request }
  const choices = r.choices.length ? { choices: r.choices, listed: r.listed } : {}
  const fail = (message: string, request = true): ReadMolecule => ({ ok: false, message, request, ...choices })
  const s = r.correct[0]
  if (s.charge) return fail(`Polyatomic ions like ${r.name} aren’t drawn yet.`)
  const past = s.atoms.findIndex((_, i) => electronsAround(s, i) > octetOf(s.atoms[i].element))
  if (past >= 0) return fail(`${r.name} has more than eight electrons around ${s.atoms[past].element}, which isn’t drawn yet.`)
  if (s.atoms.some((_, i) => formalCharge(s, i) !== 0))
    return fail(`In ${r.name}, one atom gives both electrons of a shared pair (a dative bond), which isn’t drawn yet.`)
  const overlap = crowdedPair(s)
  if (overlap) {
    const [a, b] = overlap.map((i) => s.atoms[i].element)
    return fail(`In ${r.name}, two ${a === b ? `${a} atoms’` : 'atoms’'} circles would overlap, so it can’t be drawn flat yet.`)
  }
  const owners = ownersOf(s, centralOf(s, r.central))
  if (!owners) return fail(`${r.name} has more kinds of atoms than there are marks to tell them apart.`)
  return { ok: true, molecule: { structure: s, owners, name: r.name, listed: r.listed, choices: r.choices } }
}

/** Whether what's typed is a listed molecule's name, like "ethene". */
export const isListedName = (typed: string) => LISTED.some((l) => l.names.includes(typed.trim().toLowerCase()))

// ---- Drawing ------------------------------------------------------------------

export interface MoleculeDrawing {
  /** every atom's middle */
  atoms: { x: number; y: number; symbol: string }[]
  /** the outer circles' radius, the same for every atom */
  radius: number
  /** inner rings, with every shell drawn */
  rings: { x: number; y: number; r: number }[]
  marks: Mark[]
}

/** The shared pairs of a bond of `order` between atoms at a and b: each
 *  pair a row across the overlap, its electron from a on a's side and from
 *  b on b's, the rows ROW_GAP apart along the overlap. */
export function sharedMarks(a: { x: number; y: number }, b: { x: number; y: number }, order: number, ownerA: number, ownerB: number): Mark[] {
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  const ux = (b.x - a.x) / d
  const uy = (b.y - a.y) / d
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const col = PAIR_GAP / 2
  const marks: Mark[] = []
  for (let k = 0; k < order; k++) {
    const t = (k - (order - 1) / 2) * ROW_GAP
    // along the overlap, perpendicular to the bond
    const px = mx - uy * t
    const py = my + ux * t
    marks.push({ x: round(px - ux * col), y: round(py - uy * col), owner: ownerA }, { x: round(px + ux * col), y: round(py + uy * col), owner: ownerB })
  }
  return marks
}

/** The inner shells of an element's atom, innermost first: none for H. */
export const innerShells = (symbol: string) => shellsOf(symbol).slice(0, -1)

/** Where every circle and electron of a molecule goes, around (0, 0) at the
 *  first atom, with or without its inner shells. */
export function drawMolecule(m: Molecule, allShells: boolean): MoleculeDrawing {
  const s = m.structure
  const inner = allShells ? Math.max(...s.atoms.map((a) => innerShells(a.element).length)) : 0
  const radius = moleculeRadius(inner)
  const spacing = BOND_SPACING * radius
  const atoms = s.atoms.map((a) => ({ x: round(a.x * spacing), y: round(a.y * spacing), symbol: a.element }))
  const rings: MoleculeDrawing['rings'] = []
  const marks: Mark[] = []

  atoms.forEach((p, i) => {
    if (allShells)
      innerShells(p.symbol).forEach((count, shell) => {
        const r = innerRadius(shell)
        rings.push({ x: p.x, y: p.y, r })
        marks.push(...ringMarks(p.x, p.y, r, shell, Array(count).fill(m.owners[i])))
      })
    // lone electrons on the atom's own circle, two to a side
    const half = (PAIR_GAP / 2 / radius) * (180 / Math.PI)
    for (const g of electronGroups(s, i)) {
      const angles = g.electrons === 2 ? [g.direction - half, g.direction + half] : [g.direction]
      for (const angle of angles) marks.push({ ...toXY(p.x, p.y, radius, angle), owner: m.owners[i] })
    }
  })
  for (const b of s.bonds) marks.push(...sharedMarks(atoms[b.a], atoms[b.b], b.order, m.owners[b.a], m.owners[b.b]))
  return { atoms, radius, rings, marks }
}

/** How far a molecule's drawing reaches from its atoms' middles. */
export const moleculeReach = (d: MoleculeDrawing) => d.radius + MARK + 1
