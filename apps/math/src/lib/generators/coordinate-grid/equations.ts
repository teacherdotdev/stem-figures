// Reading what a teacher types to graph on a coordinate grid, with Caret (see
// docs/adr/0002-caret-for-math-input.md): a straight line like y = 2x + 1,
// 2x + 3y = 6 or x = 4, a curve that can be solved for y like y = x^2 - 4,
// y = 2^x or y = 3sin(2x), an inequality of either like y > 2x + 1, x < 3 or
// −2 < x ≤ 3 (shaded on one side of its boundary), or points like (2, 3) or
// A(1, 2), B(3, 4). Not yet: sideways curves and circles. Runs on the server too.

import type { TreeNode } from '@caret-js/core'
import { CommaListNode, ComparisonNode, ParenthesesChildTag, VariableNode } from '@caret-js/math'
import { fromText, parsers } from '$lib/shared/math.js'
import { fmt } from '$shared/graph/numbering'
import { FunctionNameNode } from '$lib/shared/functions.js'
import { splitLabels } from '$lib/shared/pointLabels.js'
import { divisors, evaluate, type AngleUnit } from './evaluate.js'
import {
  ARROWS, ASYMPTOTES, COLORS, ENDPOINTS, FILLS, LINE_STYLES, LABEL_STYLES, POINT_STYLES,
  type Arrows, type AsymptoteStyle, type Color, type Endpoints, type Fill, type LineStyle, type LabelStyle, type PointStyle,
} from '$lib/shared/rowStyle.js'

const EXAMPLE = 'Try a line like y = 2x + 1, a curve like y = x^2 − 4, a point like (2, 3), or a list of points like (2, 3), (1, 4).'
const EPS = 1e-9

class ReadError extends Error {}

export { splitLabels }
export { ARROWS, ASYMPTOTES, COLORS, ENDPOINTS, FILLS, LINE_STYLES, LABEL_STYLES, POINT_STYLES }
export type { Arrows, AsymptoteStyle, Color, Endpoints, Fill, LineStyle, LabelStyle, PointStyle }

/**
 * One equation row: what's typed, and how it's drawn. An inequality's boundary
 * has arrows of its own (barrows), which start off, since its shading shows it
 * goes on, and how its shaded region is filled.
 */
export type Row = {
  text: string; color: Color; line: LineStyle; arrows: Arrows; point: PointStyle; names: LabelStyle; ends: Endpoints; asym: AsymptoteStyle
  fill: Fill; barrows: Arrows
}

export const ROW_DEFAULTS: Row = {
  text: '', color: 'black', line: 'solid', arrows: 'both', point: 'dot', names: 'name', ends: 'shown', asym: 'hidden', fill: 'tint', barrows: 'none',
}

const STYLE_KEYS = {
  color: COLORS, line: LINE_STYLES, arrows: ARROWS, point: POINT_STYLES, names: LABEL_STYLES, ends: ENDPOINTS, asym: ASYMPTOTES, fill: FILLS, barrows: ARROWS,
}
type StyleKey = keyof typeof STYLE_KEYS

/** A point, in the grid's own values, and its point name if it has one (A, B′). */
export type Point = { x: number; y: number; name?: string }
/** The line a·x + b·y + c = 0. */
export type Line = { a: number; b: number; c: number }
/** The stretch of values a grid covers. */
export type Box = { x0: number; x1: number; y0: number; y1: number }
/**
 * Part of a line or curve inside the grid, left to right, and whether each end
 * leaves through the grid's edge. An inequality's boundary says whether its
 * points are left out (strict: < or >, drawn dashed) or included (≤ or ≥, solid).
 */
export type Run = { points: Point[]; edges: [boolean, boolean]; strict?: boolean }
/** An open or closed circle on a graphed line: a hole, or (end) an endpoint at the end of its domain. */
export type Circle = Point & { closed: boolean; end?: boolean }
/**
 * y = f(x), and the parts of it that divide by something with x in it (see
 * divisors()). It was read from an equation F(x, y) = 0 with F = A(x)·y + B(x);
 * lead is A, whose sign says which side of the curve F is positive on.
 */
export type Curve = { f: (x: number) => number | null; divisors: ((x: number) => number | null)[]; lead: (x: number) => number | null }
/**
 * One row, read: what it draws, or a problem for the settings panel. An
 * inequality also has its shaded region, as polygons (possibly none on the grid).
 */
export type ReadRow =
  | { problem: string; runs?: undefined; points?: undefined; circles?: undefined; asymptotes?: undefined; regions?: undefined }
  | { runs: Run[]; circles: Circle[]; asymptotes: Line[]; regions?: Point[][]; problem?: undefined; points?: undefined }
  | { points: Point[]; problem: string | null; runs?: undefined; circles?: undefined; asymptotes?: undefined; regions?: undefined }

/** A row from a form, a stored preset or an older link (just its text). */
export function cleanRow(r: any): Row {
  if (typeof r !== 'object' || r === null) return { ...ROW_DEFAULTS, text: String(r ?? '') }
  const out: Row = { ...ROW_DEFAULTS, text: String(r.text ?? '') }
  for (const [k, list] of Object.entries(STYLE_KEYS) as [StyleKey, object][]) if (r[k] in list) (out as Record<StyleKey, string>)[k] = r[k]
  return out
}

/** A row as one value in the page address: "y=2x+1", or "y=2x+1|color=red|line=dashed". */
export function rowToParam(r: Row): string {
  const style = (Object.keys(STYLE_KEYS) as StyleKey[]).filter((k) => r[k] !== ROW_DEFAULTS[k]).map((k) => `${k}=${r[k]}`)
  return [r.text.trim(), ...style].join('|')
}

export function rowFromParam(value: string): Row {
  // The style is the "key=value" parts at the end; anything before is the
  // text, which can have bars of its own, as in y = |x| − 2.
  const parts = String(value).split('|')
  const style: string[][] = []
  const isStyle = (p: string) => {
    const k = p.split('=')[0]
    return p.includes('=') && k !== 'text' && k in ROW_DEFAULTS
  }
  while (parts.length > 1 && isStyle(parts.at(-1)!)) style.unshift(parts.pop()!.split('='))
  return cleanRow({ text: parts.join('|'), ...Object.fromEntries(style) })
}

/** A bracketed pair like (2, 3) as { x, y }. */
function point(node: TreeNode, angle: AngleUnit): Point {
  if (!(node instanceof CommaListNode && node.hasTag(ParenthesesChildTag) && node.expressions.length === 2)) {
    throw new ReadError('Write each point as (x, y), like (2, 3). For more than one, put commas between them: (2, 3), (1, 4).')
  }
  const [x, y] = node.expressions.map((n) => evaluate(n, {}, angle))
  if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new ReadError('Each point needs two numbers, like (2, 3) or (−1/2, 4). For more than one: (2, 3), (1, 4).')
  }
  return { x, y }
}

/** Is v close enough to w, relative to their size? */
const near = (v: number, w: number) => Math.abs(v - w) <= 1e-7 * Math.max(1, Math.abs(v), Math.abs(w))
// Where an equation is tested for its shape: spread out, and off the usual integers.
const XS = [-7.3, -3.7, -1.2, 0.4, 1.9, 2.9, 5.3, 8.6]

/**
 * An equation in x and y, as the line a·x + b·y + c = 0 when it is one, or else
 * as y = f(x) when y appears only to the first power (y = x² − 4, 2y = 2^x).
 * Both sides are evaluated at test points to see which, so any way of writing
 * it works: y − 3 = (x − 1)², for one.
 */
function graphOf(node: ComparisonNode, angle: AngleUnit): Graph {
  if (node.operators.length > 1) throw new ReadError('Use one = sign, like y = 2x + 1.')
  return sidesGraph(node, node.operands[0], node.operands[1], angle)
}

type Graph = { line: Line; curve?: undefined } | { curve: Curve; line?: undefined }

/** The graph of left = right, read from the comparison they're part of. */
function sidesGraph(node: ComparisonNode, left: TreeNode, right: TreeNode, angle: AngleUnit): Graph {
  for (const n of node.traverse()) {
    if (n instanceof FunctionNameNode) throw new ReadError(`Give ${n.name} something to work on, like ${n.name}(x).`)
    if (n instanceof VariableNode && n.name !== 'x' && n.name !== 'y') throw new ReadError(`Use x and y, not ${n.name}.`)
  }
  const F = (x: number, y: number) => {
    const l = evaluate(left, { x, y }, angle)
    const r = evaluate(right, { x, y }, angle)
    return l === null || r === null || !Number.isFinite(l) || !Number.isFinite(r) ? null : l - r
  }

  // A straight line: F is a·x + b·y + c everywhere. One that divides by
  // something with x in it, like y = (x² − 1)/(x − 1), is drawn as a curve,
  // which knows about holes.
  const divs = [...divisors(left, angle), ...divisors(right, angle)]
  const c = divs.length ? null : F(0, 0)
  // (F(1, 0) and F(0, 1) are checked before a and b are used.)
  const a = c === null ? null : F(1, 0)! - c
  const b = c === null ? null : F(0, 1)! - c
  const linear =
    c !== null && F(1, 0) !== null && F(0, 1) !== null &&
    [[2, -3], [-1.5, 4.25], [7, 11], [-6.2, -2.7]].every(([x, y]) => {
      const v = F(x, y)
      return v !== null && near(v, a! * x + b! * y + c)
    })
  if (linear) {
    if (Math.abs(a!) < 1e-12 && Math.abs(b!) < 1e-12) {
      throw new ReadError(Math.abs(c!) < 1e-12 ? 'That’s true for every point, so there’s nothing to draw.' : 'That’s never true, so there’s nothing to draw.')
    }
    return { line: { a: a!, b: b!, c: c! } }
  }

  // A curve y = f(x): at each x, F is A·y + B, so y = −B / A.
  let tested = 0
  let slope = false
  for (const x of XS) {
    const B = F(x, 0)
    const A1 = F(x, 1)
    if (B === null || A1 === null) continue
    const A = A1 - B
    for (const y of [2, -3.5, 6.25]) {
      const v = F(x, y)
      if (v === null) continue
      tested++
      if (!near(v, A * y + B)) throw new ReadError('Sideways curves and circles aren’t here yet. Try one you can write as y = …, like y = x^2 − 4.')
    }
    if (Math.abs(A) > 1e-12) slope = true
  }
  if (!tested) throw new ReadError(EXAMPLE)
  if (!slope) throw new ReadError('Write it with y, like y = x^2 − 4. An equation in x alone, like x^2 = 4, isn’t here yet.')
  const A = (x: number) => {
    const B = F(x, 0)
    const A1 = F(x, 1)
    return B === null || A1 === null ? null : A1 - B
  }
  return {
    curve: {
      f: (x) => {
        const B = F(x, 0)
        const A1 = F(x, 1)
        if (B === null || A1 === null || Math.abs(A1 - B) < 1e-12) return null
        return -B / (A1 - B)
      },
      // Solving for y divides by y's coefficient too: y(x − 1) = x² − 1.
      divisors: [...divs, A],
      lead: A,
    },
  }
}

const INEQUALITY_SIGNS = ['<', '≤', '>', '≥']

/**
 * One side of a boundary: the points where F = left − right is positive
 * (greater, for > and ≥) or negative, and whether the boundary itself is left
 * out (strict, for < and >).
 */
export type Condition = Graph & { greater: boolean; strict: boolean }

/**
 * An inequality, as the conditions that all hold: one, like y > 2x + 1, or two
 * for a compound one like −2 < x ≤ 3, whose boundaries both have to be lines.
 */
function inequalityOf(node: ComparisonNode, angle: AngleUnit): Condition[] {
  const ops = node.operators
  if (ops.includes('≠')) throw new ReadError('≠ can’t be shaded. Try an inequality like y > 2x + 1 or y ≤ x^2.')
  if (ops.some((op) => !INEQUALITY_SIGNS.includes(op))) throw new ReadError('Use = for a line, or <, ≤, > or ≥ to shade, not both in one row.')
  if (ops.length > 2) throw new ReadError('Use at most two signs, like −2 < x ≤ 3.')
  const less = (op: string) => op === '<' || op === '≤'
  if (ops.length === 2 && less(ops[0]) !== less(ops[1])) throw new ReadError('Point both signs the same way, like −2 < x ≤ 3.')
  const conditions = ops.map((op, i) => ({
    ...sidesGraph(node, node.operands[i], node.operands[i + 1], angle),
    greater: !less(op),
    strict: op === '<' || op === '>',
  }))
  if (conditions.length > 1) {
    if (conditions.some((c) => c.curve)) throw new ReadError('A compound inequality has to be in straight lines, like −2 < x ≤ 3. Give a curve’s inequalities a row each.')
    const far = 1e9
    const everywhere = [{ x: -far, y: -far }, { x: far, y: -far }, { x: far, y: far }, { x: -far, y: far }]
    if (!conditions.reduce((poly, c) => clipHalf(poly, c.line!, c.greater), everywhere).length) {
      throw new ReadError('No points make that true, so there’s nothing to shade.')
    }
  }
  return conditions
}

/** A polygon cut down to where a·x + b·y + c is positive (greater) or negative, as Sutherland–Hodgman does it. */
function clipHalf(poly: Point[], { a, b, c }: Line, greater: boolean): Point[] {
  const side = (p: Point) => (greater ? 1 : -1) * (a * p.x + b * p.y + c)
  const out: Point[] = []
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length]
    const [sp, sq] = [side(p), side(q)]
    if (sp >= 0) out.push(p)
    if (sp >= 0 !== sq >= 0) {
      const t = sp / (sp - sq)
      out.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) })
    }
  })
  return out
}

/** A polygon's area. */
const areaOf = (poly: Point[]) => Math.abs(poly.reduce((sum, p, i) => sum + p.x * poly[(i + 1) % poly.length].y - poly[(i + 1) % poly.length].x * p.y, 0)) / 2

/** One end of a domain: where it stops, and whether that number is included (≤) or not (<). */
export type Bound = { v: number; closed: boolean }
/** The x-values a graphed line is drawn over (or y-values, for an up-and-down line); a missing end runs on. */
export type Domain = { variable: 'x' | 'y'; lo: Bound | null; hi: Bound | null }

const DOMAIN_EXAMPLE = 'After the comma, give the x-values to draw, like y = 2x + 1, −2 ≤ x < 3 or y = x^2, x ≥ 0.'

/** A domain from what's typed after the equation's comma: −5 ≤ x < 7, or x ≥ 0, or several (all of them hold). */
function domainOf(conditions: TreeNode[], angle: AngleUnit): Domain {
  let variable: 'x' | 'y' | null = null
  let lo: Bound | null = null
  let hi: Bound | null = null
  const tighter = (a: Bound | null, b: Bound, low: boolean): Bound => {
    if (!a) return b
    if (a.v === b.v) return { v: a.v, closed: a.closed && b.closed }
    return (low ? b.v > a.v : b.v < a.v) ? b : a
  }
  for (const c of conditions) {
    if (!(c instanceof ComparisonNode) || c.operators.some((op) => !['<', '≤', '>', '≥'].includes(op))) throw new ReadError(DOMAIN_EXAMPLE)
    const isVar = (n: TreeNode): n is VariableNode => n instanceof VariableNode && (n.name === 'x' || n.name === 'y')
    for (let i = 0; i < c.operators.length; i++) {
      const [l, r, op] = [c.operands[i], c.operands[i + 1], c.operators[i]]
      const v = isVar(l) ? l : isVar(r) ? r : null
      const other = v === l ? r : l
      if (!v || isVar(other)) throw new ReadError(DOMAIN_EXAMPLE)
      if (variable && v.name !== variable) throw new ReadError('Give the domain in one letter, x or y.')
      variable = v.name as 'x' | 'y'
      const n = evaluate(other, {}, angle)
      if (n === null) throw new ReadError(DOMAIN_EXAMPLE)
      // x < n and n > x put n above x; x > n and n < x put it below.
      const above = (v === l) === (op === '<' || op === '≤')
      const b = { v: n, closed: op === '≤' || op === '≥' }
      if (above) hi = tighter(hi, b, false)
      else lo = tighter(lo, b, true)
    }
  }
  if (!variable) throw new ReadError(DOMAIN_EXAMPLE)
  if (lo && hi && (lo.v > hi.v || (lo.v === hi.v && !(lo.closed && hi.closed)))) throw new ReadError(`No ${variable}-values fit that domain, so there’s nothing to draw.`)
  return { variable, lo, hi }
}

/**
 * Read one row. Blank text draws nothing.
 */
export function parseEquation(
  text: string,
  angle: AngleUnit = 'radians',
): { line?: Line; curve?: Curve; domain?: Domain; inequality?: Condition[]; points?: Point[]; error?: string } | null {
  if (!String(text ?? '').trim()) return null
  try {
    const labeled = splitLabels(text)
    const node = parsers.equation.parse(fromText(labeled?.text ?? text))
    const isInequality = (n: ComparisonNode) => n.operators.some((op) => op !== '=')
    if (node instanceof ComparisonNode) return isInequality(node) ? { inequality: inequalityOf(node, angle) } : graphOf(node, angle)
    // An equation and its domain after a comma: y = 3x, −5 ≤ x < 7.
    if (node instanceof CommaListNode && !node.hasTag(ParenthesesChildTag) && node.expressions[0] instanceof ComparisonNode) {
      const [eq, ...conditions] = node.expressions
      if (isInequality(eq as ComparisonNode)) {
        throw new ReadError('An inequality can’t take a domain. Give each inequality its own row; together they’re shaded as a system.')
      }
      const graph = graphOf(eq as ComparisonNode, angle)
      const domain = domainOf(conditions, angle)
      if (graph.curve && domain.variable === 'y') throw new ReadError('Give a curve’s domain in x, like y = x^2, −2 ≤ x ≤ 3.')
      return { ...graph, domain }
    }
    if (node instanceof CommaListNode) {
      const items = node.hasTag(ParenthesesChildTag) ? [node] : node.expressions
      return {
        points: items.map((item, i) => {
          const p = point(item, angle)
          const name = labeled?.labels[i]
          return name ? { ...p, name } : p
        }),
      }
    }
    throw new ReadError(EXAMPLE)
  } catch (e) {
    if (e instanceof ReadError) return { error: e.message }
    throw e
  }
}

/**
 * The line a·x + b·y + c = 0 clipped to a box of values, as its two ends, or
 * null when it misses the box.
 */
export function clipLine({ a, b, c }: Line, box: Box): [Point, Point] | null {
  // Walk along the line from a point on it: p + t·d, d = (b, −a).
  const p: Point = Math.abs(b) > Math.abs(a) ? { x: 0, y: -c / b } : { x: -c / a, y: 0 }
  const d: Point = { x: b, y: -a }
  let lo = -Infinity
  let hi = Infinity
  for (const [k, min, max] of [['x', box.x0, box.x1], ['y', box.y0, box.y1]] as const) {
    if (Math.abs(d[k]) < 1e-12) {
      if (p[k] < min - 1e-9 || p[k] > max + 1e-9) return null
      continue
    }
    const [t1, t2] = [(min - p[k]) / d[k], (max - p[k]) / d[k]].sort((m, n) => m - n)
    lo = Math.max(lo, t1)
    hi = Math.min(hi, t2)
  }
  if (!(hi - lo > 1e-9)) return null
  const at = (t: number): Point => ({ x: p.x + t * d.x, y: p.y + t * d.y })
  return [at(lo), at(hi)]
}

const inBox = ({ x, y }: Point, box: Box) => x >= box.x0 - EPS && x <= box.x1 + EPS && y >= box.y0 - EPS && y <= box.y1 + EPS

/** Left end first; for an up-and-down line, the bottom. */
const leftFirst = (p: Point, q: Point) => (Math.abs(p.x - q.x) > EPS ? p.x < q.x : p.y < q.y)

/** Where g is 0 between a and b: where it changes sign, and where it touches 0 without crossing, like (x − 1)². */
function zerosOf(g: (x: number) => number | null, a: number, b: number, n = 960): number[] {
  const xs = Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)
  const vs = xs.map((x) => {
    const v = g(x)
    return v === null || !Number.isFinite(v) ? null : v
  })
  const scale = Math.max(1, ...vs.map((v) => Math.abs(v ?? 0)))
  const out: number[] = []
  const bisect = (lo: number, hi: number, glo: number) => {
    for (let k = 0; k < 80; k++) {
      const m = (lo + hi) / 2
      const gm = g(m)
      if (gm === null || gm === 0) return m
      if (Math.sign(gm) === Math.sign(glo)) [lo, glo] = [m, gm]
      else hi = m
    }
    return (lo + hi) / 2
  }
  for (let i = 0; i <= n; i++) {
    const v = vs[i]
    if (v === null) continue
    const [before, after] = [vs[i - 1] ?? null, vs[i + 1] ?? null]
    if (v === 0) out.push(xs[i])
    else if (after !== null && after !== 0 && Math.sign(after) !== Math.sign(v)) out.push(bisect(xs[i], xs[i + 1], v))
    else if (before !== null && after !== null && Math.abs(v) < Math.abs(before) && Math.abs(v) <= Math.abs(after)) {
      // A dip toward 0: find its bottom, and keep it if it gets there.
      let [lo, hi] = [xs[i - 1], xs[i + 1]]
      for (let k = 0; k < 100; k++) {
        const [m1, m2] = [lo + (hi - lo) / 3, hi - (hi - lo) / 3]
        const [g1, g2] = [g(m1), g(m2)]
        if (g1 === null || g2 === null) break
        if (Math.abs(g1) < Math.abs(g2)) hi = m2
        else lo = m1
      }
      const m = (lo + hi) / 2
      const gm = g(m)
      if (gm !== null && Math.abs(gm) < 1e-9 * scale) out.push(m)
    }
  }
  return out
}

/**
 * Where y = f(x) breaks inside the box's x-values, found where something it
 * divides by (or takes the log of) is 0: holes, where the curve carries on
 * across one missing point (drawn as an open circle), vertical asymptotes
 * (poles), and jumps.
 */
export function breaksOf(curve: Curve, box: Box): { holes: Point[]; at: number[]; poles: number[] } {
  const { f } = curve
  const w = box.x1 - box.x0
  const h = box.y1 - box.y0
  const found: number[] = []
  for (const g of curve.divisors) {
    for (const r of zerosOf(g, box.x0, box.x1)) if (!found.some((q) => Math.abs(q - r) < w * 1e-9)) found.push(r)
  }
  const holes: Point[] = []
  const at: number[] = []
  const poles: number[] = []
  const d = w * 1e-7
  // Still heading away as it nears r from one side, as 1/x and ln x do: an
  // asymptote. (A curve that carries on settles down that close to r.)
  const blows = (v: number | null, farther: number | null) => v !== null && farther !== null && Math.abs(v) > Math.abs(farther) && Math.abs(v - farther) > h * 1e-3
  for (const r of found.sort((p, q) => p - q)) {
    const [l, rt] = [f(r - d), f(r + d)]
    if (blows(l, f(r - 10 * d)) || blows(rt, f(r + 10 * d))) {
      at.push(r)
      poles.push(r)
    }
    // Dividing by 0 leaves it undefined at r, even where the curve carries on
    // across (and r is only found to within rounding, so f(r) may not say so).
    else if (l !== null && rt !== null && Math.abs(l - rt) < h * 1e-4) {
      at.push(r)
      holes.push({ x: r, y: (l + rt) / 2 })
    } else if (l !== null && rt !== null) at.push(r)
  }
  return { holes: holes.filter((p) => inBox(p, box)), at, poles }
}

/**
 * The lines y = f(x) settles toward far off to the left and to the right:
 * horizontal (y = 0 for y = 2^x) or slant (y = x for y = (x² + 1)/x). Found
 * by looking further and further out and seeing that f keeps to one line.
 * A curve that is a line has none.
 */
export function endAsymptotes(f: (x: number) => number | null, box: Box, sides: { left: boolean; right: boolean }): Line[] {
  const h = box.y1 - box.y0
  const X = 1e4 * Math.max(1, box.x1 - box.x0, Math.abs(box.x0), Math.abs(box.x1))
  const out: Line[] = []
  for (const [side, on] of [[-1, sides.left], [1, sides.right]] as const) {
    if (!on) continue
    const at = (k: number) => f(side * k * X)
    const [f1, f2, f4, f8, f16] = [at(1), at(2), at(4), at(8), at(16)]
    if (f1 === null || f2 === null || f4 === null || f8 === null || f16 === null) continue
    // The line through f at kX and 2kX, then with the part that shrinks like
    // 1/x taken out (Richardson), since f is still closing in on it out there.
    const through = (fa: number, fb: number, k: number) => {
      const m = (fb - fa) / (side * k * X)
      return { m, b: fa - m * side * k * X }
    }
    const [p, q] = [through(f2, f4, 2), through(f4, f8, 4)]
    const m = 2 * q.m - p.m
    const b = 2 * q.b - p.b
    const fits = (v: number, k: number) => Math.abs(v - (m * side * k * X + b)) < h * 1e-3
    if (!fits(f8, 8) || !fits(f16, 16) || !fits(f1, 1)) continue
    // Tidy rounding, so y = 0.0000001 reads as y = 0.
    const tidy = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v)
    const line = { a: tidy(m), b: -1, c: tidy(b) } // y = m·x + b
    // A curve that is its own line (y = 2x + 1) has no asymptote.
    const mid = (box.x0 + box.x1) / 2
    const own = [box.x0, mid, box.x1, mid + (box.x1 - box.x0) / 7].every((x) => {
      const y = f(x)
      return y !== null && Math.abs(y - (line.a * x + line.c)) < h * 1e-6
    })
    if (own) continue
    if (!out.some((l) => Math.abs(l.a - line.a) < 1e-6 && Math.abs(l.c - line.c) < h * 1e-4)) out.push(line)
  }
  return out
}

/**
 * The parts of y = f(x) inside the box, each left to right, with whether each
 * end leaves through the box's edge (where an arrow goes) rather than stopping
 * where f does (like √x at 0). Sampled finely enough to draw smoothly, and
 * never joined across a break: one given (an asymptote, a hole or a jump), or
 * one found between two neighboring samples that stay far apart however
 * closely they're looked at.
 */
export function curveRuns(f: (x: number) => number | null, box: Box, breaks: number[] = [], samples = 480): Run[] {
  type Sample = { x: number; y: number | null; in: boolean; brk?: boolean }
  const w = box.x1 - box.x0
  const h = box.y1 - box.y0
  const value = (x: number) => {
    const y = f(x)
    return y === null || !Number.isFinite(y) ? null : y
  }
  const inside = (y: number | null) => y !== null && y >= box.y0 - EPS && y <= box.y1 + EPS
  const sample = (x: number, brk = false): Sample => {
    const y = value(x)
    return { x, y, in: inside(y), brk }
  }

  const uniform = Array.from({ length: samples + 1 }, (_, i) => sample(box.x0 + (w * i) / samples))
  const all = [...breaks]
  for (let i = 0; i < samples; i++) {
    let [ya, yb] = [uniform[i].y, uniform[i + 1].y]
    if (ya === null || yb === null || Math.abs(yb - ya) <= h) continue
    // Keep the half that jumps more: a steep curve's jump shrinks, a break's doesn't.
    let [lo, hi] = [uniform[i].x, uniform[i + 1].x]
    let brk: number | null = null
    for (let k = 0; k < 60 && Math.abs(yb - ya) >= h * 1e-3; k++) {
      const m = (lo + hi) / 2
      const ym = value(m)
      if (ym === null) {
        brk = m
        break
      }
      if (Math.abs(ym - ya) >= Math.abs(yb - ym)) [hi, yb] = [m, ym]
      else [lo, ya] = [m, ym]
    }
    if (brk === null && Math.abs(yb - ya) >= h * 1e-3) brk = (lo + hi) / 2
    if (brk !== null && !all.some((b) => Math.abs(b - brk!) < w * 1e-6)) all.push(brk)
  }

  // Each break is looked at just either side, and the far side isn't joined to the near one.
  const d = w * 1e-9
  const pts = [...uniform]
  for (const b of all) if (b > box.x0 && b < box.x1) pts.push(sample(b - d), sample(b + d, true))
  pts.sort((p, q) => p.x - q.x)

  // Where the curve crosses the top or bottom between an inside and an outside sample.
  const crossing = (a: Sample & { y: number }, b: Sample & { y: number }): Point => {
    const edge = b.y > box.y1 || a.y > box.y1 ? box.y1 : box.y0
    let [lo, hi] = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }]
    for (let k = 0; k < 50; k++) {
      const x = (lo.x + hi.x) / 2
      const y = value(x)
      if (y === null) break
      if ((y - edge) * (a.y - edge) > 0) lo = { x, y }
      else hi = { x, y }
    }
    const t = (edge - lo.y) / (hi.y - lo.y)
    return { x: lo.x + (Number.isFinite(t) ? t : 0) * (hi.x - lo.x), y: edge }
  }

  const runs: Run[] = []
  let run: Run | null = null
  let prev: Sample | null = null
  for (const s of pts) {
    const joined = prev !== null && !s.brk
    if (s.in && (!joined || !prev!.in)) {
      // Coming in: from the left edge, across the top or bottom, or where f starts.
      run = { points: [], edges: [prev === null || (joined && prev.y !== null), false] }
      if (joined && prev!.y !== null) run.points.push(crossing(prev as Sample & { y: number }, s as Sample & { y: number }))
      runs.push(run)
    }
    if (s.in) run!.points.push({ x: s.x, y: s.y! })
    else if (prev?.in) {
      // Going out: across the top or bottom, or where f stops.
      if (joined && s.y !== null) run!.points.push(crossing(prev as Sample & { y: number }, s as Sample & { y: number }))
      run!.edges[1] = joined && s.y !== null
    }
    prev = s
  }
  if (prev?.in) run!.edges[1] = true // out the right edge
  return runs.filter((r) => r.points.length > 1)
}

/**
 * The shaded region on one side of y = f(x) inside the box, as polygons: at
 * each x it runs from the curve (or the grid's edge, where the curve is past
 * it) to the top or the bottom, whichever side F is positive on (greater) or
 * negative. That side can change along the curve, where lead does: x·y > 1 is
 * above y = 1/x on the right and below it on the left. Never joined across a
 * break (an asymptote or a jump), and nothing where f isn't defined, except
 * at a hole, which the shading runs past.
 */
export function curveRegions(curve: Curve, greater: boolean, box: Box, breaks: number[] = [], holes: number[] = [], samples = 960): Point[][] {
  const w = box.x1 - box.x0
  const d = w * 1e-9
  const xs = Array.from({ length: samples + 1 }, (_, i) => ({ x: box.x0 + (w * i) / samples, brk: false }))
  for (const b of breaks) if (b > box.x0 && b < box.x1) xs.push({ x: b - d, brk: false }, { x: b + d, brk: true })
  xs.sort((p, q) => p.x - q.x)

  const out: Point[][] = []
  let poly: Point[] = []
  let side: 'up' | 'down' | null = null
  const close = () => {
    const edge = side === 'up' ? box.y1 : box.y0
    // (A curve past the edge it shades toward leaves nothing to shade.)
    if (poly.length > 1 && poly.some((p) => Math.abs(p.y - edge) > EPS)) out.push([...poly, { x: poly.at(-1)!.x, y: edge }, { x: poly[0].x, y: edge }])
    poly = []
    side = null
  }
  for (const { x, brk } of xs) {
    const y = curve.f(x)
    const A = curve.lead(x)
    const here = y === null || !Number.isFinite(y) || A === null || Math.abs(A) < 1e-12 ? null : greater === A > 0 ? 'up' : 'down'
    if (!here && holes.some((h) => Math.abs(h - x) < w * 1e-6)) continue
    if (here !== side || brk) close()
    if (here) {
      side = here
      poly.push({ x, y: Math.min(box.y1, Math.max(box.y0, y!)) })
    }
  }
  close()
  return out
}

/** A curve's asymptotes on the grid: vertical ones at its poles, and the lines it settles toward at whichever ends run on. */
function asymptotesOf(f: Curve['f'], poles: number[], box: Box, sides: { left: boolean; right: boolean }): Line[] {
  return [
    ...poles.filter((r) => r > box.x0 + EPS && r < box.x1 - EPS).map((r) => ({ a: 1, b: 0, c: -r })),
    ...endAsymptotes(f, box, sides).filter((l) => clipLine(l, box)),
  ]
}

/**
 * An inequality row fitted to the grid: its boundaries, dashed or solid by
 * whether they're included, and its shaded region. A boundary has no domain,
 * so it runs to the grid's edges like an equation's graphed line, keeping its
 * holes and breaking at asymptotes, and the shading runs past its holes.
 */
function readInequality(conditions: Condition[], box: Box): ReadRow {
  const runs: Run[] = []
  const circles: Circle[] = []
  const asymptotes: Line[] = []
  let regions: Point[][] = []
  for (const c of conditions) {
    if (c.line) {
      const ends = clipLine(c.line, box)
      if (ends) runs.push({ points: leftFirst(...ends) ? ends : [ends[1], ends[0]], edges: [true, true], strict: c.strict })
    } else {
      const { holes, at, poles } = breaksOf(c.curve, box)
      runs.push(...curveRuns(c.curve.f, box, at).map((r) => ({ ...r, strict: c.strict })))
      circles.push(...holes.map((p) => ({ ...p, closed: false })))
      asymptotes.push(...asymptotesOf(c.curve.f, poles, box, { left: true, right: true }))
      const gaps = holes.map((p) => p.x)
      regions = curveRegions(c.curve, c.greater, box, at.filter((x) => !gaps.some((h) => Math.abs(h - x) < (box.x1 - box.x0) * 1e-6)), gaps)
    }
  }
  if (conditions.every((c) => c.line)) {
    const corners = [{ x: box.x0, y: box.y0 }, { x: box.x1, y: box.y0 }, { x: box.x1, y: box.y1 }, { x: box.x0, y: box.y1 }]
    const poly = conditions.reduce((p, c) => clipHalf(p, c.line!, c.greater), corners)
    regions = areaOf(poly) > (box.x1 - box.x0) * (box.y1 - box.y0) * 1e-9 ? [poly] : []
  }
  if (!runs.length && !regions.length) return { problem: 'That inequality’s shaded region misses the grid. Widen the axes to show it.' }
  return { runs, circles, asymptotes, regions }
}

/**
 * Every row, read and fitted to the grid's box of values: the parts of a line
 * or curve inside the grid (runs), the points on it, and a problem for the
 * settings panel when a row can't be read or doesn't show.
 */
export function readEquations(texts: string[], box: Box, angle: AngleUnit = 'radians'): (ReadRow | null)[] {
  return texts.map((text): ReadRow | null => {
    const read = parseEquation(text, angle)
    if (!read) return null
    if (read.error) return { problem: read.error }
    if (read.inequality) return readInequality(read.inequality, box)
    if (read.line || read.curve) {
      // A domain narrows the box the graph is drawn in. An end cut off by the
      // domain inside the grid stops at an endpoint instead of an arrow.
      const d = read.domain
      const sub = { ...box }
      const cut = { lo: false, hi: false }
      if (d) {
        const [k0, k1] = d.variable === 'x' ? (['x0', 'x1'] as const) : (['y0', 'y1'] as const)
        if (d.lo && d.lo.v > box[k0] - EPS) [sub[k0], cut.lo] = [d.lo.v, true]
        if (d.hi && d.hi.v < box[k1] + EPS) [sub[k1], cut.hi] = [d.hi.v, true]
        if (sub[k0] > sub[k1] + EPS) return { problem: 'That graph’s domain is off the grid. Widen the axes to show it.' }
      }
      const along = (p: Point) => (d?.variable === 'y' ? p.y : p.x)
      const atLo = (p: Point) => cut.lo && Math.abs(along(p) - d!.lo!.v) < 1e-7 * Math.max(1, Math.abs(d!.lo!.v))
      const atHi = (p: Point) => cut.hi && Math.abs(along(p) - d!.hi!.v) < 1e-7 * Math.max(1, Math.abs(d!.hi!.v))

      let runs: Run[] = []
      let circles: Circle[] = []
      let asymptotes: Line[] = []
      if (read.line) {
        const ends = clipLine(read.line, sub)
        if (ends) {
          const [p, q] = leftFirst(...ends) ? ends : [ends[1], ends[0]]
          runs = [{ points: [p, q], edges: [!atLo(p) && !atHi(p), !atLo(q) && !atHi(q)] }]
          for (const e of [p, q]) {
            if (atLo(e)) circles.push({ ...e, closed: d!.lo!.closed, end: true })
            else if (atHi(e)) circles.push({ ...e, closed: d!.hi!.closed, end: true })
          }
        }
      } else {
        const { f } = read.curve!
        const { holes, at, poles } = breaksOf(read.curve!, sub)
        runs = curveRuns(f, sub, at)
        // Asymptotes: vertical ones inside the domain, and the lines it settles toward where its domain runs on.
        asymptotes = asymptotesOf(f, poles, box, { left: !d?.lo, right: !d?.hi })
        for (const run of runs) {
          if (atLo(run.points[0]) || atHi(run.points[0])) run.edges[0] = false
          if (atLo(run.points.at(-1)!) || atHi(run.points.at(-1)!)) run.edges[1] = false
        }
        circles = holes.map((p) => ({ ...p, closed: false }))
        // An endpoint sits where the curve is at that end, or where it heads, if it isn't defined there.
        const w = (sub.x1 - sub.x0) * 1e-9
        for (const [bound, x, inward] of [[d?.lo, sub.x0, w], [d?.hi, sub.x1, -w]] as const) {
          if (!bound || !(bound === d?.lo ? cut.lo : cut.hi)) continue
          const own = f(x)
          const y = own ?? f(x + inward)
          if (y !== null && inBox({ x, y }, box)) circles.push({ x, y, closed: bound.closed && own !== null, end: true })
        }
      }
      return runs.length ? { runs, circles, asymptotes } : { problem: 'That graph misses the grid. Widen the axes to show it.' }
    }
    const off = read.points!.find((pt) => !inBox(pt, box))
    return {
      points: read.points!.filter((pt) => inBox(pt, box)),
      problem: off ? `${off.name ?? ''}(${fmt(off.x)}, ${fmt(off.y)}) is off the grid. Widen the axes to show it.` : null,
    }
  })
}
