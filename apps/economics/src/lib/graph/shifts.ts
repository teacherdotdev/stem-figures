// A curve shifting: how far (small, medium or large, as a share of the
// axis), and the short arrows AP graphs draw from the old curve to the new
// one, spread along it so they stay clear of where the curves cross.

import { clipPath } from '$shared/graph/grid'
import { along, type Box, type Curve } from './curves'
import type { ArrowSpec } from './panel'

export const SHIFT_SIZES = ['small', 'medium', 'large'] as const
export type ShiftSize = (typeof SHIFT_SIZES)[number]
export const SHIFT_SIZE_NAMES: Record<ShiftSize, string> = { small: 'Small', medium: 'Medium', large: 'Large' }

/** How far a shift moves a curve, as a share of the axis it moves along. */
export const SHIFT_SHARE: Record<ShiftSize, number> = { small: 0.12, medium: 0.2, large: 0.28 }

/** Where along a curve its arrows go, by how many there are. */
const AT: Record<number, number[]> = { 0: [], 1: [0.2], 2: [0.2, 0.8], 3: [0.15, 0.5, 0.85] }

/**
 * `count` arrows from a curve to where it shifts, `dx` across and `dy` up,
 * each from a point along the part of the curve on the graph.
 */
export function shiftArrows(c: Curve, dx: number, dy: number, count: number, color: string, box: Box): ArrowSpec[] {
  const run = clipPath(c, box).sort((a, b) => b.length - a.length)[0]
  if (!run || (!dx && !dy)) return []
  return (AT[Math.max(0, Math.min(3, Math.round(count)))] ?? []).map((t) => {
    const from = along(run, t).at
    return { from, to: { x: from.x + dx, y: from.y + dy }, color }
  })
}
