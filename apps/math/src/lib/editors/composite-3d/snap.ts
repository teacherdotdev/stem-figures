// Where a piece lands on a face. A new one is fitted to cover the face (see
// fitOnto), the way the 2D editor's new pieces cover the side they're added
// to; a hole is the same shape flipped into the face. A piece being moved keeps its size and
// lands where the pointer is: lined up with the face's middle when it's
// close, flush with an edge when it's close to one, and otherwise on a
// half-unit grid from the middle.

import {
  faceAxes, newPiece, placeAll, ROTATIONS, turnsTouching, type Align, type Attach, type Dir, type Figure, type Piece, type PieceKind, type Placed,
  type V3,
} from './model.js'
import { defaultTurn } from './presets.js'

/** How close, as a share of the face's size (at least SNAP_MIN units), the pointer must be to a middle or an edge to line up on it. */
const SNAP_SHARE = 0.08
const SNAP_MIN = 0.25
const GRID = 0.5

/**
 * How a piece half as big as `half` sits on `parent`'s `face` with its middle
 * as close as it can to `spot`: for each of the face's two directions, the
 * middle, an edge, or a grid step from the middle.
 */
export function snapOnto(parent: Placed, face: Dir, spot: V3, half: V3): Pick<Attach, 'align' | 'offset'> {
  const align: [Align, Align] = ['middle', 'middle']
  const offset: [number, number] = [0, 0]
  faceAxes(face.axis).forEach((u, i) => {
    const lo = parent.min[u]
    const hi = parent.max[u]
    const tol = Math.max(SNAP_MIN, SNAP_SHARE * (hi - lo))
    const mid = (lo + hi) / 2
    const c = spot[u]
    if (Math.abs(c - mid) < tol) return
    if (Math.abs(c - half[u] - lo) < tol) return void (align[i] = 'start')
    if (Math.abs(hi - (c + half[u])) < tol) return void (align[i] = 'end')
    offset[i] = Math.round((c - mid) / GRID) * GRID
  })
  return { align, offset }
}

/**
 * A new piece of `kind` on `face` of `parentId`: fitted to cover the face and
 * centered on it (a hole sized to sit well inside it). A piece being moved
 * keeps its size and lines up where the pointer is (see snapOnto).
 */
export function pieceAt(f: Figure, kind: PieceKind, cut: boolean, parentId: string, face: Dir, spot: V3, moving: Piece | null = null): Piece | null {
  const placed = placeAll(f.pieces)
  const parent = placed.get(parentId)
  if (!parent || parent.piece.cut) return null
  const on: Attach = { parent: parentId, face: { axis: face.axis, sign: face.sign }, align: ['middle', 'middle'], offset: [0, 0] }
  if (!moving) {
    const p = newPiece(kind, on, cut)
    Object.assign(p, fitOnto(kind, parent, face, cut))
    return p
  }
  const p: Piece = { ...moving, on }
  const trial = placeAll([...f.pieces.filter((q) => q.id !== p.id), p]).get(p.id)
  if (!trial) return null
  const half: V3 = [0, 1, 2].map((i) => (trial.max[i] - trial.min[i]) / 2) as V3
  return { ...p, on: { ...on, ...snapOnto(parent, face, spot, half) } }
}

/**
 * The turn and size that make a new piece cover `face` of `parent`: standing
 * on its own flat bottom against the face, as big across as the face allows
 * (a box or a roof its whole footprint, anything round as wide as the face's
 * narrower side, a half cylinder along its longer side), and as tall as the
 * face is narrow. Of the four ways round it could stand, the one covering most.
 */
export function fitOnto(kind: PieceKind, parent: Placed, face: Dir, hole = false): Pick<Piece, 'turn' | 'size'> {
  const [u, v] = faceAxes(face.axis)
  const eu = parent.max[u] - parent.min[u]
  const ev = parent.max[v] - parent.min[v]
  const narrow = Math.min(eu, ev)
  const nice = (x: number) => Math.max(0.5, Math.round(x * 4) / 4)
  if (kind === 'sphere') return { turn: 0, size: { radius: narrow / 2 } }
  let best: Pick<Piece, 'turn' | 'size'> | null = null
  let bestArea = -1
  // Its bottom against the face; a hole's bottom in the face, facing out, so the hole is the same shape flipped in.
  const toward: Dir = hole ? face : { axis: face.axis, sign: (-face.sign) as 1 | -1 }
  for (const turn of turnsTouching({ axis: 1, sign: -1 }, toward)) {
    const r = ROTATIONS[turn]
    // Which of the piece's own directions runs along each of the face's.
    const own = (world: number) => [0, 1, 2].find((i) => r[world * 3 + i] !== 0)!
    const le: V3 = [0, 0, 0]
    // A box hole the size of the whole face would only shave the shape down, so it starts as a pocket half as wide each way.
    const inset = hole && kind === 'box' ? 0.5 : 1
    le[own(u)] = eu * inset
    le[own(v)] = ev * inset
    le[own(face.axis)] = Infinity
    const size = sizeFrom(kind, le, narrow, nice)
    // Covering most, and of two that cover as much, the lower (a half cylinder long and low, not short and tall).
    const area = footprint(kind, size) - 1e-6 * (size.radius ?? 0)
    if (area > bestArea + 1e-9) (best = { turn, size }), (bestArea = area)
  }
  return best ?? { turn: defaultTurn(kind, face), size: {} }
}

/** A piece's measures from the room it has along its own three directions (Infinity for the one it stands up along). */
function sizeFrom(kind: PieceKind, le: V3, narrow: number, nice: (x: number) => number): Piece['size'] {
  const tall = nice(narrow)
  switch (kind) {
    case 'box': return { length: le[0], height: Number.isFinite(le[1]) ? le[1] : nice(narrow / 2), width: le[2] }
    case 'prism': return { base: le[0], height: Number.isFinite(le[1]) ? le[1] : nice(narrow / 2), length: le[2] }
    case 'cylinder': case 'cone': return { radius: Math.min(le[0], le[2]) / 2, height: tall }
    case 'pyramid': return { base: Math.min(le[0], le[2]), height: nice(narrow * 0.75) }
    case 'hemisphere': return { radius: Math.min(le[0], le[2]) / 2 }
    case 'halfCylinder': return { radius: Math.min(le[0] / 2, le[1]), length: le[2] }
    default: return {}
  }
}

/** How much of a face a piece covers, from its measures. */
function footprint(kind: PieceKind, s: Piece['size']): number {
  const n = (k: keyof Piece['size']) => (Number.isFinite(s[k]) ? (s[k] as number) : 0)
  switch (kind) {
    case 'box': return n('length') * n('width')
    case 'prism': return n('base') * n('length')
    case 'halfCylinder': return 2 * n('radius') * n('length')
    case 'pyramid': return n('base') ** 2
    default: return Math.PI * n('radius') ** 2
  }
}

