// What a figure hangs from, stands on or is fixed to: a ceiling, the ground
// or a wall, drawn as a heavy line with short slanted hatches on its solid
// side (above a ceiling, below the ground, behind a wall). A ceiling and the ground are horizontal, a
// wall upright, and each can sit anywhere, at any size.
// Draw one with Support.svelte.

import type { Segment } from './vector'

/** Where a ceiling sits in a figure that hangs from the top of its box. */
export const CEILING_Y = 34
/** From one hatch to the next, along the surface. */
export const HATCH_SPACING = 13
/** How far the ground's hatches (and a rough surface's) reach into the solid side. */
export const HATCH_LENGTH = 9
/** How far a ceiling's hatches reach above it. */
export const CEILING_HATCH_LENGTH = 10
/** How far a hatch leans along the surface, as a share of its length. */
const LEAN = 0.8
/** From the surface's left end to its first hatch. */
const INSET = 4

/** A hatched surface: its line, and the hatches on its solid side. */
export interface Support {
  line: Segment
  hatches: Segment[]
}

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * The hatches above a ceiling line, each starting on the line and leaning up
 * to the right. All of them end within the line's width.
 */
export function ceilingHatches(line: Segment): Segment[] {
  const y = line.y1
  return Array.from({ length: Math.floor((line.x2 - line.x1) / HATCH_SPACING) }, (_, i) => {
    const x = line.x1 + INSET + i * HATCH_SPACING
    return { x1: x, y1: y, x2: x + CEILING_HATCH_LENGTH * LEAN, y2: y - CEILING_HATCH_LENGTH }
  })
}

/**
 * The hatches below a ground line, each starting on the line and leaning down
 * to the left. The last one may start just past the line's right end.
 */
export function groundHatches(line: Segment): Segment[] {
  const y = line.y1
  const out: Segment[] = []
  for (let x = line.x1 + INSET; x < line.x2; x += HATCH_SPACING) {
    out.push({ x1: r2(x + HATCH_LENGTH * LEAN), y1: r2(y), x2: r2(x), y2: r2(y + HATCH_LENGTH) })
  }
  return out
}

/** A hatched ceiling from x1 to x2 at height y. */
export function ceiling(x1: number, x2: number, y: number = CEILING_Y): Support {
  const line = { x1, y1: y, x2, y2: y }
  return { line, hatches: ceilingHatches(line) }
}

/** A hatched ground or floor from x1 to x2 at height y. */
export function ground(x1: number, x2: number, y: number): Support {
  const line = { x1, y1: y, x2, y2: y }
  return { line, hatches: groundHatches(line) }
}

/**
 * The hatches on a wall's solid side, each starting on the wall's line and
 * leaning down into the wall: to the left of a wall on the figure's left
 * (`side` 'left', the solid side), or to the right. All of them start within
 * the line's height.
 */
export function wallHatches(line: Segment, side: 'left' | 'right' = 'left'): Segment[] {
  const x = line.x1
  const [top, bottom] = [Math.min(line.y1, line.y2), Math.max(line.y1, line.y2)]
  const out: Segment[] = []
  const dx = side === 'left' ? -HATCH_LENGTH : HATCH_LENGTH
  for (let y = top + INSET; y < bottom; y += HATCH_SPACING) {
    out.push({ x1: r2(x), y1: r2(y), x2: r2(x + dx), y2: r2(y + HATCH_LENGTH * LEAN) })
  }
  return out
}

/** A hatched upright wall at x from y1 down to y2, solid on its `side`. */
export function wall(x: number, y1: number, y2: number, side: 'left' | 'right' = 'left'): Support {
  const line = { x1: x, y1, x2: x, y2 }
  return { line, hatches: wallHatches(line, side) }
}
