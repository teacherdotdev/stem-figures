// A composite shape built by hand in the Composite Shape Editor: pieces
// (rectangles, triangles, semicircles) joined side to side, and everything
// the teacher labels on them. Everything here is plain data and arithmetic,
// so the page (CompositeEditor.svelte) only handles pointers.
//
// Every length is in the figure's units, drawn to scale, with y down as on
// the page. The first piece sits on its base side, reaching up; every other
// piece sits on a stretch of one of its parent's straight sides, reaching
// outward, and is kept as offsets along that side, so it rides along when
// its parent changes.
//
// Changes spread through seams (see `change`): a piece covering the whole of
// the side it sits on keeps covering it, whichever of the two is resized, and
// a piece on part of a side keeps its length and its place along the side.
//
// Parts that carry labels are keyed by the outline, which is worked out
// fresh from the pieces each time: a side by the piece side it starts on
// and which stretch of it ("p1:2#0"), a corner by the side starting there.

import { add, cross, dot, len, mul, perp, sub, unit, type Vec } from '$lib/shapes/vec.js'
import { ANGLE_DEFAULTS, ANGLE_LABELS, MARKS, SHADES, type AngleLabel, type AngleStyle } from '$lib/labeling/options.js'
import { LINE_STYLES, type LineStyle } from '$lib/shapes/parts.js'
import { CAPS, type Cap } from '$lib/generators/parallel-lines/settings.js'

export type { AngleStyle, Cap, LineStyle, Vec }
/** How an extra line is drawn: solid, dashed or dotted, or hidden, still splitting sides and making angles but not drawn. */
export type ExtraStyle = LineStyle | 'hidden'
export const LINE_WEIGHTS = { thin: 'Thin', regular: 'Regular', thick: 'Thick' }
export type LineWeight = keyof typeof LINE_WEIGHTS
export { ANGLE_DEFAULTS, SHADES }

const EPS = 1e-6
const near = (p: Vec, q: Vec) => Math.abs(p[0] - q[0]) < EPS && Math.abs(p[1] - q[1]) < EPS
export const vec = { add, sub, mul, dot, cross, len, unit, perp, near }

/** How far a new piece reaches out from its side, whatever the side's length, and the smallest any length can be. */
export const NEW_DEPTH = 3
export const MIN_SIZE = 0.25

export const PIECE_KINDS = ['rectangle', 'triangle', 'semicircle', 'quarter'] as const
export type PieceKind = (typeof PIECE_KINDS)[number]
export const PIECE_NAMES: Record<PieceKind, string> = { rectangle: 'Rectangle', triangle: 'Triangle', semicircle: 'Semicircle', quarter: 'Quarter circle' }
/** What can start a shape or go on a side; a quarter circle goes in a corner (see cornerPieces). */
export const SIDE_KINDS = ['rectangle', 'triangle', 'semicircle'] as const satisfies readonly PieceKind[]

/** Where a piece sits on its parent: a stretch of one of the parent's straight sides, from and to along it. */
export interface Mount {
  parent: string
  side: number
  from: number
  to: number
  /** When it was added across several pieces' lined-up sides: the others it sits on, besides `parent`. */
  with?: { parent: string; side: number }[]
}

/** What a triangle's popup can lock: its angles A and B at the ends of its base and C at its tip, and its sides a (opposite A), b and c (its base). */
export const TRIANGLE_PARTS = ['A', 'B', 'C', 'a', 'b', 'c'] as const
export type TrianglePart = (typeof TRIANGLE_PARTS)[number]

export interface Piece {
  id: string
  kind: PieceKind
  /**
   * A piece standing on its own (the first, or one whose parent was
   * deleted) has no mount: its base runs from `at`, `width` long, along
   * `frame.u` (right, unless it was left tilted), reaching out along
   * `frame.out` (up, unless so).
   */
  mount: Mount | null
  at: Vec
  frame?: { u: Vec; out: Vec }
  /** Its base's length (for a mounted piece, mount.to − mount.from). */
  width: number
  /** How far it reaches out from its base (a semicircle's is half its base, a quarter circle's all of it). */
  depth: number
  /** A triangle's tip, how far along its base from its start (below 0 or past the base when it leans out); a quarter circle's center, at its base's start (0) or end (its width). */
  tip: number
  /** Index into SHADES; 0 is none. */
  shade: number
  /** A triangle's locked parts, kept while others are typed. */
  locks: TrianglePart[]
}

export type LabelMode = AngleLabel
export const LABEL_MODES = ANGLE_LABELS

/** `style` and `weight` draw the side (or a curve, kept under its piece's id and ":arc") as extra lines can be; solid and regular unless set. */
export interface SideStyle { label: LabelMode; text: string; ticks: number; arrows: number; style?: ExtraStyle; weight?: LineWeight }
/** A spot on a piece, in its own directions (along its base, and out), so it rides along with the piece. */
export interface Anchor { piece: string; s: number; t: number }
/**
 * Where an extra line ends, kept as how it's found rather than where it is,
 * so it keeps its meaning when the shape changes: one of a piece's corners,
 * halfway between two points, the foot of a height (where a line from a
 * point meets the line through two others at a right angle), where two
 * lines cross, or a spot on a semicircle's curve. Lines drawn before these end at a spot fixed on a piece.
 */
export type Point =
  | { at: 'corner'; piece: string; corner: number }
  | { at: 'mid'; p: Point; q: Point }
  | { at: 'foot'; from: Point; p: Point; q: Point }
  | { at: 'cross'; a: [Point, Point]; b: [Point, Point] }
  /** A spot on a semicircle's curve, `deg` round from its base's start (0) to its end (180). */
  | { at: 'arc'; piece: string; deg: number }
  | ({ at: 'spot' } & Anchor)
/**
 * `right` draws a right-angle square where a height meets its side. `ray` says which ends run on past where they're
 * drawn to, making a ray or a line, each with the end cap it finishes with once cut off (null: it stops there).
 */
export interface ExtraLine { id: string; a: Point; b: Point; style: ExtraStyle; weight?: LineWeight; label: LabelMode; text: string; ticks: number; right: boolean; ray?: RayEnds }
export type RayEnds = { a: Cap | null; b: Cap | null }
export const NO_RAY: RayEnds = { a: null, b: null }
/** A semicircle's extras: its radius, drawn to the top of its curve, its center and a label on its curve. */
export interface SemiStyle { radius: boolean; radiusLabel: LabelMode; radiusText: string; center: string | null; arcText: string }
export type Offset = [number, number]

export interface Composite {
  pieces: Piece[]
  sides: Record<string, SideStyle>
  angles: Record<string, AngleStyle>
  /** Corner names, by corner key; a corner without one shows no point. */
  points: Record<string, string>
  lines: ExtraLine[]
  semis: Record<string, SemiStyle>
  /** Dragged labels' offsets from their usual spots, along and across their part. */
  moved: Record<string, Offset>
  unit: string
  /** Decimal places for lengths and for angles. */
  round: number
  angleRound: number
  /** How far the whole figure is turned as it's labeled and printed, in degrees counterclockwise, −180 to 180. */
  turn: number
}

export const SIDE_DEFAULTS: SideStyle = { label: 'none', text: '', ticks: 0, arrows: 0 }
export const SEMI_DEFAULTS: SemiStyle = { radius: false, radiusLabel: 'measure', radiusText: 'r', center: null, arcText: '' }

export const emptyComposite = (): Composite => ({
  pieces: [], sides: {}, angles: {}, points: {}, lines: [], semis: {}, moved: {}, unit: '', round: 1, angleRound: 0, turn: 0,
})

export const clone = (c: Composite): Composite => structuredClone(c)

// ----- Placing pieces

/** A piece where it sits: its base from a to b, the way it reaches (out), and its outline. */
export interface Placed {
  piece: Piece
  a: Vec
  b: Vec
  u: Vec
  out: Vec
  /** Corners in order: a, b, then around. A semicircle has just a and b; a quarter circle a, b and the far end of its straight side. */
  corners: Vec[]
  /** Its straight sides, by index: 0 is the base. */
  sides: [Vec, Vec][]
  /**
   * A semicircle's or quarter circle's curve: its center, radius, and the
   * stretch of turn it covers, `lo` to `hi` degrees, measured from the
   * base's start (0) over the top (90) to its end (180). Going round the
   * corners in order, it runs from hi back to lo.
   */
  arc: { c: Vec; r: number; lo: number; hi: number } | null
  /** +1 when going round its corners in order keeps its inside on perp's side, −1 when the other way. */
  turn: 1 | -1
}

export function placePiece(piece: Piece, a: Vec, b: Vec, out: Vec): Placed {
  const u = unit(sub(b, a))
  const top = (s: number) => add(add(a, mul(u, s)), mul(out, piece.depth))
  let corners: Vec[]
  let arc: Placed['arc'] = null
  const W = len(sub(b, a))
  let sides: [Vec, Vec][] | null = null
  if (piece.kind === 'rectangle') corners = [a, b, top(W), top(0)]
  else if (piece.kind === 'triangle') corners = [a, b, top(piece.tip)]
  else if (piece.kind === 'quarter') {
    // Centered at one end of its base, its straight side rising from there, the curve joining the two.
    const atStart = piece.tip < W / 2
    const t = add(atStart ? a : b, mul(out, W))
    corners = [a, b, t]
    sides = atStart ? [[a, b], [t, a]] : [[a, b], [b, t]]
    arc = atStart ? { c: a, r: W, lo: 90, hi: 180 } : { c: b, r: W, lo: 0, hi: 90 }
  } else {
    corners = [a, b]
    arc = { c: mul(add(a, b), 0.5), r: W / 2, lo: 0, hi: 180 }
  }
  sides ??= (piece.kind === 'semicircle' ? [[a, b]] : corners.map((p, i) => [p, corners[(i + 1) % corners.length]])) as [Vec, Vec][]
  return { piece, a, b, u, out, corners, sides, arc, turn: cross(u, out) > 0 ? 1 : -1 }
}

/** Every piece placed, parents before children. Pieces whose parent or side is missing are left out. */
export function placeAll(pieces: Piece[]): Map<string, Placed> {
  const placed = new Map<string, Placed>()
  const pending = [...pieces]
  for (let guard = 0; pending.length && guard < pieces.length + 1; guard++) {
    for (let i = 0; i < pending.length; i++) {
      const p = pending[i]
      let at: Placed | null = null
      if (!p.mount) {
        const { u, out } = p.frame ?? { u: [1, 0] as Vec, out: [0, -1] as Vec }
        at = placePiece(p, p.at, add(p.at, mul(u, p.width)), out)
      }
      else {
        const parent = placed.get(p.mount.parent)
        if (!parent) continue
        const side = parent.sides[p.mount.side]
        if (!side) {
          pending.splice(i--, 1)
          continue
        }
        const d = unit(sub(side[1], side[0]))
        const outward = mul(perp(d), -parent.turn)
        at = placePiece(p, add(side[0], mul(d, p.mount.from)), add(side[0], mul(d, p.mount.to)), outward)
      }
      placed.set(p.id, at)
      pending.splice(i--, 1)
    }
  }
  return placed
}

/**
 * The pieces turned `deg` counterclockwise on the page about the middle of the shape: each piece standing on its own
 * is turned and moved, and the rest ride along on them.
 */
export function turnedPieces(pieces: Piece[], deg: number): Piece[] {
  if (!deg) return pieces
  const bs = [...placeAll(pieces).values()].map(bounds)
  if (!bs.length) return pieces
  const mid: Vec = [(Math.min(...bs.map((b) => b.x1)) + Math.max(...bs.map((b) => b.x2))) / 2, (Math.min(...bs.map((b) => b.y1)) + Math.max(...bs.map((b) => b.y2))) / 2]
  const th = (deg * Math.PI) / 180
  // Counterclockwise as seen, with y down.
  const turn = ([x, y]: Vec): Vec => [x * Math.cos(th) + y * Math.sin(th), -x * Math.sin(th) + y * Math.cos(th)]
  return pieces.map((p) => {
    if (p.mount) return p
    const { u, out } = p.frame ?? { u: [1, 0] as Vec, out: [0, -1] as Vec }
    return { ...p, at: add(mid, turn(sub(p.at, mid))), frame: { u: turn(u), out: turn(out) } }
  })
}

/** The way out of a placed piece through one of its straight sides. */
export const outwardOf = (pl: Placed, [p, q]: [Vec, Vec]): Vec => mul(perp(unit(sub(q, p))), -pl.turn)

/** A point on a piece's curve, `deg` round from its base's start (see Placed.arc). */
export function onArc(pl: Placed, deg: number): Vec {
  const th = (deg * Math.PI) / 180
  return add(pl.arc!.c, add(mul(pl.u, -Math.cos(th) * pl.arc!.r), mul(pl.out, Math.sin(th) * pl.arc!.r)))
}
/** How far round a piece's curve a point lies, in degrees (see Placed.arc). */
export function arcDeg(pl: Placed, p: Vec): number {
  const d = sub(p, pl.arc!.c)
  return (Math.atan2(dot(d, pl.out), -dot(d, pl.u)) * 180) / Math.PI
}

/** A spot on a piece, back on the page. */
export const anchorAt = (pl: Placed, an: Anchor): Vec => add(add(pl.a, mul(pl.u, an.s)), mul(pl.out, an.t))
export const anchorOf = (pl: Placed, p: Vec): Anchor => ({ piece: pl.piece.id, s: dot(sub(p, pl.a), pl.u), t: dot(sub(p, pl.a), pl.out) })

// ----- Points that extra lines end at

/** Where a point is now, or null when what it hangs on is gone (or two lines it crosses run side by side). */
export function pointAt(placed: Map<string, Placed>, pt: Point): Vec | null {
  if (pt.at === 'corner') return placed.get(pt.piece)?.corners[pt.corner] ?? null
  if (pt.at === 'spot') {
    const pl = placed.get(pt.piece)
    return pl ? anchorAt(pl, pt) : null
  }
  if (pt.at === 'arc') {
    const pl = placed.get(pt.piece)
    return pl?.arc && pt.deg > pl.arc.lo && pt.deg < pl.arc.hi ? onArc(pl, pt.deg) : null
  }
  if (pt.at === 'mid') {
    const [p, q] = [pointAt(placed, pt.p), pointAt(placed, pt.q)]
    return p && q ? mul(add(p, q), 0.5) : null
  }
  if (pt.at === 'foot') {
    const [f, p, q] = [pointAt(placed, pt.from), pointAt(placed, pt.p), pointAt(placed, pt.q)]
    if (!f || !p || !q || near(p, q)) return null
    const d = unit(sub(q, p))
    return add(p, mul(d, dot(sub(f, p), d)))
  }
  const [p1, p2, q1, q2] = [...pt.a, ...pt.b].map((x) => pointAt(placed, x))
  if (!p1 || !p2 || !q1 || !q2) return null
  const [r, s] = [sub(p2, p1), sub(q2, q1)]
  const den = cross(r, s)
  if (Math.abs(den) < EPS) return null
  return add(p1, mul(r, cross(sub(q1, p1), s) / den))
}

/** Where a height's foot falls along its side: 0 at one end, 1 at the other, outside 0 to 1 once it has left the side. */
export function footAlong(placed: Map<string, Placed>, pt: Extract<Point, { at: 'foot' }>): number | null {
  const [f, p, q] = [pointAt(placed, pt.from), pointAt(placed, pt.p), pointAt(placed, pt.q)]
  if (!f || !p || !q || near(p, q)) return null
  const d = sub(q, p)
  return dot(sub(f, p), d) / dot(d, d)
}

/** Where an extra line ends, or null when what it hangs on is gone. */
export function lineEnds(placed: Map<string, Placed>, l: ExtraLine): [Vec, Vec] | null {
  const [p, q] = [pointAt(placed, l.a), pointAt(placed, l.b)]
  return p && q ? [p, q] : null
}

/** A point for a spot on the shape: a piece's corner there, else the end of an extra line there, else a spot fixed on the piece whose edge holds it. */
export function pointFor(placed: Map<string, Placed>, lines: ExtraLine[], p: Vec): Point | null {
  for (const pl of placed.values()) {
    const i = pl.corners.findIndex((x) => near(x, p))
    if (i >= 0) return { at: 'corner', piece: pl.piece.id, corner: i }
  }
  for (const l of lines) for (const end of [l.a, l.b]) {
    const at = pointAt(placed, end)
    if (at && near(at, p)) return end
  }
  for (const pl of placed.values()) if (onPieceEdge(pl, p)) return { at: 'spot', ...anchorOf(pl, p) }
  return null
}

// ----- Inside and outside

function inPolygon(p: Vec, poly: Vec[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function onSegment(p: Vec, [s, e]: [Vec, Vec], eps = EPS) {
  const d = sub(e, s)
  const l = len(d)
  if (l < EPS) return near(p, s)
  const t = dot(sub(p, s), d) / (l * l)
  return t > -eps / l && t < 1 + eps / l && Math.abs(cross(d, sub(p, s))) / l < eps
}
/** Whether a point is strictly inside a piece (not on its edge). */
export function insidePiece(pl: Placed, p: Vec) {
  if (pl.arc) {
    const h = dot(sub(p, pl.a), pl.out)
    // A quarter circle's other straight side bounds it too.
    const s = dot(sub(p, pl.arc.c), pl.u)
    const beside = pl.arc.lo === 90 ? s > EPS : pl.arc.hi === 90 ? s < -EPS : true
    return h > EPS && beside && len(sub(p, pl.arc.c)) < pl.arc.r - EPS
  }
  return inPolygon(p, pl.corners) && !pl.sides.some((s) => onSegment(p, s))
}
function onPieceEdge(pl: Placed, p: Vec) {
  if (pl.sides.some((s) => onSegment(p, s))) return true
  if (!pl.arc || dot(sub(p, pl.a), pl.out) < -EPS || Math.abs(len(sub(p, pl.arc.c)) - pl.arc.r) > EPS) return false
  const deg = arcDeg(pl, p)
  return deg > pl.arc.lo - 1e-4 && deg < pl.arc.hi + 1e-4
}

/**
 * How far along `d` (a unit direction) from `p` a ray last leaves the shape: 0 when it heads straight out, else the
 * distance to where it crosses the outline for the last time.
 */
export function exitAlong(o: Outline, p: Vec, d: Vec): number {
  const pls = [...o.placed.values()]
  const inShape = (t: number) => pls.some((pl) => insidePiece(pl, add(p, mul(d, t))) || onPieceEdge(pl, add(p, mul(d, t))))
  const bs = pls.map(bounds)
  const far = Math.hypot(Math.max(...bs.map((b) => b.x2)) - Math.min(...bs.map((b) => b.x1)), Math.max(...bs.map((b) => b.y2)) - Math.min(...bs.map((b) => b.y1)))
  const steps = 400
  let last = -1
  for (let i = 1; i <= steps; i++) if (inShape((far * i) / steps)) last = i
  if (last < 0) return 0
  let [lo, hi] = [(far * last) / steps, (far * (last + 1)) / steps]
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (inShape(mid)) lo = mid
    else hi = mid
  }
  return lo
}

export function bounds(pl: Placed) {
  const pts = pl.arc ? [...pl.corners, ...[0, 0.25, 0.5, 0.75, 1].map((f) => onArc(pl, pl.arc!.lo + (pl.arc!.hi - pl.arc!.lo) * f))] : pl.corners
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) }
}

/** Whether two pieces overlap, by sampling a fine lattice where their boxes meet. */
function overlap(p: Placed, q: Placed) {
  const [bp, bq] = [bounds(p), bounds(q)]
  const x1 = Math.max(bp.x1, bq.x1), x2 = Math.min(bp.x2, bq.x2)
  const y1 = Math.max(bp.y1, bq.y1), y2 = Math.min(bp.y2, bq.y2)
  if (x2 - x1 < EPS || y2 - y1 < EPS) return false
  const step = Math.max(x2 - x1, y2 - y1) / 48
  for (let x = x1 + step * 0.513; x < x2; x += step)
    for (let y = y1 + step * 0.471; y < y2; y += step)
      if (insidePiece(p, [x, y]) && insidePiece(q, [x, y])) return true
  return false
}

/** Why a set of pieces can't be drawn, or null when it can. */
export function problem(pieces: Piece[]): string | null {
  const placed = placeAll(pieces)
  if (placed.size !== pieces.length) return 'A piece lost the side it sat on.'
  for (const p of pieces) {
    if (!(p.width >= MIN_SIZE - EPS)) return 'That’s too narrow.'
    if (p.kind !== 'semicircle' && p.kind !== 'quarter' && !(p.depth >= MIN_SIZE - EPS)) return 'That’s too thin.'
    if (p.mount) {
      // It can run past either end of the side it sits on, but must still touch it, at least at a corner.
      const [s, e] = placed.get(p.mount.parent)!.sides[p.mount.side]
      const L = len(sub(e, s))
      if (p.mount.from > L + EPS || p.mount.to < -EPS) return 'That would leave a piece apart from the rest.'
      // A quarter circle can't be bigger than the side it was added on.
      if (p.kind === 'quarter' && (p.mount.from < -EPS || p.mount.to > L + EPS)) return 'A quarter circle can’t be bigger than its side.'
    }
  }
  const list = [...placed.values()]
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) if (overlap(list[i], list[j])) return 'Pieces can’t overlap.'
  return null
}

// ----- The outline

/** One stretch of a piece side left on the outside once seams are taken away. */
export interface Stretch { key: string; piece: string; side: number; from: number; to: number; p: Vec; q: Vec }
/** One part of the outline: a straight side or a semicircle's curve, in order around the shape. */
export type Edge =
  | { kind: 'line'; key: string; p: Vec; q: Vec; stretches: Stretch[] }
  | { kind: 'arc'; key: string; p: Vec; q: Vec; c: Vec; r: number; start: number; sweep: number; piece: string }

export interface Corner { key: string; at: Vec; /** Its inside angle, in degrees, when both sides are straight. */ angle: number | null; inDir: Vec; outDir: Vec }

/** A stretch two pieces share, keyed by the two piece sides it's on. */
export interface Seam { key: string; p: Vec; q: Vec }

export interface Outline {
  placed: Map<string, Placed>
  loops: Edge[][]
  corners: Corner[]
  /** Every stretch of piece side on the outside, before joining into sides: where new pieces go. */
  stretches: Stretch[]
  /** Where two pieces meet: every stretch of side two pieces share, whether one sits on the other or they only touch. */
  seams: Seam[]
}

/** The outside of the union of pieces: seams removed, sides joined where they run straight on. `splits` are spots where an extra line meets a side partway along, which become corners. */
export function outline(pieces: Piece[], splits: Vec[] = []): Outline {
  const placed = placeAll(pieces)
  // Every straight side, each going the same way round (inside on perp's side).
  type Seg = { piece: string; side: number; p: Vec; q: Vec; reversed: boolean }
  const segs: Seg[] = []
  for (const pl of placed.values())
    pl.sides.forEach(([p, q], side) => segs.push(pl.turn === 1 ? { piece: pl.piece.id, side, p, q, reversed: false } : { piece: pl.piece.id, side, p: q, q: p, reversed: true }))

  // Take away the stretches each side shares with another piece's side.
  const stretches: Stretch[] = []
  const seams: Seam[] = []
  for (const s of segs) {
    const d = sub(s.q, s.p)
    const L = len(d)
    const du = unit(d)
    const cut: [number, number][] = []
    for (const o of segs) {
      if (o.piece === s.piece) continue
      if (Math.abs(cross(du, sub(o.p, s.p))) > EPS || Math.abs(cross(du, sub(o.q, s.p))) > EPS) continue
      const [t1, t2] = [dot(sub(o.p, s.p), du), dot(sub(o.q, s.p), du)].sort((x, y) => x - y)
      const lo = Math.max(0, t1), hi = Math.min(L, t2)
      if (hi - lo <= EPS) continue
      cut.push([lo, hi])
      // Each shared stretch once, from the side whose piece comes first.
      if (s.piece < o.piece) seams.push({ key: `${s.piece}:${s.side}~${o.piece}:${o.side}`, p: add(s.p, mul(du, lo)), q: add(s.p, mul(du, hi)) })
    }
    cut.sort((x, y) => x[0] - y[0])
    const keep: [number, number][] = []
    let at = 0
    for (const [lo, hi] of cut) {
      if (lo - at > EPS) keep.push([at, lo])
      at = Math.max(at, hi)
    }
    if (L - at > EPS) keep.push([at, L])
    // Stretches are numbered along the piece's own side, so their keys don't depend on which way round it's walked.
    const own = keep.map(([lo, hi]) => (s.reversed ? [L - hi, L - lo] : [lo, hi]) as [number, number]).sort((x, y) => x[0] - y[0])
    for (const [lo, hi] of keep) {
      const ownFrom = s.reversed ? L - hi : lo
      const n = own.findIndex(([x]) => Math.abs(x - ownFrom) < EPS)
      stretches.push({ key: `${s.piece}:${s.side}#${n}`, piece: s.piece, side: s.side, from: ownFrom, to: ownFrom + hi - lo, p: add(s.p, mul(du, lo)), q: add(s.p, mul(du, hi)) })
    }
  }

  // The edges: stretches split where extra lines meet them, and semicircles' curves.
  const raw: Edge[] = []
  for (const st of stretches) {
    const d = unit(sub(st.q, st.p))
    const cuts = splits
      .filter((sp) => onSegment(sp, [st.p, st.q]) && !near(sp, st.p) && !near(sp, st.q))
      .map((sp) => dot(sub(sp, st.p), d))
      .sort((x, y) => x - y)
    const ts = [0, ...cuts, len(sub(st.q, st.p))]
    for (let i = 0; i + 1 < ts.length; i++)
      raw.push({ kind: 'line', key: i ? `${st.key}/${i}` : st.key, p: add(st.p, mul(d, ts[i])), q: add(st.p, mul(d, ts[i + 1])), stretches: [st] })
  }
  for (const pl of placed.values()) {
    if (!pl.arc) continue
    // The curve runs from hi round to lo; walked the other way when the piece turns the other way.
    const [hiAt, loAt] = [onArc(pl, pl.arc.hi), onArc(pl, pl.arc.lo)]
    const [p, q] = pl.turn === 1 ? [hiAt, loAt] : [loAt, hiAt]
    const start = Math.atan2(p[1] - pl.arc.c[1], p[0] - pl.arc.c[0])
    const midAt = sub(onArc(pl, (pl.arc.lo + pl.arc.hi) / 2), pl.arc.c)
    const mid = Math.atan2(midAt[1], midAt[0])
    let sweep = 2 * (mid - start)
    sweep = Math.atan2(Math.sin(sweep / 2), Math.cos(sweep / 2)) * 2
    raw.push({ kind: 'arc', key: `${pl.piece.id}:arc`, p, q, c: pl.arc.c, r: pl.arc.r, start, sweep, piece: pl.piece.id })
  }

  // Chain the edges into loops.
  const used = new Set<Edge>()
  const loops: Edge[][] = []
  for (const first of raw) {
    if (used.has(first)) continue
    const loop: Edge[] = []
    let e: Edge | undefined = first
    while (e && !used.has(e)) {
      used.add(e)
      loop.push(e)
      const end: Vec = e.q
      e = raw.find((n) => !used.has(n) && near(n.p, end))
    }
    loops.push(joinStraight(loop, splits))
  }

  const corners: Corner[] = []
  for (const loop of loops)
    loop.forEach((e, i) => {
      const prev = loop[(i + loop.length - 1) % loop.length]
      const inDir = prev.kind === 'line' ? unit(sub(prev.q, prev.p)) : arcDir(prev, 1)
      const outDir = e.kind === 'line' ? unit(sub(e.q, e.p)) : arcDir(e, 0)
      const straight = prev.kind === 'line' && e.kind === 'line'
      const turnBy = Math.atan2(cross(inDir, outDir), dot(inDir, outDir))
      const angle = straight ? 180 - (turnBy * 180) / Math.PI : null
      corners.push({ key: e.key, at: e.p, angle: angle !== null && Math.abs(angle - 180) < 1e-6 ? 180 : angle, inDir, outDir })
    })

  return { placed, loops, corners, stretches, seams }
}

/** The direction a curve is heading at its start (0) or end (1). */
function arcDir(e: Extract<Edge, { kind: 'arc' }>, at: 0 | 1): Vec {
  const th = e.start + e.sweep * at
  return mul([-Math.sin(th), Math.cos(th)], Math.sign(e.sweep))
}

/** Straight sides that run on in the same direction become one, keeping the first's key, except where an extra line ends between them. */
function joinStraight(loop: Edge[], splits: Vec[]): Edge[] {
  const out: Edge[] = []
  const same = (a: Edge, b: Edge) =>
    a.kind === 'line' && b.kind === 'line' && Math.abs(cross(unit(sub(a.q, a.p)), unit(sub(b.q, b.p)))) < EPS &&
    dot(sub(a.q, a.p), sub(b.q, b.p)) > 0 && !splits.some((sp) => near(sp, a.q))
  const join = (a: Edge, b: Edge): Edge => (a.kind === 'line' && b.kind === 'line' ? { ...a, q: b.q, stretches: [...a.stretches, ...b.stretches] } : a)
  for (const e of loop) {
    const last = out.at(-1)
    if (last && same(last, e)) out[out.length - 1] = join(last, e)
    else out.push(e)
  }
  // The loop may start partway along a straight run.
  if (out.length > 1 && same(out.at(-1)!, out[0])) {
    const first = out.shift()!
    out[out.length - 1] = join(out[out.length - 1], first)
  }
  return out
}

/** Whether a point lies on the outline, and on which edge. */
export function edgeAt(o: Outline, p: Vec): Edge | null {
  for (const loop of o.loops)
    for (const e of loop) {
      if (e.kind === 'line' && onSegment(p, [e.p, e.q])) return e
      if (e.kind === 'arc' && Math.abs(len(sub(p, e.c)) - e.r) < EPS) return e
    }
  return null
}

/** Whether a straight line between two spots on the outline stays inside the shape, rather than running along or outside it. */
export function crossesInside(o: Outline, p: Vec, q: Vec) {
  if (near(p, q)) return false
  const pls = [...o.placed.values()]
  const inShape = (x: Vec) => pls.some((pl) => insidePiece(pl, x) || onPieceEdge(pl, x))
  for (let i = 1; i < 40; i++) {
    const x = add(p, mul(sub(q, p), i / 40))
    if (!inShape(x)) return false
  }
  return !edgeAt(o, mul(add(p, q), 0.5))
}

/** A spot an extra line can end at while it's being drawn, and the point it would end at. A height's foot gets a right-angle square. */
export interface Target { at: Vec; point: Point; kind: 'corner' | 'mid' | 'foot' | 'cross' | 'center' | 'arc'; /** What it is, in a few words, shown on hover. */ name: string }

/**
 * Where extra lines can start and end, whatever they start from: every
 * corner (including where lines already meet a side), the middle of every
 * straight side as the shape is built (not of the halves a line's end
 * leaves), the middle of every extra line, and where two extra lines cross. `plain` is the outline before
 * lines split it.
 */
export function anchorPoints(o: Outline, plain: Outline, lines: ExtraLine[]): Target[] {
  const ref = (p: Vec) => pointFor(o.placed, lines, p)
  const all: Target[] = []
  const push = (at: Vec | null, point: Point | null, kind: Target['kind'], name: string) => at && point && all.push({ at, point, kind, name })
  const kindOf = (id: string) => o.placed.get(id)?.piece.kind ?? 'shape'
  for (const c of o.corners) {
    const point = ref(c.at)
    // A corner of several pieces is where they meet.
    const owners = [...o.placed.values()].filter((pl) => pl.corners.some((x) => near(x, c.at))).map((pl) => PIECE_NAMES[pl.piece.kind].toLowerCase())
    const name = point?.at !== 'corner' ? 'Where a line meets a side'
      : owners.length > 1 && new Set(owners).size > 1 ? `Where the ${owners[0]} meets the ${owners.find((k) => k !== owners[0])}`
      : `Corner of the ${owners[0] ?? 'shape'}`
    push(c.at, point, 'corner', name)
  }
  // A semicircle's center, inside the shape or not, for drawing its radius (a quarter circle's is a corner); and the middle of each curve.
  for (const pl of o.placed.values()) {
    if (!pl.arc) continue
    const id = pl.piece.id
    const name = PIECE_NAMES[pl.piece.kind].toLowerCase()
    if (pl.piece.kind === 'semicircle')
      push(pl.arc.c, { at: 'mid', p: { at: 'corner', piece: id, corner: 0 }, q: { at: 'corner', piece: id, corner: 1 } }, 'center', `Center of the ${name}`)
    const top: Point = { at: 'arc', piece: id, deg: (pl.arc.lo + pl.arc.hi) / 2 }
    push(pointAt(o.placed, top), top, 'arc', `Middle of the ${name}’s curve`)
  }
  for (const loop of plain.loops)
    for (const e of loop) {
      if (e.kind !== 'line') continue
      const [p, q] = [ref(e.p), ref(e.q)]
      const pieces = new Set(e.stretches.map((st) => st.piece))
      const name = pieces.size === 1 ? `Middle of the ${kindOf([...pieces][0])}’s side` : 'Middle of a side'
      if (p && q) push(mul(add(e.p, e.q), 0.5), { at: 'mid', p, q }, 'mid', name)
    }
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) {
      const point: Point = { at: 'cross', a: [lines[i].a, lines[i].b], b: [lines[j].a, lines[j].b] }
      const at = pointAt(o.placed, point)
      const [e1, e2] = [lineEnds(o.placed, lines[i]), lineEnds(o.placed, lines[j])]
      if (at && e1 && e2 && strictlyOn(at, e1) && strictlyOn(at, e2)) push(at, point, 'cross', 'Where two lines cross')
    }
  // After crossings, which win where they meet (as a rectangle's diagonals cross at their middles).
  for (const l of lines) {
    const mid: Point = { at: 'mid', p: l.a, q: l.b }
    push(pointAt(o.placed, mid), mid, 'mid', 'Middle of a line')
  }
  const out: Target[] = []
  for (const tg of all) if (!out.some((x) => near(x.at, tg.at))) out.push(tg)
  return out
}

/**
 * Where an extra line from `from` can end: any anchor point, and the foot
 * of a height dropped from `from` onto a side, as long as the line crosses
 * the inside of the shape. A height's foot wins over the middle of a side
 * on the same spot (as in an isosceles triangle), since that's what keeps
 * it square to its side.
 */
export function lineTargets(o: Outline, plain: Outline, lines: ExtraLine[], from: Point): Target[] {
  const start = pointAt(o.placed, from)
  if (!start) return []
  const ref = (p: Vec) => pointFor(o.placed, lines, p)
  const feet: Target[] = []
  for (const loop of plain.loops)
    for (const e of loop) {
      if (e.kind !== 'line') continue
      const [p, q] = [ref(e.p), ref(e.q)]
      const d = unit(sub(e.q, e.p))
      const t = dot(sub(start, e.p), d)
      if (p && q && t > EPS && t < len(sub(e.q, e.p)) - EPS) feet.push({ at: add(e.p, mul(d, t)), point: { at: 'foot', from, p, q }, kind: 'foot', name: 'Foot of a height: square to this side' })
    }
  // And onto another extra line, square to it.
  for (const l of lines) {
    const ends = lineEnds(o.placed, l)
    if (!ends || [l.a, l.b].some((x) => JSON.stringify(x) === JSON.stringify(from))) continue
    const d = unit(sub(ends[1], ends[0]))
    const t = dot(sub(start, ends[0]), d)
    if (t > EPS && t < len(sub(ends[1], ends[0])) - EPS) feet.push({ at: add(ends[0], mul(d, t)), point: { at: 'foot', from, p: l.a, q: l.b }, kind: 'foot', name: 'Foot of a height: square to this line' })
  }
  const anchors = anchorPoints(o, plain, lines)
  const all = [...anchors.filter((a) => a.kind === 'corner'), ...feet, ...anchors.filter((a) => a.kind !== 'corner')]
  const out: Target[] = []
  for (const tg of all) if (!out.some((x) => near(x.at, tg.at)) && crossesInside(o, start, tg.at)) out.push(tg)
  return out
}

/**
 * A spot on a curve near `g` (within `reach`) that a line from `from` can end at: wherever it's dropped, pulled onto a
 * quarter of the way round, halfway or three quarters when it's that near one, unless `free`.
 */
export function arcTarget(o: Outline, from: Vec, g: Vec, reach: number, free: boolean): Target | null {
  for (const pl of o.placed.values()) {
    if (!pl.arc) continue
    const d = sub(g, pl.arc.c)
    if (Math.abs(len(d) - pl.arc.r) > reach || dot(d, pl.out) <= 0) continue
    let deg = arcDeg(pl, g)
    const { lo, hi } = pl.arc
    const pull = [1, 2, 3].map((i) => lo + ((hi - lo) * i) / 4).find((q) => len(sub(onArc(pl, q), g)) <= reach)
    if (!free && pull !== undefined) deg = pull
    if (deg <= pl.arc.lo + 0.5 || deg >= pl.arc.hi - 0.5) continue
    const point: Point = { at: 'arc', piece: pl.piece.id, deg }
    const at = pointAt(o.placed, point)!
    if (crossesInside(o, from, at)) return { at, point, kind: 'arc', name: `On the ${PIECE_NAMES[pl.piece.kind].toLowerCase()}’s curve` }
  }
  return null
}

/**
 * The extra lines still on the shape: both ends on its outline, on
 * another line that is, or at a semicircle's center (for its radius). A line whose end is now inside the shape (its side
 * became a seam when a piece was added on it, say) is dropped.
 */
export function linesOnShape(pieces: Piece[], lines: ExtraLine[]): ExtraLine[] {
  const o = outline(pieces)
  const centers = [...o.placed.values()].flatMap((pl) => (pl.arc ? [pl.arc.c] : []))
  const onOutline = (p: Vec) => !!edgeAt(o, p) || o.corners.some((c) => near(c.at, p)) || centers.some((c) => near(c, p))
  let kept = lines.filter((l) => lineEnds(o.placed, l))
  for (let changed = true; changed; ) {
    changed = false
    const next = kept.filter((l) =>
      lineEnds(o.placed, l)!.every((p) => onOutline(p) || kept.some((m) => m !== l && onSegment(p, lineEnds(o.placed, m)!, 1e-5))),
    )
    if (next.length !== kept.length) (kept = next), (changed = true)
  }
  return kept
}

/** Whether a point lies on a segment, away from its ends. */
const strictlyOn = (p: Vec, seg: [Vec, Vec]) => onSegment(p, seg) && !near(p, seg[0]) && !near(p, seg[1])

// ----- Measures

/** A length or angle as a label writes it: rounded, without trailing zeros. */
export const roundTo = (v: number, places: number) => String(Number(v.toFixed(places)))

/** The base's length: a mounted piece's stretch of side. */
export const baseOf = (p: Piece) => (p.mount ? p.mount.to - p.mount.from : p.width)

/** A triangle's angles (in degrees) and sides: a from the end of its base to its tip, b from its tip back to the start, c its base. */
export function triangleParts(p: Piece): Record<TrianglePart, number> {
  const c = baseOf(p)
  const b = Math.hypot(p.tip, p.depth)
  const a = Math.hypot(c - p.tip, p.depth)
  const A = (Math.atan2(p.depth, p.tip) * 180) / Math.PI
  const B = (Math.atan2(p.depth, c - p.tip) * 180) / Math.PI
  return { A, B, C: 180 - A - B, a, b, c }
}

const RAD = Math.PI / 180
type Known = Partial<Record<TrianglePart, number>>

/** A whole triangle from three of its parts (at least one a side), or null when they don't make one. `nearTo` picks between the two triangles that two sides and an angle not between them can make. */
function solveTriangle(k: Known, nearTo: Record<TrianglePart, number>): Record<TrianglePart, number> | null {
  const t: Known = { ...k }
  const set = (n: TrianglePart) => t[n] !== undefined
  const pairs: [TrianglePart, TrianglePart][] = [['A', 'a'], ['B', 'b'], ['C', 'c']]
  // Two angles settle the third.
  const angles = pairs.filter(([X]) => set(X))
  if (angles.length === 2) {
    const [[Missing]] = pairs.filter(([X]) => !set(X))
    t[Missing] = 180 - angles.reduce((sum, [X]) => sum + t[X]!, 0)
  }
  if (pairs.every(([X]) => set(X))) {
    // Every angle: one side scales the rest, by the law of sines.
    const [X, x] = pairs.find(([, s]) => set(s))!
    const ratio = t[x]! / Math.sin(t[X]! * RAD)
    for (const [Y, y] of pairs) t[y] = ratio * Math.sin(t[Y]! * RAD)
  } else {
    const sides = pairs.filter(([, s]) => set(s))
    if (sides.length === 2) {
      const [X, x] = pairs.find(([, s]) => !set(s))!
      if (set(X)) {
        // The angle between the two sides: the third side, by the law of cosines.
        const [p, q] = sides.map(([, s]) => t[s]!)
        t[x] = Math.sqrt(Math.max(0, p * p + q * q - 2 * p * q * Math.cos(t[X]! * RAD)))
      } else {
        // An angle opposite one of them: the law of sines, picking the triangle nearer the one there now.
        const [[Kn, kn], [On, on]] = set(sides[0][0]) ? sides : [sides[1], sides[0]]
        if (!set(Kn)) return null
        const sin = (t[on]! * Math.sin(t[Kn]! * RAD)) / t[kn]!
        if (sin > 1 + EPS) return null
        const first = Math.asin(Math.min(1, sin)) / RAD
        const options = [first, 180 - first].filter((o) => o > EPS && t[Kn]! + o < 180 - EPS)
        if (!options.length) return null
        t[On] = options.reduce((m, o) => (Math.abs(o - nearTo[On]) < Math.abs(m - nearTo[On]) ? o : m))
        t[X] = 180 - t[Kn]! - t[On]!
        t[x] = (t[kn]! * Math.sin(t[X]! * RAD)) / Math.sin(t[Kn]! * RAD)
      }
    }
    if (!pairs.every(([, s]) => set(s))) return null
    // Every side: the angles, by the law of cosines.
    const [x, y, z] = [t.a!, t.b!, t.c!]
    const cos = (p: number, q: number, r: number) => (q * q + r * r - p * p) / (2 * q * r)
    if ([cos(x, y, z), cos(y, z, x)].some((v) => !(Math.abs(v) < 1))) return null
    t.A = Math.acos(cos(x, y, z)) / RAD
    t.B = Math.acos(cos(y, z, x)) / RAD
    t.C = 180 - t.A - t.B
  }
  if (TRIANGLE_PARTS.some((n) => !(t[n]! > EPS) || !Number.isFinite(t[n]!)) || t.C! >= 180) return null
  return t as Record<TrianglePart, number>
}

/** What else a triangle keeps when one part is typed and nothing locked settles it. */
const FALLBACK: Record<TrianglePart, TrianglePart[]> = { A: ['B'], B: ['A'], C: ['A'], a: ['b'], b: ['a'], c: ['A', 'B'] }

/**
 * A triangle with one part typed: its base, tip and depth, or why it can't
 * be. Its base and locked parts stay; if that doesn't settle it, so does what
 * FALLBACK says (the other base angle, for a base angle).
 */
export function retypeTriangle(p: Piece, part: TrianglePart, value: number): { width: number; tip: number; depth: number } | { problem: string } {
  const now = triangleParts(p)
  const isAngle = (n: TrianglePart) => n === n.toUpperCase()
  if (!(value > 0) || (isAngle(part) && value >= 180)) return { problem: isAngle(part) ? 'An angle is between 0° and 180°.' : 'A length is more than 0.' }
  const known: Known = { [part]: value }
  const order = [...(part === 'c' ? [] : (['c'] as TrianglePart[])), ...p.locks.filter((n) => n !== part), ...FALLBACK[part], ...TRIANGLE_PARTS]
  for (const n of order) {
    const names = Object.keys(known) as TrianglePart[]
    if (names.length >= 3 || n in known) continue
    // Two angles settle the third, so a third angle adds nothing.
    if (isAngle(n) && names.filter(isAngle).length >= 2) continue
    if (names.length === 2 && names.every(isAngle) && isAngle(n)) continue
    known[n] = now[n]
  }
  const t = solveTriangle(known, now)
  if (!t) return { problem: 'Those don’t make a triangle.' }
  const clash = p.locks.find((n) => n !== part && Math.abs(t[n] - now[n]) > 1e-6 * Math.max(1, now[n]))
  if (clash) return { problem: 'That needs a locked part to change. Unlock one first.' }
  return { width: t.c, tip: t.b * Math.cos(t.A * RAD), depth: t.b * Math.sin(t.A * RAD) }
}

/**
 * Where a triangle's tip can go with its locks kept, in its own directions
 * (along its base, and out): anywhere (null), along a line from one end of
 * its base (a locked base angle), round a circle (a locked side, about the
 * end it runs from; or a locked tip angle, through both ends of the base),
 * or nowhere else, when two locks hold it in place. A locked base doesn't
 * hold the tip.
 */
export type TipPath = null | 'held' | { ray: Vec; dir: Vec } | { c: Vec; r: number }
export function tipPath(p: Piece): TipPath {
  const W = baseOf(p)
  const now = triangleParts(p)
  const paths: TipPath[] = p.locks.flatMap((n): TipPath[] => {
    if (n === 'A') return [{ ray: [0, 0], dir: [Math.cos(now.A * RAD), Math.sin(now.A * RAD)] }]
    if (n === 'B') return [{ ray: [W, 0], dir: [-Math.cos(now.B * RAD), Math.sin(now.B * RAD)] }]
    if (n === 'b') return [{ c: [0, 0], r: now.b }]
    if (n === 'a') return [{ c: [W, 0], r: now.a }]
    if (n === 'C') {
      const C = now.C * RAD
      return [{ c: [W / 2, W / (2 * Math.tan(C))], r: W / (2 * Math.sin(C)) }]
    }
    return []
  })
  return paths.length > 1 ? 'held' : (paths[0] ?? null)
}

/** The nearest spot on a tip's path to `g` (both in the triangle's own directions), kept out from its base. */
export function ontoTipPath(path: Exclude<TipPath, null | 'held'>, g: Vec): Vec {
  if ('ray' in path) return add(path.ray, mul(path.dir, Math.max(MIN_SIZE, dot(sub(g, path.ray), path.dir))))
  const d = sub(g, path.c)
  const at = add(path.c, mul(len(d) > EPS ? unit(d) : [0, 1], path.r))
  if (at[1] > MIN_SIZE) return at
  // Below the base: the end of the path above it on that side.
  const h = MIN_SIZE - path.c[1]
  const w = Math.sqrt(Math.max(0, path.r * path.r - h * h))
  return [path.c[0] + (g[0] < path.c[0] ? -w : w), MIN_SIZE]
}

// ----- Changing pieces

let counter = 0
export const newId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`

class Impossible extends Error {}

/** The pieces in order, parents first. */
function parentsFirst(pieces: Piece[]): Piece[] {
  const out: Piece[] = []
  const seen = new Set<string>()
  for (let grew = true; grew; ) {
    grew = false
    for (const p of pieces)
      if (!seen.has(p.id) && (!p.mount || seen.has(p.mount.parent))) {
        out.push(p)
        seen.add(p.id)
        grew = true
      }
  }
  return out
}

/** Gives a piece a new base length, keeping its shape: a triangle's tip moves with it (keeping its locked parts, when it has some), a semicircle's depth is half of it. */
function rebase(p: Piece, width: number) {
  const old = baseOf(p)
  if (p.kind === 'triangle' && p.locks.length && Math.abs(width - old) > EPS) {
    if (p.locks.includes('c')) throw new Impossible('That triangle’s base is locked. Unlock it first.')
    const r = retypeTriangle(p, 'c', width)
    if ('problem' in r) throw new Impossible(r.problem)
    p.tip = r.tip
    p.depth = r.depth
  } else if (p.kind === 'triangle' && old > EPS) p.tip *= width / old
  if (p.kind === 'semicircle') p.depth = width / 2
  if (p.kind === 'quarter') (p.depth = width), (p.tip = p.tip > EPS ? width : 0)
  p.width = width
}

/** The end of its base a piece keeps as it's resized: a quarter circle's center, or a right triangle's square corner. Others keep their middle, or cover the whole side. */
function heldEnd(p: Piece): 'start' | 'end' | null {
  const W = baseOf(p)
  if (p.kind === 'quarter') return p.tip < W / 2 ? 'start' : 'end'
  if (p.kind === 'triangle') return Math.abs(p.tip) < EPS ? 'start' : Math.abs(p.tip - W) < EPS ? 'end' : null
  return null
}

/** Changes a piece's base, spreading through its seam: see `change`. */
export function setBase(draft: Piece[], id: string, width: number, pinned: Set<string>) {
  const p = draft.find((x) => x.id === id)!
  const held = heldEnd(p)
  rebase(p, width)
  if (!p.mount) return
  pinned.add(id)
  const side = placeAll(draft).get(p.mount.parent)?.sides[p.mount.side]
  if (!side) throw new Impossible('A piece lost the side it sat on.')
  const S = len(sub(side[1], side[0]))
  const { from, to } = p.mount
  // Only triangles, semicircles and quarter circles share the side they cover all of; a rectangle resizes on its own.
  const whole = p.kind !== 'rectangle' && Math.abs(from) < EPS && Math.abs(to - S) < EPS
  if (!whole && (held === 'start' || held === 'end')) {
    // Its square corner (or a quarter circle's center) stays where it is, as in the corner it was put in.
    const f = held === 'start' ? from : to - width
    p.mount = { ...p.mount, from: f, to: f + width }
    return
  }
  if (!whole) {
    // Partway along: it grows or shrinks about its middle, staying on the side when it was on it and still fits.
    let f = (from + to) / 2 - width / 2
    if (p.kind !== 'rectangle' && from > -EPS && to < S + EPS && width <= S + EPS) f = Math.max(0, Math.min(f, S - width))
    p.mount = { ...p.mount, from: f, to: f + width }
    return
  }
  p.mount = { ...p.mount, from: 0, to: width }
  setSide(draft, p.mount.parent, p.mount.side, width, pinned)
}

/** Changes the length of one of a piece's straight sides, keeping the rest of it as far as it can. */
export function setSide(draft: Piece[], id: string, side: number, length: number, pinned: Set<string>) {
  const p = draft.find((x) => x.id === id)!
  if (side === 0 || (p.kind === 'rectangle' && side === 2)) return setBase(draft, id, length, pinned)
  if (p.kind === 'rectangle') {
    p.depth = length
    return
  }
  if (p.kind === 'triangle') {
    const r = retypeTriangle(p, side === 1 ? 'a' : 'b', length)
    if ('problem' in r) throw new Impossible(p.locks.length ? r.problem : 'Those sides don’t make a triangle.')
    p.tip = r.tip
    p.depth = r.depth
  }
}

/**
 * After a change, keeps each piece sitting on a side that changed (except
 * `pinned` ones, which the change placed itself) where it was on the page:
 * a piece is never moved or resized by another, only carried along when the
 * side under it moves across. The exception is a shared edge: a triangle,
 * semicircle or quarter circle covering exactly the whole of the side (or
 * of the lined-up sides) it was added on stretches with it, and a quarter
 * circle shrinks to stay within its side.
 */
function reflow(before: Piece[], after: Piece[], pinned: Set<string>) {
  const old = placeAll(before)
  const was = new Map(before.map((p) => [p.id, p]))
  for (const p of parentsFirst(after)) {
    const prior = was.get(p.id)
    if (!p.mount || !prior?.mount || pinned.has(p.id) || prior.mount.parent !== p.mount.parent || prior.mount.side !== p.mount.side) continue
    const now = placeAll(after)
    const oldSide = old.get(p.mount.parent)?.sides[p.mount.side]
    const newSide = now.get(p.mount.parent)?.sides[p.mount.side]
    if (!oldSide || !newSide) continue
    const [d0, d1] = [unit(sub(oldSide[1], oldSide[0])), unit(sub(newSide[1], newSide[0]))]
    const [S0, S1] = [len(sub(oldSide[1], oldSide[0])), len(sub(newSide[1], newSide[0]))]
    const { from, to } = prior.mount
    const w = to - from
    // Where its ends were, along the side as it is now; or, when the side turned, the same share of it.
    const parallel = Math.abs(cross(d0, d1)) < EPS && dot(d0, d1) > 0
    const along = (t: number) => (parallel ? dot(sub(add(oldSide[0], mul(d0, t)), newSide[0]), d1) : (t * S1) / S0)
    // The stretch of the side(s) it was added on, before and after, in this side's own terms.
    const span = (placed: Map<string, Placed>, side: [Vec, Vec], d: Vec) => {
      const hosts = [{ parent: p.mount!.parent, side: p.mount!.side }, ...(p.mount!.with ?? [])]
      const ts = hosts.flatMap((h) => placed.get(h.parent)?.sides[h.side] ?? []).map((q) => dot(sub(q, side[0]), d))
      return [Math.min(...ts), Math.max(...ts)]
    }
    const [o1, o2] = span(old, oldSide, d0)
    const [n1, n2] = span(now, newSide, d1)
    const shares = p.kind !== 'rectangle' && Math.abs(from - o1) < EPS && Math.abs(to - o2) < EPS
    if (shares) {
      if (Math.abs(n2 - n1 - w) > EPS) rebase(p, n2 - n1)
      p.mount = { ...p.mount, from: n1, to: n2 }
      continue
    }
    let [f, t] = [along(from), along(to)]
    if (!parallel) [f, t] = [Math.max(0, Math.min((along(from) + along(to)) / 2 - w / 2, S1 - w)), 0]
    t = f + w
    if (p.kind === 'quarter') {
      // Its center stays put; it shrinks to stay within its side.
      const atStart = p.tip < w / 2
      const room = atStart ? n2 - f : t - n1
      if (room < w - EPS && room >= MIN_SIZE - EPS) {
        rebase(p, room)
        if (!atStart) f = t - room
        t = f + room
      }
    }
    p.mount = { ...p.mount, from: f, to: t }
  }
}

/**
 * Makes a change to the pieces, given as `fn` working on a copy of them and
 * calling setBase and setSide (or changing a piece outright, adding what it
 * placed itself to `pinned`), then spreads it to the pieces sitting on any
 * side that changed. Returns the new pieces, or why they can't be.
 */
export function change(pieces: Piece[], fn: (draft: Piece[], pinned: Set<string>) => void): { pieces: Piece[] } | { problem: string } {
  const draft = structuredClone(pieces)
  const pinned = new Set<string>()
  try {
    fn(draft, pinned)
    reflow(pieces, draft, pinned)
  } catch (e) {
    if (e instanceof Impossible) return { problem: e.message }
    throw e
  }
  const why = problem(draft)
  return why ? { problem: why } : { pieces: draft }
}

const blank = (kind: PieceKind, width: number): Omit<Piece, 'id' | 'mount' | 'at'> => ({
  kind, width, depth: kind === 'semicircle' ? width / 2 : kind === 'quarter' ? width : NEW_DEPTH, tip: kind === 'quarter' ? 0 : width / 2, shade: 0, locks: [],
})

/** A new piece covering a stretch of outline, as far out as it fits (NEW_DEPTH down), or a reason it can't go. */
export function pieceOn(pieces: Piece[], st: Stretch, kind: PieceKind): { piece: Piece } | { problem: string } {
  const width = st.to - st.from
  const base = { ...blank(kind, width), id: newId(), mount: { parent: st.piece, side: st.side, from: st.from, to: st.to }, at: [0, 0] as Vec }
  const depths = kind === 'semicircle' ? [width / 2] : [NEW_DEPTH, 2, 1, 0.5]
  let why = 'There’s no room there.'
  for (const depth of depths) {
    const piece = { ...base, depth }
    const p = problem([...pieces, piece])
    if (!p) return { piece }
    why = p
  }
  return { problem: why }
}

/** A piece offered for an inside corner at one end of a side: what it is, and the piece, or why it can't go. */
export interface CornerOption { kind: 'triangle' | 'quarter'; corner: Vec; result: { piece: Piece } | { problem: string } }

/**
 * What can fill an inside corner (a square one, as in an L-shape) at either
 * end of a stretch of outline: a right triangle with its legs along the
 * corner's two sides, and a quarter circle centered on the corner. Each
 * sits on the stretch, flush against the corner, reaching out along the
 * corner's other side: the triangle as far as both sides go, the quarter
 * circle as far as the shorter does, or less when that would overlap.
 */
export function cornerPieces(pieces: Piece[], o: Outline, st: Stretch): CornerOption[] {
  const parent = o.placed.get(st.piece)
  if (!parent) return []
  const [s0, s1] = parent.sides[st.side]
  const d = unit(sub(s1, s0))
  const along = (p: Vec) => dot(sub(p, s0), d)
  const out: CornerOption[] = []
  for (const loop of o.loops)
    loop.forEach((e, i) => {
      if (e.kind !== 'line' || !e.stretches.some((x) => x.key === st.key)) return
      for (const end of [st.p, st.q]) {
        const corner = o.corners.find((c) => near(c.at, end))
        if (!corner || corner.angle === null || Math.abs(corner.angle - 270) > 1e-6) continue
        // The corner's other side: the edge after this one when the stretch ends there, else the one before.
        const other = near(end, e.q) ? loop[(i + 1) % loop.length] : near(end, e.p) ? loop[(i + loop.length - 1) % loop.length] : null
        if (!other || other.kind !== 'line') continue
        const a = len(sub(st.q, st.p))
        const b = len(sub(other.q, other.p))
        const [tE, tO] = [along(end), along(near(end, st.p) ? st.q : st.p)]
        const sign = Math.sign(tO - tE)
        const make = (kind: 'triangle' | 'quarter', scale: number): Piece => {
          const w = (kind === 'quarter' ? Math.min(a, b) : a) * scale
          const [from, to] = [Math.min(tE, tE + sign * w), Math.max(tE, tE + sign * w)]
          const atStart = Math.abs(from - tE) < EPS
          return {
            ...blank(kind, w), id: newId(), mount: { parent: st.piece, side: st.side, from, to }, at: [0, 0],
            depth: kind === 'quarter' ? w : b * scale, tip: atStart ? 0 : w,
          }
        }
        for (const kind of ['triangle', 'quarter'] as const) {
          let result: CornerOption['result'] = { problem: 'There’s no room there.' }
          for (const scale of [1, 0.75, 0.5, 0.25]) {
            const piece = make(kind, scale)
            const why = problem([...pieces, piece])
            if (!why) {
              result = { piece }
              break
            }
            result = { problem: why }
          }
          out.push({ kind, corner: end, result })
        }
      }
    })
  return out
}

/** The first piece. */
export function firstPiece(kind: PieceKind, width = 6): Piece {
  return { ...blank(kind, width), id: newId(), mount: null, at: [0, 0], ...(kind === 'rectangle' ? { depth: 4 } : {}) }
}

/** A piece and everything sitting on it, directly or not. */
export function familyOf(pieces: Piece[], id: string): Set<string> {
  const out = new Set([id])
  for (let grew = true; grew; ) {
    grew = false
    for (const p of pieces) if (p.mount && out.has(p.mount.parent) && !out.has(p.id)) (out.add(p.id), (grew = true))
  }
  return out
}

/** Whether two placed pieces touch: along a side, or at least at a corner. */
function touching(a: Placed, b: Placed) {
  return a.corners.some((p) => onPieceEdge(b, p)) || b.corners.some((p) => onPieceEdge(a, p))
}

/**
 * What deleting `ids` deletes: those pieces, and any left floating apart
 * from the rest (the biggest connected part stays; on a tie, the one with
 * the piece placed first).
 */
export function deletedBy(pieces: Piece[], ids: Iterable<string>): Set<string> {
  const gone = new Set(ids)
  const placed = placeAll(pieces)
  const left = pieces.filter((p) => !gone.has(p.id) && placed.has(p.id))
  const parts: Piece[][] = []
  const seen = new Set<string>()
  for (const p of left) {
    if (seen.has(p.id)) continue
    const part: Piece[] = []
    const todo = [p]
    seen.add(p.id)
    while (todo.length) {
      const q = todo.pop()!
      part.push(q)
      for (const r of left)
        if (!seen.has(r.id) && touching(placed.get(q.id)!, placed.get(r.id)!)) (seen.add(r.id), todo.push(r))
    }
    parts.push(part)
  }
  const keep = parts.reduce<Piece[] | null>((best, part) => (!best || part.length > best.length ? part : best), null) ?? []
  for (const p of left) if (!keep.includes(p)) gone.add(p.id)
  return gone
}

/**
 * The pieces without `ids`, and without any they'd leave floating (see
 * deletedBy). The rest stay just where they are: one that sat on a deleted
 * piece sits on another it was added across, else stands on its own. Lines
 * that ended on deleted corners go.
 */
export function withoutPieces(c: Composite, ids: Iterable<string>): Composite {
  const gone = deletedBy(c.pieces, ids)
  const before = placeAll(c.pieces)
  const pieces = c.pieces
    .filter((p) => !gone.has(p.id))
    .map((p): Piece => {
      if (!p.mount) return p
      const others = (p.mount.with ?? []).filter((h) => !gone.has(h.parent))
      if (!gone.has(p.mount.parent)) return { ...p, mount: { ...p.mount, with: others.length ? others : undefined } }
      const pl = before.get(p.id)!
      // Onto another piece it was added across, when its base runs the same way along that piece's side.
      for (const h of others) {
        const side = before.get(h.parent)?.sides[h.side]
        if (!side) continue
        const d = unit(sub(side[1], side[0]))
        const [from, to] = [dot(sub(pl.a, side[0]), d), dot(sub(pl.b, side[0]), d)]
        if (to > from) {
          const rest = others.filter((x) => x !== h)
          return { ...p, mount: { parent: h.parent, side: h.side, from, to, with: rest.length ? rest : undefined } }
        }
      }
      return { ...p, mount: null, at: pl.a, width: baseOf(p), frame: { u: pl.u, out: pl.out } }
    })
  const placed = placeAll(pieces)
  return {
    ...c,
    pieces,
    lines: c.lines.filter((l) => lineEnds(placed, l)),
    semis: Object.fromEntries(Object.entries(c.semis).filter(([k]) => !gone.has(k))),
  }
}
export const withoutPiece = (c: Composite, id: string) => withoutPieces(c, [id])

// ----- Several pieces at once: lined-up sides, adding across them, merging

/** Sides lying along one straight line, that move together: the selected pieces' sides facing the same way, and any other side on that line beside them. */
export interface LinedUp { sides: { piece: string; side: number }[]; p: Vec; q: Vec; out: Vec }

const collinear = (a: [Vec, Vec], b: [Vec, Vec]) => {
  const d = unit(sub(a[1], a[0]))
  return Math.abs(cross(d, unit(sub(b[1], b[0])))) < EPS && Math.abs(cross(d, sub(b[0], a[0]))) < EPS
}

/** Where two or more selected rectangles' sides line up, facing the same way: one handle each, to move them together. */
export function linedUpSides(o: Outline, ids: string[]): LinedUp[] {
  const rects = ids.map((id) => o.placed.get(id)).filter((pl): pl is Placed => pl?.piece.kind === 'rectangle')
  const all = [...o.placed.values()].filter((pl) => pl.piece.kind === 'rectangle')
  const groups: { sides: { piece: string; side: number; seg: [Vec, Vec] }[]; out: Vec }[] = []
  for (const pl of rects)
    pl.sides.forEach((seg, side) => {
      const out = outwardOf(pl, seg)
      const g = groups.find((x) => collinear(x.sides[0].seg, seg) && dot(x.out, out) > 0)
      if (g) g.sides.push({ piece: pl.piece.id, side, seg })
      else groups.push({ sides: [{ piece: pl.piece.id, side, seg }], out })
    })
  const lined: LinedUp[] = []
  for (const g of groups) {
    if (g.sides.length < 2) continue
    const d = unit(sub(g.sides[0].seg[1], g.sides[0].seg[0]))
    const o0 = g.sides[0].seg[0]
    const ts = g.sides.flatMap((x) => x.seg.map((q) => dot(sub(q, o0), d)))
    let [lo, hi] = [Math.min(...ts), Math.max(...ts)]
    // Any other rectangle's side lying along the line beside them moves too, so nothing comes apart or overlaps.
    for (let grew = true; grew; ) {
      grew = false
      for (const pl of all)
        pl.sides.forEach((seg, side) => {
          if (g.sides.some((x) => x.piece === pl.piece.id && x.side === side) || !collinear(g.sides[0].seg, seg)) return
          const [a, b] = seg.map((q) => dot(sub(q, o0), d)).sort((x, y) => x - y)
          if (b < lo - EPS || a > hi + EPS) return
          g.sides.push({ piece: pl.piece.id, side, seg })
          ;[lo, hi] = [Math.min(lo, a), Math.max(hi, b)]
          grew = true
        })
    }
    lined.push({ sides: g.sides.map(({ piece, side }) => ({ piece, side })), p: add(o0, mul(d, lo)), q: add(o0, mul(d, hi)), out: g.out })
  }
  return lined
}

/** Moves every side in a lined-up group onto the parallel line through `at`, each rectangle keeping its opposite side where it was. */
export function moveLinedUp(draft: Piece[], line: LinedUp, at: Vec, pinned: Set<string>) {
  const orig = placeAll(draft)
  const order = parentsFirst(draft).filter((p) => line.sides.some((x) => x.piece === p.id))
  for (const p of order) {
    for (const { side } of line.sides.filter((x) => x.piece === p.id)) {
      const pl = placeAll(draft).get(p.id)!
      const o = orig.get(p.id)!
      pinned.add(p.id)
      if (side === 2) p.depth = dot(sub(at, pl.a), pl.out)
      else if (side === 0) {
        // Its top stays: a piece standing alone moves its base; one sitting on another rides on it.
        const top = o.corners[3]
        if (!p.mount) p.at = add(p.at, mul(o.out, dot(sub(at, o.a), o.out)))
        const a = p.mount ? pl.a : add(o.a, mul(o.out, dot(sub(at, o.a), o.out)))
        p.depth = dot(sub(top, a), o.out)
      } else if (side === 1) {
        const w = dot(sub(at, pl.a), pl.u)
        if (p.mount) p.mount = { ...p.mount, to: p.mount.from + w }
        p.width = w
      } else {
        const shift = dot(sub(at, o.a), o.u)
        if (p.mount) p.mount = { ...p.mount, from: p.mount.from + shift }
        else p.at = add(p.at, mul(o.u, shift))
        p.width -= shift
      }
    }
  }
}

/** Where the selected pieces' sides line up end to end into one unbroken edge on the outside, facing the same way: a piece can go across all of it. */
export function acrossEdge(o: Outline, ids: string[]): Mount | null {
  if (ids.length < 2) return null
  const pls = ids.map((id) => o.placed.get(id))
  if (pls.some((pl) => !pl)) return null
  const exposed = (pl: Placed, side: number) => {
    const L = len(sub(pl.sides[side][1], pl.sides[side][0]))
    return o.stretches.some((st) => st.piece === pl.piece.id && st.side === side && st.from < EPS && st.to > L - EPS)
  }
  const [first, ...rest] = pls as Placed[]
  for (let s0 = 0; s0 < first.sides.length; s0++) {
    if (!exposed(first, s0)) continue
    const seg0 = first.sides[s0]
    const out0 = outwardOf(first, seg0)
    const picks = [{ pl: first, side: s0 }]
    for (const pl of rest) {
      const side = pl.sides.findIndex((seg, i) => exposed(pl, i) && collinear(seg0, seg) && dot(outwardOf(pl, seg), out0) > 0)
      if (side < 0) break
      picks.push({ pl, side })
    }
    if (picks.length !== pls.length) continue
    // End to end, with no gaps or overlaps.
    const d = unit(sub(seg0[1], seg0[0]))
    const spans = picks.map(({ pl, side }) => pl.sides[side].map((q) => dot(sub(q, seg0[0]), d)).sort((x, y) => x - y)).sort((x, y) => x[0] - y[0])
    if (spans.some((sp, i) => i && Math.abs(sp[0] - spans[i - 1][1]) > EPS)) continue
    return { parent: first.piece.id, side: s0, from: spans[0][0], to: spans.at(-1)![1], with: picks.slice(1).map(({ pl, side }) => ({ parent: pl.piece.id, side })) }
  }
  return null
}

/** A new piece across such an edge, as far out as it fits, or why it can't go. */
export function pieceAcross(pieces: Piece[], mount: Mount, kind: PieceKind): { piece: Piece } | { problem: string } {
  const width = mount.to - mount.from
  const depths = kind === 'semicircle' ? [width / 2] : [NEW_DEPTH, 2, 1, 0.5]
  let why = 'There’s no room there.'
  for (const depth of depths) {
    const piece: Piece = { ...blank(kind, width), id: newId(), mount: { ...mount }, at: [0, 0], depth }
    const p = problem([...pieces, piece])
    if (!p) return { piece }
    why = p
  }
  return { problem: why }
}

/** The outline as drawn, split where extra lines meet it, for keying labels. */
function drawnOutline(c: Composite) {
  const placed = placeAll(c.pieces)
  return outline(c.pieces, c.lines.flatMap((l) => lineEnds(placed, l) ?? []))
}

/** Labels keyed by the old outline, moved to the same sides and corners of the new one; those whose side or corner is gone go. */
function rekeyLabels(before: Composite, after: Composite): Composite {
  const [o0, o1] = [drawnOutline(before), drawnOutline(after)]
  const sideKey = new Map<string, string>()
  for (const e of o0.loops.flat()) {
    const same = o1.loops.flat().find((x) => x.kind === e.kind && near(x.p, e.p) && near(x.q, e.q))
    if (same) sideKey.set(e.key, same.key)
  }
  const cornerKey = new Map<string, string>()
  for (const k of o0.corners) {
    const same = o1.corners.find((x) => near(x.at, k.at))
    if (same) cornerKey.set(k.key, same.key)
  }
  // An angle split by lines keeps what follows its corner's key.
  const corner = (key: string) => {
    const [head, ...tail] = key.split('|')
    if (!o0.corners.some((k) => k.key === head)) return key
    const to = cornerKey.get(head)
    return to === undefined ? null : [to, ...tail].join('|')
  }
  const remap = <T,>(rec: Record<string, T>, fn: (k: string) => string | null) =>
    Object.fromEntries(Object.entries(rec).flatMap(([k, v]) => {
      const to = fn(k)
      return to === null ? [] : [[to, v]]
    }))
  const sideOr = (k: string) => (o0.loops.flat().some((e) => e.key === k) ? sideKey.get(k) ?? null : k)
  return {
    ...after,
    sides: remap(before.sides, sideOr),
    angles: remap(before.angles, corner),
    points: remap(before.points, corner),
    moved: remap(before.moved, (k) => {
      const [kind, rest] = [k.slice(0, 2), k.slice(2)]
      if (kind === 's:') return (sideOr(rest) ?? null) && 's:' + sideOr(rest)
      if (kind === 'a:' || kind === 'v:') return corner(rest) === null ? null : kind + corner(rest)
      return k
    }),
  }
}

/** A line's end, where it referred to a piece now gone, as the same spot on what's there now; null when there's nothing there. */
function rehome(pt: Point, old: Map<string, Placed>, now: Map<string, Placed>, gone: Set<string>): Point | null {
  const map = (x: Point) => rehome(x, old, now, gone)
  if (pt.at === 'corner' || pt.at === 'spot' || pt.at === 'arc') {
    if (!gone.has(pt.piece)) return pt
    const at = pointAt(old, pt)
    return at ? pointFor(now, [], at) : null
  }
  if (pt.at === 'mid') {
    const [p, q] = [map(pt.p), map(pt.q)]
    return p && q ? { at: 'mid', p, q } : null
  }
  if (pt.at === 'foot') {
    const [from, p, q] = [map(pt.from), map(pt.p), map(pt.q)]
    return from && p && q ? { at: 'foot', from, p, q } : null
  }
  const ends = [...pt.a, ...pt.b].map(map)
  return ends.every(Boolean) ? { at: 'cross', a: [ends[0]!, ends[1]!], b: [ends[2]!, ends[3]!] } : null
}

/** Whether the selected pieces can merge: rectangles, two or more, making one rectangle together. */
export function mergeCheck(pieces: Piece[], ids: string[]): { box: { o: Vec; u: Vec; out: Vec; s: [number, number]; t: [number, number] } } | { problem: string } {
  const placed = placeAll(pieces)
  const pls = ids.map((id) => placed.get(id))
  if (pls.length < 2 || pls.some((pl) => !pl)) return { problem: 'Select two or more rectangles to merge.' }
  if (pls.some((pl) => pl!.piece.kind !== 'rectangle')) return { problem: 'Only rectangles merge.' }
  const { u, out, a: o } = pls[0]!
  const pts = pls.flatMap((pl) => pl!.corners)
  if (pls.some((pl) => Math.abs(cross(pl!.u, u)) > EPS && Math.abs(dot(pl!.u, u)) > EPS)) return { problem: 'These don’t make one rectangle.' }
  const ss = pts.map((p) => dot(sub(p, o), u))
  const ts = pts.map((p) => dot(sub(p, o), out))
  const box = { o, u, out, s: [Math.min(...ss), Math.max(...ss)] as [number, number], t: [Math.min(...ts), Math.max(...ts)] as [number, number] }
  const area = pls.reduce((a, pl) => a + baseOf(pl!.piece) * pl!.piece.depth, 0)
  if (Math.abs(area - (box.s[1] - box.s[0]) * (box.t[1] - box.t[0])) > 1e-6) return { problem: 'These don’t make one rectangle.' }
  return { box }
}

/**
 * The selected rectangles merged into one. Nothing moves on the page: what
 * sat on them sits on the merged rectangle (or, when it can't, stands on its
 * own where it is), labels stay on the sides and corners still there, and
 * lines keep their ends.
 */
export function mergePieces(c: Composite, ids: string[]): { comp: Composite; id: string } | { problem: string } {
  const check = mergeCheck(c.pieces, ids)
  if ('problem' in check) return check
  const { o, u, out, s: [s1, s2], t: [t1, t2] } = check.box
  const gone = new Set(ids)
  const old = placeAll(c.pieces)
  const corner = (s: number, t: number) => add(o, add(mul(u, s), mul(out, t)))
  const box: Vec[] = [corner(s1, t1), corner(s2, t1), corner(s2, t2), corner(s1, t2)]
  const boxSides: [Vec, Vec][] = box.map((p, i) => [p, box[(i + 1) % 4]])
  const id = newId()
  const first = c.pieces.find((p) => p.id === ids[0])!
  let merged: Piece | null = null
  // On whatever one of them sat on, along the box's side lying there.
  for (const p of c.pieces.filter((x) => gone.has(x.id) && x.mount && !gone.has(x.mount.parent))) {
    const side = old.get(p.mount!.parent)!.sides[p.mount!.side]
    const along = boxSides.find((seg) => collinear(side, seg))
    if (!along) continue
    const d = unit(sub(side[1], side[0]))
    const [from, to] = along.map((q) => dot(sub(q, side[0]), d)).sort((x, y) => x - y)
    const pOut = outwardOf(old.get(p.mount!.parent)!, side)
    const depth = Math.abs(dot(sub(box[0], box[2]), pOut))
    merged = { ...first, id, kind: 'rectangle', mount: { parent: p.mount!.parent, side: p.mount!.side, from, to }, width: to - from, depth, locks: [] }
    delete merged.frame
    break
  }
  merged ??= { ...first, id, kind: 'rectangle', mount: null, at: box[0], width: s2 - s1, depth: t2 - t1, frame: { u, out }, locks: [] }
  let pieces = [...c.pieces.filter((p) => !gone.has(p.id)), merged]
  const mergedPl = placeAll(pieces).get(id)
  if (!mergedPl) return { problem: 'These don’t make one rectangle.' }
  // What sat on them sits on the merged rectangle where its base runs along one of its sides the same way; else stands on its own.
  pieces = pieces.map((p) => {
    if (!p.mount || p.id === id) return p
    const hostsGone = [p.mount.parent, ...(p.mount.with ?? []).map((h) => h.parent)].some((h) => gone.has(h))
    if (!hostsGone) return p
    const pl = old.get(p.id)!
    const keep = (p.mount.with ?? []).filter((h) => !gone.has(h.parent))
    if (!gone.has(p.mount.parent)) return { ...p, mount: { ...p.mount, with: keep.length ? keep : undefined } }
    for (let side = 0; side < 4; side++) {
      const seg = mergedPl.sides[side]
      const d = unit(sub(seg[1], seg[0]))
      if (!collinear(seg, [pl.a, pl.b]) || dot(pl.u, d) <= 0) continue
      return { ...p, mount: { parent: id, side, from: dot(sub(pl.a, seg[0]), d), to: dot(sub(pl.b, seg[0]), d), with: keep.length ? keep : undefined } }
    }
    return { ...p, mount: null, at: pl.a, width: baseOf(p), frame: { u: pl.u, out: pl.out } }
  })
  const why = problem(pieces)
  if (why) return { problem: why }
  const now = placeAll(pieces)
  const lines = c.lines.flatMap((l) => {
    const [a, b] = [rehome(l.a, old, now, gone), rehome(l.b, old, now, gone)]
    return a && b ? [{ ...l, a, b }] : []
  })
  const after: Composite = { ...c, pieces, lines, semis: Object.fromEntries(Object.entries(c.semis).filter(([k]) => !gone.has(k))) }
  return { comp: rekeyLabels(c, after), id }
}

// ----- Starters: shapes already built from pieces

export const STARTERS = ['circle', 'l-shape', 'house', 'arch'] as const
export type Starter = (typeof STARTERS)[number]
export const STARTER_NAMES: Record<Starter, string> = { 'l-shape': 'L-shape', house: 'House', arch: 'Arch', circle: 'Circle' }

export function starter(kind: Starter): Piece[] {
  if (kind === 'l-shape') {
    const base = { ...firstPiece('rectangle', 8), depth: 3 }
    // On the top side (index 2, which runs right to left), the leftmost three units.
    return [base, { ...blank('rectangle', 3), id: newId(), mount: { parent: base.id, side: 2, from: 5, to: 8 }, at: [0, 0], depth: 4 }]
  }
  if (kind === 'circle') {
    // Two semicircles sharing their diameter, which is a seam: drawn only if a line is drawn along it.
    const top = firstPiece('semicircle', 6)
    return [top, { ...blank('semicircle', 6), id: newId(), mount: { parent: top.id, side: 0, from: 0, to: 6 }, at: [0, 0] }]
  }
  const base = { ...firstPiece('rectangle', 6), depth: 4 }
  if (kind === 'house') return [base, { ...blank('triangle', 6), id: newId(), mount: { parent: base.id, side: 2, from: 0, to: 6 }, at: [0, 0], depth: 3 }]
  return [base, { ...blank('semicircle', 6), id: newId(), mount: { parent: base.id, side: 2, from: 0, to: 6 }, at: [0, 0] }]
}

// ----- Reading back from storage

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const oneOf = <T>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)
const cap = (v: unknown): Cap | null => (typeof v === 'string' && v in CAPS ? (v as Cap) : null)
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {})

/** A composite shape read back from browser storage, keeping only what's well-formed and drawable. Pieces of kinds there no longer are (trapezoids) go, with what sat on them. */
export function tidyComposite(stored: unknown): Composite {
  const s = obj(stored)
  const all: any[] = (Array.isArray(s.pieces) ? s.pieces : []).filter((p: any) => p && typeof p.id === 'string')
  const gone = new Set<string>()
  for (const p of all) if (!PIECE_KINDS.includes(p.kind)) for (const id of familyOf(all, p.id)) gone.add(id)
  const pieces: Piece[] = all
    .filter((p) => !gone.has(p.id))
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      mount: p.mount && typeof p.mount.parent === 'string'
        ? {
            parent: p.mount.parent, side: num(p.mount.side, 0), from: num(p.mount.from, 0), to: num(p.mount.to, 1),
            ...(Array.isArray(p.mount.with) && p.mount.with.length
              ? { with: p.mount.with.filter((h: any) => h && typeof h.parent === 'string').map((h: any) => ({ parent: h.parent, side: num(h.side, 0) })) }
              : {}),
          }
        : null,
      at: [num(p.at?.[0], 0), num(p.at?.[1], 0)] as Vec,
      ...(p.frame && !p.mount ? { frame: { u: unit([num(p.frame.u?.[0], 1), num(p.frame.u?.[1], 0)]), out: unit([num(p.frame.out?.[0], 0), num(p.frame.out?.[1], -1)]) } } : {}),
      width: num(p.width, 1),
      depth: num(p.depth, 1),
      tip: num(p.tip, 0),
      shade: oneOf(SHADES.map((_, i) => i), p.shade, 0),
      locks: (Array.isArray(p.locks) ? p.locks : []).filter((n: unknown) => TRIANGLE_PARTS.includes(n as TrianglePart)),
    }))
  const out = emptyComposite()
  if (problem(pieces)) return out
  out.pieces = pieces
  for (const [k, v] of Object.entries(obj(s.sides)))
    out.sides[k] = {
      label: oneOf(LABEL_MODES, v?.label, 'none'), text: str(v?.text), ticks: num(v?.ticks, 0), arrows: num(v?.arrows, 0),
      style: oneOf([...Object.keys(LINE_STYLES), 'hidden'] as ExtraStyle[], v?.style, 'solid'), weight: oneOf(Object.keys(LINE_WEIGHTS) as LineWeight[], v?.weight, 'regular'),
    }
  for (const [k, v] of Object.entries(obj(s.angles)))
    out.angles[k] = { label: oneOf(LABEL_MODES, v?.label, 'none'), text: str(v?.text), mark: oneOf(MARKS, v?.mark, 'none'), shade: num(v?.shade, 0) }
  for (const [k, v] of Object.entries(obj(s.points))) if (typeof v === 'string') out.points[k] = v.slice(0, 4)
  const ids = new Set(pieces.map((p) => p.id))
  for (const [k, v] of Object.entries(obj(s.semis)))
    if (ids.has(k))
      out.semis[k] = {
        radius: !!v?.radius, radiusLabel: oneOf(LABEL_MODES, v?.radiusLabel, 'measure'), radiusText: str(v?.radiusText, 'r'),
        center: typeof v?.center === 'string' ? v.center.slice(0, 4) : null, arcText: str(v?.arcText),
      }
  const placed = placeAll(pieces)
  out.lines = (Array.isArray(s.lines) ? s.lines : []).flatMap((l: any) => {
    const [a, b] = [tidyPoint(l?.a, placed), tidyPoint(l?.b, placed)]
    return a && b && typeof l.id === 'string' && lineEnds(placed, { a, b } as ExtraLine)
      ? [{
          id: l.id, a, b, style: oneOf([...Object.keys(LINE_STYLES), 'hidden'] as ExtraStyle[], l.style, 'dashed'),
          weight: oneOf(Object.keys(LINE_WEIGHTS) as LineWeight[], l.weight, 'regular'),
          label: oneOf(LABEL_MODES, l.label, 'none'), text: str(l.text), ticks: num(l.ticks, 0), right: l.right !== false,
          ray: { a: cap(l.ray?.a), b: cap(l.ray?.b) },
        }]
      : []
  })
  for (const [k, v] of Object.entries(obj(s.moved))) if (Array.isArray(v) && v.length === 2) out.moved[k] = [num(v[0], 0), num(v[1], 0)]
  out.unit = str(s.unit).slice(0, 8)
  out.round = oneOf([0, 1, 2], s.round, 1)
  out.angleRound = oneOf([0, 1, 2], s.angleRound, 0)
  out.turn = Math.max(-180, Math.min(180, Math.round(num(s.turn, 0))))
  return out
}

/** A line's end read back, or null when it's malformed. Ends kept as a spot on a piece (from before points were kept by how they're found) become that piece's corner when they sit on one. */
function tidyPoint(v: any, placed: Map<string, Placed>, depth = 0): Point | null {
  if (!v || typeof v !== 'object' || depth > 12) return null
  const at = (x: any) => tidyPoint(x, placed, depth + 1)
  const pl = typeof v.piece === 'string' ? placed.get(v.piece) : undefined
  if (v.at === 'corner') return pl && Number.isInteger(v.corner) && pl.corners[v.corner] ? { at: 'corner', piece: v.piece, corner: v.corner } : null
  if (v.at === 'mid') {
    const [p, q] = [at(v.p), at(v.q)]
    return p && q ? { at: 'mid', p, q } : null
  }
  if (v.at === 'foot') {
    const [from, p, q] = [at(v.from), at(v.p), at(v.q)]
    return from && p && q ? { at: 'foot', from, p, q } : null
  }
  if (v.at === 'arc') return pl?.arc && typeof v.deg === 'number' && v.deg > pl.arc.lo && v.deg < pl.arc.hi ? { at: 'arc', piece: v.piece, deg: v.deg } : null
  if (v.at === 'cross') {
    const ends = [v.a?.[0], v.a?.[1], v.b?.[0], v.b?.[1]].map(at)
    return ends.every(Boolean) ? { at: 'cross', a: [ends[0]!, ends[1]!], b: [ends[2]!, ends[3]!] } : null
  }
  if (!pl || (v.at !== undefined && v.at !== 'spot')) return null
  const spot: Anchor = { piece: v.piece, s: num(v.s, 0), t: num(v.t, 0) }
  const i = pl.corners.findIndex((c) => len(sub(c, anchorAt(pl, spot))) < 1e-4)
  return i >= 0 ? { at: 'corner', piece: v.piece, corner: i } : { at: 'spot', ...spot }
}

/** A few words saying what is drawn, for screen readers and the image's label. */
export function describe(c: Composite) {
  if (!c.pieces.length) return 'An empty page'
  const counts = new Map<string, number>()
  for (const p of c.pieces) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1)
  const parts = [...counts].map(([k, n]) => `${n} ${PIECE_NAMES[k as PieceKind].toLowerCase()}${n === 1 ? '' : 's'}`).join(', ')
  return `A composite shape made of ${parts}`
}
