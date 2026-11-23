// A VSEPR figure laid out on the page: the shape turned to the teacher's
// view and projected, as pieces drawn back to front (atoms, bonds, lone
// pairs), then the bond angle arcs, brackets and the lines under it. Pure
// numbers, so the Svelte component only draws them.

import { ELEMENTS } from '../lewis-structures/elements'
import { textWidth } from '../lewis-structures/drawing'
import { chargeText } from '../lewis-structures/formula'
import type { Structure } from '../lewis-structures/structure'
import type { Vec, VseprShape } from './shape'
import { angleLabels, asking, labelLines, type VseprSettings } from './settings'

export const SYMBOL_FONT = 18
export const ANGLE_FONT = 15
export const LINE_FONT = 17
const LINE_H = 26
const DOT_GAP = 3.6

/** A bond that leaves the page by more than this (as the sine of its angle
 *  to the page) is a wedge or a dash. */
export const OUT_OF_PAGE = 0.42

export type Point = [number, number]

export type Piece =
  | {
      kind: 'atom'; z: number; x: number; y: number; r: number; element: string; central: boolean
      /** how far toward the viewer, from -1 (straight back) to 1, for fading the far ones */
      near: number
    }
  | { kind: 'bond'; z: number; from: Point; to: Point; order: number; depth: 'plane' | 'wedge' | 'dash'; width: number; balls?: [number, number, number][]
      /** ball-and-stick: how big the stick is drawn at each end, so one going back narrows, and how near each end is (-1 to 1) */
      ends?: { size: [number, number]; near: [number, number] }
    }
  | {
      /** a balloon, pointed at the central atom: its tip on the atom, its
       *  length and half-width as seen, and its round end's middle (x, y) with
       *  half its length (rx) and its half-width (ry) for keeping labels off it */
      kind: 'lobe'; z: number; tip: Point; length: number; x: number; y: number; rx: number; ry: number; angle: number; dots: Point[]
    }
  | { kind: 'dots'; z: number; dots: Point[] }

export interface Arc {
  path: string
  label: string
  at: Point
}

export interface Layout {
  width: number
  height: number
  pieces: Piece[]
  arcs: Arc[]
  brackets?: { left: number; right: number; top: number; bottom: number; charge: string }
  lines: { text: string; y: number }[]
  key: string[]
  /** where the drawing's middle is, for turning it by dragging */
  center: Point
}

interface Look {
  bond: number
  /** drawn as textbooks do, with a bond that leaves the page kept nearly
   *  full length rather than foreshortened */
  schematic: boolean
  radius: (element: string, central: boolean) => number
  /** a little perspective, so farther atoms look smaller */
  perspective: number
}

const LOOKS: Record<VseprSettings['style'], Look> = {
  'wedge-and-dash': { bond: 82, schematic: true, radius: () => 17, perspective: 0 },
  'ball-and-stick': {
    bond: 96,
    schematic: false,
    radius: (el) => (el === 'H' ? 14 : ELEMENTS[el].period <= 2 ? 20 : 24),
    perspective: 1 / 380,
  },
}

const deg = Math.PI / 180

/** Turns a direction by the teacher's view: round the page's up-down axis
 *  (yaw), then tipped toward or away from the viewer (pitch). */
export function turn([x, y, z]: Vec, yaw: number, pitch: number): Vec {
  const a = yaw * deg
  const b = pitch * deg
  const x1 = x * Math.cos(a) + z * Math.sin(a)
  const z1 = -x * Math.sin(a) + z * Math.cos(a)
  return [x1, y * Math.cos(b) - z1 * Math.sin(b), y * Math.sin(b) + z1 * Math.cos(b)]
}

const scale = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k]
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = (v: Vec) => scale(v, 1 / Math.hypot(...v))
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

/** The page directions (as angles) to draw lone pairs in: each the way it
 *  points as seen, then pushed round until it is at least 40° from every bond
 *  and 60° from every other lone pair. One seen end on starts in the widest gap
 *  between the bonds. */
export function flatAngles(lone: Vec[], bonds: Vec[]): number[] {
  const GAP = 40 * deg
  const PAIR_GAP = 60 * deg
  const fixed = bonds.filter((b) => Math.hypot(b[0], b[1]) > 0.15).map((b) => Math.atan2(b[1], b[0]))
  const diff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))
  const widestGap = () => {
    const all = [...fixed].sort((a, b) => a - b)
    if (all.length === 0) return -Math.PI / 2
    let best = all[0] + Math.PI
    let size = -1
    all.forEach((a, i) => {
      const next = i + 1 < all.length ? all[i + 1] : all[0] + 2 * Math.PI
      if (next - a > size) [size, best] = [next - a, (a + next) / 2]
    })
    return best
  }
  const angles = lone.map((u, i) => (Math.hypot(u[0], u[1]) > 0.15 ? Math.atan2(u[1], u[0]) : widestGap() + i * PAIR_GAP))
  for (let round = 0; round < 60; round++) {
    angles.forEach((a, i) => {
      let push = 0
      for (const f of fixed) {
        const d = diff(a, f)
        if (Math.abs(d) < GAP) push += (d >= 0 ? 1 : -1) * (GAP - Math.abs(d))
      }
      angles.forEach((o, j) => {
        if (j === i) return
        const d = diff(a, o)
        if (Math.abs(d) < PAIR_GAP) push += (d > 0 || (d === 0 && i > j) ? 1 : -1) * ((PAIR_GAP - Math.abs(d)) / 2)
      })
      angles[i] = a + push * 0.5
    })
  }
  return angles
}

export function layoutFigure(s: VseprSettings, structure: Structure, shape: VseprShape): Layout {
  const look = LOOKS[s.style]
  const view = (v: Vec) => turn(v, s.yaw, s.pitch)
  /** A point in 3D (bond lengths from the central atom, as seen) on the page. */
  const project = (p: Vec): Point => {
    if (look.schematic) {
      // as far out as a bond 1.7 times less foreshortened, up to its full length
      const len = Math.hypot(...p)
      const m = Math.hypot(p[0], p[1])
      if (m < 1e-9) return [0, 0]
      const k = (Math.min(1, (1.7 * m) / len) * len) / m
      return [p[0] * k, p[1] * k]
    }
    const k = 1 / (1 - p[2] * look.perspective)
    return [p[0] * k, p[1] * k]
  }
  const sizeAt = (z: number) => 1 / (1 - z * look.perspective)

  const pieces: Piece[] = []
  const centralEl = structure.atoms[shape.central].element
  const rc = look.radius(centralEl, true)
  pieces.push({ kind: 'atom', z: 0, x: 0, y: 0, r: rc, element: centralEl, central: true, near: 0 })

  /** Two dots (or one) side by side across a direction, centered on a point. */
  const pairAt = (at: Point, along: Point, electrons: number): Point[] => {
    const len = Math.hypot(...along)
    const [ux, uy] = len < 0.15 ? [1, 0] : [along[0] / len, along[1] / len]
    if (electrons === 1) return [at]
    return [
      [at[0] - uy * DOT_GAP, at[1] + ux * DOT_GAP],
      [at[0] + uy * DOT_GAP, at[1] - ux * DOT_GAP],
    ]
  }

  for (const g of shape.atoms) {
    const u = view(g.dir)
    const el = structure.atoms[g.atom].element
    const centerZ = u[2] * look.bond
    const r = look.radius(el, false) * sizeAt(centerZ)
    const c = scale(u, look.bond)
    const [x, y] = project(c)
    pieces.push({ kind: 'atom', z: centerZ, x, y, r, element: el, central: false, near: u[2] })

    // Wedge-and-dash: from the central atom to the outer one, trimmed when
    // drawn. Ball-and-stick: from center to center, with both balls' discs
    // (x, y, r) masked off, so the stick joins each at its outline.
    const ball = s.style === 'ball-and-stick'
    const from = project([0, 0, 0])
    const to: Point = [x, y]
    const depth = u[2] > OUT_OF_PAGE ? 'wedge' : u[2] < -OUT_OF_PAGE ? 'dash' : 'plane'
    const balls: [number, number, number][] | undefined = ball ? [[0, 0, rc], [x, y, r]] : undefined
    const ends = ball ? { size: [sizeAt(0), sizeAt(centerZ)] as [number, number], near: [0, u[2]] as [number, number] } : undefined
    pieces.push({ kind: 'bond', z: centerZ / 2, from, to, order: g.order, depth, width: sizeAt(centerZ / 2), balls, ends })

    if (s.outerPairs) {
      // Flat on the page, as in a Lewis structure: spread round the side of
      // the atom facing away from its bond, just outside its outline, and on
      // top of it: three pairs 90° apart, at the sides and the end; two 120°
      // apart, as round a double-bonded O.
      const lone = structure.atoms[g.atom].lone
      const n = Math.ceil(lone / 2)
      const m = Math.hypot(x, y)
      const away = m < 1 ? -Math.PI / 2 : Math.atan2(y, x)
      const step = n >= 3 ? Math.PI / 2 : (2 * Math.PI) / 3
      for (let i = 0; i < n; i++) {
        const a = away + (i - (n - 1) / 2) * step
        const d: Point = [Math.cos(a), Math.sin(a)]
        const at: Point = [x + d[0] * (r + 7), y + d[1] * (r + 7)]
        const electrons = i < Math.floor(lone / 2) ? 2 : 1
        pieces.push({ kind: 'dots', z: centerZ + r + 0.5, dots: pairAt(at, d, electrons) })
      }
    }
  }

  // The central atom's lone pairs are drawn flat on the page and on top of
  // the atom, never behind it or end on, each pointing the way it does as
  // seen, fanned out so it is clear of the bonds and the other pairs.
  if (s.lonePairs !== 'none') {
    const angles = flatAngles(
      shape.lone.map((g) => view(g.dir)),
      shape.atoms.map((g) => view(g.dir)),
    )
    shape.lone.forEach((g, i) => {
      const dir: Point = [Math.cos(angles[i]), Math.sin(angles[i])]
      const z = rc + 1
      if (s.lonePairs === 'dots') {
        const at: Point = [dir[0] * (rc + 8), dir[1] * (rc + 8)]
        pieces.push({ kind: 'dots', z, dots: pairAt(at, dir, g.electrons) })
        return
      }
      // A balloon pointed at the central atom, always touching it, swelling
      // to a round end.
      const length = look.bond * 0.78
      const wide = look.bond * 0.2
      // Ball-and-stick: tucked into the ball. Wedge-and-dash: on the circle's
      // outline, the two lines (each 1.5 wide) just meeting.
      const reach = s.style === 'ball-and-stick' ? rc * 0.8 : rc + 1.5
      const tip: Point = [dir[0] * reach, dir[1] * reach]
      const at = (t: number): Point => [tip[0] + dir[0] * length * t, tip[1] + dir[1] * length * t]
      const [x, y] = at(0.66)
      pieces.push({ kind: 'lobe', z, tip, length, x, y, rx: length * 0.34, ry: wide, angle: angles[i] / deg, dots: pairAt([x, y], dir, g.electrons) })
    })
  }

  pieces.sort((a, b) => a.z - b.z)

  // Bond angle arcs: for each kind of angle, the pair of bonds it looks
  // clearest between from this view, with its label clear of the atoms,
  // lone pairs and the other labels.
  const arcs: Arc[] = []
  if (s.bondAngles) {
    const labels = angleLabels(shape, s.angles).map((l) => (asking(s) ? '____' : l))
    const radius = rc + look.bond * 0.28
    /** What a label mustn't sit on: atoms other than the central one, lone
     *  pairs and their dots, as circles, and bonds, as lines with a half-width. */
    const blockers = pieces.flatMap((p): [number, number, number][] =>
      p.kind === 'atom' && !p.central
        ? [[p.x, p.y, p.r]]
        : p.kind === 'lobe'
          ? [[p.x, p.y, (p.rx + p.ry) / 2]]
          : p.kind === 'dots'
            ? p.dots.map(([x, y]): [number, number, number] => [x, y, 4])
            : [],
    )
    const bondHalf = s.style === 'ball-and-stick' ? 7 : 6
    const bonds = pieces.flatMap((p): [Point, Point][] => (p.kind === 'bond' ? [[p.from, p.to]] : []))
    const taken: [number, number, number, number][] = []
    const hits = (box: [number, number, number, number]) => {
      const [x0, y0, x1, y1] = box
      const near = (cx: number, cy: number, r: number) => {
        const dx = Math.max(x0 - cx, 0, cx - x1)
        const dy = Math.max(y0 - cy, 0, cy - y1)
        return dx * dx + dy * dy < r * r
      }
      let n = 0
      for (const [cx, cy, r] of blockers) if (near(cx, cy, r)) n++
      for (const [a, b] of bonds) {
        const steps = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3))
        for (let t = 0; t <= steps; t++)
          if (near(a[0] + ((b[0] - a[0]) * t) / steps, a[1] + ((b[1] - a[1]) * t) / steps, bondHalf)) {
            n++
            break
          }
      }
      for (const [a0, b0, a1, b1] of taken) if (x0 < a1 && a0 < x1 && y0 < b1 && b0 < y1) n++
      return n
    }
    shape.angles.forEach((a, i) => {
      let best: { score: number; arc: Arc; box: [number, number, number, number] } | undefined
      const labelW = textWidth(labels[i], ANGLE_FONT)
      for (const [p, q] of a.pairs) {
        const u = view(shape.atoms[p].dir)
        const v = view(shape.atoms[q].dir)
        // An axis to swing round: across both bonds, or, for a straight
        // line, over or under it (across it when it points up).
        const swings: Vec[] = []
        if (dot(u, v) < -0.999) {
          const up: Vec = [0, -1, 0]
          const off = add(up, scale(u, -dot(up, u)))
          const w = Math.hypot(...off) > 0.2 ? norm(off) : norm(add([1, 0, 0], scale(u, -u[0])))
          swings.push(w, scale(w, -1))
        } else swings.push(norm(add(v, scale(u, -dot(u, v)))))
        const angle = Math.acos(Math.max(-1, Math.min(1, dot(u, v))))
        for (const w of swings) {
          const steps = 24
          const pts: Point[] = []
          for (let t = 0; t <= steps; t++) {
            const th = (angle * t) / steps
            pts.push(project(scale(add(scale(u, Math.cos(th)), scale(w, Math.sin(th))), radius)))
          }
          let seen = 0
          for (let t = 1; t < pts.length; t++) seen += Math.hypot(pts[t][0] - pts[t - 1][0], pts[t][1] - pts[t - 1][1])
          const mid = add(scale(u, Math.cos(angle / 2)), scale(w, Math.sin(angle / 2)))
          const labelDir = project(scale(mid, 1))
          const ml = Math.hypot(...labelDir) || 1
          const [lx, ly] = [labelDir[0] / ml, labelDir[1] / ml]
          const path = 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')
          // out past the arc by half the label's width or height, whichever
          // it points along, and further out if that's on something
          const edge = Math.hypot(...project(scale(mid, radius))) + 7 + Math.abs(lx) * (labelW / 2) + Math.abs(ly) * (ANGLE_FONT / 2)
          for (const [k, extra] of [0, 10, 20, 32].entries()) {
            const out = edge + extra
            const at: Point = [lx * out, ly * out + ANGLE_FONT * 0.35]
            const box: [number, number, number, number] = [at[0] - labelW / 2, at[1] - ANGLE_FONT * 0.8, at[0] + labelW / 2, at[1] + 2]
            // face-on arcs are clearest; a label on an atom, lone pair or
            // bond is worst; a label close to its arc is better than far
            const score = seen / (radius * angle) - hits(box) - k * 0.2
            if (!best || score > best.score + 1e-6) best = { score, arc: { path, label: labels[i], at }, box }
          }
        }
      }
      if (best) {
        arcs.push(best.arc)
        taken.push(best.box)
      }
    })
  }

  // How far the drawing reaches, to size the figure round it.
  let [minX, minY, maxX, maxY] = [-rc, -rc, rc, rc]
  const reach = (x: number, y: number, r = 0) => {
    minX = Math.min(minX, x - r)
    maxX = Math.max(maxX, x + r)
    minY = Math.min(minY, y - r)
    maxY = Math.max(maxY, y + r)
  }
  for (const p of pieces) {
    if (p.kind === 'atom') reach(p.x, p.y, p.r + 1)
    else if (p.kind === 'lobe') reach(p.x, p.y, Math.max(p.rx, p.ry) + 1)
    else if (p.kind === 'dots') for (const [x, y] of p.dots) reach(x, y, 3)
  }
  for (const a of arcs) {
    const w = textWidth(a.label, ANGLE_FONT) / 2
    reach(a.at[0] - w, a.at[1] - ANGLE_FONT)
    reach(a.at[0] + w, a.at[1] + 4)
  }

  const charge = structure.charge
  const PAD = 6
  const BRACKET = 14
  const chargeW = charge ? textWidth(chargeText(charge), 18) + 4 : 0
  const left = -minX + PAD + (charge ? BRACKET : 0)
  const top = -minY + PAD + (charge ? 8 : 0)
  const drawW = maxX - minX
  const drawH = maxY - minY
  const brackets = charge
    ? { left: left + minX - BRACKET + 4, right: left + maxX + BRACKET - 4, top: top + minY - 6, bottom: top + maxY + 6, charge: chargeText(charge) }
    : undefined
  const bodyW = drawW + 2 * PAD + (charge ? 2 * BRACKET + chargeW : 0)
  const bodyH = drawH + 2 * PAD + (charge ? 16 : 0)

  const { under, key } = labelLines(s, shape)
  const linesW = Math.max(0, ...under.map((t) => textWidth(t, LINE_FONT)))
  const width = Math.max(bodyW, linesW + 8)
  const shift = (width - bodyW) / 2
  const lines = under.map((text, i) => ({ text, y: bodyH + 14 + LINE_FONT + i * LINE_H }))
  const height = bodyH + (under.length ? 14 + under.length * LINE_H : 0)

  const move = (p: Point): Point => [p[0] + left + shift, p[1] + top]
  const moved = pieces.map((p): Piece => {
    if (p.kind === 'atom') {
      const [x, y] = move([p.x, p.y])
      return { ...p, x, y }
    }
    if (p.kind === 'bond')
      return { ...p, from: move(p.from), to: move(p.to), balls: p.balls?.map(([x, y, r]): [number, number, number] => [...move([x, y]), r]) }
    if (p.kind === 'lobe') {
      const [x, y] = move([p.x, p.y])
      return { ...p, x, y, tip: move(p.tip), dots: p.dots.map(move) }
    }
    return { ...p, dots: p.dots.map(move) }
  })
  const movedArcs = arcs.map((a) => ({
    ...a,
    path: a.path.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => `${(Number(x) + left + shift).toFixed(1)} ${(Number(y) + top).toFixed(1)}`),
    at: move(a.at),
  }))
  return {
    width,
    height,
    pieces: moved,
    arcs: movedArcs,
    brackets: brackets && { ...brackets, left: brackets.left + shift, right: brackets.right + shift },
    lines,
    key,
    center: move([0, 0]),
  }
}
