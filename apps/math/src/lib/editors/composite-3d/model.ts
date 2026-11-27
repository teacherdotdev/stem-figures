// A composite 3D shape as the teacher builds it: pieces (3D shapes) attached
// face to face, some of them holes, plus how it's labeled and viewed. This
// file is the plain data and the placing of each piece in space; drawing it
// is in draw.ts, the solid geometry in solid.ts.
//
// Space: x to the right, y up, z back (away from the viewer). Every piece has
// its own frame, a box from the origin to its extent (`extent`), which is
// turned a quarter turn at a time and moved into place. Pieces only ever sit
// square to the axes, so every flat face they're attached by faces along one.

export type V3 = [number, number, number]

export const PIECE_KINDS = ['box', 'prism', 'cylinder', 'halfCylinder', 'cone', 'pyramid', 'sphere', 'hemisphere'] as const
export type PieceKind = (typeof PIECE_KINDS)[number]
/** The pieces that can be cut out of another. */
export const CUT_KINDS = ['box', 'prism', 'cylinder', 'halfCylinder', 'cone', 'pyramid', 'hemisphere'] as const satisfies readonly PieceKind[]

export const PIECE_NAMES: Record<PieceKind, string> = {
  box: 'Box', prism: 'Triangular prism', cylinder: 'Cylinder', halfCylinder: 'Half cylinder', cone: 'Cone', pyramid: 'Square pyramid', sphere: 'Sphere', hemisphere: 'Hemisphere',
}

export type SizeKey = 'length' | 'width' | 'height' | 'base' | 'radius'
/** The measures each kind of piece is typed by, in the order its popup asks for them. */
export const SIZE_FIELDS: Record<PieceKind, [SizeKey, string][]> = {
  box: [['length', 'Length'], ['width', 'Width'], ['height', 'Height']],
  prism: [['base', 'Triangle base'], ['height', 'Triangle height'], ['length', 'Length']],
  cylinder: [['radius', 'Radius'], ['height', 'Height']],
  halfCylinder: [['radius', 'Radius'], ['length', 'Length']],
  cone: [['radius', 'Radius'], ['height', 'Height']],
  pyramid: [['base', 'Base side'], ['height', 'Height']],
  sphere: [['radius', 'Radius']],
  hemisphere: [['radius', 'Radius']],
}
export const DEFAULT_SIZES: Record<PieceKind, Partial<Record<SizeKey, number>>> = {
  box: { length: 4, width: 3, height: 2 },
  prism: { base: 4, height: 2, length: 3 },
  cylinder: { radius: 2, height: 4 },
  halfCylinder: { radius: 2, length: 4 },
  cone: { radius: 2, height: 4 },
  pyramid: { base: 4, height: 3 },
  sphere: { radius: 2 },
  hemisphere: { radius: 2 },
}

/** The measures each kind is typed by, and which of its own directions (x, y, z) each one spans, as a share of it. */
export const SPANS: Record<PieceKind, [SizeKey, [number, number][]][]> = {
  box: [['length', [[0, 1]]], ['height', [[1, 1]]], ['width', [[2, 1]]]],
  prism: [['base', [[0, 1]]], ['height', [[1, 1]]], ['length', [[2, 1]]]],
  cylinder: [['radius', [[0, 2], [2, 2]]], ['height', [[1, 1]]]],
  cone: [['radius', [[0, 2], [2, 2]]], ['height', [[1, 1]]]],
  pyramid: [['base', [[0, 1], [2, 1]]], ['height', [[1, 1]]]],
  sphere: [['radius', [[0, 2], [1, 2], [2, 2]]]],
  hemisphere: [['radius', [[0, 2], [2, 2], [1, 1]]]],
  halfCylinder: [['radius', [[0, 2], [1, 1]]], ['length', [[2, 1]]]],
}

/** A face direction in space: along an axis (0 x, 1 y, 2 z), on its plus or minus side. */
export type Dir = { axis: 0 | 1 | 2; sign: 1 | -1 }
/** Where a piece sits along one of its face's two directions: its middle, or flush with one end, moved by `offset`. */
export type Align = 'middle' | 'start' | 'end'

export type Attach = {
  parent: string
  face: Dir
  align: [Align, Align]
  offset: [number, number]
}

export type LineKind = 'height' | 'radius' | 'diameter' | 'slant'

export type Piece = {
  id: string
  kind: PieceKind
  /** Taken away from its parent instead of added to the shape. */
  cut: boolean
  size: Partial<Record<SizeKey, number>>
  /** A triangular prism's triangle: isosceles, or right-angled at its left corner. */
  triangle: 'isosceles' | 'right'
  /** Its quarter turns, as one of ROTATIONS (a hole's put its bottom in the face it's cut into, see holeTurn). */
  turn: number
  /** A hole that goes all the way through its parent, rather than to its own depth. */
  through: boolean
  /** Null for the first piece. */
  on: Attach | null
  /**
   * Measures that fill the face the piece sits on, as Figma's "fill
   * container": kept as wide as the face that way, and the piece centered
   * that way, whatever the face's size. Typing or dragging the measure lets go.
   */
  fill?: Partial<Record<SizeKey, boolean>>
  lines: Partial<Record<LineKind, boolean>>
}

export type LabelMode = 'none' | 'measure' | 'text'
/** How a length is labeled: beside its line, or on a dimension line set off parallel to it with end ticks. */
export type LabelStyle = 'beside' | 'dimension'
/** A label; `style` unset follows the figure's. */
export type PartLabel = { mode: LabelMode; text: string; style?: LabelStyle }
/** Measures across the whole figure, drawn as dimension lines along its outside. */
export type Overall = 'height' | 'width' | 'depth'

export type View = {
  /**
   * Camera: as the 3D view's camera looks at it, turned `yaw` and tipped `pitch`, without perspective.
   * Front: the front face square-on, depth back on a slant (oblique), as textbooks draw. Corner: a camera view turned to show a corner.
   */
  style: 'camera' | 'front' | 'corner'
  /** The camera's turn about the up-down line, in degrees (0 looks at the front, positive comes round to the right). */
  yaw: number
  /** How far the camera looks down, in degrees (negative looks up). */
  pitch: number
  /** How far the corner view is turned from straight on, 15° to 75°. */
  corner: number
  /** How the whole figure is turned for print, square to the axes: an index into ROTATIONS (0, not turned). */
  orient: number
  /** Which way depth runs on the page. */
  side: 'right' | 'left'
  from: 'above' | 'below'
  /** The angle depth runs back at, 30° to 60°, or 90° for straight up (how round shapes are drawn); auto is 90° when every piece is round, else 45°. */
  angle: number | 'auto'
}

export type Figure = {
  pieces: Piece[]
  labels: Record<string, PartLabel>
  /** Dragged labels: [along, across] their part, in page units. */
  moved: Record<string, [number, number]>
  unit: string
  hidden: boolean
  seams: boolean
  cubes: boolean
  view: View
  /** How lengths are labeled unless a label says otherwise. */
  labelStyle: LabelStyle
  overall: Partial<Record<Overall, boolean>>
  /** Hidden lines set on their own, by the key of the line: true left out, false dashed. The rest follow `hidden`. */
  unseen: Record<string, boolean>
}

export const MIN_SIZE = 0.1
export const MAX_SIZE = 1000

// ---------------------------------------------------------------------------
// Quarter turns

/** A turn as a 3×3 matrix of 0s and ±1s, row by row. */
export type Rot = number[]
const IDENTITY: Rot = [1, 0, 0, 0, 1, 0, 0, 0, 1]
export const mulRot = (a: Rot, b: Rot): Rot => {
  const out: number[] = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c])
  return out
}
export const applyRot = (m: Rot, p: V3): V3 => [
  m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
  m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
  m[6] * p[0] + m[7] * p[1] + m[8] * p[2],
]
/** A quarter turn about the up-down line (seen from above, clockwise), tipping forward, and rolling sideways. */
export const QUARTER = {
  spin: [0, 0, -1, 0, 1, 0, 1, 0, 0] as Rot,
  tip: [1, 0, 0, 0, 0, -1, 0, 1, 0] as Rot,
  roll: [0, -1, 0, 1, 0, 0, 0, 0, 1] as Rot,
}
const key = (m: Rot) => m.join(',')
/** All 24 ways to turn a piece square to the axes, the first being no turn. */
export const ROTATIONS: Rot[] = (() => {
  const out: Rot[] = [IDENTITY]
  const seen = new Set([key(IDENTITY)])
  for (let i = 0; i < out.length; i++) {
    for (const q of Object.values(QUARTER)) {
      const m = mulRot(q, out[i])
      if (!seen.has(key(m))) (seen.add(key(m)), out.push(m))
    }
  }
  return out
})()
export const rotIndex = (m: Rot) => ROTATIONS.findIndex((r) => key(r) === key(m))
/** The quarter turn about each axis: tip about x, spin about y, roll about z. */
export const ABOUT: (keyof typeof QUARTER)[] = ['tip', 'spin', 'roll']

/** The turns that put a piece's own flat face `own` against a face pointing `toward` (its outward direction, into what it touches). */
export function turnsTouching(own: Dir, toward: Dir): number[] {
  return ROTATIONS.map((r, i) => [r, i] as const)
    .filter(([r]) => {
      const v = applyRot(r, axisVec(own))
      return v[toward.axis] === toward.sign
    })
    .map(([, i]) => i)
}
/** Which of a piece's own flat faces a turn puts toward `toward`, if any. */
export function touchingFace(p: Pick<Piece, 'kind' | 'triangle' | 'turn'>, toward: Dir): Dir | null {
  const r = ROTATIONS[p.turn] ?? IDENTITY
  return ownFlatFaces(p).find((f) => applyRot(r, axisVec(f))[toward.axis] === toward.sign) ?? null
}

/** The turn after one more quarter turn of `how`. */
export const turned = (turn: number, how: keyof typeof QUARTER) => rotIndex(mulRot(QUARTER[how], ROTATIONS[turn] ?? IDENTITY))

export const axisVec = (d: Dir): V3 => {
  const v: V3 = [0, 0, 0]
  v[d.axis] = d.sign
  return v
}
const dirOf = (v: V3): Dir | null => {
  for (const axis of [0, 1, 2] as const) if (Math.abs(v[axis]) > 0.5) return { axis, sign: v[axis] > 0 ? 1 : -1 }
  return null
}

// ---------------------------------------------------------------------------
// Pieces in their own frame

/** The piece's own box: [x, y, z] sizes before it's turned. */
export function extent(p: Pick<Piece, 'kind' | 'size'>): V3 {
  const s = (k: SizeKey) => p.size[k] ?? DEFAULT_SIZES[p.kind][k] ?? 1
  switch (p.kind) {
    case 'box': return [s('length'), s('height'), s('width')]
    case 'prism': return [s('base'), s('height'), s('length')]
    case 'cylinder': case 'cone': return [2 * s('radius'), s('height'), 2 * s('radius')]
    case 'halfCylinder': return [2 * s('radius'), s('radius'), s('length')]
    case 'pyramid': return [s('base'), s('height'), s('base')]
    case 'sphere': return [2 * s('radius'), 2 * s('radius'), 2 * s('radius')]
    case 'hemisphere': return [2 * s('radius'), s('radius'), 2 * s('radius')]
  }
}

/** The measure that's a hole's depth, or null when its depth is its radius (a hemisphere's or a half cylinder's). */
export const depthKey = (kind: PieceKind): SizeKey | null => (kind === 'hemisphere' || kind === 'halfCylinder' ? null : 'height')

/** The flat faces of a piece in its own frame, as outward directions: the ones that face along an axis. */
export function ownFlatFaces(p: Pick<Piece, 'kind' | 'triangle'>): Dir[] {
  const all: Dir[] = [0, 1, 2].flatMap((axis) => [1, -1].map((sign) => ({ axis, sign }) as Dir))
  switch (p.kind) {
    case 'box': return all
    case 'prism': return [{ axis: 1, sign: -1 }, { axis: 2, sign: 1 }, { axis: 2, sign: -1 }, ...(p.triangle === 'right' ? [{ axis: 0, sign: -1 } as Dir] : [])]
    case 'cylinder': return [{ axis: 1, sign: 1 }, { axis: 1, sign: -1 }]
    case 'halfCylinder': return [{ axis: 1, sign: -1 }, { axis: 2, sign: 1 }, { axis: 2, sign: -1 }]
    case 'cone': case 'pyramid': case 'hemisphere': return [{ axis: 1, sign: -1 }]
    case 'sphere': return []
  }
}

// ---------------------------------------------------------------------------
// Placing pieces in space

export type Placed = {
  /** The piece, its measures as drawn (with any that fill their face worked out). */
  piece: Piece
  /** Turns the piece's own frame into space, about its middle. */
  rot: Rot
  /** Its own box, with a hole's depth worked out. */
  ext: V3
  center: V3
  min: V3
  max: V3
  /** Its flat faces, in space. */
  faces: Dir[]
  /** Its parent's flat faces don't include the one it's on (the parent was turned since). */
  loose: boolean
}

const halfOf = (rot: Rot, ext: V3): V3 => {
  const h = applyRot(rot, [ext[0] / 2, ext[1] / 2, ext[2] / 2])
  return [Math.abs(h[0]), Math.abs(h[1]), Math.abs(h[2])]
}

/** A face's two other directions, in order. */
export const faceAxes = (axis: 0 | 1 | 2): [0 | 1 | 2, 0 | 1 | 2] => (axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1])

/** Every piece placed in space, parents before the pieces on them. Pieces whose parent is missing are left out. */
export function placeAll(pieces: Piece[]): Map<string, Placed> {
  const out = new Map<string, Placed>()
  for (let piece of pieces) {
    const own = extent(piece)
    if (!piece.on) {
      const rot = ROTATIONS[piece.turn] ?? IDENTITY
      const half = halfOf(rot, own)
      const center: V3 = [0, half[1], 0]
      out.set(piece.id, made(piece, rot, own, center, half, false))
      continue
    }
    const parent = out.get(piece.on.parent)
    if (!parent || parent.piece.cut) continue
    const { face, offset } = piece.on
    const align: [Align, Align] = [...piece.on.align]
    const a = face.axis
    const loose = !parent.faces.some((f) => f.axis === face.axis && f.sign === face.sign)
    const rot: Rot = ROTATIONS[piece.turn] ?? IDENTITY
    // Measures that fill the face take its size, and center the piece along the directions they run.
    const fills = filled(piece, rot, parent, face)
    if (fills) {
      piece = { ...piece, size: { ...piece.size, ...fills.size } }
      faceAxes(a).forEach((u, i) => fills.axes.includes(u) && (align[i] = 'middle'))
    }
    const ext: V3 = [...extent(piece)]
    if (piece.cut) {
      // A hole is turned like a piece, its bottom flush with the face and the rest going in. It goes no deeper than its parent,
      // or all the way through it.
      const thick = parent.max[a] - parent.min[a]
      const ia = [0, 1, 2].find((i) => rot[a * 3 + i] !== 0)!
      if (piece.through && cutCanGoThrough(piece.kind) && canGoThrough(parent, face)) ext[ia] = thick
      else ext[ia] = Math.min(ext[ia], thick)
    }
    const half = halfOf(rot, ext)
    const center: V3 = [0, 0, 0]
    if (piece.cut) center[a] = face.sign > 0 ? parent.max[a] - half[a] : parent.min[a] + half[a]
    else center[a] = face.sign > 0 ? parent.max[a] + half[a] : parent.min[a] - half[a]
    faceAxes(a).forEach((u, i) => {
      const o = fills?.axes.includes(u) ? 0 : (offset[i] ?? 0)
      center[u] =
        align[i] === 'start' ? parent.min[u] + half[u] + o
        : align[i] === 'end' ? parent.max[u] - half[u] - o
        : (parent.min[u] + parent.max[u]) / 2 + o
    })
    out.set(piece.id, made(piece, rot, ext, center, half, loose))
  }
  return out
}

function made(piece: Piece, rot: Rot, ext: V3, center: V3, half: V3, loose: boolean): Placed {
  const faces = ownFlatFaces(piece).map((f) => dirOf(applyRot(rot, axisVec(f)))!).filter(Boolean)
  return {
    piece, rot, ext, center, loose, faces,
    min: [center[0] - half[0], center[1] - half[1], center[2] - half[2]],
    max: [center[0] + half[0], center[1] + half[1], center[2] + half[2]],
  }
}

/** A piece's measures that fill the face it's on, worked out from the face, and the directions in space they run. */
function filled(piece: Piece, rot: Rot, parent: Placed, face: Dir): { size: Piece['size']; axes: number[] } | null {
  const keys = Object.entries(piece.fill ?? {}).filter(([, on]) => on).map(([k]) => k as SizeKey)
  if (!keys.length) return null
  const world = [0, 1, 2].map((i) => [0, 1, 2].find((w) => rot[w * 3 + i] !== 0)!)
  const across = new Map<number, number>(faceAxes(face.axis).map((u) => [u, parent.max[u] - parent.min[u]]))
  const size: Piece['size'] = {}
  const axes: number[] = []
  for (const [key, spans] of SPANS[piece.kind]) {
    if (!keys.includes(key)) continue
    const fits = spans.filter(([own]) => across.has(world[own])).map(([own, share]) => across.get(world[own])! / share)
    if (!fits.length) continue
    size[key] = Math.min(...fits)
    for (const [own] of spans) if (across.has(world[own])) axes.push(world[own])
  }
  return { size, axes }
}

/** Whether a hole into this face can go all the way through: only when the face opposite is flat and parallel to it. */
export const canGoThrough = (parent: Placed, face: Dir) =>
  parent.faces.some((f) => f.axis === face.axis && f.sign === face.sign) && parent.faces.some((f) => f.axis === face.axis && f.sign === -face.sign)

/** Whether this kind of piece can go all the way through, as a hole. */
export const cutCanGoThrough = (kind: PieceKind) => kind === 'box' || kind === 'cylinder'

/** A piece's id, and every piece attached onto it, directly or through others. */
export function withAttached(pieces: Piece[], id: string): string[] {
  const out = [id]
  for (let i = 0; i < out.length; i++) for (const p of pieces) if (p.on?.parent === out[i] && !out.includes(p.id)) out.push(p.id)
  return out
}

export function withoutPieces(f: Figure, ids: string[]): Figure {
  return { ...f, pieces: f.pieces.filter((p) => !ids.includes(p.id)) }
}

// ---------------------------------------------------------------------------
// Making and checking

let counter = 0
export const newId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`

export function newPiece(kind: PieceKind, on: Attach | null = null, cut = false): Piece {
  return {
    id: newId(), kind, cut, size: { ...DEFAULT_SIZES[kind] }, triangle: 'isosceles', turn: cut && on ? holeTurn(on.face) : 0,
    through: cut && cutCanGoThrough(kind), on, lines: {},
  }
}

/**
 * A hole is the piece that would be built on the face, flipped into it: its
 * own bottom lies in the face, facing out the way the face does, and the rest
 * goes in (a cone's tip points down into a top face).
 */
export function holeTurn(face: Dir): number {
  return turnsTouching({ axis: 1, sign: -1 }, face)[0] ?? 0
}

export const DEFAULT_VIEW: View = { style: 'front', yaw: 35, pitch: 28, corner: 35, orient: 0, side: 'right', from: 'above', angle: 'auto' }

export function emptyFigure(): Figure {
  return {
    pieces: [], labels: {}, moved: {}, unit: '', hidden: true, seams: false, cubes: false, view: { ...DEFAULT_VIEW }, labelStyle: 'beside', overall: {}, unseen: {},
  }
}

/** The figure the editor opens on: an L-shaped block of two boxes, the lower one long, the upper one on its left end. */
export function starterFigure(): Figure {
  const low: Piece = { ...newPiece('box'), size: { length: 8, width: 4, height: 3 } }
  const high: Piece = {
    ...newPiece('box', { parent: low.id, face: { axis: 1, sign: 1 }, align: ['start', 'middle'], offset: [0, 0] }),
    size: { length: 3, width: 4, height: 4 },
  }
  return { ...emptyFigure(), pieces: [low, high], unit: 'cm' }
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const clampSize = (v: number) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, v))

/** A figure from storage, made safe: anything missing or broken is put right or dropped. */
export function tidyFigure(raw: unknown): Figure {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Figure>
  const base = emptyFigure()
  const pieces: Piece[] = []
  for (const q of Array.isArray(r.pieces) ? r.pieces : []) {
    if (!q || typeof q !== 'object' || !PIECE_KINDS.includes(q.kind) || typeof q.id !== 'string') continue
    const cut = !!q.cut && (CUT_KINDS as readonly string[]).includes(q.kind)
    const size: Partial<Record<SizeKey, number>> = {}
    for (const [k] of SIZE_FIELDS[q.kind as PieceKind]) size[k] = clampSize(num(q.size?.[k], DEFAULT_SIZES[q.kind as PieceKind][k]!))
    let on: Attach | null = null
    if (q.on && typeof q.on === 'object') {
      const f = q.on.face
      const ok = pieces.some((p) => p.id === q.on!.parent && !p.cut) && f && [0, 1, 2].includes(f.axis) && [1, -1].includes(f.sign)
      if (!ok) continue
      const align = (i: number): Align => (['middle', 'start', 'end'].includes(q.on!.align?.[i]) ? q.on!.align[i] : 'middle')
      on = { parent: q.on.parent, face: { axis: f.axis, sign: f.sign }, align: [align(0), align(1)], offset: [num(q.on.offset?.[0], 0), num(q.on.offset?.[1], 0)] }
    } else if (pieces.length) continue // only the first piece stands alone
    if (cut && !on) continue
    pieces.push({
      id: q.id, kind: q.kind, cut, size, triangle: q.triangle === 'right' ? 'right' : 'isosceles',
      turn: ROTATIONS[q.turn] ? q.turn : 0, through: !!q.through,
      on,
      ...(SIZE_FIELDS[q.kind as PieceKind].some(([k]) => q.fill?.[k] === true)
        ? { fill: Object.fromEntries(SIZE_FIELDS[q.kind as PieceKind].filter(([k]) => q.fill?.[k] === true).map(([k]) => [k, true])) }
        : {}),
      lines: Object.fromEntries((['height', 'radius', 'diameter', 'slant'] as const).filter((k) => q.lines?.[k] === true).map((k) => [k, true])),
    })
  }
  const labels: Record<string, PartLabel> = {}
  for (const [k, v] of Object.entries(r.labels ?? {})) {
    if (v && ['none', 'measure', 'text'].includes(v.mode)) {
      labels[k] = { mode: v.mode, text: String(v.text ?? '') }
      if (v.style === 'beside' || v.style === 'dimension') labels[k].style = v.style
    }
  }
  const moved: Record<string, [number, number]> = {}
  for (const [k, v] of Object.entries(r.moved ?? {})) if (Array.isArray(v)) moved[k] = [num(v[0], 0), num(v[1], 0)]
  const v = (r.view ?? {}) as Partial<View>
  const angle = v.angle === 'auto' ? 'auto' : Math.min(90, Math.max(30, num(v.angle, 45)))
  return {
    pieces, labels, moved,
    unit: typeof r.unit === 'string' ? r.unit.slice(0, 12) : base.unit,
    hidden: r.hidden ?? base.hidden, seams: !!r.seams, cubes: !!r.cubes,
    labelStyle: r.labelStyle === 'dimension' ? 'dimension' : 'beside',
    unseen: Object.fromEntries(Object.entries(r.unseen ?? {}).filter(([, v]) => typeof v === 'boolean') as [string, boolean][]),
    overall: Object.fromEntries((['height', 'width', 'depth'] as const).filter((k) => r.overall?.[k] === true).map((k) => [k, true])),
    view: {
      style: v.style === 'corner' || v.style === 'camera' ? v.style : 'front',
      yaw: ((((num(v.yaw, 35) + 180) % 360) + 360) % 360) - 180,
      pitch: Math.min(89, Math.max(-89, num(v.pitch, 28))),
      corner: Math.min(75, Math.max(15, num(v.corner, 35))),
      orient: Number.isInteger(v.orient) && (v.orient as number) >= 0 && (v.orient as number) < 24 ? (v.orient as number) : 0,
      side: v.side === 'left' ? 'left' : 'right', from: v.from === 'below' ? 'below' : 'above',
      angle: v.angle === undefined ? 'auto' : angle,
    },
  }
}

// Through JSON, as a figure is plain data and a piece of it may come from a reactive proxy.
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

/** Whether unit cubes can be drawn: every piece a box with whole-number sizes. */
export function cubesPossible(pieces: Piece[]): boolean {
  return pieces.length > 0 && pieces.every((p) => p.kind === 'box' && SIZE_FIELDS.box.every(([k]) => Number.isInteger(p.size[k] ?? 0)))
}

/** Whether every piece is round, so the figure is drawn seen from a little above with depth straight up. */
export const allRound = (pieces: Piece[]) =>
  pieces.length > 0 &&
  pieces.every((p) => p.kind === 'sphere' || (['cylinder', 'cone', 'hemisphere'].includes(p.kind) && (ROTATIONS[p.turn] ?? [])[4] !== 0))
// (Each round piece upright too: a lying cylinder, as in a capsule, seen with depth straight up would look flat.)

/** The angle depth runs back at, in degrees. */
export const viewAngle = (f: Figure) => (f.view.angle === 'auto' ? (allRound(f.pieces) ? 90 : 45) : f.view.angle)

/** A short description of the figure for screen readers and exports. */
export function describe(f: Figure): string {
  const added = f.pieces.filter((p) => !p.cut).map((p) => PIECE_NAMES[p.kind].toLowerCase())
  const cuts = f.pieces.filter((p) => p.cut).map((p) => PIECE_NAMES[p.kind].toLowerCase())
  if (!added.length) return 'An empty composite 3D shape'
  return `A composite 3D shape made of ${list(added)}${cuts.length ? `, with ${list(cuts)} cut out` : ''}`
}
const list = (xs: string[]) => {
  const counts = new Map<string, number>()
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1)
  const words = [...counts].map(([x, n]) => (n === 1 ? `a ${x}` : `${n} ${x}${x.endsWith('s') ? 'es' : 's'}`))
  return words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
}
