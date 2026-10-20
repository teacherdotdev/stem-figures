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
  /** every H circle's radius, in outer radii: 1 unless the H atoms have to
   *  be smaller to keep unbonded circles apart (see hydrogenSize) */
  hydrogen: number
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

/** The gap kept between unbonded circles, in outer radii: atoms at right
 *  angles to each other are 0.12 apart. */
const UNBONDED_GAP = 0.1
/** How wide every overlap is along its bond, in outer radii, whatever the
 *  circles' sizes, so each shared pair has the room it has between two
 *  full-size circles. */
const OVERLAP = 2 - BOND_SPACING
/** The smallest H circle, in outer radii: smaller, and its shared pair would
 *  run into its symbol. */
export const MIN_HYDROGEN = 0.62
const HYDROGEN_STEP = 0.01
/** How far a smaller H's symbol moves from its circle's middle, as a share
 *  of how much smaller the circle is. */
const SYMBOL_SHIFT = 0.6

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

/** Every atom's middle and circle radius, in outer radii, with H circles
 *  of radius `hydrogen`. Other atoms are BOND_SPACING apart; an H atom sits
 *  in from where it would be, along its bond, so its overlap with the atom
 *  it's bonded to stays OVERLAP wide (at full size, BOND_SPACING away). */
export function placeCircles(s: Structure, hydrogen: number) {
  const radius = (i: number) => (s.atoms[i].element === 'H' ? hydrogen : 1)
  return s.atoms.map((a, i) => {
    const [n] = neighbours(s, i)
    if (a.element !== 'H' || n === undefined || s.atoms[n].element === 'H')
      return { x: a.x * BOND_SPACING, y: a.y * BOND_SPACING, r: radius(i) }
    const b = s.atoms[n]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    const apart = 1 + hydrogen - OVERLAP
    return { x: b.x * BOND_SPACING + ((a.x - b.x) / d) * apart, y: b.y * BOND_SPACING + ((a.y - b.y) / d) * apart, r: hydrogen }
  })
}

/** Two atoms not bonded to each other whose circles come within
 *  UNBONDED_GAP, or undefined when every pair is clear. */
export function crowdedPair(s: Structure, hydrogen = 1): [number, number] | undefined {
  const c = placeCircles(s, hydrogen)
  for (let i = 0; i < s.atoms.length; i++)
    for (let j = i + 1; j < s.atoms.length; j++) {
      if (neighbours(s, i).includes(j)) continue
      if (Math.hypot(c[i].x - c[j].x, c[i].y - c[j].y) < c[i].r + c[j].r + UNBONDED_GAP - 1e-9) return [i, j]
    }
  return undefined
}

/** The H circles' radius for a molecule, in outer radii: full size wherever
 *  that keeps unbonded circles apart, as for every molecule with one central
 *  atom; otherwise just small enough, the same for every H, as in C₂H₆,
 *  whose H atoms on the two carbons' same side would be one bond length
 *  apart. Undefined when no size down to MIN_HYDROGEN is clear. */
export function hydrogenSize(s: Structure): number | undefined {
  if (!crowdedPair(s)) return 1
  if (!s.atoms.some((a) => a.element === 'H')) return undefined
  for (let k = 1 - HYDROGEN_STEP; k >= MIN_HYDROGEN - 1e-9; k -= HYDROGEN_STEP) {
    const size = Math.round(k * 100) / 100
    if (!crowdedPair(s, size)) return size
  }
  return undefined
}

/** A molecule from a formula or a listed name, or why it can't be drawn.
 *  Of several listed molecules sharing a formula, the first that can be
 *  drawn, unless `which` picks one. */
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
  const hydrogen = hydrogenSize(s)
  if (hydrogen === undefined) {
    const [a, b] = crowdedPair(s, MIN_HYDROGEN)!.map((i) => s.atoms[i].element)
    return fail(`In ${r.name}, two ${a === b ? `${a} atoms’` : 'atoms’'} circles would overlap, so it can’t be drawn flat yet.`)
  }
  const owners = ownersOf(s, centralOf(s, r.central))
  if (!owners) return fail(`${r.name} has more kinds of atoms than there are marks to tell them apart.`)
  return { ok: true, molecule: { structure: s, hydrogen, owners, name: r.name, listed: r.listed, choices: r.choices } }
}

/** Whether what's typed is a listed molecule's name, like "ethene". */
export const isListedName = (typed: string) => LISTED.some((l) => l.names.includes(typed.trim().toLowerCase()))

// ---- Drawing ------------------------------------------------------------------

export interface MoleculeDrawing {
  /** every atom's middle, outer circle's radius, and where its symbol goes */
  atoms: { x: number; y: number; r: number; symbol: string; label: { x: number; y: number } }[]
  /** the outer circles' radius, every atom's but smaller H atoms' */
  radius: number
  /** inner rings, with every shell drawn */
  rings: { x: number; y: number; r: number }[]
  marks: Mark[]
}

/** The shared pairs of a bond of `order` between circles a and b: each
 *  pair a row across the middle of the overlap, its electron from a on a's
 *  side and from b on b's, the rows ROW_GAP apart along the overlap. */
export function sharedMarks(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }, order: number, ownerA: number, ownerB: number): Mark[] {
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  const ux = (b.x - a.x) / d
  const uy = (b.y - a.y) / d
  // the overlap runs from b's near edge to a's far edge
  const middle = (d - b.r + a.r) / 2
  const mx = a.x + ux * middle
  const my = a.y + uy * middle
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
  const circles = placeCircles(s, m.hydrogen)
  const atoms = circles.map((c, i) => {
    const at = { x: round(c.x * radius), y: round(c.y * radius) }
    // A smaller H's symbol moves out of its circle's middle, away from the
    // atom it's bonded to, so its shared pair doesn't crowd it.
    const [n] = neighbours(s, i)
    const shift = c.r < 1 && n !== undefined ? SYMBOL_SHIFT * (1 - c.r) * radius : 0
    const away = shift ? Math.hypot(c.x - circles[n].x, c.y - circles[n].y) : 1
    const label = shift
      ? { x: round(at.x + ((c.x - circles[n].x) / away) * shift), y: round(at.y + ((c.y - circles[n].y) / away) * shift) }
      : at
    return { ...at, r: round(c.r * radius), symbol: s.atoms[i].element, label }
  })
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

/** How far an atom's circle and marks reach from its middle. */
export const reachOf = (atom: { r: number }) => atom.r + MARK + 1
