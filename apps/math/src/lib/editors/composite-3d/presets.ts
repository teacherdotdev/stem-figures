// The figures the editor offers to start from, the most common in the
// examples teachers sent (composite-3d-examples-review.md, section 5), each
// built from pieces like any other and labeled the way a textbook would.

import { measureEdges } from './draw.js'
import {
  emptyFigure, newPiece, ownFlatFaces, turned, turnsTouching, type Attach, type Dir, type Figure, type LineKind, type Piece, type PieceKind,
  type SizeKey,
} from './model.js'

/** The turn a new piece starts with on a face: standing on its own bottom when it has one, that face against the face it's on. */
export function defaultTurn(kind: PieceKind, face: Dir): number {
  if (face.axis === 1 && face.sign === 1) return 0
  const own = ownFlatFaces({ kind, triangle: 'isosceles' })
  const bottom = own.find((d) => d.axis === 1 && d.sign === -1) ?? own[0]
  if (!bottom) return 0
  return turnsTouching(bottom, { axis: face.axis, sign: (-face.sign) as 1 | -1 })[0] ?? 0
}

type Spec = { kind: PieceKind; size: Partial<Record<SizeKey, number>>; on?: [number, Dir, Attach['align']?]; cut?: boolean; turn?: number; lines?: LineKind[] }

const UP: Dir = { axis: 1, sign: 1 }
const FRONT: Dir = { axis: 2, sign: -1 }

function build(specs: Spec[], unit: string, extra: Partial<Figure> = {}): Figure {
  const pieces: Piece[] = []
  for (const sp of specs) {
    const on = sp.on ? { parent: pieces[sp.on[0]].id, face: sp.on[1], align: sp.on[2] ?? ['middle', 'middle'], offset: [0, 0] as [number, number] } : null
    const p = newPiece(sp.kind, on, !!sp.cut)
    p.size = { ...sp.size }
    // A hole keeps the flipped turn newPiece gives it.
    if (sp.turn !== undefined) p.turn = sp.turn
    else if (on && !sp.cut) p.turn = defaultTurn(sp.kind, on.face)
    for (const l of sp.lines ?? []) p.lines[l] = true
    pieces.push(p)
  }
  const f: Figure = { ...emptyFigure(), pieces, unit, ...extra }
  const labels = measureEdges(f)
  for (const p of pieces) for (const l of Object.keys(p.lines)) labels[`${p.id}:${l}`] = { mode: 'measure', text: '' }
  for (const k of Object.keys(f.overall)) labels[`all:${k}`] = { mode: 'measure', text: '' }
  return { ...f, labels }
}

export type Preset = { id: string; name: string; make: () => Figure }

export const PRESETS: Preset[] = [
  { id: 'l-shape', name: 'L-shape', make: () => build([
    { kind: 'box', size: { length: 8, width: 4, height: 3 } },
    { kind: 'box', size: { length: 3, width: 4, height: 4 }, on: [0, UP, ['start', 'middle']] },
  ], 'cm') },
  { id: 'stacked', name: 'Stacked boxes', make: () => build([
    { kind: 'box', size: { length: 8, width: 6, height: 3 } },
    { kind: 'box', size: { length: 4, width: 3, height: 3 } , on: [0, UP] },
  ], 'cm') },
  { id: 'stairs', name: 'Stairs', make: () => build([
    { kind: 'box', size: { length: 6, width: 3, height: 1 } },
    { kind: 'box', size: { length: 4, width: 3, height: 1 }, on: [0, UP, ['start', 'middle']] },
    { kind: 'box', size: { length: 2, width: 3, height: 1 }, on: [1, UP, ['start', 'middle']] },
  ], 'ft') },
  { id: 'house', name: 'House', make: () => build([
    { kind: 'box', size: { length: 6, width: 5, height: 4 } },
    { kind: 'prism', size: { base: 6, height: 3, length: 5 }, on: [0, UP], lines: ['height'] },
  ], 'ft') },
  { id: 'tower', name: 'Tower', make: () => build([
    { kind: 'box', size: { length: 4, width: 4, height: 6 } },
    { kind: 'pyramid', size: { base: 4, height: 3 }, on: [0, UP], lines: ['height'] },
  ], 'm') },
  { id: 'silo', name: 'Silo', make: () => build([
    { kind: 'cylinder', size: { radius: 3, height: 8 }, lines: ['radius', 'height'] },
    { kind: 'hemisphere', size: { radius: 3 }, on: [0, UP] },
  ], 'm') },
  { id: 'pencil', name: 'Pencil', make: () => build([
    { kind: 'cylinder', size: { radius: 1, height: 8 }, lines: ['diameter', 'height'] },
    { kind: 'cone', size: { radius: 1, height: 2 }, on: [0, UP], lines: ['height'] },
  ], 'cm') },
  { id: 'ice-cream', name: 'Ice cream cone', make: () => build([
    { kind: 'cone', size: { radius: 2, height: 6 }, turn: turned(turned(0, 'tip'), 'tip'), lines: ['height'] },
    { kind: 'hemisphere', size: { radius: 2 }, on: [0, UP], lines: ['radius'] },
  ], 'cm') },
  { id: 'capsule', name: 'Capsule', make: () => build([
    { kind: 'cylinder', size: { radius: 2, height: 6 }, turn: turned(turned(0, 'tip'), 'spin'), lines: ['diameter'] },
    { kind: 'hemisphere', size: { radius: 2 }, on: [0, { axis: 0, sign: 1 }] },
    { kind: 'hemisphere', size: { radius: 2 }, on: [0, { axis: 0, sign: -1 }] },
  ], 'mm', { overall: { width: true } }) },
  { id: 'cylinder-on-box', name: 'Cylinder on a box', make: () => build([
    { kind: 'box', size: { length: 8, width: 6, height: 2 } },
    { kind: 'cylinder', size: { radius: 2, height: 4 }, on: [0, UP], lines: ['radius', 'height'] },
  ], 'in') },
  { id: 'cube-hole', name: 'Cube with a hole', make: () => build([
    { kind: 'box', size: { length: 6, width: 6, height: 6 } },
    { kind: 'cylinder', size: { radius: 1.5, height: 6 }, on: [0, FRONT], cut: true, lines: ['radius'] },
  ], 'cm') },
  { id: 'carved-cone', name: 'Cone carved from a cylinder', make: () => build([
    { kind: 'cylinder', size: { radius: 3, height: 6 }, lines: ['radius', 'height'] },
    { kind: 'cone', size: { radius: 3, height: 6 }, on: [0, UP], cut: true },
  ], 'cm') },
  { id: 'chest', name: 'Treasure chest', make: () => build([
    { kind: 'box', size: { length: 6, width: 4, height: 3 } },
    { kind: 'halfCylinder', size: { radius: 2, length: 6 }, on: [0, UP], turn: turned(0, 'spin'), lines: ['radius'] },
  ], 'in') },
]

/** The figure the editor opens on. */
export const firstPreset = () => PRESETS[0].make()

