// The enclosed areas of a circle figure: every region the circle and the
// lines close off, such as a sector between two radii, a segment between a
// chord and the circle, a triangle of chords, or the pieces where chords
// cross. Each can be shaded.
//
// The figure is a set of edges (each line cut at every place on it, and the
// circle cut at every place on it) meeting at vertices. Lines' loose ends
// close nothing off, so they're trimmed away first. Walking round each
// vertex, always taking the next edge clockwise from the one arrived on,
// traces each area counterclockwise; the one walk that goes clockwise, round
// the outside of the whole figure, is left out.
//
// An area is named by the edges round it, sorted: a line's id for a piece of
// that line, an arc's key for a piece of the circle, so "l1+l2+p1~p2" is the
// sector between the radii l1 and l2 and the arc from p1 to p2. Its shading
// stays with it while points move, until a line cuts across it.

import { add, cross, dot, mul, perp, r1, sub, type Vec } from '$lib/shapes/vec.js'
import { degOf, type Geometry } from './geometry.js'

const SAME = 1e-6
const RAD = Math.PI / 180

/** A piece of a line, or of the circle from one place counterclockwise to the next (`sweep` degrees). */
type Edge = { from: string; to: string; part: string } & ({ arc: false } | { arc: true; sweep: number })
/** An edge walked one way: forward from `from` to `to`, or back. */
type Half = { edge: number; forward: boolean }

export type Face = {
  key: string
  /** The places round it, in order, and the edges between them, walked counterclockwise. */
  corners: string[]
  /** Its area, in the figure's units (the circle's radius is 1), and the part of it that's a multiple of π. */
  area: number
  pi: number
  /** The arcs round it, as degrees each. */
  arcs: number[]
  /** Its outline, on the page, from `place` (figure units to page units). */
  path: (place: (p: Vec) => Vec, R: number) => string
  /** A point in it, in the figure's units, where its popup opens. */
  inside: Vec
}

export function findFaces(geo: Pick<Geometry, 'nodes' | 'lines' | 'arcs'>): Face[] {
  const where = new Map<string, Vec>(geo.nodes.map((n) => [n.key, n.at]))
  const edges: Edge[] = []

  // Each line, cut at every place on it, from its drawn start to its drawn end.
  for (const g of geo.lines) {
    const stops = geo.nodes
      .map((n) => ({ key: n.key, t: dot(sub(n.at, g.P), g.d), off: Math.abs(cross(g.d, sub(n.at, g.P))) }))
      .filter((x) => x.off < SAME && x.t > g.lo - SAME && x.t < g.hi + SAME)
    if (!stops.some((x) => Math.abs(x.t - g.lo) < SAME)) {
      where.set(`${g.id}:lo`, add(g.P, mul(g.d, g.lo)))
      stops.push({ key: `${g.id}:lo`, t: g.lo, off: 0 })
    }
    if (!stops.some((x) => Math.abs(x.t - g.hi) < SAME)) {
      where.set(`${g.id}:hi`, add(g.P, mul(g.d, g.hi)))
      stops.push({ key: `${g.id}:hi`, t: g.hi, off: 0 })
    }
    stops.sort((x, y) => x.t - y.t)
    for (let i = 1; i < stops.length; i++) {
      const [a, b] = [stops[i - 1].key, stops[i].key]
      // Lines along each other make one edge, named by the first.
      if (a !== b && !edges.some((e) => !e.arc && ((e.from === a && e.to === b) || (e.from === b && e.to === a)))) edges.push({ from: a, to: b, part: g.id, arc: false })
    }
  }
  // The circle, cut at every place on it; with no place on it, the whole circle is one area.
  if (!geo.arcs.length) {
    return [{
      key: 'c', corners: [], area: Math.PI, pi: 1, arcs: [360], inside: [0, 0],
      path: (to, R) => {
        const [a, b] = [to([1, 0]).map(r1), to([-1, 0]).map(r1)]
        return `M${a[0]},${a[1]} A${R},${R} 0 1 0 ${b[0]},${b[1]} A${R},${R} 0 1 0 ${a[0]},${a[1]} Z`
      },
    }]
  }
  for (const a of geo.arcs) edges.push({ from: a.from, to: a.to, part: a.key, arc: true, sweep: a.sweep })

  // Loose ends close nothing off: trim them, and what's left loose, away.
  let live = edges.map(() => true)
  for (let changed = true; changed; ) {
    changed = false
    const degree = new Map<string, number>()
    edges.forEach((e, i) => live[i] && [e.from, e.to].forEach((v) => degree.set(v, (degree.get(v) ?? 0) + 1)))
    edges.forEach((e, i) => {
      if (live[i] && e.from !== e.to && (degree.get(e.from) === 1 || degree.get(e.to) === 1)) {
        live[i] = false
        changed = true
      }
    })
  }

  const start = (h: Half) => (h.forward ? edges[h.edge].from : edges[h.edge].to)
  const end = (h: Half) => (h.forward ? edges[h.edge].to : edges[h.edge].from)
  /** Which way a half sets off, and which way it bends (left +1, right −1), to order the edges round a vertex. */
  function heading(h: Half): [number, number] {
    const e = edges[h.edge]
    if (!e.arc) return [degOf(sub(where.get(end(h))!, where.get(start(h))!)), 0]
    const p = where.get(start(h))!
    return h.forward ? [degOf(perp(p)), 1] : [degOf(mul(perp(p), -1)), -1]
  }
  // Each vertex's halves setting off from it, counterclockwise; a bend to the left comes after going straight the same way.
  const around = new Map<string, Half[]>()
  edges.forEach((e, i) => {
    if (!live[i]) return
    for (const forward of [true, false]) {
      const h = { edge: i, forward }
      if (!around.has(start(h))) around.set(start(h), [])
      around.get(start(h))!.push(h)
    }
  })
  for (const list of around.values()) {
    list.sort((x, y) => {
      const [a, b] = [heading(x), heading(y)]
      const gap = a[0] - b[0]
      return Math.abs(gap) > 1e-7 && Math.abs(Math.abs(gap) - 360) > 1e-7 ? gap : a[1] - b[1]
    })
  }

  const done = new Set<string>()
  const id = (h: Half) => `${h.edge}${h.forward ? '+' : '-'}`
  const faces: Face[] = []
  for (const first of [...around.values()].flat()) {
    if (done.has(id(first))) continue
    const walk: Half[] = []
    let h = first
    while (!done.has(id(h))) {
      done.add(id(h))
      walk.push(h)
      // Next: the half leaving where this one ends, just clockwise of the way back.
      const list = around.get(end(h))!
      const back = list.findIndex((x) => x.edge === h.edge && x.forward !== h.forward)
      h = list[(back - 1 + list.length) % list.length]
    }
    // Its area: the straight edges' shoelace, and for each arc the wedge it sweeps round the center.
    let straight = 0
    let pi = 0
    const arcs: number[] = []
    for (const w of walk) {
      const e = edges[w.edge]
      if (e.arc) {
        const sweep = w.forward ? e.sweep : -e.sweep
        pi += sweep / 360
        arcs.push(e.sweep)
      } else straight += cross(where.get(start(w))!, where.get(end(w))!) / 2
    }
    const area = straight + pi * Math.PI
    if (area < 1e-9) continue
    const key = walk.map((w) => edges[w.edge].part).sort().join('+')
    const corners = walk.map(start)
    // A point inside: the middle of its outline, arcs followed round.
    const ring: Vec[] = walk.flatMap((w) => {
      const e = edges[w.edge]
      const p = where.get(start(w))!
      if (!e.arc) return [p]
      const from = degOf(p)
      const n = Math.max(2, Math.ceil(e.sweep / 10))
      return Array.from({ length: n }, (_, i) => {
        const deg = from + ((w.forward ? 1 : -1) * e.sweep * i) / n
        return [Math.cos(deg * RAD), Math.sin(deg * RAD)] as Vec
      })
    })
    faces.push({
      key, corners, area, pi, arcs, inside: centroid(ring),
      path: (to, R) => {
        const place = (p: Vec) => to(p).map(r1) as Vec
        const p0 = place(where.get(start(walk[0]))!)
        let d = `M${p0[0]},${p0[1]}`
        for (const w of walk) {
          const e = edges[w.edge]
          const q = place(where.get(end(w))!)
          if (!e.arc) d += ` L${q[0]},${q[1]}`
          else if (e.sweep >= 360 - 1e-9) {
            // A whole circle in two halves, the way the walk goes round it.
            const m = place(mul(where.get(start(w))!, -1))
            const flag = w.forward ? 0 : 1
            d += ` A${R},${R} 0 1 ${flag} ${m[0]},${m[1]} A${R},${R} 0 1 ${flag} ${q[0]},${q[1]}`
          } else d += ` A${R},${R} 0 ${e.sweep > 180 ? 1 : 0} ${w.forward ? 0 : 1} ${q[0]},${q[1]}`
        }
        return `${d} Z`
      },
    })
  }
  return faces
}

/** The middle of an outline's area, or of its corners when it has none. */
function centroid(ring: Vec[]): Vec {
  let [a, x, y] = [0, 0, 0]
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length]
    const k = cross(p, q)
    a += k
    x += (p[0] + q[0]) * k
    y += (p[1] + q[1]) * k
  })
  if (Math.abs(a) < 1e-12) return mul(ring.reduce((s, p) => add(s, p), [0, 0] as Vec), 1 / ring.length)
  return [x / (3 * a), y / (3 * a)]
}
