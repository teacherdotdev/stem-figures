// Where everything in a Circular Motion figure goes. Each setup has its own
// builder (the Top view, the Vertical circle, the Conical pendulum), and all
// three fill in the same figure: path pieces, objects, vectors, marks and
// labels, on a fixed 640 × 420 box.
//
// Motion is uniform, so every velocity arrow in a figure is the same length,
// and so is every acceleration or inward force arrow (a second object halfway
// out on a turntable has arrows half as long: v = ωr and a = ω²r). Every
// arrow on an object starts at its middle and is measured from there, and the
// object is drawn over it, so the arrow comes out of its edge. Arrows pointing
// the same way are drawn side by side, as on the Free Body Diagram.
// Angles are in degrees counterclockwise from the right (see $lib/shared/layout).
//
// Labels are placed last, each at the first clear spot near where it belongs
// (placeLabels); no arrow or line moves for one.

import { asVector, type Label } from '$lib/shared/label'
import { boxCorners, crosses, direction, labelBox, labelWidth, overlaps, placeLabels, pt, seg, type Box, type Placing } from '$lib/shared/layout'
import { objectHeight, type ObjectKind } from '$lib/shared/objects'
import { ceiling, type Support } from '$lib/shared/support'
import { numbered, type LabeledVector, type Point, type Segment } from '$lib/shared/vector'
import { SIDE_GAP, sameDirection } from '../free-body-diagram/fbd'
import { hasInner, objectKind, pointsOf, type CircularSettings } from './settings'

export const WIDTH = 640
export const HEIGHT = 420
/** Every object is this size (see $lib/shared/objects). */
export const OBJECT_SIZE = 0.5

/** The Top view: its circle, and how long a velocity and an inward arrow are. */
export const TOP = { centre: { x: 320, y: 210 }, r: 135, velocity: 76, inward: 68 }
/** A turntable's edge and a road's edges, out from the path. */
const DISC_RIM = 34
const ROAD_HALF = 24
/** The Vertical circle: its circle, a velocity arrow, and a force of length 1 (gravity's), short enough that the bottom's tension stops short of the centre. */
export const VERTICAL = { centre: { x: 320, y: 185 }, r: 122, velocity: 64, unit: 42 }
/** Over a hill or through a dip only one point is drawn, so a force of length 1 can be longer. */
export const GROUND_UNIT = 62
/** A hill or a dip: how tightly it curves, and how its ends level out. */
const HILL = { r: 220, fillet: 50, top: 150, bottom: 300, left: 30, right: 610 }
/**
 * The net force toward the centre, in units of gravity. The speed is steady,
 * so it is the same at every point: on a string or in a loop the tension or
 * normal force plus gravity at the top, it alone at the side, and it minus
 * gravity at the bottom. Over a hill it is gravity minus the normal force, so
 * it is less than 1 there (more and the car leaves the road), and a dip mirrors it.
 */
export const NET = { circle: 1.7, ground: 0.4 }

/** The tension or normal force at a point, in units of gravity: shorter than gravity at the top, longer at the bottom. */
export function contactOf(held: CircularSettings['held'], p: 'top' | 'side' | 'bottom'): number {
  const n = held === 'hill' ? 1 - NET.ground : held === 'dip' ? 1 + NET.ground : { top: NET.circle - 1, side: NET.circle, bottom: NET.circle + 1 }[p]
  return Math.round(n * 100) / 100
}
/** The Conical pendulum: its pivot, string, and gravity arrow. */
export const CONICAL = { pivot: { x: 300, y: 34 }, length: 240, gravity: 62, squash: 0.22 }
/** An acceleration arrow drawn beside the object, in the side views: how long, and how far beside. */
const BESIDE = { length: 50, gap: 62 }
/** How much of an arrow from an object's middle must show past its edge (a head and a little shaft). */
const MIN_SHOWN = 18
const OMEGA_R = 18
const MARK_R = 36

export type VectorKind = 'velocity' | 'acceleration' | 'inward' | 'gravity' | 'tension' | 'normal' | 'x' | 'y'

export interface FigureVector extends LabeledVector<VectorKind> {
  /** Which object it is drawn on, or −1 for one drawn beside it. */
  object: number
  /** Its direction, in degrees counterclockwise from the right. */
  angle: number
  length: number
}

/** How a path piece is drawn (see CircularMotion.svelte). */
export type Look = 'path' | 'back' | 'track' | 'ground' | 'disc' | 'road' | 'string' | 'thin' | 'ref' | 'arc' | 'curved'

export interface Piece {
  d: string
  look: Look
}

export interface FigureObject {
  kind: ObjectKind
  /** Its middle. */
  at: Point
  /** How far it is turned, in degrees clockwise on the page. */
  turn: number
}

/** A label that isn't a vector's: a mark's, a letter, an object's. */
export interface Note {
  label: Label
  at: Point
  tone: 'ink' | 'vector'
  italic: boolean
}

export interface CircularFigure {
  width: number
  height: number
  /** The centre of the circle the object goes round, and that circle's radius. */
  centre: Point
  radius: number
  /** The Conical pendulum's ceiling. */
  support: Support | null
  pieces: Piece[]
  dots: { at: Point; r: number }[]
  objects: FigureObject[]
  vectors: FigureVector[]
  /** Dotted lines from a force's tip to its components' tips. */
  guides: Segment[]
  /** A diameter, or a radius measured beside a line, drawn as a dimension line. */
  dimensions: Segment[]
  /** Arrowheads of curved arrows (the angular speed's), as corners. */
  heads: Point[][]
  /** A velocity along the line of sight: a dot (out of the page) or a cross (into it). */
  symbol: { at: Point; way: 'out' | 'in' } | null
  notes: Note[]
  /** Every outermost point drawn, for tests. */
  extent: Point[]
}

const OFF: Label = { mode: 'none', text: '' }
const r2 = (n: number) => Math.round(n * 100) / 100
const norm = (deg: number) => r2(((deg % 360) + 360) % 360)
const polar = (c: Point, r: number, deg: number): Point => {
  const d = direction(deg)
  return pt(c.x + d.x * r, c.y + d.y * r)
}
const add = (p: Point, d: Point, k = 1): Point => ({ x: p.x + d.x * k, y: p.y + d.y * k })
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y

const circleD = (c: Point, r: number) => `M${r2(c.x - r)},${c.y} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0`
/** An arc from one angle round to another, counterclockwise if `to` is the bigger. */
function arcD(c: Point, r: number, from: number, to: number) {
  const a = polar(c, r, from)
  const b = polar(c, r, to)
  return `M${a.x},${a.y} A${r},${r} 0 ${Math.abs(to - from) > 180 ? 1 : 0} ${to > from ? 0 : 1} ${b.x},${b.y}`
}
/** The same arc (or an ellipse's, squashed top to bottom) as short straight pieces, for keeping labels off it. */
function arcLines(c: Point, r: number, from: number, to: number, squash = 1): Segment[] {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / 10))
  const at = (i: number) => {
    const p = polar(c, r, from + ((to - from) * i) / n)
    return pt(p.x, c.y + (p.y - c.y) * squash)
  }
  return Array.from({ length: n }, (_, i) => seg(at(i), at(i + 1)))
}

/** An arrow to draw from a point: which way, how long, and where its label goes. */
interface ArrowSpec {
  kind: VectorKind
  angle: number
  length: number
  label: Label
  /** Off draws the arrow without its label (past four positions, only the first is labelled). */
  labelled?: boolean
  /** Its label goes past its tip, beside its head, or beside its middle. */
  place: 'tip' | 'beside' | 'middle'
  /** Which side a label beside it goes: the one nearer this direction. */
  side?: Point
}

interface Want extends Placing {
  put(p: Point): void
}

/** A figure being built: what's drawn so far, what labels keep clear of, and the labels still to place. */
function draft(s: CircularSettings) {
  const fig: CircularFigure = {
    width: WIDTH,
    height: HEIGHT,
    centre: pt(0, 0),
    radius: 0,
    support: null,
    pieces: [],
    dots: [],
    objects: [],
    vectors: [],
    guides: [],
    dimensions: [],
    heads: [],
    symbol: null,
    notes: [],
    extent: [],
  }
  /** Every line a label keeps clear of. */
  const lines: Segment[] = []
  const vectorWants: Want[] = []
  const noteWants: Want[] = []

  const vectorLabel = (l: Label) => asVector(l, s.notation)

  const line = (a: Point, b: Point, look: Look) => {
    fig.pieces.push({ d: `M${r2(a.x)},${r2(a.y)} L${r2(b.x)},${r2(b.y)}`, look })
    lines.push(seg(a, b))
    fig.extent.push(pt(a.x, a.y), pt(b.x, b.y))
  }
  const circle = (c: Point, r: number, look: Look) => {
    fig.pieces.push({ d: circleD(c, r), look })
    lines.push(...arcLines(c, r, 0, 360))
    fig.extent.push(pt(c.x - r, c.y - r), pt(c.x + r, c.y + r))
  }
  const arc = (c: Point, r: number, from: number, to: number, look: Look) => {
    fig.pieces.push({ d: arcD(c, r, from, to), look })
    lines.push(...arcLines(c, r, from, to))
  }
  const object = (kind: ObjectKind, at: Point, turn = 0) => {
    const half = objectHeight(kind, OBJECT_SIZE) / 2
    fig.objects.push({ kind, at: pt(at.x, at.y), turn: r2(turn) })
    // Its box and diagonals, so no label lands on it.
    const c = [pt(at.x - half, at.y - half), pt(at.x + half, at.y - half), pt(at.x + half, at.y + half), pt(at.x - half, at.y + half)]
    lines.push(seg(c[0], c[1]), seg(c[1], c[2]), seg(c[2], c[3]), seg(c[3], c[0]), seg(c[0], c[2]), seg(c[1], c[3]))
    fig.extent.push(c[0], c[2])
    return fig.objects.length - 1
  }

  /** Arrows from one point, those pointing the same way side by side, each with its label. */
  const arrows = (objectIndex: number, at: Point, specs: ArrowSpec[]) => {
    const offsets = specs.map(() => 0)
    for (const group of sameDirection(specs.map((a) => ({ angle: norm(a.angle) })))) {
      group.forEach((i, k) => (offsets[i] = (k - (group.length - 1) / 2) * SIDE_GAP))
    }
    specs.forEach((a, i) => {
      const d = direction(a.angle)
      const across = { x: -d.y, y: d.x }
      const off = offsets[i]
      const tail = add(at, across, off)
      const v = seg(tail, add(tail, d, a.length))
      const label = a.labelled === false ? OFF : vectorLabel(a.label)
      const lw = labelWidth(label)
      let labelAt: Point
      let out: Point
      let alt: Point | undefined
      if (!off && a.place === 'tip') {
        labelAt = add(add(tail, d, a.length), d, 12 + (lw / 2) * Math.abs(d.x) + 15 * Math.abs(d.y))
        out = d
      } else {
        // Beside it: on the outside of a pair, or on the side asked for.
        const sign = off ? Math.sign(off) : a.side ? Math.sign(dot(across, a.side)) || 1 : 1
        const reach = 10 + (lw / 2) * Math.abs(across.x) + 13 * Math.abs(across.y)
        const base = add(tail, d, a.place === 'middle' ? a.length / 2 : a.length - 10)
        labelAt = add(base, across, sign * reach)
        out = { x: across.x * sign, y: across.y * sign }
        if (!off) alt = pt(base.x - across.x * sign * reach, base.y - across.y * sign * reach)
      }
      const vector: FigureVector = { kind: a.kind, object: objectIndex, angle: norm(a.angle), length: r2(a.length), v, label, labelAt: pt(labelAt.x, labelAt.y) }
      fig.vectors.push(vector)
      lines.push(v)
      vectorWants.push({ at: vector.labelAt, out, alt, label, put: (p) => (vector.labelAt = p) })
    })
  }

  /** A label that isn't a vector's, to be placed near `at`, moving `out` if that spot is taken. */
  const note = (label: Label, at: Point, out: Point, tone: Note['tone'] = 'ink', italic = true, alt?: Point) => {
    const n: Note = { label, at: pt(at.x, at.y), tone, italic }
    fig.notes.push(n)
    noteWants.push({ at: n.at, out, alt, label, put: (p) => (n.at = p) })
  }

  /** Every label put at a clear spot, vectors' first, and kept on the figure. */
  const finish = (): CircularFigure => {
    const wants = [...vectorWants, ...noteWants]
    const onFigure = (p: Point, l: Label) => {
      const b = labelBox(p, l)
      return pt(Math.min(WIDTH - 4 - b.w / 2, Math.max(4 + b.w / 2, p.x)), Math.min(HEIGHT - 4 - b.h / 2, Math.max(4 + b.h / 2, p.y)))
    }
    // A busy figure can leave placeLabels no clear spot near where a label wants to be (or
    // keeping it on the figure can push it onto something), so any label still on another
    // label or a line looks further round its spot for the nearest clear one.
    const placed: Box[] = []
    const clear = (b: Box) => !placed.some((q) => overlaps(q, b, 2)) && !lines.some((v) => crosses(v, b))
    placeLabels(wants, lines, null).forEach((p, i) => {
      const l = wants[i].label
      let at = onFigure(p, l)
      if (labelWidth(l) > 0 && !clear(labelBox(at, l))) {
        search: for (let r = 6; r <= 120; r += 6) {
          for (let k = 0; k < 24; k++) {
            const a = (k * Math.PI) / 12
            const t = onFigure(pt(wants[i].at.x + Math.cos(a) * r, wants[i].at.y + Math.sin(a) * r), l)
            if (clear(labelBox(t, l))) {
              at = t
              break search
            }
          }
        }
      }
      placed.push(labelBox(at, l))
      wants[i].put(at)
    })
    fig.extent.push(
      ...fig.vectors.flatMap((v) => [pt(v.v.x1, v.v.y1), pt(v.v.x2, v.v.y2), ...boxCorners(labelBox(v.labelAt, v.label))]),
      ...fig.notes.flatMap((n) => boxCorners(labelBox(n.at, n.label))),
      ...fig.dots.map((d) => d.at),
    )
    return fig
  }

  return { fig, lines, line, circle, arc, object, arrows, note, vectorLabel, finish }
}

type Draft = ReturnType<typeof draft>

const letter = (i: number): Label => ({ mode: 'text', text: String.fromCharCode(65 + i) })

/** A diameter's label: the radius label, but d where it is still the default r. */
export const radiusLabelOf = (s: Pick<CircularSettings, 'radius' | 'radiusLabel'>): Label =>
  s.radius === 'diameter' && s.radiusLabel.text === 'r' ? { ...s.radiusLabel, text: 'd' } : s.radiusLabel

/** A label beside a line from `from` toward `angle`, `along` of the way, on the side nearer `side`. */
function besideLine(d: Draft, label: Label, from: Point, angle: number, along: number, side: Point, tone: Note['tone'] = 'ink') {
  const u = direction(angle)
  const across = { x: -u.y, y: u.x }
  const sign = Math.sign(dot(across, side)) || 1
  const reach = 9 + (labelWidth(label) / 2) * Math.abs(across.x) + 12 * Math.abs(across.y)
  const base = add(from, u, along)
  d.note(label, add(base, across, sign * reach), { x: across.x * sign, y: across.y * sign }, tone, true, add(base, across, -sign * reach))
}

/** The Top view: the object on a dashed circle seen from above, at one to eight positions. */
function buildTop(s: CircularSettings): CircularFigure {
  const d = draft(s)
  const { fig } = d
  const C = pt(TOP.centre.x, TOP.centre.y)
  const R = TOP.r
  fig.centre = C
  fig.radius = R
  const kind = objectKind(s)
  const half = objectHeight(kind, OBJECT_SIZE) / 2
  const sign = s.direction === 'ccw' ? 1 : -1
  const n = s.positions
  const angleOf = (i: number) => s.startAngle + (sign * i * 360) / n
  const inner = hasInner(s)
  const a0 = s.startAngle
  const first = polar(C, R, a0)
  const marked = s.angleMark && a0 !== 0

  // What it goes round on, then the path itself.
  let edge = R + half
  if (s.around === 'turntable') {
    d.circle(C, R + DISC_RIM, 'disc')
    edge = R + DISC_RIM
  }
  if (s.around === 'road') {
    fig.pieces.push({ d: `${circleD(C, R + ROAD_HALF)} ${circleD(C, R - ROAD_HALF)}`, look: 'road' })
    d.lines.push(...arcLines(C, R + ROAD_HALF, 0, 360), ...arcLines(C, R - ROAD_HALF, 0, 360))
    fig.extent.push(pt(C.x - R - ROAD_HALF, C.y - R - ROAD_HALF), pt(C.x + R + ROAD_HALF, C.y + R + ROAD_HALF))
    edge = R + ROAD_HALF
  }
  d.circle(C, R, 'path')

  // Lines through the centre go first, so the arrows that lie on them are drawn over them.
  if (marked) {
    d.line(C, polar(C, R, 0), 'ref')
    d.arc(C, MARK_R, 0, a0, 'arc')
  }
  if (s.around === 'string') for (let i = 0; i < n; i++) d.line(C, polar(C, R, angleOf(i)), 'string')
  else if (s.radius === 'radius' || marked) d.line(C, first, 'thin')
  // A diameter runs midway between the positions' own diameters, clear of every object.
  const across = a0 + (n % 2 ? 90 / n : 180 / n)
  if (s.radius === 'diameter') {
    const m = seg(polar(C, R, across), polar(C, R, across + 180))
    fig.dimensions.push(m)
    d.lines.push(m)
  }
  fig.dots.push({ at: C, r: s.around === 'turntable' ? 5 : 3 })

  // The inward arrows of the outer object stop short of a second object on its radius.
  const inward = inner ? R / 2 - half - 3 : TOP.inward
  const name = (l: Label, k: 1 | 2) => (inner ? numbered(l, k) : l)
  const specsAt = (a: number, k: 1 | 2, labelled: boolean): ArrowSpec[] => {
    const scale = k === 2 ? 0.5 : 1
    const behind = direction(a - sign * 90)
    return [
      ...(s.velocity ? [{ kind: 'velocity', angle: a + sign * 90, length: TOP.velocity * scale, label: name(s.velocityLabel, k), labelled, place: 'tip' } as const] : []),
      ...(s.acceleration ? [{ kind: 'acceleration', angle: a + 180, length: inward * scale, label: name(s.accelerationLabel, k), labelled, place: 'middle', side: behind } as const] : []),
      ...(s.inwardForce ? [{ kind: 'inward', angle: a + 180, length: inward * scale, label: name(s.forceLabel, k), labelled, place: 'middle', side: behind } as const] : []),
    ]
  }
  for (let i = 0; i < n; i++) {
    const a = angleOf(i)
    const at = polar(C, R, a)
    // A block is turned along the path.
    d.arrows(d.object(kind, at, kind === 'block' ? -a : 0), at, specsAt(a, 1, n <= 4 || i === 0))
  }
  const innerAt = polar(C, R / 2, a0)
  if (inner) d.arrows(d.object(kind, innerAt, kind === 'block' ? -a0 : 0), innerAt, specsAt(a0, 2, true))

  // Marks. Each goes on the side of the first radius the object is heading for, away from the inward arrows' labels.
  const ahead = direction(a0 + sign * 90)
  // With a second object on the line, the first one's radius is measured beside it, from the
  // centre all the way out, so r₁ isn't read as the gap between the two objects.
  const besideR1 = { x: -ahead.x * (half + 10), y: -ahead.y * (half + 10) }
  if (s.radius === 'radius') {
    if (inner) {
      const m = seg(add(C, besideR1), add(first, besideR1))
      fig.dimensions.push(m)
      d.lines.push(m)
      besideLine(d, name(s.radiusLabel, 1), add(C, besideR1), a0, R * 0.62, { x: -ahead.x, y: -ahead.y })
      besideLine(d, name(s.radiusLabel, 2), C, a0, R * 0.22, ahead)
    } else besideLine(d, name(s.radiusLabel, 1), C, a0, R * 0.3, ahead)
  }
  if (s.radius === 'diameter') besideLine(d, radiusLabelOf(s), C, across, R * 0.5, { x: 0, y: -1 })
  if (marked) {
    const mid = direction(a0 / 2)
    const reach = MARK_R + 10 + (labelWidth(s.angleLabel) / 2) * Math.abs(mid.x) + 11 * Math.abs(mid.y)
    d.note(s.angleLabel, add(C, mid, reach), mid)
  }
  if (s.angularSpeed) {
    // A curved arrow round the centre, its gap (and its label) where the least is going on.
    const busy = [...Array.from({ length: n }, (_, i) => angleOf(i)), ...(marked ? [0, a0 / 2] : []), ...(s.radius === 'diameter' ? [across, across + 180] : []), ...(inner && s.radius === 'radius' ? [a0 - sign * 90] : [])]
    const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
    const gap = Array.from({ length: 24 }, (_, i) => 270 + i * 15)
      .map((a) => ({ a, clear: Math.min(...busy.map((b) => apart(a, b))) }))
      .reduce((best, c) => (c.clear > best.clear + 1e-6 ? c : best)).a
    const from = gap + sign * 45
    const to = gap + sign * 315
    d.arc(C, OMEGA_R, from, to, 'curved')
    const end = polar(C, OMEGA_R, to)
    const along = direction(to + sign * 90)
    const out = direction(to)
    const back = add(end, along, -6)
    fig.heads.push([add(end, along, 6), add(back, out, 5.5), add(back, out, -5.5)].map((p) => pt(p.x, p.y)))
    const g = direction(gap)
    d.note(s.omegaLabel, add(C, g, OMEGA_R + 8 + (labelWidth(s.omegaLabel) / 2) * Math.abs(g.x) + 11 * Math.abs(g.y)), g, 'vector')
  }
  if (s.pointLabels) {
    for (let i = 0; i < n; i++) {
      const u = direction(angleOf(i))
      d.note(letter(i), add(C, u, edge + 9 + 6 * Math.abs(u.x) + 12 * Math.abs(u.y)), u, 'ink', false)
    }
  }
  const out = direction(a0)
  const beyond = (l: Label) => edge + 9 + (labelWidth(l) / 2) * Math.abs(out.x) + 12 * Math.abs(out.y)
  d.note(name(s.objectLabel, 1), add(C, out, beyond(name(s.objectLabel, 1))), out)
  if (inner) {
    const behind = direction(a0 - sign * 90)
    const l = name(s.objectLabel, 2)
    d.note(l, add(innerAt, behind, half + 8 + (labelWidth(l) / 2) * Math.abs(behind.x) + 12 * Math.abs(behind.y)), behind)
  }

  return d.finish()
}

/** A hill's or a dip's ground: the top (or bottom) quarter of its circle, levelling out to both sides. */
function groundD(C: Point, hill: boolean) {
  const { r, fillet, left, right } = HILL
  const [a1, a2] = hill ? [135, 45] : [225, 315]
  const e1 = polar(C, r, a1)
  const e2 = polar(C, r, a2)
  const f1 = polar(C, r + fillet, a1)
  const f2 = polar(C, r + fillet, a2)
  const level = r2(f1.y + (hill ? fillet : -fillet))
  const [bend, crest] = hill ? [0, 1] : [1, 0]
  const d = `M${left},${level} L${f1.x},${level} A${fillet},${fillet} 0 0 ${bend} ${e1.x},${e1.y} A${r},${r} 0 0 ${crest} ${e2.x},${e2.y} A${fillet},${fillet} 0 0 ${bend} ${f2.x},${level} L${right},${level}`
  const fromLevel = hill ? 270 : 90
  const keepOff = [
    seg(pt(left, level), pt(f1.x, level)),
    ...arcLines(f1, fillet, fromLevel, hill ? 315 : 45),
    ...arcLines(C, r, a1, a2),
    ...arcLines(f2, fillet, hill ? 225 : 135, fromLevel),
    seg(pt(f2.x, level), pt(right, level)),
  ]
  return { d, keepOff, level }
}

/** The Vertical circle, from the side: the object at the top, side or bottom, on a string, in a loop, over a hill or in a dip. */
function buildVertical(s: CircularSettings): CircularFigure {
  const d = draft(s)
  const { fig } = d
  const kind = s.object as ObjectKind
  const half = objectHeight(kind, OBJECT_SIZE) / 2
  const sign = s.direction === 'ccw' ? 1 : -1
  const ANGLE = { top: 90, side: 0, bottom: 270 }
  const points = pointsOf(s)
  const hill = s.held === 'hill'
  const ground = hill || s.held === 'dip'
  const U = ground ? GROUND_UNIT : VERTICAL.unit

  // The circle the object's middle goes round.
  const C = ground ? pt(320, hill ? HILL.top + HILL.r : HILL.bottom - HILL.r) : pt(VERTICAL.centre.x, VERTICAL.centre.y)
  const R = ground ? HILL.r + (hill ? half : -half) : VERTICAL.r
  fig.centre = C
  fig.radius = R
  const first = polar(C, R, ANGLE[points[0]])

  if (ground) {
    const g = groundD(C, hill)
    fig.pieces.push({ d: g.d, look: 'ground' })
    d.lines.push(...g.keepOff)
    fig.extent.push(pt(HILL.left, g.level), pt(HILL.right, g.level))
    if (s.radius !== 'none') {
      // The centre and the radius, dashed, to the ground the object is on.
      d.line(C, polar(C, HILL.r, ANGLE[points[0]]), 'ref')
      fig.dots.push({ at: C, r: 3 })
      besideLine(d, s.radiusLabel, C, ANGLE[points[0]], hill ? HILL.r * 0.35 : HILL.r * 0.3, { x: 1, y: 0 })
    }
  } else {
    if (s.held === 'string') {
      d.circle(C, R, 'path')
      for (const p of points) d.line(C, polar(C, R, ANGLE[p]), 'string')
    } else {
      // The track's inside edge is where the object touches it.
      d.circle(C, R + half + 1.5, 'track')
    }
    const rim = s.held === 'loop' ? R + half : R
    if (s.radius === 'radius') {
      if (s.held !== 'string') d.line(C, first, 'thin')
      besideLine(d, s.radiusLabel, C, ANGLE[points[0]], R * 0.3, direction(ANGLE[points[0]] + sign * 90))
    }
    if (s.radius === 'diameter') {
      // Level, or tilted clear of an object at the side.
      const tilt = points.includes('side') ? 135 : 0
      const m = seg(polar(C, rim, tilt), polar(C, rim, tilt + 180))
      fig.dimensions.push(m)
      d.lines.push(m)
      besideLine(d, radiusLabelOf(s), C, tilt, rim * 0.5, { x: 0, y: -1 })
    }
    fig.dots.push({ at: C, r: 3 })
  }

  for (const p of points) {
    const a = ANGLE[p]
    const at = polar(C, R, a)
    const way = direction(a + sign * 90)
    const index = d.object(kind, at)
    // On a hill the ground pushes up, away from the centre; everywhere else the string or track pulls or pushes toward it.
    const contact: ArrowSpec = {
      kind: s.held === 'string' ? 'tension' : 'normal',
      angle: hill ? 90 : a + 180,
      length: U * contactOf(s.held, p),
      label: s.held === 'string' ? s.tensionLabel : s.normalLabel,
      place: hill ? 'tip' : 'beside',
      side: way,
    }
    d.arrows(index, at, [
      ...(s.velocity ? [{ kind: 'velocity', angle: a + sign * 90, length: VERTICAL.velocity, label: s.velocityLabel, place: 'tip' } as const] : []),
      ...(s.forces ? [contact, { kind: 'gravity', angle: 270, length: U, label: s.gravityLabel, place: 'tip' } as const] : []),
    ])
    if (s.acceleration) {
      // Beside the object, on the side it came from, clear of the circle or the ground.
      const inwardWay = direction(a + 180)
      const start = hill ? -42 : ground ? 10 : 26
      const tail = add(add(at, way, -BESIDE.gap), inwardWay, start)
      d.arrows(-1, tail, [{ kind: 'acceleration', angle: a + 180, length: BESIDE.length, label: s.accelerationLabel, place: 'middle', side: { x: -way.x, y: -way.y } }])
    }
  }

  // Letters in the order the object reaches the points, starting from the top.
  const reached = [...points].sort((p, q) => norm((ANGLE[p] - 90) * sign) - norm((ANGLE[q] - 90) * sign))
  const outside = (p: 'top' | 'side' | 'bottom', l: Label, ahead = false) => {
    const a = ANGLE[p]
    const u = direction(a)
    // Straight out from the bottom is gravity's arrow (from a hill's top, the normal force's),
    // so the label goes out and to one side: the side the object came from, or the side it's heading for.
    if (p === 'bottom' || hill) {
      const back = direction(a - sign * (ahead ? -90 : 90))
      const reach = half + 12
      const out = add(add(polar(C, R, a), u, reach + (s.held === 'loop' ? half : 0)), back, reach + labelWidth(l) / 2)
      return { at: out, out: pt(r2(u.x + back.x), r2(u.y + back.y)) }
    }
    const edge = R + half + (s.held === 'loop' ? half + 3 : 0)
    return { at: add(C, u, edge + 9 + (labelWidth(l) / 2) * Math.abs(u.x) + 12 * Math.abs(u.y)), out: u }
  }
  const noteOutside = (p: 'top' | 'side' | 'bottom', l: Label, italic: boolean, ahead = false) => {
    const o = outside(p, l, ahead)
    d.note(l, o.at, o.out, 'ink', italic)
  }
  if (s.pointLabels) reached.forEach((p, i) => noteOutside(p, letter(i), false))
  // With letters on, the object's label goes on the other side of it from its letter.
  noteOutside(points[0], s.objectLabel, true, s.pointLabels)

  return d.finish()
}

/** The Conical pendulum, from the side: a bob on a string from a ceiling, going round a level circle drawn as an ellipse. */
function buildConical(s: CircularSettings): CircularFigure {
  const d = draft(s)
  const { fig } = d
  const kind = s.object as ObjectKind
  const half = objectHeight(kind, OBJECT_SIZE) / 2
  const P = pt(CONICAL.pivot.x, CONICAL.pivot.y)
  const theta = (s.angle * Math.PI) / 180
  const B = pt(P.x + CONICAL.length * Math.sin(theta), P.y + CONICAL.length * Math.cos(theta))
  const O = pt(P.x, B.y)
  const rx = r2(B.x - O.x)
  const ry = r2(rx * CONICAL.squash)
  fig.centre = O
  fig.radius = rx
  fig.support = ceiling(P.x - 70, P.x + 70, P.y)
  d.lines.push(fig.support.line)
  fig.extent.push(pt(P.x - 70, P.y - 10), pt(O.x - rx, O.y + ry))

  // The path, its back half lighter; the vertical through the pivot; the string and its angle.
  fig.pieces.push({ d: `M${r2(O.x - rx)},${O.y} A${rx},${ry} 0 0 1 ${r2(O.x + rx)},${O.y}`, look: 'back' })
  fig.pieces.push({ d: `M${r2(O.x - rx)},${O.y} A${rx},${ry} 0 0 0 ${r2(O.x + rx)},${O.y}`, look: 'path' })
  d.lines.push(...arcLines(O, rx, 0, 360, CONICAL.squash))
  d.line(P, O, 'ref')
  if (s.radius !== 'none') {
    d.line(O, B, 'thin')
    fig.dots.push({ at: O, r: 3 })
    besideLine(d, s.radiusLabel, O, 0, rx * 0.4, { x: 0, y: 1 })
  }
  d.line(P, B, 'string')
  const arcR = 44
  d.arc(P, arcR, 270, 270 + s.angle, 'arc')
  const mid = direction(270 + s.angle / 2)
  d.note(s.angleLabel, add(P, mid, arcR + 9 + (labelWidth(s.angleLabel) / 2) * Math.abs(mid.x) + 12 * Math.abs(mid.y)), mid)
  fig.dots.push({ at: P, r: 3 })
  besideLine(d, s.lengthLabel, P, 270 + s.angle, CONICAL.length * 0.32, { x: 1, y: -1 })

  // The forces, to scale: the tension's vertical part is as long as gravity.
  const G = CONICAL.gravity
  const tension = G / Math.cos(theta)
  const index = d.object(kind, B)
  const on = s.forces
  const components = on && s.components
  // At a small angle the horizontal part is too short to come out from under the bob, so it is
  // drawn from the tip of the vertical part instead, closing the triangle with the tension.
  const tx = G * Math.tan(theta)
  const xFromBob = tx >= half + MIN_SHOWN
  const xSpec = (side: Point): ArrowSpec => ({ kind: 'x', angle: 180, length: tx, label: s.xLabel, place: 'middle', side })
  d.arrows(index, B, [
    ...(on ? [{ kind: 'tension', angle: 90 + s.angle, length: tension, label: s.tensionLabel, place: 'beside', side: { x: 1, y: -1 } } as const] : []),
    ...(on ? [{ kind: 'gravity', angle: 270, length: G, label: s.gravityLabel, place: 'tip' } as const] : []),
    ...(components ? [...(xFromBob ? [xSpec({ x: 0, y: 1 })] : []), { kind: 'y', angle: 90, length: G, label: s.yLabel, place: 'middle', side: { x: 1, y: 0 } } as const] : []),
  ])
  if (components && xFromBob) {
    const tip = add(B, direction(90 + s.angle), tension)
    fig.guides.push(seg(tip, pt(tip.x, B.y)), seg(tip, pt(B.x, tip.y)))
  }
  if (components && !xFromBob) d.arrows(-1, pt(B.x, B.y - G), [xSpec({ x: 0, y: -1 })])

  // Beside the bob, clear of the path: the velocity along the line of sight, and the acceleration toward the axis.
  if (s.velocity) {
    const at = pt(B.x + 40, B.y)
    fig.symbol = { at, way: s.velocityInto }
    d.lines.push(seg(pt(at.x - 10, at.y), pt(at.x + 10, at.y)), seg(pt(at.x, at.y - 10), pt(at.x, at.y + 10)))
    const l = d.vectorLabel(s.velocityLabel)
    d.note(l, pt(at.x + 17 + labelWidth(l) / 2, at.y), { x: 1, y: 0 }, 'vector')
    fig.extent.push(pt(at.x + 10, at.y))
  }
  if (s.acceleration) {
    d.arrows(-1, pt(B.x + 92, B.y + 36), [{ kind: 'acceleration', angle: 180, length: BESIDE.length, label: s.accelerationLabel, place: 'middle', side: { x: 0, y: 1 } }])
  }
  d.note(s.objectLabel, pt(B.x - half - 8 - labelWidth(s.objectLabel) / 2, B.y + half + 14), { x: -1, y: 0 })

  return d.finish()
}

export function buildCircular(s: CircularSettings): CircularFigure {
  return s.setup === 'top' ? buildTop(s) : s.setup === 'vertical' ? buildVertical(s) : buildConical(s)
}

/** What the figure shows, for screen readers: the setup, its vectors, which way it goes, and any marks. */
export function describe(s: CircularSettings): string {
  const kind = objectKind(s)
  const list = (parts: string[]) => (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : (parts[0] ?? ''))
  const marked = (parts: string[]) => {
    const kept = parts.filter(Boolean)
    return kept.length ? `. Marked: ${list(kept)}` : ''
  }
  const letters = s.pointLabels ? 'the positions lettered A, B, C in the order the object reaches them' : ''
  if (s.setup === 'top') {
    const where = { nothing: '', string: ' on a string to the center', turntable: ' on a turntable', road: ' on a curved road' }[s.around]
    const shown = [s.velocity ? 'velocity' : '', s.acceleration ? 'centripetal acceleration' : '', s.inwardForce ? 'inward force' : ''].filter(Boolean)
    const radius =
      s.radius === 'diameter' ? 'the diameter' : s.radius === 'radius' ? (hasInner(s) ? 'the radius of each object' : 'the radius to the first position') : ''
    return (
      `Circular motion seen from above: a ${kind}${where} at ${s.positions === 1 ? 'one position' : `${s.positions} positions`} on a dashed circle, going ${s.direction === 'ccw' ? 'counterclockwise' : 'clockwise'}` +
      (hasInner(s) ? ', and a second one halfway out' : '') +
      (shown.length ? `, with its ${list(shown)} ${shown.length > 1 ? 'vectors' : 'vector'}` : '') +
      marked([
        radius,
        s.angularSpeed ? 'the angular speed, as a curved arrow round the center' : '',
        s.angleMark && s.startAngle !== 0 ? `the first position's angle, ${s.startAngle}° counterclockwise from the right` : '',
        letters,
      ])
    )
  }
  if (s.setup === 'vertical') {
    const points = pointsOf(s)
    const turning = s.direction === 'ccw' ? 'counterclockwise' : 'clockwise'
    // At the top, going counterclockwise is moving left; at the bottom, moving right.
    const moving = (s.held === 'hill') === (s.direction === 'ccw') ? 'left' : 'right'
    const what = {
      string: `A ${kind} on a string going ${turning} round a vertical circle, drawn at the ${list(points)}`,
      loop: `A ${kind} going ${turning} round inside a vertical loop, drawn at the ${list(points)}`,
      hill: `A ${kind} at the top of a hill, moving to the ${moving}`,
      dip: `A ${kind} at the bottom of a dip, moving to the ${moving}`,
    }[s.held]
    const contact = s.held === 'string' ? 'tension' : 'normal force'
    const shown = [s.forces ? `gravity and the ${contact}` : '', s.velocity ? 'its velocity' : '', s.acceleration ? 'its centripetal acceleration' : ''].filter(Boolean)
    const ground = s.held === 'hill' || s.held === 'dip'
    const radius = s.radius === 'none' ? '' : s.radius === 'diameter' && !ground ? 'the diameter' : ground ? 'the radius of the curve, down to its center' : 'the radius'
    return what + (shown.length ? `, with ${list(shown)}` : '') + marked([radius, ground ? '' : letters])
  }
  const shown = [
    s.forces ? `gravity and the tension${s.components ? ' with its components' : ''}` : '',
    s.velocity ? `its velocity ${s.velocityInto === 'out' ? 'out of' : 'into'} the page` : '',
    s.acceleration ? 'its centripetal acceleration' : '',
  ].filter(Boolean)
  return (
    `A conical pendulum: a ${kind} on a string from a ceiling, ${s.angle}° from the vertical, going round a level circle` +
    (shown.length ? `, with ${list(shown)}` : '') +
    marked([s.radius !== 'none' ? "the circle's radius" : ''])
  )
}
