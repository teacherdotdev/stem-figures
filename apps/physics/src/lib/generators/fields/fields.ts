// The Electric and Magnetic Field figure: where each part goes and the field
// lines around it, in a fixed 640 × 420 figure.
//
// Charges' lines are traced through the real field, each charge's falling off
// as 1/r² (a slice through 3D, the way textbooks draw it), so they curve the
// way they should and never cross. Plates' lines are straight, a magnet's are
// the Coil and Magnet's, and a wire's are circles.

import { magnetFieldLines } from '$lib/generators/coil-and-magnet/fieldLines'
import { arrowAlong, traceLine, type Field, type Point } from '$lib/shared/field'
import type { FieldSettings, Setup } from './settings'

export const WIDTH = 640
export const HEIGHT = 420
export const CHARGE_R = 20
export const WIRE_R = 18

export interface Arrow {
  x: number
  y: number
  /** Which way it points, in degrees clockwise from the right (SVG's way). */
  angle: number
}

export interface Line {
  points: Point[]
  arrows: Arrow[]
}

export interface Charge {
  x: number
  y: number
  q: 1 | -1
}

export interface Plates {
  left: number
  right: number
  top: number
  bottom: number
  /** Where the + and − signs go along each plate. */
  signs: number[]
}

export interface FieldFigure {
  width: number
  height: number
  lines: Line[]
  charges: Charge[]
  plates: Plates | null
  magnet: { x: number; y: number; length: number; height: number } | null
  wire: { x: number; y: number; current: 'out' | 'in' } | null
}

const DENSITY: Record<Setup, Record<FieldSettings['lines'], number>> = {
  charge: { fewer: 8, normal: 12, more: 16 },
  opposite: { fewer: 8, normal: 12, more: 16 },
  like: { fewer: 8, normal: 12, more: 16 },
  plates: { fewer: 5, normal: 7, more: 9 },
  magnet: { fewer: 3, normal: 4, more: 6 },
  wire: { fewer: 3, normal: 4, more: 5 },
}

export const lineCount = (s: FieldSettings) => DENSITY[s.setup][s.lines]

const CX = WIDTH / 2
const CY = HEIGHT / 2
/** Half the gap between a pair of charges. */
const PAIR = 130
/** How far from a charge the arrowhead goes on a line that runs off the figure. */
const ARROW_OUT = 75

export function buildFields(s: FieldSettings): FieldFigure {
  const fig: FieldFigure = { width: WIDTH, height: HEIGHT, lines: [], charges: [], plates: null, magnet: null, wire: null }
  const sign = s.sign === '-' ? -1 : 1
  const n = lineCount(s)
  switch (s.setup) {
    case 'charge':
      fig.charges = [{ x: CX, y: CY, q: sign }]
      fig.lines = chargeLines(fig.charges, n, 0)
      break
    case 'opposite':
      fig.charges = [{ x: CX - PAIR, y: CY, q: 1 }, { x: CX + PAIR, y: CY, q: -1 }]
      fig.lines = chargeLines(fig.charges, n, 0)
      break
    case 'like':
      fig.charges = [{ x: CX - PAIR, y: CY, q: sign }, { x: CX + PAIR, y: CY, q: sign }]
      // Half a step off the axis, so no line runs into the still point between them.
      fig.lines = chargeLines(fig.charges, n, 0.5)
      break
    case 'plates':
      fig.plates = plates()
      fig.lines = plateLines(fig.plates, n)
      break
    case 'magnet': {
      const magnet = { x: CX - 110, y: CY - 25, length: 220, height: 50 }
      fig.magnet = magnet
      fig.lines = magnetFieldLines({ ...magnet, near: 'N' }, n, 160).map((l) => ({ points: l.points, arrows: l.arrow ? [l.arrow] : [] }))
      break
    }
    case 'wire':
      fig.wire = { x: CX, y: CY, current: s.current }
      fig.lines = wireLines(n, s.current)
      break
  }
  return fig
}

/** The field of point charges, each falling off as 1/r². */
export function chargeField(charges: Charge[]): Field {
  return (x, y) => {
    let ex = 0
    let ey = 0
    for (const c of charges) {
      const dx = x - c.x
      const dy = y - c.y
      const r2 = dx * dx + dy * dy + 1e-6
      const k = c.q / (r2 * Math.sqrt(r2))
      ex += k * dx
      ey += k * dy
    }
    return [ex, ey]
  }
}

const cache = new Map<string, Line[]>()

/**
 * Lines start evenly spaced around each + charge and follow the field until
 * they reach another charge or leave a box well outside the figure (which
 * clips them). Each − charge starts lines too, following the field backward,
 * and keeps only those that don't end on a + charge: so between opposite
 * charges each line is drawn once, and lines come in to a − charge from
 * outside. `offset` turns the starts by part of a step.
 */
function chargeLines(charges: Charge[], n: number, offset: number): Line[] {
  const key = JSON.stringify([charges, n, offset])
  const hit = cache.get(key)
  if (hit) return hit
  const field = chargeField(charges)
  const backward: Field = (x, y) => {
    const [ex, ey] = field(x, y)
    return [-ex, -ey]
  }
  const bounds = { left: -WIDTH, right: 2 * WIDTH, top: -HEIGHT, bottom: 2 * HEIGHT }
  const onCharge = (p: Point) => charges.find((c) => Math.hypot(p.x - c.x, p.y - c.y) < CHARGE_R)
  const lines: Line[] = []
  for (const c of charges) {
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * (k + offset)) / n
      const start = { x: c.x + (CHARGE_R + 1) * Math.cos(a), y: c.y + (CHARGE_R + 1) * Math.sin(a) }
      const points = traceLine(c.q > 0 ? field : backward, start, { stop: (p) => !!onCharge(p), bounds, step: 2 })
      const end = onCharge(points.at(-1)!)
      if (c.q < 0) {
        if (end && end.q > 0) continue // already drawn from the + charge
        points.reverse()
      }
      lines.push({ points, arrows: [end ? middleArrow(points) : outerArrow(points, c.q)] })
    }
  }
  cache.set(key, lines)
  return lines
}

const inFigure = (p: Point, margin = 15) => p.x > margin && p.x < WIDTH - margin && p.y > margin && p.y < HEIGHT - margin

/** Halfway along a line between two charges, or near its start if halfway is off the figure. */
function middleArrow(points: Point[]): Arrow {
  const mid = arrowAlong(points)!
  return inFigure(mid) ? mid : arrowAt(points, ARROW_OUT)
}

/** On a line running off the figure, a fixed way from its charge: out from a +, in to a −. */
const outerArrow = (points: Point[], q: number): Arrow => arrowAt(points, q > 0 ? ARROW_OUT : lengthOf(points) - ARROW_OUT)

/** A point `distance` along a line, and which way the line points there. */
function arrowAt(points: Point[], distance: number): Arrow {
  let walked = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    walked += Math.hypot(b.x - a.x, b.y - a.y)
    if (walked >= distance) return { x: b.x, y: b.y, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI }
  }
  return arrowAlong(points)!
}

const lengthOf = (points: Point[]) => points.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : 0), 0)

/** Two plates, + on top and − below, with a sign every 40 or so along each. */
function plates(): Plates {
  const left = CX - 190
  const right = CX + 190
  const count = 9
  return {
    left,
    right,
    top: CY - 100,
    bottom: CY + 100,
    signs: Array.from({ length: count }, (_, i) => left + ((i + 0.5) / count) * (right - left)),
  }
}

/** Straight lines from the + plate down to the − plate, evenly spaced and clear of the ends. */
function plateLines(p: Plates, n: number): Line[] {
  const inset = 25
  const top = p.top + 5
  const bottom = p.bottom - 5
  return Array.from({ length: n }, (_, i) => {
    const x = p.left + inset + (i / (n - 1)) * (p.right - p.left - 2 * inset)
    return { points: [{ x, y: top }, { x, y: bottom }], arrows: [{ x, y: (top + bottom) / 2 + 6, angle: 90 }] }
  })
}

/**
 * Circles around the wire, further apart further out, since the field weakens
 * with distance. With the current out of the page they run counterclockwise
 * (right-hand rule), into the page clockwise: an arrowhead at the top and the
 * bottom of each.
 */
function wireLines(n: number, current: 'out' | 'in'): Line[] {
  const ccw = current === 'out'
  return Array.from({ length: n }, (_, k) => {
    const r = 42 * 1.45 ** k
    const points = Array.from({ length: 289 }, (_, i) => {
      const a = (2 * Math.PI * i) / 288
      return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
    })
    // On screen, y runs down: counterclockwise goes left over the top and right along the bottom.
    const arrows = [
      { x: CX, y: CY - r, angle: ccw ? 180 : 0 },
      { x: CX, y: CY + r, angle: ccw ? 0 : 180 },
    ]
    return { points, arrows }
  })
}

/** What the figure shows, for screen readers. */
export function describe(s: FieldSettings): string {
  const sign = s.sign === '-' ? 'negative' : 'positive'
  const what = {
    charge: `A ${sign} point charge`,
    opposite: 'A positive and a negative point charge side by side',
    like: `Two ${sign} point charges side by side`,
    plates: 'Two parallel plates, positive on top and negative below',
    magnet: 'A bar magnet, north on the right',
    wire: `A wire seen end-on with its current ${s.current === 'out' ? 'out of' : 'into'} the page`,
  }[s.setup]
  if (!s.fieldLines) return `${what}, with no field lines`
  return `${what}, with ${s.setup === 'magnet' || s.setup === 'wire' ? 'magnetic' : 'electric'} field lines${s.arrows ? '' : ' without arrows'}`
}
