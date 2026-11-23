// A built structure's VSEPR shape (see CONTEXT.md "VSEPR figure"): how many
// atoms and lone pairs sit around its central atom, what that shape and its
// electron geometry are called, and where each atom and lone pair points in
// 3D. Directions are unit vectors in the textbook view: x right, y down, z
// toward the viewer. The figure is always drawn at the electron geometry's
// ideal angles; only the bond angle labels say lone pairs squeeze them.

import { ELEMENTS } from '../lewis-structures/elements'
import type { Structure } from '../lewis-structures/structure'

export type Vec = [number, number, number]

/** One kind of bond angle the shape has, and the pairs of atom slots that
 *  make it (indices into the shape's atom directions). */
export interface AngleKind {
  ideal: number
  /** whether lone pairs squeeze it below the ideal angle */
  squeezed: boolean
  pairs: [number, number][]
}

interface ShapeSpec {
  name: string
  electronGeometry: string
  /** where the outer atoms go, the ones that take the more electronegative atoms first */
  atoms: Vec[]
  lone: Vec[]
  /** degrees the textbook view is tipped toward the viewer, so a wedge and a
   *  dash on the same side don't land on top of each other */
  tilt: number
  /** degrees it's first turned round the up-down axis, so two lone pairs
   *  pointing toward and away from the viewer don't hide each other */
  yaw?: number
  angles: AngleKind[]
  /** atoms go by electronegativity, the most electronegative first (axial) */
  byElectronegativity?: boolean
  /** the first slot (the apex, opposite the lone pair) takes the odd atom
   *  out: the one with the most bonds to it, else the one of its element
   *  alone, as O in XeOF₄ */
  apexOddOneOut?: boolean
}

const S3 = Math.sqrt(3) / 2
const R2 = Math.SQRT1_2
// A tetrahedron with one corner up and one down-left in the page, the other
// two to the right, one toward the viewer and one away.
const TA: Vec = [0, -1, 0]
const TB: Vec = [-0.9428, 0.3333, 0]
const TC: Vec = [0.4714, 0.3333, 0.8165]
const TD: Vec = [0.4714, 0.3333, -0.8165]
// A trigonal bipyramid: axial up and down, one equatorial corner to the left
// in the page, two to the right, toward and away from the viewer.
const UP: Vec = [0, -1, 0]
const DOWN: Vec = [0, 1, 0]
const E1: Vec = [-1, 0, 0]
const E2: Vec = [0.5, 0, S3]
const E3: Vec = [0.5, 0, -S3]
// An octahedron's equatorial square, turned so its corners are two toward the
// viewer and two away, in order round the square.
const SQUARE: Vec[] = [
  [R2, 0, R2],
  [-R2, 0, R2],
  [-R2, 0, -R2],
  [R2, 0, -R2],
]

const allPairs = (n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n - i - 1 }, (_, j) => [i, i + j + 1] as [number, number])).flat()
const roundSquare = (from: number) => [0, 1, 2, 3].map((i) => [from + i, from + ((i + 1) % 4)] as [number, number])

/** Every shape drawn, by atoms and lone groups around the central atom. */
const SHAPES: Record<string, ShapeSpec> = {
  '1,0': { name: 'linear', electronGeometry: 'linear', atoms: [[1, 0, 0]], lone: [], tilt: 0, angles: [] },
  '1,1': { name: 'linear', electronGeometry: 'linear', atoms: [[1, 0, 0]], lone: [[-1, 0, 0]], tilt: 0, angles: [] },
  '1,2': { name: 'linear', electronGeometry: 'trigonal planar', atoms: [[1, 0, 0]], lone: [[-0.5, -S3, 0], [-0.5, S3, 0]], tilt: 0, angles: [] },
  '1,3': {
    name: 'linear',
    electronGeometry: 'tetrahedral',
    atoms: [[1, 0, 0]],
    lone: [[-0.3333, -0.9428, 0], [-0.3333, 0.4714, 0.8165], [-0.3333, 0.4714, -0.8165]],
    tilt: -20,
    angles: [],
  },
  '2,0': { name: 'linear', electronGeometry: 'linear', atoms: [[-1, 0, 0], [1, 0, 0]], lone: [], tilt: 0, angles: [{ ideal: 180, squeezed: false, pairs: [[0, 1]] }] },
  '2,1': { name: 'bent', electronGeometry: 'trigonal planar', atoms: [[-S3, 0.5, 0], [S3, 0.5, 0]], lone: [UP], tilt: 0, angles: [{ ideal: 120, squeezed: true, pairs: [[0, 1]] }] },
  '2,2': {
    name: 'bent',
    electronGeometry: 'tetrahedral',
    atoms: [[-0.8165, 0.5774, 0], [0.8165, 0.5774, 0]],
    lone: [[0, -0.5774, 0.8165], [0, -0.5774, -0.8165]],
    tilt: 0,
    yaw: 28,
    angles: [{ ideal: 109.5, squeezed: true, pairs: [[0, 1]] }],
  },
  '2,3': {
    name: 'linear',
    electronGeometry: 'trigonal bipyramidal',
    atoms: [[-1, 0, 0], [1, 0, 0]],
    lone: [UP, [0, 0.5, S3], [0, 0.5, -S3]],
    tilt: -20,
    angles: [{ ideal: 180, squeezed: false, pairs: [[0, 1]] }],
  },
  '3,0': { name: 'trigonal planar', electronGeometry: 'trigonal planar', atoms: [UP, [-S3, 0.5, 0], [S3, 0.5, 0]], lone: [], tilt: 0, angles: [{ ideal: 120, squeezed: false, pairs: allPairs(3) }] },
  '3,1': { name: 'trigonal pyramidal', electronGeometry: 'tetrahedral', atoms: [TB, TC, TD], lone: [TA], tilt: -20, angles: [{ ideal: 109.5, squeezed: true, pairs: allPairs(3) }] },
  '3,2': {
    name: 'T-shaped',
    electronGeometry: 'trigonal bipyramidal',
    atoms: [UP, DOWN, E1],
    lone: [E2, E3],
    tilt: -20,
    angles: [{ ideal: 90, squeezed: true, pairs: [[0, 2], [1, 2]] }],
    byElectronegativity: true,
  },
  '4,0': { name: 'tetrahedral', electronGeometry: 'tetrahedral', atoms: [TA, TB, TC, TD], lone: [], tilt: -20, angles: [{ ideal: 109.5, squeezed: false, pairs: allPairs(4) }] },
  '4,1': {
    name: 'seesaw',
    electronGeometry: 'trigonal bipyramidal',
    atoms: [UP, DOWN, E2, E3],
    lone: [E1],
    tilt: -20,
    angles: [
      { ideal: 90, squeezed: true, pairs: [[0, 2], [0, 3], [1, 2], [1, 3]] },
      { ideal: 120, squeezed: true, pairs: [[2, 3]] },
    ],
    byElectronegativity: true,
  },
  '4,2': { name: 'square planar', electronGeometry: 'octahedral', atoms: SQUARE, lone: [UP, DOWN], tilt: -35, angles: [{ ideal: 90, squeezed: false, pairs: roundSquare(0) }] },
  '5,0': {
    name: 'trigonal bipyramidal',
    electronGeometry: 'trigonal bipyramidal',
    atoms: [UP, DOWN, E1, E2, E3],
    lone: [],
    tilt: -20,
    angles: [
      { ideal: 90, squeezed: false, pairs: [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4]] },
      { ideal: 120, squeezed: false, pairs: [[2, 3], [2, 4], [3, 4]] },
    ],
    byElectronegativity: true,
  },
  '5,1': {
    name: 'square pyramidal',
    electronGeometry: 'octahedral',
    atoms: [UP, ...SQUARE],
    lone: [DOWN],
    tilt: -20,
    angles: [
      { ideal: 90, squeezed: true, pairs: [[0, 1], [0, 2], [0, 3], [0, 4]] },
      { ideal: 90, squeezed: false, pairs: roundSquare(1) },
    ],
    apexOddOneOut: true,
  },
  '6,0': {
    name: 'octahedral',
    electronGeometry: 'octahedral',
    atoms: [UP, DOWN, ...SQUARE],
    lone: [],
    tilt: -20,
    angles: [{ ideal: 90, squeezed: false, pairs: [...roundSquare(2), ...[2, 3, 4, 5].flatMap((i) => [[0, i], [1, i]] as [number, number][])] }],
  },
}

/** A radical with three atoms and its lone electron round a period 2 atom,
 *  as CH₃•: planar, with the lone electron in a p orbital at right angles to
 *  the plane (toward the viewer), not squeezing the 120° angles. */
const PLANAR_RADICAL: ShapeSpec = { ...SHAPES['3,0'], lone: [[0, 0, 1]] }

/** An atom or lone group around the central atom. */
export type Group =
  | { kind: 'atom'; atom: number; order: number; dir: Vec }
  | { kind: 'lone'; electrons: 1 | 2; dir: Vec }

export interface VseprShape {
  central: number
  /** atoms bonded to the central atom (X) */
  x: number
  /** lone groups on the central atom (E): pairs, and a lone electron on its own */
  e: number
  name: string
  electronGeometry: string
  /** e.g. AX₃E */
  axe: string
  /** the outer atoms, in the order of the spec's atom slots */
  atoms: Extract<Group, { kind: 'atom' }>[]
  lone: Extract<Group, { kind: 'lone' }>[]
  angles: AngleKind[]
}

export type ShapeResult = { ok: true; shape: VseprShape } | { ok: false; message: string }

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'
const sub = (n: number) => (n === 1 ? '' : [...String(n)].map((d) => SUBSCRIPTS[Number(d)]).join(''))

/** AX₃E for 3 atoms and 1 lone group. */
export const axeOf = (x: number, e: number) => `AX${sub(x)}${e ? `E${sub(e)}` : ''}`

/** Turns a direction round the up-down axis by `yaw`, then tips it toward
 *  the viewer by `tilt` round the x axis (negative brings the bottom
 *  forward, as if seen from a little above). */
function placed([x0, y, z0]: Vec, spec: ShapeSpec): Vec {
  const a = ((spec.yaw ?? 0) * Math.PI) / 180
  const x = x0 * Math.cos(a) + z0 * Math.sin(a)
  const z = -x0 * Math.sin(a) + z0 * Math.cos(a)
  const t = (spec.tilt * Math.PI) / 180
  return [x, y * Math.cos(t) - z * Math.sin(t), y * Math.sin(t) + z * Math.cos(t)]
}

/** The shape around a structure's central atom. */
export function vseprShape(s: Structure, central: number): ShapeResult {
  const bonds = s.bonds.filter((b) => b.order > 0 && (b.a === central || b.b === central))
  const outer = bonds.map((b) => ({ atom: b.a === central ? b.b : b.a, order: b.order }))
  const lone = s.atoms[central].lone
  const pairs = Math.floor(lone / 2)
  const single = lone % 2
  const x = outer.length
  const e = pairs + single
  const el = s.atoms[central].element
  const planarRadical = x === 3 && pairs === 0 && single === 1 && ELEMENTS[el].period === 2
  const spec: ShapeSpec | undefined = planarRadical ? PLANAR_RADICAL : SHAPES[`${x},${e}`]
  if (!spec)
    return {
      ok: false,
      message: `${el} has ${x} atom${x === 1 ? '' : 's'} and ${e} lone pair${e === 1 ? '' : 's'} around it (${axeOf(x, e)}), which VSEPR Shapes doesn’t draw yet.`,
    }

  // Like atoms side by side, in the order they first come; for a trigonal
  // bipyramid the most electronegative take the axial slots.
  const first = new Map<string, number>()
  outer.forEach((o, i) => first.set(s.atoms[o.atom].element, first.get(s.atoms[o.atom].element) ?? i))
  const en = (o: (typeof outer)[number]) => ELEMENTS[s.atoms[o.atom].element].electronegativity
  const sorted = [...outer].sort((p, q) =>
    spec.byElectronegativity && en(p) !== en(q) ? en(q) - en(p) : first.get(s.atoms[p.atom].element)! - first.get(s.atoms[q.atom].element)!,
  )
  if (spec.apexOddOneOut) {
    const count = (o: (typeof outer)[number]) => outer.filter((other) => s.atoms[other.atom].element === s.atoms[o.atom].element).length
    const apex = sorted.reduce((best, o) => (o.order > best.order || (o.order === best.order && count(o) < count(best)) ? o : best))
    sorted.splice(sorted.indexOf(apex), 1)
    sorted.unshift(apex)
  }
  // A lone electron on its own pushes the bonds less than a pair does (NO₂
  // is 134°, ClO₂ 117.6°), so no angle is labeled as squeezed below ideal.
  const angles = single ? spec.angles.map((a) => ({ ...a, squeezed: false })) : spec.angles

  const loneGroups: VseprShape['lone'] = Array.from({ length: e }, (_, i) => ({
    kind: 'lone' as const,
    electrons: (i < pairs ? 2 : 1) as 1 | 2,
    dir: placed(spec.lone[i], spec),
  }))
  return {
    ok: true,
    shape: {
      central,
      x,
      e,
      name: spec.name,
      electronGeometry: spec.electronGeometry,
      axe: axeOf(x, e),
      atoms: sorted.map((o, i) => ({ kind: 'atom' as const, atom: o.atom, order: o.order, dir: placed(spec.atoms[i], spec) })),
      lone: loneGroups,
      angles,
    },
  }
}

/** A bond angle as labeled before the teacher types their own: the ideal
 *  angle, with "<" when lone pairs squeeze it. */
export const defaultAngleText = (a: AngleKind) => `${a.squeezed ? '<' : ''}${a.ideal}°`
