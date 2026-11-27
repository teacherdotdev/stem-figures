// Each placed piece as a solid in space: a convex shape (every piece is
// convex), held as the planes bounding it, plus a ball for spheres. Round
// sides are cut into ROUND flat strips, fine enough that nobody sees the
// facets; the circles drawn on the figure use the same corners, so lines lie
// exactly on the solid. From these come what drawing needs: whether a point
// is inside the shape, where a line of sight goes through it, and the lines
// a piece is drawn with.

import { applyRot, type Placed, type V3 } from './model.js'

export const ROUND = 96

/** A half-space: points p with n·p ≤ d. */
type Plane = { n: V3; d: number }
export type Solid = {
  id: string
  cut: boolean
  kind: Placed['piece']['kind']
  planes: Plane[]
  ball: { c: V3; r: number } | null
  /** Its corners in space (round ones' circles included), for its outline on the page and its size. */
  corners: V3[]
}

export const add3 = (p: V3, q: V3): V3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]]
export const sub3 = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]]
export const mul3 = (p: V3, k: number): V3 => [p[0] * k, p[1] * k, p[2] * k]
export const dot3 = (p: V3, q: V3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2]
export const cross3 = (p: V3, q: V3): V3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]
export const len3 = (p: V3) => Math.hypot(p[0], p[1], p[2])
export const unit3 = (p: V3) => mul3(p, 1 / (len3(p) || 1))

/** A piece's own-frame point in space. */
export const toSpace = (pl: Placed, p: V3): V3 => add3(applyRot(pl.rot, sub3(p, mul3(pl.ext, 0.5))), pl.center)
const dirToSpace = (pl: Placed, n: V3): V3 => applyRot(pl.rot, n)

/** The corners of a circle of the piece's own frame, level (y = `y`), round (`cx`, `cz`). */
export function ring(r: number, cx: number, y: number, cz: number): V3[] {
  return Array.from({ length: ROUND }, (_, i) => {
    const a = (i / ROUND) * 2 * Math.PI
    return [cx + r * Math.cos(a), y, cz + r * Math.sin(a)] as V3
  })
}

/** The corners of a half circle of a half cylinder's own frame, standing on the x axis at depth z, from its right end round to its left. */
export function halfRing(r: number, z: number): V3[] {
  return Array.from({ length: ROUND / 2 + 1 }, (_, i) => {
    const a = (i / (ROUND / 2)) * Math.PI
    return [r + r * Math.cos(a), r * Math.sin(a), z] as V3
  })
}

/** The plane through three points, facing away from `inside`. */
function planeThrough(a: V3, b: V3, c: V3, inside: V3): Plane {
  let n = unit3(cross3(sub3(b, a), sub3(c, a)))
  if (dot3(n, sub3(inside, a)) > 0) n = mul3(n, -1)
  return { n, d: dot3(n, a) }
}

/** The triangle of a triangular prism, in its own x–y plane. */
export function triangleOf(pl: Placed): [number, number][] {
  const [b, h] = [pl.ext[0], pl.ext[1]]
  return pl.piece.triangle === 'right' ? [[0, 0], [b, 0], [0, h]] : [[0, 0], [b, 0], [b / 2, h]]
}

/** The solid a placed piece fills. */
export function solidOf(pl: Placed): Solid {
  const [ex, ey, ez] = pl.ext
  const own: { planes: [V3, V3, V3][]; corners: V3[]; ball: { c: V3; r: number } | null } = { planes: [], corners: [], ball: null }
  const box = (): V3[] => [[0, 0, 0], [ex, 0, 0], [ex, ey, 0], [0, ey, 0], [0, 0, ez], [ex, 0, ez], [ex, ey, ez], [0, ey, ez]]
  const level = (y: number): [V3, V3, V3] => [[0, y, 0], [0, y, 1], [1, y, 0]]
  switch (pl.piece.kind) {
    case 'box': {
      own.corners = box()
      const c = own.corners
      own.planes = [[c[0], c[1], c[2]], [c[4], c[5], c[6]], [c[0], c[3], c[7]], [c[1], c[2], c[6]], [c[0], c[1], c[5]], [c[3], c[2], c[6]]]
      break
    }
    case 'prism': {
      const t = triangleOf(pl)
      own.corners = [...t.map(([x, y]): V3 => [x, y, 0]), ...t.map(([x, y]): V3 => [x, y, ez])]
      const c = own.corners
      own.planes = [[c[0], c[1], c[2]], [c[3], c[4], c[5]], [c[0], c[1], c[4]], [c[1], c[2], c[5]], [c[2], c[0], c[3]]]
      break
    }
    case 'cylinder': {
      const r = ex / 2
      const bottom = ring(r, r, 0, r)
      const top = ring(r, r, ey, r)
      own.corners = [...bottom, ...top]
      own.planes = [level(0), level(ey), ...bottom.map((p, i): [V3, V3, V3] => [p, bottom[(i + 1) % ROUND], top[i]])]
      break
    }
    case 'halfCylinder': {
      // Its half circles at the front and back, flat side down.
      const r = ex / 2
      const front = halfRing(r, 0)
      const back = halfRing(r, ez)
      own.corners = [...front, ...back]
      own.planes = [level(0), [[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 0, ez], [1, 0, ez], [0, 1, ez]], ...front.slice(0, -1).map((p, i): [V3, V3, V3] => [p, front[i + 1], back[i]])]
      break
    }
    case 'cone': {
      const r = ex / 2
      const bottom = ring(r, r, 0, r)
      const apex: V3 = [r, ey, r]
      own.corners = [...bottom, apex]
      own.planes = [level(0), ...bottom.map((p, i): [V3, V3, V3] => [p, bottom[(i + 1) % ROUND], apex])]
      break
    }
    case 'pyramid': {
      const apex: V3 = [ex / 2, ey, ez / 2]
      const b: V3[] = [[0, 0, 0], [ex, 0, 0], [ex, 0, ez], [0, 0, ez]]
      own.corners = [...b, apex]
      own.planes = [level(0), ...b.map((p, i): [V3, V3, V3] => [p, b[(i + 1) % 4], apex])]
      break
    }
    case 'sphere': {
      const r = ex / 2
      own.ball = { c: [r, r, r], r }
      own.corners = [...ring(r, r, r, r), [r, 0, r], [r, 2 * r, r], [r, r, 0], [r, r, 2 * r], [0, r, r], [2 * r, r, r]]
      break
    }
    case 'hemisphere': {
      const r = ex / 2
      own.ball = { c: [r, 0, r], r }
      own.planes = [level(0)]
      own.corners = [...ring(r, r, 0, r), [r, r, r], ...ring(r * Math.SQRT1_2, r, r * Math.SQRT1_2, r)]
      break
    }
  }
  const middle: V3 = mul3(pl.ext, 0.5)
  if (pl.piece.kind === 'hemisphere') middle[1] = pl.ext[1] / 3
  const planes = own.planes.map(([a, b, c]) => {
    const p = planeThrough(toSpace(pl, a), toSpace(pl, b), toSpace(pl, c), toSpace(pl, middle))
    return p
  })
  return {
    id: pl.piece.id, cut: pl.piece.cut, kind: pl.piece.kind, planes,
    ball: own.ball ? { c: toSpace(pl, own.ball.c), r: own.ball.r } : null,
    corners: own.corners.map((p) => toSpace(pl, p)),
  }
}

/** Whether a point is inside a solid, by more than `margin`. */
export function inside(s: Solid, p: V3, margin = 0): boolean {
  for (const pl of s.planes) if (dot3(pl.n, p) > pl.d - margin) return false
  if (s.ball && len3(sub3(p, s.ball.c)) > s.ball.r - margin) return false
  return true
}

/** Where the line o + t·dir runs through a solid: from t0 to t1, with the outward direction of the surface at each end; null if it misses. */
export type Span = { t0: number; t1: number; n0: V3; n1: V3 }
export function span(s: Solid, o: V3, dir: V3): Span | null {
  let t0 = -Infinity
  let t1 = Infinity
  let n0: V3 = [0, 0, 0]
  let n1: V3 = [0, 0, 0]
  for (const pl of s.planes) {
    const dn = dot3(pl.n, dir)
    const dist = pl.d - dot3(pl.n, o)
    if (Math.abs(dn) < 1e-12) {
      if (dist < 0) return null
      continue
    }
    const t = dist / dn
    if (dn > 0) {
      if (t < t1) (t1 = t), (n1 = pl.n)
    } else if (t > t0) (t0 = t), (n0 = pl.n)
  }
  if (s.ball) {
    const oc = sub3(o, s.ball.c)
    const a = dot3(dir, dir)
    const b = 2 * dot3(oc, dir)
    const c = dot3(oc, oc) - s.ball.r * s.ball.r
    const disc = b * b - 4 * a * c
    if (disc < 0) return null
    const q = Math.sqrt(disc)
    const ta = (-b - q) / (2 * a)
    const tb = (-b + q) / (2 * a)
    if (ta > t0) (t0 = ta), (n0 = unit3(sub3(add3(o, mul3(dir, ta)), s.ball.c)))
    if (tb < t1) (t1 = tb), (n1 = unit3(sub3(add3(o, mul3(dir, tb)), s.ball.c)))
  }
  return t0 < t1 ? { t0, t1, n0, n1 } : null
}

/** A line to draw on a piece, before it's known whether it shows. */
export type Feature = {
  piece: string
  /**
   * edge: a straight edge of a flat-sided piece, drawn where the surface bends there;
   * rim: a round piece's circle, drawn where the surface bends or where two kinds of piece meet;
   * outline: where a round side turns away from view, drawn wherever it's on the surface;
   * grid: a unit cube's edge across a face, drawn only where it shows.
   */
  kind: 'edge' | 'rim' | 'outline' | 'grid'
  pts: V3[]
  closed: boolean
  /** Which of its piece's lines it is, so a label can stay on it as the piece is resized. */
  index?: number
}

/** The lines a placed piece is drawn with, seen looking back along `toViewer`. */
export function featuresOf(pl: Placed, s: Solid, toViewer: V3): Feature[] {
  const id = pl.piece.id
  const out: Feature[] = []
  const edge = (a: V3, b: V3) => out.push({ piece: id, kind: 'edge', pts: [a, b], closed: false, index: out.length })
  const c = s.corners
  switch (pl.piece.kind) {
    case 'box':
      for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) edge(c[i], c[j])
      break
    case 'prism':
      for (const [i, j] of [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]]) edge(c[i], c[j])
      break
    case 'pyramid':
      for (let i = 0; i < 4; i++) edge(c[i], c[(i + 1) % 4]), edge(c[i], c[4])
      break
    case 'cylinder': {
      const bottom = c.slice(0, ROUND)
      const top = c.slice(ROUND)
      out.push({ piece: id, kind: 'rim', pts: bottom, closed: true }, { piece: id, kind: 'rim', pts: top, closed: true })
      const lift = sub3(centerOf(top), centerOf(bottom))
      for (const p of tangentPoints(bottom, unit3(lift), toViewer)) out.push({ piece: id, kind: 'outline', pts: [p, add3(p, lift)], closed: false })
      break
    }
    case 'halfCylinder': {
      const n = ROUND / 2 + 1
      const front = c.slice(0, n)
      const back = c.slice(n)
      // The flat face's long edges and its ends, then the half circles.
      edge(front[0], back[0])
      edge(front[n - 1], back[n - 1])
      edge(front[0], front[n - 1])
      edge(back[0], back[n - 1])
      out.push({ piece: id, kind: 'rim', pts: front, closed: false }, { piece: id, kind: 'rim', pts: back, closed: false })
      // Where the curved side turns away from view, on the true half circle.
      const along = sub3(back[0], front[0])
      const cf = mul3(add3(front[0], front[n - 1]), 0.5)
      const r = len3(sub3(front[0], cf))
      const side = cross3(unit3(along), toViewer)
      if (len3(side) > 1e-9) for (const sgn of [1, -1]) out.push({ piece: id, kind: 'outline', pts: [add3(cf, mul3(unit3(side), sgn * r)), add3(add3(cf, mul3(unit3(side), sgn * r)), along)], closed: false })
      break
    }
    case 'cone': {
      const bottom = c.slice(0, ROUND)
      const apex = c[ROUND]
      out.push({ piece: id, kind: 'rim', pts: bottom, closed: true })
      for (const p of coneTangents(bottom, apex, toViewer)) out.push({ piece: id, kind: 'outline', pts: [p, apex], closed: false })
      break
    }
    case 'sphere':
    case 'hemisphere': {
      const ball = s.ball!
      // A hemisphere's flat face's rim; a sphere's equator, drawn as textbooks do wherever it's on the surface.
      out.push({ piece: id, kind: pl.piece.kind === 'hemisphere' ? 'rim' : 'outline', pts: c.slice(0, ROUND), closed: true })
      // The outline: the great circle square to the line of sight.
      const v = unit3(toViewer)
      const e1 = unit3(Math.abs(v[1]) < 0.9 ? cross3(v, [0, 1, 0]) : cross3(v, [1, 0, 0]))
      const e2 = cross3(v, e1)
      const pts = Array.from({ length: ROUND * 2 }, (_, i) => {
        const a = (i / (ROUND * 2)) * 2 * Math.PI
        return add3(ball.c, add3(mul3(e1, ball.r * Math.cos(a)), mul3(e2, ball.r * Math.sin(a))))
      })
      out.push({ piece: id, kind: 'outline', pts, closed: true })
      break
    }
  }
  return out
}

export const centerOf = (pts: V3[]) => mul3(pts.reduce((t, p) => add3(t, p), [0, 0, 0] as V3), 1 / pts.length)

/** The two points of a ring's true circle where a round side running along `axis` turns away from view. */
function tangentPoints(ringPts: V3[], axis: V3, toViewer: V3): V3[] {
  const side = cross3(axis, toViewer)
  if (len3(side) < 1e-9) return []
  const c = centerOf(ringPts)
  const r = len3(sub3(ringPts[0], c))
  const u = unit3(side)
  return [add3(c, mul3(u, r)), sub3(c, mul3(u, r))]
}

/** The two points of a cone's base circle its sides seen edge-on run from, if its tip shows outside its base. */
function coneTangents(base: V3[], apex: V3, toViewer: V3): V3[] {
  const c = centerOf(base)
  const axis = unit3(sub3(apex, c))
  const r = len3(sub3(base[0], c))
  const va = dot3(toViewer, axis)
  if (Math.abs(va) < 1e-12) return tangentPoints(base, axis, toViewer)
  // The tip, slid along the line of sight into the base's plane.
  const foot = sub3(apex, mul3(toViewer, dot3(sub3(apex, c), axis) / va))
  const out = sub3(foot, c)
  const d = len3(out)
  if (d <= r * 1.0001) return []
  const u = mul3(out, 1 / d)
  const w = cross3(axis, u)
  const ca = r / d
  const sa = Math.sqrt(1 - ca * ca)
  return [add3(c, mul3(add3(mul3(u, ca), mul3(w, sa)), r)), add3(c, mul3(sub3(mul3(u, ca), mul3(w, sa)), r))]
}
