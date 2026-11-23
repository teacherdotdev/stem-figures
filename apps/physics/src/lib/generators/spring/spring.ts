// Where everything in a Spring figure goes. A figure is one, two or three
// copies of the same spring (or springs) fixed to a support, each with its
// free end at its own extension: one copy; Before and after (at the natural
// length, then stretched or squashed); or Three positions (at +A, at
// equilibrium and at −A). Hanging copies stand side by side under one
// ceiling; horizontal copies are rows, each with its own wall and floor.
//
// Each coil is drawn for the length it has ($lib/shared/spring), never
// scaled. Springs in series share the natural length and stretch equally;
// springs in parallel each run from the support to a light bar, and the
// object hangs from (or is pushed by) the bar's middle. k is a text label, so
// every spring stretches alike.
//
// Positions are y down. A hanging spring's free end goes down from the
// ceiling, a horizontal one's goes right from the wall.

import type { Label } from '$lib/shared/label'
import { labelWidth } from '$lib/shared/layout'
import { objectHeight, objectWidth } from '$lib/shared/objects'
import { coilPath } from '$lib/shared/spring'
import { CEILING_Y, ceiling, ground, wall, type Support } from '$lib/shared/support'
import { numbered, type Point, type Segment } from '$lib/shared/vector'
import { arrangementOf, type SpringSettings } from './settings'

/** Every object is drawn this size (see $lib/shared/objects): a block 56 across. */
export const OBJECT_SIZE = 1
/** A coil's width across, and its width when parallel springs lie one above the other on a floor. */
export const COIL_WIDTH = 22
const NARROW_COIL = 12
/** Parallel springs, from the middle of one to the next: side by side, and one above the other. */
const PARALLEL_SPACING = { hanging: 70, horizontal: 38 }
/** From the parallel springs' bar to the object. */
const BAR_LINK = 14
/** About this much spring for each turn, at the natural length. */
const TURN_LENGTH = 15
/** How long a vector is: an applied force, a velocity or an acceleration. */
export const ARROW = 60
/** Slotted masses, as the Spring Scale draws them: three discs on a hanger. */
export const MASS = { width: 56, height: 11, discs: 3, rod: 14, base: 5 }
/** The hook at the end of a spring with nothing on it. */
const RING = 4
/** How far a spring's label keeps from the natural length's dashed line, along the spring. */
const LABEL_CLEAR = 16

/** Each hanging layout's width, natural length (in px), and where its copies go. Its height fits what hangs. */
const HANGING = {
  one: { width: 420, natural: 190, columns: [180] },
  beforeAfter: { width: 640, natural: 140, columns: [230, 440] },
  positions: { width: 640, natural: 110, columns: [150, 320, 490] },
}
/** In Three positions a hanging spring rests stretched by half its natural length. */
export const HANGING_EQUILIBRIUM = 0.5
const HORIZONTAL = { width: 640, wallX: 50, top: 40, row: 136, natural: { one: 200, beforeAfter: 200, positions: 230 } }

export type ObjectKind = 'block' | 'ball'

export interface Labelled {
  label: Label
  /** the middle of the label's baseline for 'middle'; its left or right end for 'start' or 'end'; y is the label's middle */
  at: Point
  anchor: 'start' | 'middle' | 'end'
  tone: 'ink' | 'vector'
  /** how long its blank line is, where the usual one wouldn't fit */
  blank?: number
}

export interface FigureVector {
  kind: 'force' | 'velocity' | 'acceleration'
  v: Segment
}

export interface SlottedMasses {
  rod: Segment
  discs: { x: number; y: number; width: number; height: number }[]
  base: { x: number; y: number; width: number; height: number }
}

export interface SpringFigure {
  width: number
  height: number
  supports: Support[]
  coils: string[]
  /** straight wire: links from a bar or the leads to an object */
  wires: Segment[]
  /** the light bars parallel springs end on */
  bars: Segment[]
  /** where springs in series are joined */
  joins: Point[]
  /** the hook at the free end of a spring with nothing on it */
  rings: Point[]
  objects: { kind: ObjectKind; at: Point }[]
  masses: SlottedMasses[]
  /** the natural length and equilibrium lines */
  dashed: Segment[]
  dimensions: Segment[]
  vectors: FigureVector[]
  labels: Labelled[]
  /** where the free end of each copy is, from the first copy on */
  ends: Point[]
}

const r2 = (n: number) => Math.round(n * 100) / 100
const pt = (x: number, y: number): Point => ({ x: r2(x), y: r2(y) })
const seg = (a: Point, b: Point): Segment => ({ x1: r2(a.x), y1: r2(a.y), x2: r2(b.x), y2: r2(b.y) })
const shows = (l: Label) => l.mode !== 'none' && (l.mode === 'blank' || l.text.trim() !== '')

/** How many turns a spring this long at its natural length has. */
export const turnsFor = (natural: number) => Math.max(4, Math.round(natural / TURN_LENGTH))

/** One copy of the springs: where it is fixed, which way it runs, its natural length and its extension (a share of that length). */
interface Copy {
  base: Point
  along: Point
  natural: number
  extension: number
  /** what's on its free end */
  carries: 'object' | 'nothing'
  /** label its springs */
  springLabels: boolean
}

/** What one copy draws, and where its parts end up. */
interface Drawn {
  end: Point
  /** the object's box */
  box: { left: number; right: number; top: number; bottom: number }
  /** how far the springs reach to either side of the middle line */
  spread: number
}

/** Where the object's middle line meets its edge, for a horizontal spring at height `axisY` on a floor at `floorY`. */
function contactOffset(kind: ObjectKind, axisY: number, floorY: number) {
  if (kind === 'block') return 0
  const r = objectHeight('ball', OBJECT_SIZE) / 2
  const dy = axisY - (floorY - r)
  return r - Math.sqrt(Math.max(0, r * r - dy * dy))
}

export function buildSpring(s: SpringSettings): SpringFigure {
  const { count, joined } = arrangementOf(s.springs)
  const hanging = s.orientation === 'hanging'
  const kind: ObjectKind | 'masses' = s.object
  const width = hanging ? HANGING[s.picture].width : HORIZONTAL.width
  const fig: SpringFigure = { width, height: 0, supports: [], coils: [], wires: [], bars: [], joins: [], rings: [], objects: [], masses: [], dashed: [], dimensions: [], vectors: [], labels: [], ends: [] }
  const coilWidth = !hanging && joined === 'parallel' && count > 1 ? NARROW_COIL : COIL_WIDTH
  const spacing = hanging ? PARALLEL_SPACING.hanging : PARALLEL_SPACING.horizontal
  /** How far parallel springs' middles are from the middle line, the outermost. */
  const spread = joined === 'parallel' ? ((count - 1) / 2) * spacing : 0
  const ink = (label: Label, at: Point, anchor: Labelled['anchor'] = 'middle', blank?: number) =>
    shows(label) && fig.labels.push({ label, at: pt(at.x, at.y), anchor, tone: 'ink', blank })
  const vector = (kind: FigureVector['kind'], from: Point, to: Point, label: Label, at: Point, anchor: Labelled['anchor'] = 'middle') => {
    fig.vectors.push({ kind, v: seg(from, to) })
    if (shows(label)) fig.labels.push({ label, at: pt(at.x, at.y), anchor, tone: 'vector' })
  }

  /** The springs of one copy, from its base to its free end, and what hangs on it. */
  function draw(c: Copy, floorY = 0): Drawn {
    // Across the springs: to the right of a hanging one, down from a horizontal one.
    const across = hanging ? { x: 1, y: 0 } : { x: 0, y: 1 }
    const length = c.natural * (1 + c.extension)
    let end = pt(c.base.x + c.along.x * length, c.base.y + c.along.y * length)
    const at = (from: Point, along: number, off = 0) => pt(from.x + c.along.x * along + across.x * off, from.y + c.along.y * along + across.y * off)

    if (joined === 'series' || count === 1) {
      const piece = length / count
      const turns = turnsFor(c.natural / count)
      for (let i = 0; i < count; i++) {
        const a = at(c.base, piece * i)
        const b = at(c.base, piece * (i + 1))
        fig.coils.push(coilPath(a, b, turns, coilWidth, s.coils))
        if (i > 0) fig.joins.push(a)
        if (c.springLabels) {
          const l = count > 1 ? numbered(s.springLabel, i + 1) : s.springLabel
          // A little above the middle, so a spring stretched to twice its length doesn't put it on the natural length line;
          // in series, the middle of each, moved off that line when it lands on it.
          let along = piece * (i + (count === 1 ? 0.42 : 0.5))
          if (count > 1 && Math.abs(along - c.natural) < LABEL_CLEAR) along = c.natural + (along < c.natural ? -LABEL_CLEAR : LABEL_CLEAR)
          const middle = at(c.base, along)
          if (hanging) ink(l, pt(middle.x + coilWidth / 2 + 8, middle.y), 'start')
          else ink(l, pt(middle.x, middle.y - coilWidth / 2 - 14))
        }
      }
    } else {
      const reach = length - BAR_LINK
      const turns = turnsFor(c.natural - BAR_LINK)
      for (let i = 0; i < count; i++) {
        const off = -spread + i * spacing
        const a = at(c.base, 0, off)
        const b = at(c.base, reach, off)
        fig.coils.push(coilPath(a, b, turns, coilWidth, s.coils))
        if (c.springLabels) {
          const l = numbered(s.springLabel, i + 1)
          const middle = at(c.base, reach * 0.42, off)
          // Side by side, each label goes to the right of its spring; one above another, above it.
          if (hanging) ink(l, pt(middle.x + coilWidth / 2 + 6, middle.y), 'start', spacing - coilWidth - 14)
          else ink(l, pt(middle.x, middle.y - coilWidth / 2 - 13))
        }
      }
      const reachEnd = at(c.base, reach)
      fig.bars.push(seg(at(c.base, reach, -spread - 6), at(c.base, reach, spread + 6)))
      // On a floor the springs may sit higher than the object's middle, to clear
      // the floor, so the link leaves the bar level with the object's middle and
      // meets it square on, a ball at its widest.
      if (!hanging && c.carries === 'object') {
        const middleY = floorY - objectHeight(kind === 'ball' ? 'ball' : 'block', OBJECT_SIZE) / 2
        end = pt(end.x, middleY)
        fig.wires.push(seg(pt(reachEnd.x, middleY), end))
      } else fig.wires.push(seg(reachEnd, end))
    }

    const springSpread = spread + coilWidth / 2
    if (c.carries === 'nothing') {
      fig.rings.push(at(end, RING))
      return { end, box: { left: end.x - springSpread, right: end.x + springSpread, top: end.y, bottom: end.y + 2 * RING }, spread: springSpread }
    }

    if (hanging) {
      if (kind === 'masses') {
        const top = end.y + MASS.rod
        const discs = Array.from({ length: MASS.discs }, (_, i) => ({ x: r2(end.x - MASS.width / 2), y: r2(top + i * MASS.height), width: MASS.width, height: MASS.height }))
        const baseY = top + MASS.discs * MASS.height
        fig.masses.push({ rod: seg(end, pt(end.x, baseY)), discs, base: { x: r2(end.x - MASS.width / 2 - 4), y: r2(baseY), width: MASS.width + 8, height: MASS.base } })
        const box = { left: end.x - MASS.width / 2 - 4, right: end.x + MASS.width / 2 + 4, top: end.y, bottom: baseY + MASS.base }
        ink(s.massLabel, pt(box.right + 10, (top + baseY) / 2), 'start')
        return { end, box, spread: springSpread }
      }
      const h = objectHeight(kind, OBJECT_SIZE)
      const w = objectWidth(kind, OBJECT_SIZE)
      fig.objects.push({ kind, at: pt(end.x, end.y + h) })
      ink(s.massLabel, pt(end.x, end.y + h / 2))
      return { end, box: { left: end.x - w / 2, right: end.x + w / 2, top: end.y, bottom: end.y + h }, spread: springSpread }
    }

    // On a floor: the object stands on it, touching the free end.
    const k = kind === 'masses' ? 'block' : kind
    const h = objectHeight(k, OBJECT_SIZE)
    const w = objectWidth(k, OBJECT_SIZE)
    const left = end.x - contactOffset(k, end.y, floorY)
    fig.objects.push({ kind: k, at: pt(left + w / 2, floorY) })
    ink(s.massLabel, pt(left + w / 2, floorY - h / 2))
    return { end, box: { left, right: left + w, top: floorY - h, bottom: floorY }, spread: springSpread }
  }

  return hanging ? buildHanging(s, fig, draw, vector, ink) : buildHorizontal(s, fig, draw, vector, ink, spread, coilWidth)
}

type Draw = (c: Copy, floorY?: number) => Drawn
type Vector = (kind: FigureVector['kind'], from: Point, to: Point, label: Label, at: Point, anchor?: Labelled['anchor']) => void
type Ink = (label: Label, at: Point, anchor?: Labelled['anchor'], blank?: number) => void

/** The extensions of the copies, and which copy hangs at rest, for a hanging equilibrium line. */
function copiesOf(s: SpringSettings) {
  const hanging = s.orientation === 'hanging'
  if (s.picture === 'one') return { extensions: [s.stretch], rest: 0 }
  if (s.picture === 'beforeAfter') return { extensions: [0, s.stretch], rest: 1 }
  // Three positions: hanging, from the top (+A, up being positive) down; on a floor, from −A (squashed) out.
  const middle = hanging ? HANGING_EQUILIBRIUM : 0
  return { extensions: [middle - s.stretch, middle, middle + s.stretch], rest: 1 }
}

/** Does the equilibrium line carry its own label? In Three positions the middle copy's name (x = 0) says it, unless the names are off. */
export const equilibriumLabelled = (s: Pick<SpringSettings, 'picture' | 'amplitudeLabel'>) => s.picture !== 'positions' || s.amplitudeLabel.mode === 'none'

/**
 * Is the equilibrium line drawn? Not on a hanging spring an applied force
 * pulls past where its object rests, where the line would be in the wrong place.
 */
export const equilibriumShown = (s: Pick<SpringSettings, 'equilibriumLine' | 'orientation' | 'picture' | 'appliedForce' | 'stretch'>) =>
  s.equilibriumLine && !(s.orientation === 'hanging' && s.picture !== 'positions' && s.appliedForce && s.stretch !== 0)

/** The positions' names: x = +A, x = 0, x = −A, in the order the copies are drawn. */
function positionNames(s: SpringSettings): Label[] {
  const a = s.amplitudeLabel
  if (a.mode === 'none') return []
  if (a.mode === 'blank') return [a, a, a]
  const signs = s.orientation === 'hanging' ? ['+', '', '−'] : ['−', '', '+']
  return signs.map((sign) => ({ mode: 'text', text: sign ? `x = ${sign}${a.text}` : 'x = 0' }))
}

function buildHanging(s: SpringSettings, fig: SpringFigure, draw: Draw, vector: Vector, ink: Ink): SpringFigure {
  const layout = HANGING[s.picture]
  const { extensions, rest } = copiesOf(s)
  const natural = layout.natural
  const positions = s.picture === 'positions'
  const drawn = extensions.map((extension, i) =>
    draw({
      base: pt(layout.columns[i], CEILING_Y),
      along: { x: 0, y: 1 },
      natural,
      extension,
      carries: s.picture === 'beforeAfter' && i === 0 ? 'nothing' : 'object',
      springLabels: !positions || i === 0,
    }),
  )
  fig.ends = drawn.map((d) => d.end)
  const left = Math.min(...drawn.map((d) => Math.min(d.box.left, d.end.x - d.spread)))
  const right = Math.max(...drawn.map((d) => Math.max(d.box.right, d.end.x + d.spread)))
  fig.supports.push(ceiling(r2(Math.max(16, left - 50)), r2(Math.min(fig.width - 16, right + 50))))
  const naturalY = CEILING_Y + natural
  // The copy the marks are about: the stretched one.
  const last = drawn.at(-1)!
  let bottom = Math.max(...drawn.map((d) => d.box.bottom))

  if (!positions) {
    const springsRight = last.end.x + last.spread + (shows(s.springLabel) ? 34 : 0)
    const markX = Math.max(last.box.right, springsRight) + 18
    const stretched = s.stretch !== 0
    // Where the free end would be at its natural length, across to the mark.
    if (s.picture === 'beforeAfter') fig.dashed.push(seg(pt(drawn[0].end.x - drawn[0].spread - 14, naturalY), pt(markX + 10, naturalY)))
    else if (stretched && s.extensionMark) fig.dashed.push(seg(pt(last.end.x - last.spread - 14, naturalY), pt(markX + 10, naturalY)))
    if (s.extensionMark && stretched) {
      fig.dimensions.push(seg(pt(markX, naturalY), pt(markX, last.end.y)))
      ink(s.extensionLabel, pt(markX + 10, (naturalY + last.end.y) / 2), 'start')
    }
    if (s.lengthMark) {
      const first = drawn[0]
      const x = first.end.x - first.spread - 18
      fig.dimensions.push(seg(pt(x, CEILING_Y), pt(x, naturalY)))
      ink(s.lengthLabel, pt(x - 8, CEILING_Y + natural / 2), 'end')
    }
    if (s.appliedForce && stretched) {
      const from = pt(last.end.x, last.box.bottom)
      const to = pt(from.x, from.y + ARROW)
      vector('force', from, to, s.forceLabel, pt(from.x + 12, from.y + ARROW / 2), 'start')
      bottom = Math.max(bottom, to.y)
    }
  } else {
    const names = positionNames(s)
    // Arrows go beside the object, past the slotted masses' label.
    const past = s.object === 'masses' && shows(s.massLabel) ? labelWidth(s.massLabel) + 14 : 0
    drawn.forEach((d, i) => {
      const middleY = (d.box.top + d.box.bottom) / 2
      const x = d.box.right + 16 + past
      if (names[i]) {
        ink(names[i], pt(d.end.x, d.box.bottom + 24), 'middle')
        bottom = Math.max(bottom, d.box.bottom + 24)
      }
      // Up is +A: the top copy is pulled down toward equilibrium, the bottom one up.
      const showA = s.motionArrows === 'acceleration' || s.motionArrows === 'both'
      const showV = s.motionArrows === 'velocity' || s.motionArrows === 'both'
      if (i !== 1 && showA && s.stretch > 0) {
        const way = i === 0 ? 1 : -1
        vector('acceleration', pt(x, middleY - (way * ARROW) / 2), pt(x, middleY + (way * ARROW) / 2), s.accelerationLabel, pt(x + 12, middleY), 'start')
      }
      if (i === 1 && showV) {
        const way = s.moving === 'away' ? 1 : -1
        vector('velocity', pt(x, middleY - (way * ARROW) / 2), pt(x, middleY + (way * ARROW) / 2), s.velocityLabel, pt(x + 12, middleY), 'start')
      }
    })
  }

  if (equilibriumShown(s)) {
    const y = fig.ends[rest].y
    fig.dashed.push(seg(pt(20, y), pt(fig.width - 20, y)))
    if (equilibriumLabelled(s)) ink(s.equilibriumLabel, pt(20, y - 14), 'start')
  }

  fig.height = Math.ceil(bottom + 24)
  return fig
}

function buildHorizontal(s: SpringSettings, fig: SpringFigure, draw: Draw, vector: Vector, ink: Ink, spread: number, coilWidth: number): SpringFigure {
  const { extensions } = copiesOf(s)
  const natural = HORIZONTAL.natural[s.picture]
  const positions = s.picture === 'positions'
  const wallX = HORIZONTAL.wallX
  const kind = s.object === 'ball' ? 'ball' : 'block'
  const objectH = objectHeight(kind, OBJECT_SIZE)
  // The springs' middle line, above the floor: the object's middle, or higher
  // so the lowest of parallel springs clears the floor.
  const rise = Math.max(objectH / 2, spread + coilWidth / 2 + 4)
  const naturalX = wallX + natural
  const names = positions ? positionNames(s) : []
  const showA = positions && (s.motionArrows === 'acceleration' || s.motionArrows === 'both')
  const showV = positions && (s.motionArrows === 'velocity' || s.motionArrows === 'both')

  // Each row is tall enough for its springs, their labels and a mark above them.
  const rowHeight = Math.max(HORIZONTAL.row, 30 + rise + spread + coilWidth / 2 + 26 + 40)
  const rows = extensions.map((extension, i) => {
    const top = HORIZONTAL.top + i * rowHeight
    const floorY = top + rowHeight - 30
    const axisY = floorY - rise
    const d = draw({ base: pt(wallX, axisY), along: { x: 1, y: 0 }, natural, extension, carries: 'object', springLabels: !positions || i === 0 }, floorY)
    fig.supports.push(wall(wallX, Math.min(floorY - 96, axisY - spread - coilWidth / 2 - 24), floorY), ground(wallX, fig.width - 16, floorY))
    /** The top of what's drawn in the row: the object, the springs or their labels. */
    const above = Math.min(d.box.top, axisY - spread - coilWidth / 2 - (shows(s.springLabel) && (!positions || i === 0) ? 26 : 0))
    return { d, floorY, axisY, above }
  })
  fig.ends = rows.map((r) => r.d.end)
  const last = rows.at(-1)!

  if (!positions) {
    const stretched = s.stretch !== 0
    const markY = last.above - 14
    // The natural length's end: through both rows in Before and after, or a short line up from the floor.
    if (s.picture === 'beforeAfter') fig.dashed.push(seg(pt(naturalX, rows[0].above - 20), pt(naturalX, last.floorY)))
    else if (stretched && s.extensionMark) fig.dashed.push(seg(pt(naturalX, markY - 10), pt(naturalX, last.floorY)))
    if (s.extensionMark && stretched) {
      fig.dimensions.push(seg(pt(naturalX, markY), pt(last.d.end.x, markY)))
      ink(s.extensionLabel, pt((naturalX + last.d.end.x) / 2, markY - 14))
    }
    if (s.lengthMark) {
      // In one picture, stretched, the natural length and the extension run on along one line.
      const chained = s.picture === 'one' && (s.stretch > 0 || !s.extensionMark)
      const y = s.picture === 'one' ? (chained ? markY : markY - 34) : rows[0].above - 14
      fig.dimensions.push(seg(pt(wallX, y), pt(naturalX, y)))
      ink(s.lengthLabel, pt((wallX + naturalX) / 2, y - 14))
    }
    if (s.appliedForce && stretched) {
      const y = last.floorY - objectH / 2
      const face = last.d.box.right
      // Pulled out, the force pulls away from the wall; squashed, it pushes toward it.
      if (s.stretch > 0) vector('force', pt(face, y), pt(face + ARROW, y), s.forceLabel, pt(face + ARROW / 2, y - 18))
      else {
        // Clear of the natural length's dashed line, which a well-squashed spring brings over the arrow.
        const half = shows(s.forceLabel) ? labelWidth(s.forceLabel) / 2 : 0
        let x = face + ARROW * 0.7
        if (Math.abs(x - naturalX) < half + 6) x = naturalX + half + 6
        vector('force', pt(face + ARROW, y), pt(face, y), s.forceLabel, pt(x, y - 18))
      }
    }
  } else {
    rows.forEach((r, i) => {
      if (names[i]) ink(names[i], pt(fig.width - 16, r.floorY - objectH / 2), 'end')
      const middle = (r.d.box.left + r.d.box.right) / 2
      const y = r.d.box.top - 14
      // −A (squashed) is pushed out toward equilibrium, +A pulled back.
      if (i !== 1 && showA && s.stretch > 0) {
        const way = i === 0 ? 1 : -1
        vector('acceleration', pt(middle - (way * ARROW) / 2, y), pt(middle + (way * ARROW) / 2, y), s.accelerationLabel, pt(middle, y - 16))
      }
      if (i === 1 && showV) {
        const way = s.moving === 'away' ? 1 : -1
        vector('velocity', pt(middle - (way * ARROW) / 2, y), pt(middle + (way * ARROW) / 2, y), s.velocityLabel, pt(middle, y - 16))
      }
    })
  }

  // On a floor the free end rests where the spring is at its natural length.
  if (s.equilibriumLine) {
    fig.dashed.push(seg(pt(naturalX, HORIZONTAL.top - 8), pt(naturalX, last.floorY)))
    if (equilibriumLabelled(s)) ink(s.equilibriumLabel, pt(naturalX, HORIZONTAL.top - 18))
  }

  fig.height = HORIZONTAL.top + rows.length * rowHeight - 8
  return fig
}

/** The figure in words, for screen readers. */
export function describe(s: SpringSettings): string {
  const { count, joined } = arrangementOf(s.springs)
  const springs = count === 1 ? 'a spring' : `${count} springs in ${joined}`
  const object = s.object === 'masses' ? 'slotted masses' : `a ${s.object}`
  const where = s.orientation === 'hanging' ? `${springs} hanging from a ceiling` : `${springs} fixed to a wall, lying along a floor`
  const amount = `${Math.round(Math.abs(s.stretch) * 100)}% of its natural length`
  if (s.picture === 'positions') {
    const marks = { none: '', velocity: ', with its velocity at equilibrium', acceleration: ', with its acceleration at each end', both: ', with its velocity at equilibrium and its acceleration at each end' }[s.motionArrows]
    return `${where}, with ${object} on it, drawn at three positions of its oscillation: at +A, at equilibrium and at −A, where A is ${amount}${marks}`
  }
  const change = s.stretch === 0 ? 'at its natural length' : s.stretch > 0 ? `stretched by ${amount}` : `squashed by ${amount}`
  const marks = [s.extensionMark && s.stretch !== 0 ? 'the extension marked' : '', s.lengthMark ? 'the natural length marked' : '', equilibriumShown(s) ? 'a dashed equilibrium line' : '', s.appliedForce && s.stretch !== 0 ? 'an applied force' : '']
    .filter(Boolean)
    .join(', ')
  const picture =
    s.picture === 'beforeAfter'
      ? `${where}, drawn twice: at its natural length${s.orientation === 'hanging' ? ' with nothing on it' : ` with ${object} on it`}, and ${change} with ${object} on it`
      : `${where}, ${change}, with ${object} on it`
  return picture + (marks ? `, with ${marks}` : '')
}
