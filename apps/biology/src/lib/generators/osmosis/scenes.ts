// Where everything in one picture of a scene goes, at its start or as it
// ends: the outlines drawn (a cell, a beaker, a U-tube, a bag), the regions
// its particles are scattered into on each side, where arrows cross the
// membrane, and what the part labels point at. Each picture is PANEL_W ×
// PANEL_H. Curves are kept as polygons of many short sides, since the
// particles need them as regions anyway; all plain numbers, so the server
// draws what the browser will.

import type { Region } from '$shared/particles/layout'
import { blob, sample, type Pt } from '../cell-diagram/shapes'
import type { Outcome } from './model'
import type { Scene } from './settings'

export const PANEL_W = 320
export const PANEL_H = 260

/** A piece of one side, for scattering its particles into. */
export interface Part {
  region: Region
  holes: Region[]
}

/** Where an arrow crosses the membrane: from a point on the inside (or side
 *  A) to one on the outside (or side B). */
export interface Crossing {
  inner: Pt
  outer: Pt
}

export type PartKey = 'membrane' | 'wall' | 'vacuole'

export type Drawing =
  | { kind: 'blood'; box: string; cell: string; pale?: { cx: number; cy: number; r: number }; torn: string[]; bits: string[] }
  | {
      kind: 'plant'
      box: string
      wall: string
      membrane: string
      vacuole: string
      nucleus: { cx: number; cy: number; r: number }
      chloroplasts: { cx: number; cy: number; angle: number }[]
      /** the solution between the wall and a plasmolyzed cell's membrane */
      gap?: string
    }
  | { kind: 'beaker'; walls: string; liquidA: string; liquidB: string; surfaces: [Pt, Pt][]; membrane: [Pt, Pt] }
  | { kind: 'utube'; outer: string; inner: string; liquidA: string; liquidB: string; surfaces: [Pt, Pt][]; membrane: [Pt, Pt] }
  | { kind: 'bag'; walls: string; liquid: string; surfaces: [Pt, Pt][]; bag: string; knot: string; string: [Pt, Pt]; rod: [Pt, Pt] }

export interface SceneShape {
  drawing: Drawing
  /** the inside (cell, vacuole or bag) or side A, then the outside or side B */
  inside: Part[]
  outside: Part[]
  /** water arrows cross at the first two; solute arrows at the rest */
  crossings: Crossing[]
  /** what each part label points at */
  anchors: { key: PartKey; at: Pt }[]
  /** for a membrane labeled from above, where its leader ends */
  membraneTop?: Pt
  /** the middle of each side across the picture, for the words over and under it */
  sideX: [number, number]
}

const r1 = (n: number) => Math.round(n * 10) / 10
const round3 = (n: number) => Math.round(n * 1000) / 1000

/** A polygon as path data. */
export const pathOf = (points: Pt[], closed = true) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'} ${r1(x)} ${r1(y)}`).join(' ') + (closed ? ' Z' : '')

const regionOf = (points: Pt[]): Region => points.map(([x, y]) => ({ x: round3(x), y: round3(y) }))

/** A circle, or a wavy one, as `n` points: its radius at each angle from `radius`. */
function around(cx: number, cy: number, radius: (a: number) => number, n = 120): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    const r = radius(a)
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
}

/** A rounded rectangle as points, its corners `rc` round. */
function roundedRect(x: number, y: number, w: number, h: number, rc: number, per = 8): Pt[] {
  const corner = (cx: number, cy: number, from: number): Pt[] =>
    Array.from({ length: per + 1 }, (_, i) => {
      const a = ((from + (90 * i) / per) * Math.PI) / 180
      return [cx + rc * Math.cos(a), cy + rc * Math.sin(a)]
    })
  return [
    ...corner(x + w - rc, y + rc, -90),
    ...corner(x + w - rc, y + h - rc, 0),
    ...corner(x + rc, y + h - rc, 90),
    ...corner(x + rc, y + rc, 180),
  ]
}

/** Where a ray from `c` at `angle` degrees leaves a polygon around `c`. */
function rayHit(points: Pt[], c: Pt, angle: number): Pt {
  const dx = Math.cos((angle * Math.PI) / 180)
  const dy = Math.sin((angle * Math.PI) / 180)
  let best = Infinity
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j]
    const [bx, by] = points[i]
    const ex = bx - ax
    const ey = by - ay
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-12) continue
    const t = ((ax - c[0]) * ey - (ay - c[1]) * ex) / den
    const u = ((ax - c[0]) * dy - (ay - c[1]) * dx) / den
    if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t)
  }
  return [c[0] + best * dx, c[1] + best * dy]
}

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/** The solution's box around a cell. */
const BOX = roundedRect(8, 8, PANEL_W - 16, PANEL_H - 16, 16)

// A red blood cell -----------------------------------------------------------

const CX = PANEL_W / 2
const CY = PANEL_H / 2

function bloodCell(outcome: Outcome | 'start'): SceneShape {
  const crenated = outcome === 'crenated'
  const big = outcome === 'swollen' || outcome === 'burst'
  const R = crenated ? 60 : big ? 94 : 76
  // A crenated cell's edge is studded with short, round-tipped spikes.
  const BUMPS = 14
  const spike = (a: number) => R + 9 * ((1 + Math.cos(BUMPS * a)) / 2) ** 3
  const outline = around(CX, CY, crenated ? spike : () => R, crenated ? 280 : 120)
  const reach = crenated ? R + 9 : R

  const torn: string[] = []
  const bits: string[] = []
  if (outcome === 'burst') {
    // The membrane split in three places, its torn ends curling outward,
    // with scraps of it drifting off.
    const gaps = [25, 150, 265]
    const GAP = 26
    gaps.forEach((g, i) => {
      const from = g + GAP / 2
      const to = (gaps[(i + 1) % gaps.length] + (i + 1 === gaps.length ? 360 : 0)) - GAP / 2
      const pts: Pt[] = []
      for (let a = from; a <= to; a += 3) pts.push([CX + R * Math.cos((a * Math.PI) / 180), CY + R * Math.sin((a * Math.PI) / 180)])
      const flick = (a: number): Pt => [CX + (R + 7) * Math.cos((a * Math.PI) / 180), CY + (R + 7) * Math.sin((a * Math.PI) / 180)]
      torn.push(pathOf([flick(from - 3), ...pts, flick(to + 3)], false))
      const mid = g
      const at = (r: number, d: number): Pt => [CX + r * Math.cos(((mid + d) * Math.PI) / 180), CY + r * Math.sin(((mid + d) * Math.PI) / 180)]
      bits.push(pathOf([at(R + 18, -5), at(R + 21, 0), at(R + 18, 5)], false))
    })
  }

  const side = (a: number, d: number): Crossing => {
    const ux = Math.cos((a * Math.PI) / 180)
    const uy = Math.sin((a * Math.PI) / 180)
    return { inner: [CX + (R - d) * ux, CY + (R - d) * uy], outer: [CX + (reach + d) * ux, CY + (reach + d) * uy] }
  }
  return {
    drawing: {
      kind: 'blood',
      box: pathOf(BOX),
      cell: pathOf(outline),
      // A normal or crenated cell is a biconcave disc, pale in the middle;
      // a swollen one has rounded out into a sphere.
      pale: big ? undefined : { cx: CX, cy: CY, r: R * 0.42 },
      torn,
      bits,
    },
    inside: [{ region: regionOf(around(CX, CY, () => R, 120)), holes: [] }],
    outside: [{ region: regionOf(BOX), holes: [regionOf(crenated ? around(CX, CY, () => reach, 120) : outline)] }],
    crossings: [side(180, 26), side(0, 26), side(-90, 24), side(90, 24), side(225, 24)],
    anchors: [{ key: 'membrane', at: [CX + R * Math.cos((215 * Math.PI) / 180), CY + R * Math.sin((215 * Math.PI) / 180)] }],
    sideX: [PANEL_W / 4, (3 * PANEL_W) / 4],
  }
}

// A plant cell ---------------------------------------------------------------

const WALL = 9
/** How a plasmolyzed cell's membrane wobbles as it pulls away from the wall. */
const SHRUNK = [0.02, -0.03, 0.04, 0.0, -0.02, 0.03, -0.01, 0.03, -0.03, 0.01]

function plantCell(outcome: Outcome | 'start'): SceneShape {
  const turgid = outcome === 'turgid'
  const plasmolyzed = outcome === 'plasmolyzed'
  // A turgid cell presses out on its wall, which rounds a little.
  const W = turgid ? 208 : 200
  const H = turgid ? 146 : 138
  const x = CX - W / 2
  const y = CY - H / 2
  const wallOuter = roundedRect(x, y, W, H, turgid ? 30 : 20)
  const wallInner = roundedRect(x + WALL, y + WALL, W - 2 * WALL, H - 2 * WALL, (turgid ? 30 : 20) - WALL * 0.6)

  let membrane: Pt[]
  let vacuole: Pt[]
  const c: Pt = [CX, CY]
  if (plasmolyzed) {
    // The membrane and cytoplasm pull away from the wall into a rounded
    // shape, and the vacuole shrinks inside it.
    membrane = sample(blob(CX, CY + 2, 62, 38, SHRUNK), true, 12)
    vacuole = sample(blob(CX + 8, CY + 2, 40, 22, SHRUNK.map((w) => w * 0.6)), true, 12)
  } else {
    membrane = roundedRect(x + WALL + 1.5, y + WALL + 1.5, W - 2 * WALL - 3, H - 2 * WALL - 3, 14)
    // Room on the left for the nucleus; a turgid cell's vacuole is bigger,
    // pressing the cytoplasm into a thin layer.
    const [left, edge] = turgid ? [34, 9] : [44, 18]
    const mx = x + WALL + 1.5
    const my = y + WALL + 1.5
    const mw = W - 2 * WALL - 3
    const mh = H - 2 * WALL - 3
    vacuole = roundedRect(mx + left, my + edge, mw - left - edge, mh - 2 * edge, 18)
  }

  // The nucleus in the thick cytoplasm on the left, and chloroplasts round the rest.
  const band = (angle: number) => {
    const m = rayHit(membrane, c, angle)
    const v = rayHit(vacuole, c, angle)
    return { mid: lerp(m, v, 0.5), width: Math.hypot(m[0] - v[0], m[1] - v[1]) }
  }
  const n = band(205)
  const nucleus = { cx: n.mid[0], cy: n.mid[1], r: Math.max(6, Math.min(12, n.width / 2 - 3)) }
  const chloroplasts = [-60, -115, 62, 118, 25]
    .map((a) => ({ a, ...band(a) }))
    .filter((b) => b.width >= 10)
    .map((b) => ({ cx: b.mid[0], cy: b.mid[1], angle: b.a + 90 }))

  const inner = (a: number, d: number, from: Pt[]) => {
    const p = rayHit(from, c, a)
    const ux = Math.cos((a * Math.PI) / 180)
    const uy = Math.sin((a * Math.PI) / 180)
    return [p[0] - d * ux, p[1] - d * uy] as Pt
  }
  const outer = (a: number, d: number) => {
    const p = rayHit(wallOuter, c, a)
    return [p[0] + d * Math.cos((a * Math.PI) / 180), p[1] + d * Math.sin((a * Math.PI) / 180)] as Pt
  }
  // Water crosses the membrane and the wall; the arrow starts in the cytoplasm.
  const crossing = (a: number): Crossing => ({ inner: inner(a, 16, membrane), outer: outer(a, 20) })

  const outside: Part[] = [{ region: regionOf(BOX), holes: [regionOf(wallOuter)] }]
  if (plasmolyzed) outside.push({ region: regionOf(wallInner), holes: [regionOf(membrane)] })

  return {
    drawing: {
      kind: 'plant',
      box: pathOf(BOX),
      wall: `${pathOf(wallOuter)} ${pathOf([...wallInner].reverse())}`,
      membrane: pathOf(membrane),
      vacuole: pathOf(vacuole),
      nucleus,
      chloroplasts,
      gap: plasmolyzed ? `${pathOf(wallInner)} ${pathOf([...membrane].reverse())}` : undefined,
    },
    inside: [{ region: regionOf(vacuole), holes: [] }],
    outside,
    crossings: [crossing(180), crossing(0), crossing(-90), crossing(90), crossing(30)],
    anchors: [
      { key: 'wall', at: lerp(rayHit(wallOuter, c, -150), rayHit(wallInner, c, -150), 0.5) },
      { key: 'membrane', at: rayHit(membrane, c, 128) },
      { key: 'vacuole', at: inner(158, 8, vacuole) },
    ],
    sideX: [PANEL_W / 4, (3 * PANEL_W) / 4],
  }
}

// Two solutions either side of a membrane -----------------------------------

/** How far the levels move apart: more the more the sides differ. */
const levelShift = (outcome: Outcome | 'start', strength: number) =>
  outcome === 'rises-a' || outcome === 'rises-b' ? (outcome === 'rises-a' ? -1 : 1) * (22 + 40 * strength) : 0

function splitBeaker(outcome: Outcome | 'start', strength: number): SceneShape {
  const [L, R, TOP, BOTTOM, MID] = [28, 292, 22, 248, PANEL_W / 2]
  const LEVEL = 96
  const shift = levelShift(outcome, strength)
  const yA = LEVEL + shift / 2
  const yB = LEVEL - shift / 2
  const half = 1.5
  const liquidA: Pt[] = [[L + half, yA], [MID - half, yA], [MID - half, BOTTOM - half], [L + half, BOTTOM - half]]
  const liquidB: Pt[] = [[MID + half, yB], [R - half, yB], [R - half, BOTTOM - half], [MID + half, BOTTOM - half]]
  const deep = Math.max(yA, yB)
  const at = (t: number): Crossing => {
    const y = deep + t * (BOTTOM - deep)
    return { inner: [MID - 30, y], outer: [MID + 30, y] }
  }
  return {
    drawing: {
      kind: 'beaker',
      walls: `M ${L - 7} ${TOP} Q ${L} ${TOP} ${L} ${TOP + 8} V ${BOTTOM} H ${R} V ${TOP + 8} Q ${R} ${TOP} ${R + 7} ${TOP}`,
      liquidA: pathOf(liquidA),
      liquidB: pathOf(liquidB),
      surfaces: [[[L, yA], [MID, yA]], [[MID, yB], [R, yB]]],
      membrane: [[MID, TOP - 8], [MID, BOTTOM]],
    },
    inside: [{ region: regionOf(liquidA), holes: [] }],
    outside: [{ region: regionOf(liquidB), holes: [] }],
    crossings: [at(0.36), at(0.36), at(0.66), at(0.87), at(0.16)],
    anchors: [],
    membraneTop: [MID, TOP - 8],
    sideX: [(L + MID) / 2, (MID + R) / 2],
  }
}

function uTube(outcome: Outcome | 'start', strength: number): SceneShape {
  const [R, r, BY, TOP] = [112, 16, 140, 12]
  const LEVEL = 66
  const shift = levelShift(outcome, strength)
  const yA = LEVEL + shift / 2
  const yB = LEVEL - shift / 2
  const half = 1.5
  const arc = (radius: number, from: number, to: number): Pt[] =>
    Array.from({ length: 19 }, (_, i) => {
      const a = ((from + ((to - from) * i) / 18) * Math.PI) / 180
      return [CX + radius * Math.cos(a), BY + radius * Math.sin(a)]
    })
  // Each side runs down its arm and round half the bend to the membrane.
  const liquidA: Pt[] = [[CX - R + half, yA], ...arc(R - half, 180, 90), ...arc(r + half, 90, 180), [CX - r - half, yA]]
  const liquidB: Pt[] = [[CX + r + half, yB], ...arc(r + half, 0, 90), ...arc(R - half, 90, 0), [CX + R - half, yB]]
  const at = (t: number): Crossing => {
    const y = BY + r + t * (R - r)
    return { inner: [CX - 26, y], outer: [CX + 26, y] }
  }
  return {
    drawing: {
      kind: 'utube',
      outer: `M ${CX - R} ${TOP} V ${BY} A ${R} ${R} 0 0 0 ${CX + R} ${BY} V ${TOP}`,
      inner: `M ${CX - r} ${TOP} V ${BY} A ${r} ${r} 0 0 0 ${CX + r} ${BY} V ${TOP}`,
      liquidA: pathOf(liquidA),
      liquidB: pathOf(liquidB),
      surfaces: [[[CX - R, yA], [CX - r, yA]], [[CX + r, yB], [CX + R, yB]]],
      membrane: [[CX, BY + r - 4], [CX, BY + R + 4]],
    },
    inside: [{ region: regionOf(liquidA), holes: [] }],
    outside: [{ region: regionOf(liquidB), holes: [] }],
    crossings: [at(0.3), at(0.3), at(0.7), at(0.5)],
    anchors: [],
    membraneTop: [CX, BY + r - 4],
    sideX: [CX - (R + r) / 2, CX + (R + r) / 2],
  }
}

// A dialysis-tubing bag in a beaker ------------------------------------------

function bag(outcome: Outcome | 'start'): SceneShape {
  const [L, R, TOP, BOTTOM, LEVEL] = [24, 296, 30, 250, 78]
  const w = outcome === 'swells' ? 158 : outcome === 'shrinks' ? 92 : 124
  const [top, bottom] = [100, 234]
  // Tubing tied at the neck, filled out into a long bag with a rounded
  // bottom; a shrunken bag's tubing goes slack and wrinkles.
  const slack = outcome === 'shrinks' ? 6 : 0
  const across = (k: number) => w / 2 + (k % 2 ? slack : -slack)
  const down = [top + 22, top + 52, top + 82, bottom - 26]
  const ring: Pt[] = [
    [CX - 5, 62], [CX + 5, 62], [CX + 12, 78],
    [CX + w / 2 - 8, top],
    ...down.map((y, k): Pt => [CX + across(k), y]),
    [CX + w * 0.3, bottom], [CX - w * 0.3, bottom],
    ...down.map((y, k): Pt => [CX - across(k), y]).reverse(),
    [CX - w / 2 + 8, top],
    [CX - 12, 78],
  ]
  const outline = sample(ring, true, 10)
  // The bag's contents, below its tied neck.
  const contents = outline.filter(([, y]) => y >= LEVEL + 10)
  const half = 1.5
  const liquid: Pt[] = [[L + half, LEVEL], [R - half, LEVEL], [R - half, BOTTOM - half], [L + half, BOTTOM - half]]
  const side = (y: number, dir: 1 | -1, d = 24): Crossing => {
    const p = rayHit(outline, [CX, y], dir > 0 ? 0 : 180)
    return { inner: [p[0] - dir * d, y], outer: [p[0] + dir * (d - 2), y] }
  }
  return {
    drawing: {
      kind: 'bag',
      walls: `M ${L - 7} ${TOP} Q ${L} ${TOP} ${L} ${TOP + 8} V ${BOTTOM} H ${R} V ${TOP + 8} Q ${R} ${TOP} ${R + 7} ${TOP}`,
      liquid: pathOf(liquid),
      surfaces: [[[L, LEVEL], [R, LEVEL]]],
      bag: pathOf(outline),
      knot: `M ${CX - 8} 56 Q ${CX} 50 ${CX + 8} 56 Q ${CX} 62 ${CX - 8} 56 Z`,
      string: [[CX, 52], [CX, 16]],
      rod: [[L - 14, 16], [R + 14, 16]],
    },
    inside: [{ region: regionOf(contents), holes: [] }],
    outside: [{ region: regionOf(liquid), holes: [regionOf(outline)] }],
    crossings: [side(140, -1), side(140, 1), side(198, 1), side(198, -1), side(116, 1)],
    anchors: [{ key: 'membrane', at: rayHit(outline, [CX, 176], 180) }],
    sideX: [PANEL_W / 4, (3 * PANEL_W) / 4],
  }
}

/** One picture of a scene: at its start, or as it ends. `strength` (0 to 1)
 *  is how strongly the sides differ, for how far the levels move. */
export function sceneShape(scene: Scene, outcome: Outcome | 'start', strength = 0): SceneShape {
  if (scene === 'blood') return bloodCell(outcome)
  if (scene === 'plant') return plantCell(outcome)
  if (scene === 'beaker') return splitBeaker(outcome, strength)
  if (scene === 'utube') return uTube(outcome, strength)
  return bag(outcome)
}
