// Volume by Displacement's objects lying along a ruler, drawn the same way.
// Here the drawing is to scale across: the object's ends are exactly where
// its reading says, so students can measure it. Its height only has to look
// right, so a long metal cylinder doesn't grow ever taller, and a long rock
// grows taller only as much as it needs to still look like a rock.

import { CYLINDER_ASPECT, ROCK_ASPECT, rockPath, type Circle, type ObjectKind } from './objectKinds'

export type Lying =
  | { kind: 'marbles'; marbles: Circle[] }
  /** the box the rock's outline is drawn in, a little wider than the rock */
  | { kind: 'rock'; x: number; y: number; w: number; h: number }
  /** the top left corner and side, seen straight on */
  | { kind: 'cube'; x: number; y: number; a: number }
  /** the box it fills, lying on its side: `l` long and `d` across */
  | { kind: 'cylinder'; x: number; y: number; l: number; d: number }

/** The most a lying cylinder is drawn across, and a rock is drawn tall
 *  before it has to grow taller to stay rock-shaped, in drawing units. */
const ROCK_TALLEST = 84
const CYLINDER_WIDEST = 60
/** how many times longer than tall a rock is drawn, at most */
const ROCK_LONGEST = 2.2

/** Where the rock's outline actually reaches across its box, 0 to 1: its
 *  curves stay a little inside the points they bend toward. */
export const ROCK_REACH = (() => {
  // The outline of a unit box, as its M and Q commands.
  const nums = rockPath({ x: 0, y: 0, w: 1, h: 1 }).match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number)
  const xs = nums.filter((_, i) => i % 2 === 0)
  let [min, max] = [xs[0], xs[0]]
  // After M x y, each Q adds a control point and an end point.
  for (let i = 1; i + 1 < xs.length; i += 2) {
    const [p0, p1, p2] = [xs[i - 1], xs[i], xs[i + 1]]
    const turn = p0 - 2 * p1 + p2
    const t = turn ? (p0 - p1) / turn : -1
    const at = t > 0 && t < 1 ? [(1 - t) ** 2 * p0 + 2 * t * (1 - t) * p1 + t ** 2 * p2] : []
    for (const x of [p0, p2, ...at]) [min, max] = [Math.min(min, x), Math.max(max, x)]
  }
  return { min, max }
})()

/** The object lying on the ruler's top edge (y = 0) from x = `left` to
 *  `right`, in drawing units; marbles in a row, touching. */
export function objectOnRuler(kind: ObjectKind, count: number, left: number, right: number): Lying {
  const L = right - left
  if (kind === 'marbles') {
    const n = Math.max(1, Math.round(count))
    const r = L / n / 2
    return { kind, marbles: Array.from({ length: n }, (_, i) => ({ x: left + (2 * i + 1) * r, y: -r, r })) }
  }
  if (kind === 'rock') {
    const w = L / (ROCK_REACH.max - ROCK_REACH.min)
    // Its usual shape, then longer, then no longer than ROCK_LONGEST allows.
    const h = Math.max(Math.min(ROCK_TALLEST, L / ROCK_ASPECT), L / ROCK_LONGEST)
    return { kind, x: left - ROCK_REACH.min * w, y: -h, w, h }
  }
  if (kind === 'cylinder') {
    const d = Math.min(CYLINDER_WIDEST, L / CYLINDER_ASPECT)
    return { kind, x: left, y: -d, l: L, d }
  }
  return { kind, x: left, y: -L, a: L }
}

/** How far the object stands above the ruler. */
export function objectHeight(p: Lying) {
  if (p.kind === 'marbles') return 2 * p.marbles[0].r
  if (p.kind === 'rock') return p.h
  if (p.kind === 'cylinder') return p.d
  return p.a
}
