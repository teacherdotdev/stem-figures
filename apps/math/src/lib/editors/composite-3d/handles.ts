// Editing a selected piece on the plane it sits on, as Tinkercad does: its
// footprint (where it meets the face it's on, or the ground) with a handle at
// each corner to resize it across the plane, a handle on top to change its
// height, and sliding it about on the plane. A piece never leaves its plane,
// and slides at most until only an edge or a corner still touches.

import { faceAxes, placeAll, SPANS, type Attach, type Figure, type Piece, type SizeKey, type V3 } from './model.js'

/** Sizes snap to this, and so does where a piece is slid to. */
export const STEP = 0.5
const snap = (x: number) => Math.round(x / STEP) * STEP
const MIN = 0.5

/** The plane a piece sits on and its footprint there. `out` is the way its height goes from the plane: out of the face, or into it for a hole. */
export type Footprint = {
  axis: 0 | 1 | 2
  u: 0 | 1 | 2
  v: 0 | 1 | 2
  level: number
  out: 1 | -1
  lo: [number, number]
  hi: [number, number]
  height: number
  /** The face it's on, along u and v: where it can slide to. Null for the first piece, on the open ground. */
  face: { lo: [number, number]; hi: [number, number] } | null
}

export function footprintOf(f: Figure, id: string): Footprint | null {
  const placed = placeAll(f.pieces)
  const pl = placed.get(id)
  if (!pl) return null
  const on = pl.piece.on
  const parent = on ? placed.get(on.parent) : null
  if (on && !parent) return null
  const axis = on ? on.face.axis : 1
  const sign = on ? on.face.sign : 1
  const [u, v] = faceAxes(axis)
  const level = parent ? (sign > 0 ? parent.max[axis] : parent.min[axis]) : 0
  const out = (pl.piece.cut ? -sign : sign) as 1 | -1
  return {
    axis, u, v, level, out,
    lo: [pl.min[u], pl.min[v]], hi: [pl.max[u], pl.max[v]], height: pl.max[axis] - pl.min[axis],
    face: parent ? { lo: [parent.min[u], parent.min[v]], hi: [parent.max[u], parent.max[v]] } : null,
  }
}


/**
 * A piece's measures once the directions in space it's been dragged along
 * (`dragged`) are `ext` long. A measure spanning a dragged direction takes it
 * (the larger, if it spans two, as a cylinder's radius spans both across);
 * the rest stay.
 */
export function sizeFor(p: Piece, rot: number[], ext: V3, dragged: (0 | 1 | 2)[]): Piece['size'] {
  const size = { ...p.size }
  // Which direction in space each of the piece's own directions runs along.
  const world = [0, 1, 2].map((i) => [0, 1, 2].find((w) => rot[w * 3 + i] !== 0)!) as (0 | 1 | 2)[]
  for (const [key, spans] of SPANS[p.kind]) {
    const wanted = spans.filter(([own]) => dragged.includes(world[own])).map(([own, share]) => ext[world[own]] / share)
    if (wanted.length) size[key] = Math.max(MIN / 2, ...wanted)
  }
  return size
}

/** Where a piece sits on its face, from where its middle is: lined up with the face's middle, moved by however far. */
function onAt(on: Attach, fp: Footprint, center: [number, number]): Attach {
  const mid = fp.face ? [(fp.face.lo[0] + fp.face.hi[0]) / 2, (fp.face.lo[1] + fp.face.hi[1]) / 2] : [0, 0]
  return { ...on, align: ['middle', 'middle'], offset: [center[0] - mid[0], center[1] - mid[1]] }
}

/** Keeps a footprint's middle where at least a corner of it still touches the face. */
function clampTouching(fp: Footprint, center: [number, number], half: [number, number]): [number, number] {
  if (!fp.face) return center
  const f = fp.face
  return [0, 1].map((i) => Math.min(f.hi[i] + half[i], Math.max(f.lo[i] - half[i], center[i]))) as [number, number]
}

/** The piece slid on its plane so its footprint's middle is at `center` (snapped, and kept touching). */
export function slide(f: Figure, id: string, center: [number, number]): Attach | null {
  const p = f.pieces.find((q) => q.id === id)
  const fp = footprintOf(f, id)
  if (!p?.on || !fp) return null
  const half: [number, number] = [(fp.hi[0] - fp.lo[0]) / 2, (fp.hi[1] - fp.lo[1]) / 2]
  const mid = fp.face ? [(fp.face.lo[0] + fp.face.hi[0]) / 2, (fp.face.lo[1] + fp.face.hi[1]) / 2] : [0, 0]
  const snapped: [number, number] = [mid[0] + snap(center[0] - mid[0]), mid[1] + snap(center[1] - mid[1])]
  return onAt(p.on, fp, clampTouching(fp, snapped, half))
}

/**
 * The piece resized across its plane by dragging one corner of its
 * footprint to `to`, the opposite corner (`fixed`) staying put. The first
 * piece, standing in the middle of the ground, grows evenly instead.
 */
export function resizeCorner(f: Figure, id: string, fixed: [number, number], to: [number, number]): Pick<Piece, 'size' | 'on'> | null {
  const p = f.pieces.find((q) => q.id === id)
  const fp = footprintOf(f, id)
  const pl = placeAll(f.pieces).get(id)
  if (!p || !fp || !pl) return null
  const ext: V3 = [0, 0, 0]
  if (!p.on) {
    const c = [(fp.lo[0] + fp.hi[0]) / 2, (fp.lo[1] + fp.hi[1]) / 2]
    ext[fp.u] = Math.max(MIN, snap(2 * Math.abs(to[0] - c[0])))
    ext[fp.v] = Math.max(MIN, snap(2 * Math.abs(to[1] - c[1])))
    return { size: sizeFor(p, pl.rot, ext, [fp.u, fp.v]), on: null }
  }
  ext[fp.u] = Math.max(MIN, snap(Math.abs(to[0] - fixed[0])))
  ext[fp.v] = Math.max(MIN, snap(Math.abs(to[1] - fixed[1])))
  const size = sizeFor(p, pl.rot, ext, [fp.u, fp.v])
  // Its new footprint, from the fixed corner toward the dragged one.
  const grown = placeAll([...f.pieces.filter((q) => q.id !== id), { ...p, size }]).get(id)
  if (!grown) return null
  const w = [grown.max[fp.u] - grown.min[fp.u], grown.max[fp.v] - grown.min[fp.v]]
  const center: [number, number] = [0, 1].map((i) => fixed[i] + Math.sign(to[i] - fixed[i] || 1) * (w[i] / 2)) as [number, number]
  return { size, on: onAt(p.on, fp, clampTouching(fp, center, [w[0] / 2, w[1] / 2])) }
}

/** The piece made `height` tall, out from its plane (into it, for a hole). */
export function resizeHeight(f: Figure, id: string, height: number): Piece['size'] | null {
  const p = f.pieces.find((q) => q.id === id)
  const fp = footprintOf(f, id)
  const pl = placeAll(f.pieces).get(id)
  if (!p || !fp || !pl) return null
  const ext: V3 = [0, 0, 0]
  ext[fp.axis] = Math.max(MIN, snap(height))
  return sizeFor(p, pl.rot, ext, [fp.axis])
}


/**
 * The measures of a piece that run across the face it sits on, each with the
 * value that makes it span the face that way (as wide as the face, for one
 * spanning both ways, like a cylinder's radius). Measures that stand up from
 * the face (a height) aren't here; nor is anything for the first piece.
 */
export function fittable(f: Figure, id: string): Partial<Record<SizeKey, number>> {
  const p = f.pieces.find((q) => q.id === id)
  const fp = footprintOf(f, id)
  const pl = placeAll(f.pieces).get(id)
  if (!p || !fp?.face || !pl) return {}
  const world = [0, 1, 2].map((i) => [0, 1, 2].find((w) => pl.rot[w * 3 + i] !== 0)!)
  const across: Record<number, number> = { [fp.u]: fp.face.hi[0] - fp.face.lo[0], [fp.v]: fp.face.hi[1] - fp.face.lo[1] }
  const out: Partial<Record<SizeKey, number>> = {}
  for (const [key, spans] of SPANS[p.kind]) {
    const fits = spans.filter(([own]) => world[own] in across).map(([own, share]) => across[world[own]] / share)
    if (fits.length && fits.length === spans.filter(([own]) => world[own] !== fp.axis).length) out[key] = Math.min(...fits)
  }
  return out
}
