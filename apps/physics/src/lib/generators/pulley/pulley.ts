// Where everything in a Pulley figure goes, before mirroring: the wheels,
// the strings (each a run of straight pieces and arcs round wheels), the
// objects, and what the wheels hang from. Strings are always drawn taut:
// straight between the points where they leave a wheel or meet an object.

import type { Point } from '$lib/shared/field'
import { objectHeight, objectLabelHeight, objectWidth, type ObjectKind } from '$lib/shared/objects'
import { labelRuns, withoutVectors, type Label } from '$lib/shared/label'
import { boxAround, boxesMeet, polygonHits, segmentHits, type Box } from '$lib/shared/overlap'
import { labelPoint, numbered, type LabeledVector, type Segment } from '$lib/shared/vector'
import { CEILING_Y, groundHatches, HATCH_LENGTH, HATCH_SPACING } from '$lib/shared/support'
import type { PulleyObject, PulleySettings } from './settings'

export const WIDTH = 640
export const HEIGHT = 420
const WHEEL_R = 34
const OBJECT_GAP = 18
const CEILING_HALF = 110
const HANG_TOP = 250
const LOWER_BY = 60
const BOTTOM_MARGIN = 16
const GROUND_Y = HEIGHT - 30
const TABLE_TOP = 170
const TABLE_LEFT = 50
const TABLE_EDGE = 400
const TABLE_THICK = 16
const LEG = 14
/** The gap between the table's edge and its pulley, bridged by the bracket. */
const BRACKET_GAP = 14
/** How far below the wheel a hanging object's top is, when there's room. */
const HANG_DROP = 110
const MAX_RAMP_BASE = 380
const TACKLE_R = 24
/** How far the movable pulleys hang below the fixed ones, when there's room. */
const TACKLE_SPAN = 150
const BAR_GAP = 14
const HOOK = 18
const FIT_MARGIN = 14
const GROUND_OVERHANG = 30
/** The least string below a wheel before its hanging object, and the gap left above the ground. */
const MIN_DROP = 58
const GROUND_CLEAR = 12
const ARC_R = 44
const ANGLE_LABEL_R = 68
/** The string from an Atwood machine's object down to a third hanging below it. */
const LINK = 70
/** The gap between objects tied in a row on a table or ramp: room for the tension and friction between them. */
const TIE_GAP = 120
/** Room on a table or ramp behind a row of objects, for their vectors, and in front of it on a ramp, where the wheel reaches over the slope. */
const END_ROOM = 90
const FRONT_ROOM = 150

export type VectorKind = 'tension' | 'gravity' | 'normal' | 'friction' | 'contact' | 'acceleration'

export interface Wheel {
  cx: number
  cy: number
  r: number
}

export interface PlacedObject {
  kind: ObjectKind
  size: number
  /** Its bottom middle, and its tilt in degrees. */
  at: Point
  tilt: number
  middle: Point
  /** Where its label goes: the middle of its body, above a cart's wheels. */
  labelAt: Point
  height: number
  width: number
  label: Label
  gravityLabel: Label
  /** Which way it moves when the figure goes forward (a hanging object falling): along its surface toward the pulley, or up or down. */
  moves: 'along' | 'up' | 'down'
}

export interface PulleyFigure {
  width: number
  height: number
  wheels: Wheel[]
  /** Each string as the points it runs through; `arcs` are the parts wrapped round wheels. */
  strings: Point[][]
  /** Which end of each string is tied to an object, where its tension is drawn first (not in a block and tackle). */
  tied: ('start' | 'end')[]
  /** Which piece of string (from 0) each string is part of, over any wheels, for numbering its tension. */
  ropes: number[]
  arcs: { wheel: Wheel; from: number; to: number }[]
  objects: PlacedObject[]
  /** A hatched ceiling the wheel hangs from, and the rods and brackets holding wheels up. */
  ceiling: Segment | null
  rods: Segment[]
  /** Hatched ground or floor. */
  ground: Segment | null
  groundHatches: Segment[]
  /** A table: its top surface's height, the slab and legs. */
  table: { top: number; slab: { x: number; y: number; w: number; h: number }; legs: { x: number; y: number; w: number; h: number }[] } | null
  /** A ramp: its three corners, the angle's arc (from the foot) and where its label goes. */
  ramp: { foot: Point; corner: Point; top: Point; arc: string; angleLabelAt: Point } | null
  /** A block a low ramp stands on, so there's room below its pulley for the hanging object. */
  platform: { x: number; y: number; w: number; h: number } | null
  /**
   * A block and tackle: the bar the movable pulleys hang from (and the load
   * from it), the hook from the bar to the load, the strands holding the load
   * up (each as the index of its string), and the free end the effort pulls.
   */
  tackle: { bar: Segment | null; hook: Segment | null; supporting: number[]; effort: Point } | null
  vectors: LabeledVector<VectorKind>[]
  /** Hatching under a rough table or slope. */
  hatches: Segment[]
}

const r2 = (n: number) => Math.round(n * 100) / 100
const pt = (x: number, y: number): Point => ({ x: r2(x), y: r2(y) })

const seg = (a: Point, b: Point): Segment => ({ x1: r2(a.x), y1: r2(a.y), x2: r2(b.x), y2: r2(b.y) })
const empty = { ground: null, groundHatches: [], table: null, ramp: null, platform: null, tackle: null, hatches: [] as Segment[], vectors: [] }

/** An object resting at `at` (its bottom middle), tilted by `tilt` degrees; `n` points out of the surface. */
function resting(o: PulleyObject, at: Point, tilt: number, n: Point): PlacedObject {
  const kind = o.kind as ObjectKind
  const h = objectHeight(kind, o.size)
  return {
    kind,
    size: o.size,
    at,
    tilt,
    middle: pt(at.x + (n.x * h) / 2, at.y + (n.y * h) / 2),
    labelAt: pt(at.x + n.x * objectLabelHeight(kind, o.size), at.y + n.y * objectLabelHeight(kind, o.size)),
    height: h,
    width: objectWidth(kind, o.size),
    label: o.label,
    gravityLabel: o.gravityLabel,
    moves: 'along',
  }
}

/** A block hanging with its top middle at (x, top); it rises or falls as the figure goes forward. */
function hanging(o: Pick<PulleyObject, 'label' | 'gravityLabel' | 'size'>, x: number, top: number, moves: 'up' | 'down'): PlacedObject {
  const h = objectHeight('block', o.size)
  return {
    kind: 'block',
    size: o.size,
    at: pt(x, top + h),
    tilt: 0,
    middle: pt(x, top + h / 2),
    labelAt: pt(x, top + h / 2),
    height: h,
    width: objectWidth('block', o.size),
    label: o.label,
    gravityLabel: o.gravityLabel,
    moves,
  }
}

/** Room to leave below a hanging object for its gravity vector and label. */
const belowFor = (s: PulleySettings) => (s.gravity ? VECTOR_LENGTH + 34 : 0)
/** Are there objects in a row on a table or ramp, touching? */
export const touching = (s: PulleySettings) => (s.setup === 'table' || s.setup === 'ramp') && s.objects.length > 2 && s.joined === 'touching'

/** Room to leave above the objects on a table or ramp for their normal forces, acceleration or contact forces, and their labels. */
const aboveFor = (s: PulleySettings) =>
  Math.max(s.normal ? VECTOR_LENGTH + 34 : 0, s.acceleration !== 'none' ? 50 : 0, s.contact && touching(s) ? 34 : 0)

/** An Atwood machine: two objects hanging over one fixed pulley, and maybe a third hanging below one of them. */
function atwood(s: PulleySettings): PulleyFigure {
  const [oa, ob, oc] = s.objects
  const under = s.below === 'a' ? 0 : 1
  const wc = oc ? objectWidth('block', oc.size) : 0
  const wa = Math.max(objectWidth('block', oa.size), under === 0 ? wc : 0)
  const wb = Math.max(objectWidth('block', ob.size), under === 1 ? wc : 0)
  // Big objects need a bigger wheel to hang side by side (the third one too).
  const r = Math.max(WHEEL_R, (wa / 2 + wb / 2 + OBJECT_GAP) / 2)
  const wheel: Wheel = { cx: WIDTH / 2, cy: CEILING_Y + 40 + r, r }
  // The third one's string leaves room for its holder's gravity vector, and the tension's label below that.
  const link = s.gravity ? belowFor(s) + 40 : LINK
  const hung = oc ? link + objectHeight('block', oc.size) : 0
  const tallest = Math.max(objectHeight('block', oa.size) + (under === 0 ? hung : 0), objectHeight('block', ob.size) + (under === 1 ? hung : 0))
  const lowerBy = s.lower === 'neither' ? 0 : LOWER_BY
  // As high as leaves room below, but always a string's length below the wheel;
  // when that runs out of room, the figure grows.
  const top = Math.max(wheel.cy + Math.max(MIN_DROP, r + 24), Math.min(HANG_TOP, HEIGHT - BOTTOM_MARGIN - tallest - lowerBy - belowFor(s)))
  const a = hanging(oa, wheel.cx - r, top + (s.lower === 'a' ? LOWER_BY : 0), 'up')
  const b = hanging(ob, wheel.cx + r, top + (s.lower === 'b' ? LOWER_BY : 0), 'down')
  const holder = under === 0 ? a : b
  const c = oc ? hanging(oc, holder.at.x, holder.at.y + link, under === 0 ? 'up' : 'down') : null
  const objects = c ? [a, b, c] : [a, b]
  return {
    width: WIDTH,
    height: Math.max(HEIGHT, Math.ceil(Math.max(...objects.map((o) => o.at.y)) + belowFor(s) + BOTTOM_MARGIN)),
    wheels: [wheel],
    strings: [
      [pt(wheel.cx - r, wheel.cy), pt(a.at.x, a.at.y - a.height)],
      [pt(wheel.cx + r, wheel.cy), pt(b.at.x, b.at.y - b.height)],
      ...(c ? [[holder.at, pt(c.at.x, c.at.y - c.height)]] : []),
    ],
    tied: objects.map(() => 'end' as const),
    ropes: c ? [0, 0, 1] : [0, 0],
    // Over the top of the wheel, from its left side to its right.
    arcs: [{ wheel, from: 180, to: 360 }],
    objects,
    ceiling: { x1: wheel.cx - CEILING_HALF, y1: CEILING_Y, x2: wheel.cx + CEILING_HALF, y2: CEILING_Y },
    rods: [{ x1: wheel.cx, y1: CEILING_Y, x2: wheel.cx, y2: wheel.cy }],
    ...empty,
  }
}

/** Where a hanging object goes below a wheel: a good way down, but clear of the ground (and of room for its gravity vector). */
function hangBelow(o: PulleyObject, wheel: Wheel, below: number, groundY = GROUND_Y): PlacedObject {
  const h = objectHeight('block', o.size)
  const top = Math.max(wheel.cy + Math.max(MIN_DROP, wheel.r + 24), Math.min(wheel.cy + HANG_DROP, groundY - GROUND_CLEAR - h - below))
  return hanging(o, wheel.cx + wheel.r, top, 'down')
}

/** The objects on a table or ramp, from the back to the front: all but the last, which hangs. */
const rowOf = (s: PulleySettings) => s.objects.slice(0, -1)
/** The gap between objects in a row: none when they touch, longer up a steep ramp, where weight points along the slope into it, and as far apart as the teacher set. */
const gapOf = (s: PulleySettings) =>
  s.joined === 'touching' ? 0 : (s.setup === 'ramp' ? TIE_GAP + 110 * Math.sin((s.angle * Math.PI) / 180) : TIE_GAP) * s.spacing
/** How long the row of objects on a table or ramp is, end to end. */
const rowLength = (s: PulleySettings) =>
  rowOf(s).reduce((sum, o) => sum + objectWidth(o.kind as ObjectKind, o.size), 0) + gapOf(s) * (rowOf(s).length - 1)

/**
 * Blocks or carts in a row on a table, tied together or touching, the front
 * one tied level over a pulley at the table's edge to a hanging object. A row
 * too long for the table makes the table longer, and the figure wider.
 */
function table(s: PulleySettings): PulleyFigure {
  const row = rowOf(s)
  const ob = s.objects.at(-1)!
  const front = row.at(-1)!
  const kind = front.kind as ObjectKind
  const ha = objectHeight(kind, front.size)
  const wa = objectWidth(kind, front.size)
  // The table stands lower when a tall object and the vectors above it need the room.
  const tableTop = Math.max(TABLE_TOP, FIT_MARGIN + Math.max(...row.map((o) => objectHeight(o.kind as ObjectKind, o.size))) + aboveFor(s))
  const stringY = tableTop - ha / 2
  const r = WHEEL_R
  const wheel: Wheel = { cx: TABLE_EDGE + BRACKET_GAP + r, cy: stringY + r, r }
  // The front object where a lone one goes, and any others behind it.
  const up = { x: 0, y: -1 }
  const placed = [resting(front, pt(TABLE_EDGE - 90 - wa / 2, tableTop), 0, up)]
  for (const o of row.slice(0, -1).reverse()) {
    const next = placed[0]
    placed.unshift(resting(o, pt(next.at.x - next.width / 2 - gapOf(s) - objectWidth(o.kind as ObjectKind, o.size) / 2, tableTop), 0, up))
  }
  const a = placed.at(-1)!
  const b = hangBelow(ob, wheel, belowFor(s))
  // And the floor drops (the figure growing) when the hanging object still needs more room.
  const groundY = Math.max(GROUND_Y, b.at.y + belowFor(s) + GROUND_CLEAR)
  const tableLeft = Math.min(TABLE_LEFT, placed[0].at.x - placed[0].width / 2 - END_ROOM)
  const hatches: Segment[] = []
  if (s.surface === 'rough') {
    for (let x = tableLeft + 6; x < TABLE_EDGE - 4; x += HATCH_SPACING) hatches.push(seg(pt(x, tableTop), pt(x - 6, tableTop + HATCH_LENGTH)))
  }
  const legTop = tableTop + TABLE_THICK
  const ground = seg(pt(tableLeft - 30, groundY), pt(WIDTH - 20, groundY))
  // Strings between the objects in a row, level at the middle of the shorter of each pair.
  const ties =
    s.joined === 'touching'
      ? []
      : placed.slice(1).map((o, i) => {
          const back = placed[i]
          const y = tableTop - Math.min(back.height, o.height) / 2
          return [pt(back.at.x + back.width / 2, y), pt(o.at.x - o.width / 2, y)]
        })
  const f: PulleyFigure = {
    width: WIDTH,
    height: Math.max(HEIGHT, groundY + 30),
    wheels: [wheel],
    strings: [...ties, [pt(a.at.x + wa / 2, stringY), pt(wheel.cx, wheel.cy - r)], [pt(wheel.cx + r, wheel.cy), pt(b.at.x, b.at.y - b.height)]],
    tied: [...ties.map(() => 'start' as const), 'start', 'end'],
    ropes: [...ties.map((_, i) => i), ties.length, ties.length],
    // From the top of the wheel round to its right-hand side.
    arcs: [{ wheel, from: 270, to: 360 }],
    objects: [...placed, b],
    ceiling: null,
    // A bracket from the table's corner to the wheel's axle.
    rods: [seg(pt(TABLE_EDGE, tableTop + TABLE_THICK / 2), pt(wheel.cx, wheel.cy))],
    ground,
    groundHatches: groundHatches(ground),
    table: {
      top: tableTop,
      slab: { x: tableLeft, y: tableTop, w: TABLE_EDGE - tableLeft, h: TABLE_THICK },
      legs: [tableLeft + 12, TABLE_EDGE - 12 - LEG].map((x) => ({ x, y: legTop, w: LEG, h: groundY - legTop })),
    },
    ramp: null,
    platform: null,
    tackle: null,
    hatches,
    vectors: [],
  }
  const grow = TABLE_LEFT - tableLeft
  return grow > 0 ? { ...shift(f, grow, 0), width: WIDTH + grow } : f
}

/**
 * Blocks or carts on a ramp, the front one tied over a pulley at the ramp's
 * top to a hanging object. The string runs parallel to the slope from the
 * middle of the object's up-slope face, so the wheel sits one radius below
 * that line, far enough past the ramp's top for the hanging object to clear
 * the ramp. A ramp too low for the hanging object to hang below its pulley
 * stands on a platform. The ramp is as big as fits, but always long enough
 * for its row of objects (the figure growing, if need be), and the whole
 * figure is centered. A row starts at least `back` up the slope from the
 * foot (see buildPulley, which moves it up until it's clear of the angle's
 * label).
 */
function ramp(s: PulleySettings, back = END_ROOM): PulleyFigure {
  const room = { left: FIT_MARGIN, right: WIDTH - FIT_MARGIN, top: FIT_MARGIN }
  const narrow = (f: ReturnType<typeof rampAt>) => {
    const b = boundsOf(f.extent)
    return b.right - b.left <= room.right - room.left
  }
  const fits = (f: ReturnType<typeof rampAt>) => narrow(f) && boundsOf(f.extent).top >= room.top
  const least = rowOf(s).length > 1 ? (rowLength(s) + back + FRONT_ROOM) * Math.cos((s.angle * Math.PI) / 180) : 0
  // The biggest ramp that fits, with the hanging object a good way below its
  // pulley if there's room, or else as little string as looks right. A ramp
  // on a platform already stands as high as its hanging object needs, so a
  // smaller one would stand no lower: once it's narrow enough, the figure
  // grows taller instead.
  let base = Math.max(MAX_RAMP_BASE, least)
  let f = rampAt(s, base, HANG_DROP, back)
  for (let i = 0; i < 80 && !fits(f); i++) {
    f = rampAt(s, base, MIN_DROP, back)
    if (fits(f) || base <= least || (f.platform && narrow(f))) break
    base = Math.max(least, base * 0.95)
    f = rampAt(s, base, HANG_DROP, back)
  }
  const b = boundsOf(f.extent)
  const width = Math.max(WIDTH, Math.ceil(b.right - b.left + 2 * FIT_MARGIN))
  const down = Math.max(0, Math.ceil(room.top - b.top))
  return { ...shift(f, (width - (b.right - b.left)) / 2 - b.left, down), width, height: HEIGHT + down }
}

function rampAt(s: PulleySettings, base: number, wantDrop: number, back: number): PulleyFigure & { extent: Point[] } {
  const a = (s.angle * Math.PI) / 180
  const u = { x: Math.cos(a), y: -Math.sin(a) }
  const n = { x: -Math.sin(a), y: -Math.cos(a) }
  const along = (p: Point, d: number, q: Point = u) => pt(p.x + q.x * d, p.y + q.y * d)
  const row = rowOf(s)
  const ob = s.objects.at(-1)!
  const front = row.at(-1)!
  const kind = front.kind as ObjectKind
  const ha = objectHeight(kind, front.size)
  const wa = objectWidth(kind, front.size)
  const hb = objectHeight('block', ob.size)
  const wb = objectWidth('block', ob.size)
  const r = WHEEL_R
  const off = ha / 2 // the string's height above the slope
  const rise = base * Math.tan(a)
  // Along the slope from the top until the hanging string clears the ramp's side.
  const reach = Math.max(0, (wb / 2 + 8 - r - n.x * (off - r)) / u.x)
  // How far the wheel's middle is below the ramp's top, and so how high the ramp must stand
  // for the hanging object to fit below the wheel.
  const wheelBelowTop = u.y * reach + n.y * (off - r)
  const needed = wheelBelowTop + wantDrop + hb + GROUND_CLEAR + belowFor(s) // from the ramp's top down to the ground
  const lift = Math.max(0, needed - rise)

  const x0 = 0
  const footY = GROUND_Y - lift
  const foot = pt(x0, footY)
  const corner = pt(x0 + base, footY)
  const top = pt(x0 + base, footY - rise)
  const c = along(along(top, reach), off - r, n)
  const wheel: Wheel = { cx: c.x, cy: c.y, r }
  const slope = base / Math.cos(a)
  // How far along the slope each object's middle is: a lone one 0.45 of the
  // way up; a row about there, but all on the slope with room at both ends.
  let middles = [slope * 0.45]
  if (row.length > 1) {
    const length = rowLength(s)
    let d = Math.min(Math.max(slope * 0.45, back + length / 2), slope - FRONT_ROOM - length / 2) - length / 2
    middles = row.map((o) => {
      const w = objectWidth(o.kind as ObjectKind, o.size)
      const middle = d + w / 2
      d += w + gapOf(s)
      return middle
    })
  }
  const placed = row.map((o, i) => resting(o, along(foot, middles[i]), -s.angle, n))
  const obj = placed.at(-1)!
  const drop = Math.min(wantDrop, GROUND_Y - GROUND_CLEAR - hb - belowFor(s) - wheel.cy)
  const b = hanging(ob, wheel.cx + r, wheel.cy + drop, 'down')
  const leave = along(c, r, n) // where the string meets the wheel

  const hatches: Segment[] = []
  if (s.surface === 'rough') {
    for (let d = ANGLE_LABEL_R + 30; d < slope - 4; d += HATCH_SPACING) {
      const p = along(foot, d)
      hatches.push(seg(p, pt(p.x - n.x * HATCH_LENGTH - u.x * HATCH_LENGTH * 0.7, p.y - n.y * HATCH_LENGTH - u.y * HATCH_LENGTH * 0.7)))
    }
  }
  const half = a / 2
  const ground = seg(pt(-GROUND_OVERHANG, GROUND_Y), pt(Math.max(wheel.cx + r + wb / 2, x0 + base) + GROUND_OVERHANG, GROUND_Y))
  // Each object's four corners, and the room above it, for fitting.
  const corners = placed.flatMap((o) => [along(o.at, -o.width / 2), along(o.at, o.width / 2)].flatMap((p) => [p, along(p, o.height, n)]))
  const above = placed.map((o) => along(o.middle, o.height / 2 + aboveFor(s), n))
  // A row's ramp can be as wide as the figure, so it leaves room for the hanging object's
  // acceleration beside it too (a lone object's ramp always leaves that room).
  if (row.length > 1 && s.acceleration !== 'none') above.push(pt(wheel.cx + r + wb / 2 + 50, wheel.cy))
  // Strings between the objects in a row, parallel to the slope at the middle of the shorter of each pair.
  const ties =
    s.joined === 'touching'
      ? []
      : placed.slice(1).map((o, i) => {
          const back = placed[i]
          const lift = Math.min(back.height, o.height) / 2
          return [along(along(back.at, back.width / 2), lift, n), along(along(o.at, -o.width / 2), lift, n)]
        })
  return {
    width: WIDTH,
    height: HEIGHT,
    wheels: [wheel],
    strings: [...ties, [along(obj.middle, wa / 2), leave], [pt(wheel.cx + r, wheel.cy), pt(b.at.x, b.at.y - b.height)]],
    tied: [...ties.map(() => 'start' as const), 'start', 'end'],
    ropes: [...ties.map((_, i) => i), ties.length, ties.length],
    // From where the string meets the wheel, over the top, round to its right-hand side.
    arcs: [{ wheel, from: (Math.atan2(n.y, n.x) * 180) / Math.PI + 360, to: 360 }],
    objects: [...placed, b],
    ceiling: null,
    rods: [seg(top, c)],
    ground,
    groundHatches: groundHatches(ground),
    table: null,
    ramp: {
      foot,
      corner,
      top,
      arc: `M${ARC_R},0 A${ARC_R},${ARC_R} 0 0 0 ${r2(u.x * ARC_R)},${r2(u.y * ARC_R)}`,
      angleLabelAt: pt(foot.x + Math.cos(half) * ANGLE_LABEL_R + 6, foot.y - Math.sin(half) * ANGLE_LABEL_R - 2),
    },
    platform: lift > 0 ? { x: x0, y: footY, w: base, h: lift } : null,
    tackle: null,
    vectors: [],
    hatches,
    extent: [foot, top, ...corners, ...above, pt(wheel.cx - r, wheel.cy - r), pt(wheel.cx + r, wheel.cy - r), pt(b.at.x + b.width / 2, b.at.y), pt(b.at.x - b.width / 2, b.at.y)],
  }
}

const boundsOf = (points: Point[]) => ({
  left: Math.min(...points.map((p) => p.x)),
  right: Math.max(...points.map((p) => p.x)),
  top: Math.min(...points.map((p) => p.y)),
})

/** The figure (before its vectors) moved right by dx and down by dy. */
function shift(f: PulleyFigure & { extent?: Point[] }, dx: number, dy: number): PulleyFigure {
  const p = (q: Point) => pt(q.x + dx, q.y + dy)
  const sg = (q: Segment) => seg(p({ x: q.x1, y: q.y1 }), p({ x: q.x2, y: q.y2 }))
  const box = <B extends { x: number; y: number }>(b: B): B => ({ ...b, x: r2(b.x + dx), y: b.y + dy })
  const wheels = f.wheels.map((w) => ({ ...w, cx: r2(w.cx + dx), cy: r2(w.cy + dy) }))
  return {
    ...f,
    wheels,
    strings: f.strings.map((st) => st.map(p)),
    arcs: f.arcs.map((a) => ({ ...a, wheel: wheels[f.wheels.indexOf(a.wheel)] })),
    objects: f.objects.map((o) => ({ ...o, at: p(o.at), middle: p(o.middle), labelAt: p(o.labelAt) })),
    ceiling: f.ceiling && sg(f.ceiling),
    rods: f.rods.map(sg),
    ground: f.ground && sg(f.ground),
    groundHatches: f.groundHatches.map(sg),
    table: f.table && { top: r2(f.table.top + dy), slab: box(f.table.slab), legs: f.table.legs.map(box) },
    ramp: f.ramp && { ...f.ramp, foot: p(f.ramp.foot), corner: p(f.ramp.corner), top: p(f.ramp.top), angleLabelAt: p(f.ramp.angleLabelAt) },
    platform: f.platform && box(f.platform),
    hatches: f.hatches.map(sg),
    vectors: f.vectors,
  }
}

/**
 * A block and tackle: a load held up by `n` strands. The rope's strands hang
 * side by side, strand 0 being the free end the effort pulls down on. Fixed
 * pulleys at the top join strands 0–1 and 2–3; movable pulleys at the bottom,
 * on a bar the load hangs from, join strands 1–2 and 3–4. The rope's far end
 * is tied to the ceiling (even n) or the bar (odd n); with one strand there
 * are no movable pulleys and the load hangs from the rope itself.
 */
function tackle(s: PulleySettings): PulleyFigure {
  const n = s.strands
  const hl = objectHeight('block', s.loadSize)
  const wl = objectWidth('block', s.loadSize)
  // With one strand the load hangs beside the free end, so the wheel spreads them apart.
  const r = n === 1 ? Math.max(TACKLE_R, wl / 4 + 8) : TACKLE_R
  const d = 2 * r
  const x0 = WIDTH / 2 - (n * d) / 2
  const xs = Array.from({ length: n + 1 }, (_, j) => x0 + j * d)
  const topY = CEILING_Y + 44 + r
  const room = HEIGHT - BOTTOM_MARGIN - hl - HOOK - BAR_GAP - r - topY - belowFor(s)
  const bottomY = topY + Math.min(TACKLE_SPAN, room)
  const barY = bottomY + r + BAR_GAP

  const topPair = (j: number) => j - (j % 2) + 1 <= n // strand j meets a fixed pulley
  const bottomPair = (j: number) => {
    const q = j % 2 === 1 ? j : j - 1
    return q >= 1 && q + 1 <= n // strand j meets a movable pulley
  }
  const wheels: Wheel[] = []
  const arcs: PulleyFigure['arcs'] = []
  for (let j = 0; j + 1 <= n; j += 2) {
    const w = { cx: r2((xs[j] + xs[j + 1]) / 2), cy: r2(topY), r }
    wheels.push(w)
    arcs.push({ wheel: w, from: 180, to: 360 })
  }
  for (let j = 1; j + 1 <= n; j += 2) {
    const w = { cx: r2((xs[j] + xs[j + 1]) / 2), cy: r2(bottomY), r }
    wheels.push(w)
    arcs.push({ wheel: w, from: 0, to: 180 })
  }
  const movable = wheels.filter((w) => w.cy === r2(bottomY))

  // The load hangs from the middle of the bar, or from the rope with one strand.
  const bar = movable.length ? seg(pt(Math.min(...movable.map((w) => w.cx)) - r, barY), pt(Math.max(xs[n], ...movable.map((w) => w.cx + r)), barY)) : null
  const loadX = bar ? (bar.x1 + bar.x2) / 2 : xs[1]
  const loadTop = bar ? barY + HOOK : bottomY
  const load = hanging({ label: s.loadLabel, gravityLabel: s.loadGravityLabel, size: s.loadSize }, loadX, loadTop, 'up')
  const effortEnd = pt(xs[0], Math.min(bottomY + 50, HEIGHT - BOTTOM_MARGIN))

  const strings: Point[][] = [[pt(xs[0], topY), effortEnd]]
  const supporting: number[] = []
  for (let j = 1; j <= n; j++) {
    const upper = topPair(j) ? topY : CEILING_Y
    const lower = bottomPair(j) ? bottomY : bar ? barY : loadTop
    supporting.push(strings.length)
    strings.push([pt(xs[j], upper), pt(xs[j], lower)])
  }
  const rods = [
    ...wheels.filter((w) => w.cy === r2(topY)).map((w) => seg(pt(w.cx, CEILING_Y), pt(w.cx, w.cy))),
    ...movable.map((w) => seg(pt(w.cx, w.cy), pt(w.cx, barY))),
  ]
  return {
    width: WIDTH,
    height: HEIGHT,
    wheels,
    strings,
    tied: [],
    ropes: [],
    arcs,
    objects: [load],
    ceiling: seg(pt(Math.min(xs[0], loadX - wl / 2) - 40, CEILING_Y), pt(Math.max(xs[n], loadX + wl / 2) + 40, CEILING_Y)),
    rods,
    ...empty,
    tackle: { bar, hook: bar ? seg(pt(loadX, barY), pt(loadX, loadTop)) : null, supporting, effort: effortEnd },
  }
}

const VECTOR_LENGTH = 60
const TENSION_LENGTH = 56
const ACCEL_LENGTH = 50
const CONTACT_LENGTH = 34
const LABEL_SIZE = 22

/** Along an object's surface (toward its right, before tilting) and out of it. */
function axes(o: PlacedObject) {
  const t = (o.tilt * Math.PI) / 180
  return { u: { x: Math.cos(t), y: Math.sin(t) }, n: { x: Math.sin(t), y: -Math.cos(t) } }
}

/**
 * The vectors the teacher turned on. Tension runs along each string at both
 * ends: away from the object it's tied to, and away from the pulley (or the
 * other object); a block and tackle shows it once in every strand holding the
 * load (pointing up) and at the free end. Forces on objects start at their
 * edge, as on the Inclined Plane; acceleration rides beside each object.
 * Objects touching in a row have no room between them, so each one's friction
 * runs under it, just below the surface; the contact forces start where they
 * touch, each pushing into its own object; and they move as one, so the row
 * gets one acceleration arrow.
 */
function vectorsFor(f: PulleyFigure, s: PulleySettings): LabeledVector<VectorKind>[] {
  const out: LabeledVector<VectorKind>[] = []
  const centerX = f.wheels.length ? f.wheels.reduce((sum, w) => sum + w.cx, 0) / f.wheels.length : WIDTH / 2
  const widthOf = (l: Label) => [...withoutVectors(l.text)].length * LABEL_SIZE * 0.42
  /**
   * A vector from `from` in direction `d`, labeled past its tip, beside its
   * middle on the side away from the figure's middle (or toward it), or
   * beside its middle on the given side (1 is to the left of the way it points).
   */
  const add = (kind: VectorKind, from: Point, d: Point, length: number, label: Label, at: 'tip' | 'side' | 'inside' | 1 | -1 = 'tip') => {
    const v = seg(from, pt(from.x + d.x * length, from.y + d.y * length))
    let labelAt: Point
    if (at === 'tip') {
      labelAt = labelPoint(v, { at: 'tip', gap: 12 + (widthOf(label) / 2) * Math.abs(d.x) + 11 * Math.abs(d.y) })
    } else if (at === 1 || at === -1) {
      labelAt = labelPoint(v, { at: 'middle', side: at, gap: 18 })
    } else {
      // Side 1 is to the left of the way it points; pick whichever side faces out (or up, for a level vector).
      const left = { x: d.y, y: -d.x }
      const mid = { x: (v.x1 + v.x2) / 2, y: (v.y1 + v.y2) / 2 }
      const out1 = Math.abs(left.x) > 0.3 ? left.x * (mid.x - centerX) > 0 : left.y < 0
      labelAt = labelPoint(v, { at: 'middle', side: out1 === (at === 'side') ? 1 : -1, gap: 12 + widthOf(label) / 2 })
    }
    out.push({ kind, v, label, labelAt: pt(labelAt.x, labelAt.y) })
  }
  const toward = (a: Point, b: Point) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    return { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
  }
  const lengthOf = (st: Point[]) => Math.hypot(st.at(-1)!.x - st[0].x, st.at(-1)!.y - st[0].y)
  /** The hanging object with another hanging from this point, its bottom middle, if any. */
  const holder = (p: Point) => f.objects.find((o) => o.moves !== 'along' && Math.hypot(p.x - o.at.x, p.y - o.at.y) < 0.5)

  if (s.tension) {
    if (f.tackle) {
      for (const i of f.tackle.supporting) {
        const st = f.strings[i]
        const low = st[0].y > st.at(-1)!.y ? st[0] : st.at(-1)!
        add('tension', low, { x: 0, y: -1 }, Math.min(TENSION_LENGTH, lengthOf(st) * 0.42), s.tensionLabel, 'side')
      }
      add('tension', f.tackle.effort, { x: 0, y: 1 }, TENSION_LENGTH * 0.8, s.tensionLabel, 'side')
    } else {
      // With more than one piece of string, each has its own tension: T_1, T_2.
      const several = new Set(f.ropes).size > 1
      f.strings.forEach((st, i) => {
        const [tied, other] = f.tied[i] === 'end' ? [st.at(-1)!, st[0]] : [st[0], st.at(-1)!]
        const length = Math.min(TENSION_LENGTH, lengthOf(st) * 0.42)
        const label = several ? numbered(s.tensionLabel, f.ropes[i] + 1) : s.tensionLabel
        // A string from one hanging object down to another is labeled on its inner side, clear of the upper one's weight.
        const at = holder(st[0]) ? 'inside' : 'side'
        add('tension', tied, toward(tied, other), length, label, at)
        add('tension', other, toward(other, tied), length, label, at)
      })
    }
  }

  const toEdge = (o: PlacedObject, d: Point) => {
    const { u, n } = axes(o)
    const du = Math.abs(d.x * u.x + d.y * u.y)
    const dn = Math.abs(d.x * n.x + d.y * n.y)
    return Math.min(du > 1e-9 ? o.width / 2 / du : Infinity, dn > 1e-9 ? o.height / 2 / dn : Infinity)
  }
  const fromEdge = (o: PlacedObject, d: Point) => {
    const e = toEdge(o, d)
    return pt(o.middle.x + d.x * e, o.middle.y + d.y * e)
  }
  if (s.gravity) {
    const down = { x: 0, y: 1 }
    for (const o of f.objects) {
      // An object with another hanging below it has its weight set off to the outer side, and
      // labeled beside it, clear of that string.
      const holds = f.strings.some((st) => holder(st[0]) === o)
      if (holds) add('gravity', pt(o.at.x + Math.sign(o.at.x - centerX) * (o.width / 4), o.at.y), down, VECTOR_LENGTH, o.gravityLabel, 'side')
      else add('gravity', fromEdge(o, down), down, VECTOR_LENGTH, o.gravityLabel)
    }
  }

  // The objects on a table or ramp, from the back to the front; with more than one, their forces are numbered.
  const onSurface = f.objects.filter((o) => o.moves === 'along')
  const nth = (label: Label, i: number) => (onSurface.length > 1 ? numbered(label, i + 1) : label)
  const inTouch = touching(s)
  if (s.normal) {
    onSurface.forEach((o, i) => {
      const { n } = axes(o)
      add('normal', fromEdge(o, n), n, VECTOR_LENGTH, nth(s.normalLabel, i))
    })
  }
  if (s.friction !== 'none') {
    onSurface.forEach((o, i) => {
      const { u, n } = axes(o)
      // Toward the pulley is +u: to the right on a table, up a ramp.
      const d = s.friction === 'toward' ? u : { x: -u.x, y: -u.y }
      if (inTouch) {
        // From under the object's middle, just below the surface, labeled below that.
        const length = Math.min(VECTOR_LENGTH * 0.85, o.width * 0.8)
        add('friction', pt(o.at.x - n.x * 9, o.at.y - n.y * 9), d, length, nth(s.frictionLabel, i), d.y * n.x - d.x * n.y > 0 ? -1 : 1)
      } else {
        // In a row, short enough to stay clear of the next object.
        const from = pt(o.at.x + d.x * (o.width / 2) + n.x * 9, o.at.y + d.y * (o.width / 2) + n.y * 9)
        add('friction', from, d, onSurface.length > 1 ? Math.min(VECTOR_LENGTH * 0.85, gapOf(s) * 0.6) : VECTOR_LENGTH * 0.85, nth(s.frictionLabel, i))
      }
    })
  }
  if (s.contact && inTouch) {
    // Equal and opposite, from the face where two objects touch, near the top of the shorter one;
    // one label for the pair, above that face.
    const several = onSurface.length > 2
    onSurface.slice(1).forEach((o, i) => {
      const back = onSurface[i]
      const { u, n } = axes(o)
      const face = pt(o.at.x - (u.x * o.width) / 2, o.at.y - (u.y * o.width) / 2)
      const lane = Math.min(back.height, o.height) - 7
      const from = pt(face.x + n.x * lane, face.y + n.y * lane)
      const length = Math.min(CONTACT_LENGTH, back.width * 0.45, o.width * 0.45)
      const label = several ? numbered(s.contactLabel, i + 1) : s.contactLabel
      const over = Math.max(back.height, o.height) + 16
      const labelAt = pt(face.x + n.x * over, face.y + n.y * over)
      out.push({ kind: 'contact', v: seg(from, pt(from.x + u.x * length, from.y + u.y * length)), label, labelAt })
      out.push({ kind: 'contact', v: seg(from, pt(from.x - u.x * length, from.y - u.y * length)), label: { ...label, mode: 'none' }, labelAt })
    })
  }

  if (s.acceleration !== 'none') {
    const sign = s.acceleration === 'forward' ? 1 : -1
    // A touching row's one arrow goes over its leading object.
    const lead = sign > 0 ? onSurface.at(-1) : onSurface[0]
    for (const o of f.objects) {
      // Which way this object moves when the hanging one falls.
      let d: Point
      let from: Point
      if (o.moves === 'along') {
        if (inTouch && o !== lead) continue
        const { u, n } = axes(o)
        d = { x: u.x * sign, y: u.y * sign }
        // Above the object, set off to one side so it doesn't cross the normal force.
        const lane = pt(o.middle.x + n.x * (o.height / 2 + 20), o.middle.y + n.y * (o.height / 2 + 20))
        from = pt(lane.x + d.x * 14, lane.y + d.y * 14)
      } else {
        // Going forward, the hanging (or right-hand) object falls; the other rises, as does a tackle's load.
        const up = (o.moves === 'up') === sign > 0
        d = { x: 0, y: up ? -1 : 1 }
        // Beside the object, on its outer side.
        const side = o.middle.x < centerX ? -1 : 1
        const x = o.middle.x + side * (o.width / 2 + 16)
        from = pt(x, o.middle.y - d.y * (ACCEL_LENGTH / 2))
      }
      add('acceleration', from, d, ACCEL_LENGTH, s.accelerationLabel, 'side')
    }
  }
  return out
}

/** The box around a ramp's angle label. */
export function angleLabelBox(f: PulleyFigure, s: PulleySettings): Box {
  const width = [...labelRuns(s.angleLabel.text).map((r) => r.text).join('')].length * LABEL_SIZE * 0.5
  return boxAround(f.ramp!.angleLabelAt, width / 2 + 4, 14)
}

/** Is a ramp's angle label clear of every object on it, its strings, and their vectors and the vectors' labels? */
export function angleLabelClear(f: PulleyFigure, s: PulleySettings): boolean {
  // With a little room to spare around it.
  const { left, top, right, bottom } = angleLabelBox(f, s)
  const box = { left: left - LABEL_MARGIN, top: top - LABEL_MARGIN, right: right + LABEL_MARGIN, bottom: bottom + LABEL_MARGIN }
  const widthOf = (l: Label) => [...labelRuns(l.text).map((r) => r.text).join('')].length * LABEL_SIZE * 0.45
  return (
    !f.objects.some((o) => polygonHits(box, cornersOf(o))) &&
    !f.strings.some((st) => st.slice(1).some((p, i) => segmentHits(box, seg(st[i], p)))) &&
    !f.vectors.some((v) => segmentHits(box, v.v) || (v.label.mode !== 'none' && boxesMeet(box, boxAround(v.labelAt, widthOf(v.label) / 2 + 2, 11))))
  )
}

/** An object's four corners, in order round it. */
function cornersOf(o: PlacedObject): Point[] {
  const { u, n } = axes(o)
  return [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]].map(([du, dn]) => ({
    x: o.at.x + u.x * du * o.width + n.x * dn * o.height,
    y: o.at.y + u.y * du * o.width + n.y * dn * o.height,
  }))
}

/** How far up the slope a row moves at a time to clear the ramp's angle label. */
const ROW_STEP = 8
const LABEL_MARGIN = 8

export function buildPulley(s: PulleySettings): PulleyFigure {
  let f = s.setup === 'tackle' ? tackle(s) : s.setup === 'table' ? table(s) : s.setup === 'ramp' ? ramp(s) : atwood(s)
  let vectors = vectorsFor(f, s)
  // A row of objects on a ramp moves up the slope, a little at a time, until it
  // and its vectors are clear of the angle's label (the ramp growing, if it must).
  if (s.setup === 'ramp' && rowOf(s).length > 1) {
    for (let back = END_ROOM + ROW_STEP; !angleLabelClear({ ...f, vectors }, s) && back < 1000; back += ROW_STEP) {
      f = ramp(s, back)
      vectors = vectorsFor(f, s)
    }
  }
  // Should a vector or its label still reach past either side (the friction behind a long row
  // on a ramp), or past the bottom, the figure grows to hold it.
  const xs = vectors.flatMap((v) => [v.v.x1, v.v.x2, v.labelAt.x - 20, v.labelAt.x + 20])
  const left = Math.max(0, Math.ceil(10 - Math.min(...xs)))
  const right = Math.max(0, Math.ceil(Math.max(...xs) + 10 - f.width))
  if (left || right) {
    f = { ...shift(f, left, 0), width: f.width + left + right }
    vectors = vectorsFor(f, s)
  }
  const lowest = Math.max(...vectors.flatMap((v) => [v.v.y2, v.labelAt.y + 14]))
  return { ...f, vectors, height: Math.max(f.height, Math.ceil(lowest + 10)) }
}
