// A circle figure's geometry, in its own units: the circle has radius 1 and
// its center at the origin, x to the right and y up. From the settings it
// works out where every point is, how far each line runs (its run-ons and
// tangents), every place on the figure where an angle can be (a node: the
// center, a point, where lines cross, or where a line meets the circle away
// from a point), the angles between the rays at each node, and the arcs the
// places on the circle split it into. layout.ts draws it.
//
// A line is a point on it, `P`, and a direction `d`, from its a end toward its
// b end; everything on it is a distance `s` along d from P. A join's points
// are at s = 0 and s = `length`; it's drawn from `lo` to `hi`, which run past
// an end that runs on.

import { add, cross, dot, len, mul, perp, sub, unit, type Vec } from '$lib/shapes/vec.js'
import { CENTER, angleKey, arcKey, isMid, midKey, readDir, readDist, touchKey, type Line, type Settings } from './settings.js'

export type { Vec }

const RAD = Math.PI / 180
/** How far a run-on end goes past its point, or past the circle when it runs through it, in radii. */
export const RUN = 0.45
/** How far a tangent runs each way from where it touches. */
export const TANGENT = 0.9
/** How far from the center, in radii, two lines may meet when one runs on to the other. */
const FAR = 6
/** How close two places are, in radii, to be the same one. */
const SAME = 1e-6

export type LineKind = 'radius' | 'diameter' | 'chord' | 'secant' | 'tangent' | 'segment'
export const KIND_NAMES: Record<LineKind, string> = { radius: 'Radius', diameter: 'Diameter', chord: 'Chord', secant: 'Secant', tangent: 'Tangent', segment: 'Line' }

export type GeoLine = { id: string; line: Line; kind: LineKind; P: Vec; d: Vec; length: number; lo: number; hi: number }
/**
 * A place on the figure: the center, a point, where a tangent from a point
 * touches the circle, the middle of a line (once a line ends there or it's
 * named), where a line meets the circle, or where lines cross.
 */
export type Node = { key: string; at: Vec; kind: 'center' | 'point' | 'touch' | 'mid' | 'meet' | 'crossing'; onCircle: boolean }
/** A ray out from a node: its line and which way along it, its direction, and how far it runs. */
export type Ray = { ray: string; u: Vec; room: number }
export type Angle = { key: string; node: string; from: Ray; to: Ray; measure: number }
export type Corner = { node: Node; rays: Ray[]; angles: Angle[] }
/** An arc, counterclockwise from one place on the circle to the next: where it starts and how far it sweeps, in degrees. */
export type Arc = { key: string; from: string; to: string; start: number; sweep: number }

const at = (deg: number): Vec => [Math.cos(deg * RAD), Math.sin(deg * RAD)]
/** A direction's angle, counterclockwise from the right, in degrees from 0 up to 360. */
export const degOf = (u: Vec) => ((Math.atan2(u[1], u[0]) / RAD) % 360 + 360) % 360
const pointAt = (g: GeoLine, s: number) => add(g.P, mul(g.d, s))
const idNumber = (id: string) => parseInt(id.slice(1), 10)

/** Where each point is, and what to fix about any that can't be placed. */
export function readPoints(s: Settings) {
  const where = new Map<string, Vec>([[CENTER, [0, 0]]])
  const problems: Record<string, string> = {}
  for (const p of s.points) {
    const v = readDir(p.dir)
    const r = readDist(p.dist)
    if (typeof v === 'string') problems[p.id] = v
    else if (typeof r === 'string') problems[p.id] = r
    // On the circle exactly, so what's on it lines up with it.
    else where.set(p.id, r === 1 ? at(v) : mul(at(v), r))
  }
  return { where, problems }
}

const isOn = (p: Vec) => Math.abs(len(p) - 1) < SAME

/** Where a line through `P` along `d` meets the circle, as distances along it. */
function meetsCircle(P: Vec, d: Vec): number[] {
  const b = dot(P, d)
  const disc = b * b - (dot(P, P) - 1)
  if (disc < 1e-12) return []
  const r = Math.sqrt(disc)
  return [-b - r, -b + r]
}

/**
 * What kind of line a join is, from where its ends are: from the center to
 * the circle a radius; across the circle a diameter, a chord, or a secant
 * when it runs on past both ends; any other line a secant if it crosses the
 * circle twice as drawn, or just a line.
 */
function kindOf(l: Line, P: Vec, Q: Vec, crossings: number): LineKind {
  if ((l.a === CENTER && isOn(Q)) || (l.b === CENTER && isOn(P))) return 'radius'
  if (isOn(P) && isOn(Q)) return len(add(P, Q)) < SAME ? 'diameter' : l.runA && l.runB ? 'secant' : 'chord'
  return crossings >= 2 ? 'secant' : 'segment'
}

/** Where a tangent from P touches the circle, on its side looking from P toward the center, or null from inside the circle. */
export function touchPoint(P: Vec, side: 'left' | 'right'): Vec | null {
  const d = len(P)
  if (d < 1 + SAME) return null
  const turn = Math.acos(1 / d) / RAD
  return at(degOf(P) + (side === 'right' ? turn : -turn))
}

/**
 * The lines that can be drawn, each with how far it runs, in their order.
 * Where each tangent from a point touches the circle is added to `where`
 * first, so joins can end there.
 */
export function readLines(s: Settings, where: Map<string, Vec>): GeoLine[] {
  const out = new Map<string, GeoLine>()
  for (const l of s.lines) {
    const P = where.get(l.a)
    const T = l.kind === 'from' && P ? touchPoint(P, l.side) : null
    if (!P || !T) continue
    where.set(touchKey(l.id), T)
    const length = len(sub(T, P))
    out.set(l.id, { id: l.id, line: l, kind: 'tangent', P, d: unit(sub(T, P)), length, lo: l.runA ? -RUN : 0, hi: length + (l.runB ? RUN : 0) })
  }
  // Lines between places first, each giving its midpoint, then the lines ending at a midpoint.
  const order = [...s.lines.filter((l) => !isMid(l.a) && !isMid(l.b)), ...s.lines.filter((l) => isMid(l.a) || isMid(l.b))]
  for (const l of order) {
    const P = where.get(l.a)
    if (!P || l.kind === 'from') continue
    if (l.kind === 'tangent') {
      if (isOn(P)) out.set(l.id, { id: l.id, line: l, kind: 'tangent', P, d: perp(P), length: 0, lo: l.runA ? -TANGENT : 0, hi: l.runB ? TANGENT : 0 })
      continue
    }
    const Q = where.get(l.b)
    if (!Q || len(sub(Q, P)) < SAME) continue
    const length = len(sub(Q, P))
    const d = unit(sub(Q, P))
    // A run-on end goes past its point, through the circle if it's headed into it, and then on a little.
    const meets = meetsCircle(P, d)
    const pastA = Math.max(0, ...meets.map((m) => -m).filter((m) => m > SAME))
    const pastB = Math.max(0, ...meets.map((m) => m - length).filter((m) => m > SAME))
    const [lo, hi] = [l.runA ? -(pastA + RUN) : 0, length + (l.runB ? pastB + RUN : 0)]
    const crossings = meets.filter((m) => m > lo - SAME && m < hi + SAME).length
    out.set(l.id, { id: l.id, line: l, kind: kindOf(l, P, Q, crossings), P, d, length, lo, hi })
    if (!isMid(l.a) && !isMid(l.b)) where.set(midKey(l.id), mul(add(P, Q), 0.5))
  }
  // An end set to run on until it meets another line stops where it does, if that's ahead of it.
  for (const g of out.values()) {
    for (const end of ['a', 'b'] as const) {
      const other = out.get(end === 'a' ? g.line.toA : g.line.toB)
      const t = other && (end === 'a' ? g.line.runA : g.line.runB) ? meetAt(g, other, end) : null
      if (t !== null) {
        if (end === 'a') g.lo = t
        else g.hi = t
      }
    }
  }
  return s.lines.map((l) => out.get(l.id)).filter((g): g is GeoLine => !!g)
}

/** How far a line meets another past one of its ends, as a distance along it, or null when they don't (or only far off the page). */
export function meetAt(g: Pick<GeoLine, 'P' | 'd' | 'length'>, other: Pick<GeoLine, 'P' | 'd'>, end: 'a' | 'b'): number | null {
  const k = cross(g.d, other.d)
  if (Math.abs(k) < 1e-9) return null
  const t = cross(sub(other.P, g.P), other.d) / k
  if (len(add(g.P, mul(g.d, t))) > FAR) return null
  return end === 'a' ? (t < -SAME ? t : null) : t > g.length + SAME ? t : null
}

/** Every node, ray and angle on the figure, and the arcs around the circle. */
export function buildGeometry(s: Settings) {
  const { where, problems } = readPoints(s)
  const lines = readLines(s, where)
  const nodes: Node[] = [{ key: CENTER, at: [0, 0], kind: 'center', onCircle: false }]
  for (const p of s.points) if (where.has(p.id)) nodes.push({ key: p.id, at: where.get(p.id)!, kind: 'point', onCircle: isOn(where.get(p.id)!) })
  for (const l of s.lines) {
    const T = where.get(touchKey(l.id))
    if (T && !nodes.some((n) => len(sub(n.at, T)) < SAME)) nodes.push({ key: touchKey(l.id), at: T, kind: 'touch', onCircle: true })
  }
  for (const l of s.lines) {
    const key = midKey(l.id)
    const M = where.get(key)
    const used = key in s.marks || s.lines.some((x) => x.a === key || x.b === key)
    if (M && used && !nodes.some((n) => len(sub(n.at, M)) < SAME)) nodes.push({ key, at: M, kind: 'mid', onCircle: isOn(M) })
  }
  const near = (v: Vec) => nodes.find((n) => len(sub(n.at, v)) < SAME)

  // Where each line meets the circle away from a point: past its a end, between its ends, or past its b end, counted out from that end.
  for (const g of lines) {
    if (g.kind === 'tangent') continue
    const found = meetsCircle(g.P, g.d).filter((m) => m > g.lo - SAME && m < g.hi + SAME && !near(pointAt(g, m)))
    for (const part of ['a', 'm', 'b'] as const) {
      const here = found
        .filter((m) => (part === 'a' ? m < 0 : part === 'b' ? m > g.length : m >= 0 && m <= g.length))
        .sort((x, y) => (part === 'a' ? y - x : x - y))
      here.forEach((m, i) => nodes.push({ key: `${g.id}:${part}${i + 1}`, at: pointAt(g, m), kind: 'meet', onCircle: true }))
    }
  }

  // Where two lines cross away from every other node; three or more lines can cross at one.
  const crossings: { at: Vec; ids: Set<string> }[] = []
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const [a, b] = [lines[i], lines[j]]
      const k = cross(a.d, b.d)
      if (Math.abs(k) < 1e-9) continue
      const sa = cross(sub(b.P, a.P), b.d) / k
      const sb = cross(sub(b.P, a.P), a.d) / k
      if (sa < a.lo - SAME || sa > a.hi + SAME || sb < b.lo - SAME || sb > b.hi + SAME) continue
      const x = pointAt(a, sa)
      if (near(x)) continue
      const same = crossings.find((c) => len(sub(c.at, x)) < SAME)
      if (same) same.ids.add(a.id).add(b.id)
      else crossings.push({ at: x, ids: new Set([a.id, b.id]) })
    }
  }
  for (const c of crossings) {
    const key = [...c.ids].sort((x, y) => idNumber(x) - idNumber(y)).join('.')
    nodes.push({ key, at: c.at, kind: 'crossing', onCircle: false })
  }

  // The rays out from each node, along every line through it, and the angles between neighboring ones.
  const corners: Corner[] = nodes.map((node) => {
    const all: Ray[] = []
    for (const g of lines) {
      const v = sub(node.at, g.P)
      if (Math.abs(cross(g.d, v)) > SAME) continue
      const t = dot(v, g.d)
      if (t < g.lo - SAME || t > g.hi + SAME) continue
      if (t < g.hi - SAME) all.push({ ray: `${g.id}+`, u: g.d, room: g.hi - t })
      if (t > g.lo + SAME) all.push({ ray: `${g.id}-`, u: mul(g.d, -1), room: t - g.lo })
    }
    // Lines along each other give one ray, named by the first line.
    all.sort((x, y) => idNumber(x.ray) - idNumber(y.ray) || (x.ray < y.ray ? -1 : 1))
    const rays: Ray[] = []
    for (const r of all) {
      const twin = rays.find((x) => len(sub(x.u, r.u)) < 1e-7)
      if (twin) twin.room = Math.max(twin.room, r.room)
      else rays.push(r)
    }
    rays.sort((x, y) => degOf(x.u) - degOf(y.u))
    const angles: Angle[] = []
    if (rays.length >= 2) {
      rays.forEach((r, i) => {
        const next = rays[(i + 1) % rays.length]
        const measure = (((degOf(next.u) - degOf(r.u)) % 360) + 360) % 360
        // Not a straight angle, nor a reflex angle anywhere but the center (where it's a central angle).
        if (measure < 1e-6 || Math.abs(measure - 180) < 1e-6 || (node.kind !== 'center' && measure > 180)) return
        angles.push({ key: angleKey(node.key, r.ray, next.ray), node: node.key, from: r, to: next, measure })
      })
    }
    return { node, rays, angles }
  })

  // The arcs between neighboring places on the circle, counterclockwise.
  const onCircle = nodes.filter((n) => n.onCircle).map((n) => ({ key: n.key, deg: degOf(n.at) })).sort((x, y) => x.deg - y.deg)
  const arcs: Arc[] = []
  if (onCircle.length === 1) arcs.push({ key: arcKey(onCircle[0].key, onCircle[0].key), from: onCircle[0].key, to: onCircle[0].key, start: onCircle[0].deg, sweep: 360 })
  else
    onCircle.forEach((n, i) => {
      const next = onCircle[(i + 1) % onCircle.length]
      const sweep = (((next.deg - n.deg) % 360) + 360) % 360
      if (sweep > 1e-6) arcs.push({ key: arcKey(n.key, next.key), from: n.key, to: next.key, start: n.deg, sweep })
    })

  return { where, problems, lines, nodes, corners, arcs }
}

export type Geometry = ReturnType<typeof buildGeometry>
