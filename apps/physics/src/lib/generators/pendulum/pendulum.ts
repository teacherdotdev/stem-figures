// Where everything in a Pendulum figure goes: the pivot under a hatched
// ceiling, the bob (or the Swing's three bobs) on the arc the string sweeps,
// the angle and height marks, the force and velocity arrows, and the labels,
// on a fixed 640 × 420 box.
//
// The string is always LENGTH long, so θ alone sets the shape. The pivot
// sits a little toward the side the bob is on, so that at the largest angle
// both the bob and the height mark on the far side fit.
//
// Force arrows are drawn about the right size, not to scale with anything
// else: weight is WEIGHT long (longer at a wide angle, see weightOf), and the tension is as long as weight's
// component along the string, mg cos θ, which is right at a release point,
// where the bob is momentarily at rest. Every arrow on a bob starts at its
// middle and the bob is drawn over it, so the arrow comes out of its edge;
// the tension and mg cos θ show at least MIN_SHOWN past it (see
// weightOf), and mg sin θ shows at least MIN_SHOWN_ACROSS, at a small angle by
// being drawn a little longer than to scale.
//
// Angles are in degrees counterclockwise from the right (see $lib/shared/layout).
// Labels are placed last, each at the first clear spot near where it belongs
// (placeLabels); no arrow or line moves for one.

import { boxCorners, direction, labelBox, labelWidth, placeLabels, pt, seg, type Placing } from '$lib/shared/layout'
import { objectHeight } from '$lib/shared/objects'
import { CEILING_HATCH_LENGTH, ceiling, type Support } from '$lib/shared/support'
import type { Label } from '$lib/shared/label'
import type { LabeledVector, Point, Segment } from '$lib/shared/vector'
import { type PendulumSettings } from './settings'

export const WIDTH = 640
export const HEIGHT = 420
/** The bob's size (see $lib/shared/objects), and its radius. */
export const BOB_SIZE = 0.5
export const BOB_R = objectHeight('ball', BOB_SIZE) / 2
/** The string, from the pivot to the bob's middle. */
export const LENGTH = 256
/** How far the ceiling runs to each side of the pivot. */
const CEILING_HALF = 70
/** The weight arrow, and the velocity arrow. */
export const WEIGHT = 96
/** How much of a force arrow, at the least, shows past the bob's edge. */
export const MIN_SHOWN = 32
/** The same for mg sin θ at a small angle, which is drawn longer than to scale to show this much: less, so it is drawn to scale from about 25°. */
export const MIN_SHOWN_ACROSS = 22

/**
 * How long weight is drawn at θ: WEIGHT, or longer at a wide angle, so the
 * tension and weight's component along the string (both mg cos θ) still show
 * past the bob. Every force grows with it, so they stay to scale with each other.
 */
export const weightOf = (deg: number) => Math.max(WEIGHT, (BOB_R + MIN_SHOWN) / Math.cos((deg * Math.PI) / 180))
export const VELOCITY = 64
/** The angle mark's arc, around the pivot. */
export const ARC_R = 50
/** The height mark's dimension line, out from the far bob's edge. */
const HEIGHT_GAP = 16
/** A height shorter than this has its arrowheads outside, pointing in. */
export const SHORT_HEIGHT = 30
/** A dashed line runs this far past what it lines up with. */
const OVERRUN = 6

export type VectorKind = 'tension' | 'weight' | 'along' | 'across' | 'velocity'

export interface FigureVector extends LabeledVector<VectorKind> {
  length: number
}

/** How a line is drawn (see Pendulum.svelte). */
export type Look = 'string' | 'ghostString' | 'path' | 'ref' | 'arc'

export interface Piece {
  d: string
  look: Look
}

export interface Bob {
  /** Its middle. */
  at: Point
  /** The release point, at the bottom, or at the far side. */
  role: 'release' | 'bottom' | 'far'
  /** A lighter copy: the Swing's bottom and far-side bobs. */
  ghost: boolean
}

/** A label that isn't a vector's: a mark's, a letter, the bob's. */
export interface Note {
  label: Label
  at: Point
  italic: boolean
}

/** The height mark: a dimension line from the raised bob's level down to the lowest point's. */
export interface HeightMark {
  x: number
  top: number
  bottom: number
  /** Too short for heads inside: they sit outside, pointing in. */
  outside: boolean
}

export interface PendulumFigure {
  width: number
  height: number
  pivot: Point
  /** The lowest point of the bob's middle, straight under the pivot. */
  lowest: Point
  support: Support
  pieces: Piece[]
  bobs: Bob[]
  vectors: FigureVector[]
  /** Dotted lines from weight's tip to its components' tips. */
  guides: Segment[]
  heightMark: HeightMark | null
  notes: Note[]
  /** Every outermost point drawn, for tests. */
  extent: Point[]
}

const r2 = (n: number) => Math.round(n * 100) / 100
const add = (p: Point, d: Point, k = 1): Point => ({ x: p.x + d.x * k, y: p.y + d.y * k })
const polar = (c: Point, r: number, deg: number): Point => add(c, direction(deg), r)
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y

/** An arc around `c` from one angle to another, counterclockwise if `to` is the bigger. */
function arcD(c: Point, r: number, from: number, to: number) {
  const a = polar(c, r, from)
  const b = polar(c, r, to)
  return `M${r2(a.x)},${r2(a.y)} A${r},${r} 0 ${Math.abs(to - from) > 180 ? 1 : 0} ${to > from ? 0 : 1} ${r2(b.x)},${r2(b.y)}`
}
/** The same arc as short straight pieces, for keeping labels off it. */
function arcLines(c: Point, r: number, from: number, to: number): Segment[] {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / 5))
  const at = (i: number) => polar(c, r, from + ((to - from) * i) / n)
  return Array.from({ length: n }, (_, i) => seg(at(i), at(i + 1)))
}

/** Room kept for labels: beside the bob, beside its forces, under the bottom, and beside the height mark. */
const ROOM = { bob: 34, forces: 100, under: 34, height: 30 }

/**
 * Where the pivot goes, so the drawing is in the middle of the box: how far
 * it reaches to each side of the pivot and below it, with room for its
 * labels. Too wide to fit, the height mark's side is kept on the figure and
 * the labels on the bob's side find what room there is.
 */
export function pivotOf(s: PendulumSettings): Point {
  const swing = s.picture === 'swing'
  const sign = s.side === 'right' ? 1 : -1
  const rad = (s.angle * Math.PI) / 180
  const across = LENGTH * Math.sin(rad)
  const down = LENGTH * Math.cos(rad)
  const forces = !swing && s.forces !== 'none'
  // Toward the bob, and away from it.
  const near = across + BOB_R + (forces ? ROOM.forces : ROOM.bob)
  const far = Math.max(CEILING_HALF, swing || s.arc ? across + BOB_R + ROOM.bob : 0, s.heightMark ? across + BOB_R + HEIGHT_GAP + ROOM.height : 0)
  const x = Math.max(4 + far, Math.min(WIDTH - 4 - near, WIDTH / 2 + (far - near) / 2))
  // Below the pivot: the lowest point and what's under it, or the bob and its forces.
  const lowest = swing || s.arc || s.heightMark || s.angleMark ? LENGTH + (swing ? BOB_R + ROOM.under : 0) : 0
  const bottom = Math.max(lowest, down + (forces ? weightOf(s.angle) + 40 : BOB_R + ROOM.bob))
  const top = CEILING_HATCH_LENGTH
  const y = Math.max(top + 4, (HEIGHT - bottom - top) / 2 + top)
  return pt(sign > 0 ? x : WIDTH - x, y)
}

/** The bob's middle at `deg` from the vertical, to the right for a positive angle. */
export const bobAt = (pivot: Point, deg: number) => {
  const a = (deg * Math.PI) / 180
  return pt(pivot.x + LENGTH * Math.sin(a), pivot.y + LENGTH * Math.cos(a))
}

export function buildPendulum(s: PendulumSettings): PendulumFigure {
  const swing = s.picture === 'swing'
  const sign = s.side === 'right' ? 1 : -1
  const theta = s.angle
  const rad = (theta * Math.PI) / 180
  const P = pivotOf(s)
  const lowest = pt(P.x, P.y + LENGTH)
  const release = bobAt(P, sign * theta)
  const far = bobAt(P, -sign * theta)
  /** The release string's direction, in degrees counterclockwise from the right. */
  const stringAngle = 270 + sign * theta

  const fig: PendulumFigure = {
    width: WIDTH,
    height: HEIGHT,
    pivot: P,
    lowest,
    support: ceiling(P.x - CEILING_HALF, P.x + CEILING_HALF, P.y),
    pieces: [],
    bobs: [],
    vectors: [],
    guides: [],
    heightMark: null,
    notes: [],
    extent: [],
  }
  /** Every line a label keeps clear of. */
  const lines: Segment[] = []
  type Want = Placing & { put(p: Point): void }
  const vectorWants: Want[] = []
  const noteWants: Want[] = []

  const line = (a: Point, b: Point, look: Look) => {
    fig.pieces.push({ d: `M${r2(a.x)},${r2(a.y)} L${r2(b.x)},${r2(b.y)}`, look })
    lines.push(seg(a, b))
    fig.extent.push(pt(a.x, a.y), pt(b.x, b.y))
  }
  const arc = (c: Point, r: number, from: number, to: number, look: Look) => {
    fig.pieces.push({ d: arcD(c, r, from, to), look })
    lines.push(...arcLines(c, r, from, to))
  }
  const bob = (at: Point, role: Bob['role'], ghost: boolean) => {
    fig.bobs.push({ at, role, ghost })
    // Its box and diagonals, so no label lands on it.
    const c = [pt(at.x - BOB_R, at.y - BOB_R), pt(at.x + BOB_R, at.y - BOB_R), pt(at.x + BOB_R, at.y + BOB_R), pt(at.x - BOB_R, at.y + BOB_R)]
    lines.push(seg(c[0], c[1]), seg(c[1], c[2]), seg(c[2], c[3]), seg(c[3], c[0]), seg(c[0], c[2]), seg(c[1], c[3]))
    fig.extent.push(c[0], c[2])
  }
  /** A label to place near `at`, moving `out` if that spot is taken, or near `alt` on the other side. */
  const note = (label: Label, at: Point, out: Point, italic = true, alt?: Point) => {
    const n: Note = { label, at: pt(at.x, at.y), italic }
    fig.notes.push(n)
    noteWants.push({ at: n.at, out, alt, label, put: (p) => (n.at = p) })
  }
  /** A label beside a line from `from` along `angle`, `along` of the way, on the side nearer `side`. */
  const besideLine = (label: Label, from: Point, angle: number, along: number, side: Point) => {
    const u = direction(angle)
    const across = { x: -u.y, y: u.x }
    const k = Math.sign(dot(across, side)) || 1
    const reach = 9 + (labelWidth(label) / 2) * Math.abs(across.x) + 12 * Math.abs(across.y)
    const base = add(from, u, along)
    note(label, add(base, across, k * reach), { x: across.x * k, y: across.y * k }, true, add(base, across, -k * reach))
  }
  /**
   * An arrow from `from` along the unit vector `d`, `length` long, with its
   * label past its tip, or beside its middle on the side nearer `side`.
   */
  const arrow = (kind: VectorKind, from: Point, d: Point, length: number, label: Label, place: 'tip' | 'beside', side?: Point) => {
    const v = seg(from, add(from, d, length))
    const lw = labelWidth(label)
    let at: Point
    let out: Point
    let alt: Point | undefined
    if (place === 'tip' && kind === 'across') {
      // Level with its tip, on the vertical's side, a little lower: clear of the dotted guide, and by its arrow even when the label is wide.
      const sx = Math.sign(d.x) || 1
      const tip = add(from, d, length)
      at = pt(tip.x + sx * (labelBox(tip, label).w / 2 + 6), tip.y + 6)
      out = { x: sx, y: 0 }
    } else if (place === 'tip') {
      at = add(add(from, d, length), d, 12 + (lw / 2) * Math.abs(d.x) + 15 * Math.abs(d.y))
      out = d
    } else {
      const across = { x: -d.y, y: d.x }
      const k = side ? Math.sign(dot(across, side)) || 1 : 1
      const reach = 10 + (lw / 2) * Math.abs(across.x) + 13 * Math.abs(across.y)
      const base = add(from, d, Math.max(length / 2, BOB_R + 6))
      at = add(base, across, k * reach)
      out = { x: across.x * k, y: across.y * k }
      alt = add(base, across, -k * reach)
    }
    const vector: FigureVector = { kind, v, label, labelAt: pt(at.x, at.y), length: r2(length) }
    fig.vectors.push(vector)
    lines.push(v)
    vectorWants.push({ at: vector.labelAt, out, alt, label, put: (p) => (vector.labelAt = p) })
    return vector
  }

  // The ceiling, and the space its hatches take, kept clear of labels.
  const sl = fig.support.line
  const top = sl.y1 - CEILING_HATCH_LENGTH
  lines.push(sl, seg(pt(sl.x1, top), pt(sl.x2, top)), seg(pt(sl.x1, top), pt(sl.x1, sl.y1)), seg(pt(sl.x2, top), pt(sl.x2, sl.y1)))
  fig.extent.push(pt(sl.x1, top), pt(sl.x2, sl.y1))

  // The path, then the marks, then the strings, so the strings are drawn over the dashed lines.
  if (s.arc) arc(P, LENGTH, 270 - theta, 270 + theta, 'path')
  // With forces on and nothing else at the bottom, the vertical stops level with the bob, leaving room for mg sin θ's label.
  const shortVertical = s.forces !== 'none' && !s.arc && !s.heightMark
  if (s.angleMark && !swing) line(P, shortVertical ? pt(P.x, release.y) : lowest, 'ref')
  if (s.heightMark) {
    // On the far side, so it crosses no string; its dashed lines reach across under the release bob.
    const x = r2(far.x - sign * (BOB_R + HEIGHT_GAP))
    const past = x - sign * OVERRUN
    line(release, pt(past, release.y), 'ref')
    line(pt(release.x, lowest.y), pt(past, lowest.y), 'ref')
    const h = lowest.y - release.y
    fig.heightMark = { x, top: release.y, bottom: lowest.y, outside: h < SHORT_HEIGHT }
    const reach = fig.heightMark.outside ? 18 : 0
    lines.push(seg(pt(x, release.y - reach), pt(x, lowest.y + reach)))
    const w = labelWidth(s.heightLabel)
    note(s.heightLabel, pt(x - sign * (9 + w / 2), (release.y + lowest.y) / 2), { x: -sign, y: 0 })
  }
  if (swing) {
    line(P, lowest, 'ghostString')
    line(P, far, 'ghostString')
  }
  line(P, release, 'string')

  if (s.angleMark) {
    arc(P, ARC_R, Math.min(270, stringAngle), Math.max(270, stringAngle), 'arc')
    const mid = direction(270 + (sign * theta) / 2)
    const w = labelWidth(s.angleLabel)
    note(s.angleLabel, add(P, mid, ARC_R + 9 + (w / 2) * Math.abs(mid.x) + 12 * Math.abs(mid.y)), mid)
  }
  // The length label beside the release string, on its side away from the vertical.
  besideLine(s.lengthLabel, P, stringAngle, LENGTH * 0.55, { x: sign * Math.cos(rad), y: -Math.sin(rad) })

  // Arrows. Along the string, out from the pivot; along the path, toward the bottom.
  const outward = { x: sign * Math.sin(rad), y: Math.cos(rad) }
  const downPath = { x: -sign * Math.cos(rad), y: Math.sin(rad) }
  const awayFromVertical = { x: sign * Math.cos(rad), y: -Math.sin(rad) }
  if (!swing && s.forces !== 'none') {
    const W = weightOf(theta)
    // The tension's label goes on the vertical's side of the string, leaving the outside for the bob's.
    const towardVertical = { x: -awayFromVertical.x, y: -awayFromVertical.y }
    arrow('tension', release, { x: -outward.x, y: -outward.y }, W * Math.cos(rad), s.tensionLabel, 'beside', towardVertical)
    const weight = arrow('weight', release, { x: 0, y: 1 }, W, s.weightLabel, 'tip')
    if (s.forces === 'components') {
      const along = arrow('along', release, outward, W * Math.cos(rad), s.alongLabel, 'beside', awayFromVertical)
      // At a small angle mg sin θ is drawn a little longer than to scale, so it shows past the bob.
      const short = W * Math.sin(rad) < BOB_R + MIN_SHOWN_ACROSS
      const across = arrow('across', release, downPath, Math.max(W * Math.sin(rad), BOB_R + MIN_SHOWN_ACROSS), s.acrossLabel, 'tip')
      const tip = pt(weight.v.x2, weight.v.y2)
      // Dotted lines from weight's tip, each as long as the other component: the second only when that one is to scale.
      fig.guides.push(seg(tip, pt(along.v.x2, along.v.y2)))
      if (!short) fig.guides.push(seg(tip, pt(across.v.x2, across.v.y2)))
      lines.push(...fig.guides)
    }
  }
  // Stopping short of the far bob at a small angle.
  if (swing && s.velocity) arrow('velocity', lowest, { x: -sign, y: 0 }, Math.min(VELOCITY, LENGTH * Math.sin(rad) - BOB_R - 8), s.velocityLabel, 'tip')

  // The bobs, the ghosts first so the release bob is on top.
  if (swing) {
    bob(lowest, 'bottom', true)
    bob(far, 'far', true)
  }
  bob(release, 'release', false)
  fig.extent.push(P)

  // The bob's label beside it, away from the vertical: level with it in the Swing (its letter A is above),
  // and up and out on One bob, clear of the forces below it. It stays on that side.
  const lw = labelWidth(s.bobLabel)
  const bobOut = swing ? { x: sign, y: 0 } : awayFromVertical
  note(s.bobLabel, add(release, bobOut, BOB_R + 8 + (lw / 2) * Math.abs(bobOut.x) + 12 * Math.abs(bobOut.y)), bobOut)
  // It is placed first, so it stays by the bob and the force labels find room round it.
  const bobWant = noteWants.pop()!
  if (swing && s.pointLabels) {
    const beyond = (at: Point, d: Point, l: Label) => add(at, d, BOB_R + 8 + (labelWidth(l) / 2) * Math.abs(d.x) + 12 * Math.abs(d.y))
    const upFar = { x: -sign * Math.cos(rad), y: -Math.sin(rad) }
    note(s.labelA, beyond(release, awayFromVertical, s.labelA), awayFromVertical, false)
    note(s.labelB, beyond(lowest, { x: 0, y: 1 }, s.labelB), { x: 0, y: 1 }, false)
    note(s.labelC, beyond(far, upFar, s.labelC), upFar, false)
  }

  // Every label at a clear spot, arrows' first, and kept on the figure.
  // The figure's edges count as lines, so a label finds a clear spot inside them.
  const edge = [pt(2, 2), pt(WIDTH - 2, 2), pt(WIDTH - 2, HEIGHT - 2), pt(2, HEIGHT - 2)]
  const edges = edge.map((p, i) => seg(p, edge[(i + 1) % 4]))
  const order = [bobWant, ...vectorWants, ...noteWants]
  placeLabels(order, [...lines, ...edges], null).forEach((p, i) => {
    const b = labelBox(p, order[i].label)
    order[i].put(pt(Math.min(WIDTH - 4 - b.w / 2, Math.max(4 + b.w / 2, p.x)), Math.min(HEIGHT - 4 - b.h / 2, Math.max(4 + b.h / 2, p.y))))
  })
  if (fig.heightMark) {
    const m = fig.heightMark
    const reach = m.outside ? 18 : 0
    fig.extent.push(pt(m.x, m.top - reach), pt(m.x, m.bottom + reach))
  }
  fig.extent.push(
    ...fig.vectors.flatMap((v) => [pt(v.v.x1, v.v.y1), pt(v.v.x2, v.v.y2), ...boxCorners(labelBox(v.labelAt, v.label))]),
    ...fig.notes.flatMap((n) => boxCorners(labelBox(n.at, n.label))),
  )
  return fig
}

/** What the figure shows, for screen readers. */
export function describe(s: PendulumSettings): string {
  const side = s.side === 'right' ? 'right' : 'left'
  const marks = [s.angleMark ? 'the angle θ' : '', s.heightMark ? 'the height h it drops' : ''].filter(Boolean).join(' and ')
  if (s.picture === 'swing') {
    return (
      `A pendulum swinging: a bob on a string from a ceiling, released ${s.angle}° to the ${side} of the vertical, drawn there, at the bottom and at the same height on the far side` +
      (s.arc ? ', with its dashed path' : '') +
      (s.velocity ? ', and its velocity at the bottom' : '') +
      (marks ? `. Marked: ${marks}` : '')
    )
  }
  const forces = { none: '', tensionWeight: ', with the tension and its weight', components: ', with the tension, its weight, and its weight’s components along the string and the path' }[s.forces]
  return `A pendulum: a bob on a string from a ceiling, ${s.angle}° to the ${side} of the vertical${forces}` + (marks ? `. Marked: ${marks}` : '')
}
