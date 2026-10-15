// How marks on a labeled figure are drawn, shared by every figure whose parts
// are labeled by clicking them: an angle's wedge and congruence arcs, its
// right-angle square, a side's congruence ticks and parallel arrows. Each
// figure passes its own sizes, so each keeps its look.

import { add, mul, r1, type Vec } from '$lib/shapes/vec.js'
import type { Mark } from './options.js'

/**
 * Part of a circle around v, from direction e1 round to e2 (clockwise on the
 * page): just the arc, or closed through v as a wedge. `large` when it's more
 * than half a turn.
 */
export function sectorPath(v: Vec, e1: Vec, e2: Vec, r: number, closed: boolean, large: boolean) {
  const [a, b] = [add(v, mul(e1, r)), add(v, mul(e2, r))]
  const arc = `A${r1(r)},${r1(r)} 0 ${large ? 1 : 0} 1 ${r1(b[0])},${r1(b[1])}`
  return closed ? `M${r1(v[0])},${r1(v[1])} L${r1(a[0])},${r1(a[1])} ${arc} Z` : `M${r1(a[0])},${r1(a[1])} ${arc}`
}

export interface MarkSizes {
  /** The first arc's radius, and the gap between nested arcs. */
  arc: number
  arcGap: number
  /** A right-angle square's side. */
  square: number
}

/**
 * The mark an angle's style asks for at v, between e1 and e2: a square at a
 * right angle, or that many arcs (one when a square's angle stops being
 * 90°). Returns how far out from v it reaches, so a label can clear it.
 */
export function angleMark(
  out: { arcs: string[]; squares: Vec[][] }, v: Vec, e1: Vec, e2: Vec, mark: Mark, right: boolean, large: boolean, size: MarkSizes,
) {
  if (mark === 'right' && right) {
    out.squares.push([add(v, mul(e1, size.square)), add(v, add(mul(e1, size.square), mul(e2, size.square))), add(v, mul(e2, size.square))])
    return size.square * Math.SQRT2
  }
  if (mark === 'none') return 0
  const count = mark === 'right' ? 1 : Number(mark)
  for (let n = 0; n < count; n++) out.arcs.push(sectorPath(v, e1, e2, size.arc + n * size.arcGap, false, large))
  return size.arc + (count - 1) * size.arcGap
}

/** `count` congruence ticks across a line at m, which runs along t, each reaching `half` either side of it. */
export function tickMarks(m: Vec, t: Vec, n: Vec, count: number, half: number, gap: number): [Vec, Vec][] {
  return Array.from({ length: count }, (_, i) => {
    const at = add(m, mul(t, (i - (count - 1) / 2) * gap))
    return [add(at, mul(n, half)), add(at, mul(n, -half))] as [Vec, Vec]
  })
}

/** `count` parallel arrows (open chevrons) centered at m, pointing along t, each `half` long either side and `width` across. */
export function parallelArrows(m: Vec, t: Vec, n: Vec, count: number, half: number, width: number, gap: number): Vec[][] {
  return Array.from({ length: count }, (_, i) => {
    const at = add(m, mul(t, (i - (count - 1) / 2) * gap))
    const tail = add(at, mul(t, -half))
    return [add(tail, mul(n, width)), add(at, mul(t, half)), add(tail, mul(n, -width))]
  })
}
