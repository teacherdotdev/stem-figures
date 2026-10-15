// Lays out rays out from one vertex for LinesFigure.svelte to draw, and works
// out what the teacher can point at on it: every angle, ray and place for a
// point. It makes the same drawing the Parallel Lines and Transversal
// Generator does, so both figures share their drawing and picking.
//
// The figure is worked out with the vertex at (0, 0) and every half-ray 1
// long, then turned and scaled to fit the same box, with the rays never
// longer than RAY_MAX; the SVG's frame grows to hold the labels.
//
// The half-rays split the space around the vertex into angles, each the gap
// from one half-ray to the next counterclockwise, named by its two half-rays
// (see settings.ts), so its label follows it as the rays move. With two rays
// there are two angles: the one under 180° and the reflex angle around the
// outside.

import { LABEL_SCALE } from '$shared/labelSize'
import { layoutMath, type MathBox } from '$lib/shared/mathSvg.js'
import type { PlacedLabel } from '$lib/shapes/layout.js'
import { roundTo } from '$lib/shapes/parts.js'
import { add, len, mul, perp, r1, reach, sub, unit, type Vec } from '$lib/shapes/vec.js'
import { angleMark, sectorPath } from '$lib/labeling/marks.js'
import { SHADES } from '$lib/labeling/options.js'
import { DOT, WEDGE, type Drawing } from '../parallel-lines/layout.js'
import { ANGLE_DEFAULTS, angleKey, readRays, type Ray, type Settings } from './settings.js'

export type { Vec }

const BASE_FS = 20 // label font size, at medium labels
const BASE_NAME_FS = 21
const FIT_W = 360
const FIT_H = 260
const RAY_MAX = 240 // the longest a half-ray is drawn
const PAD = 12
const ARC = 20 // angle arc radius
const ARC_GAP = 4.5 // between congruence arcs
const SQUARE = 13 // right-angle square
const LINE_W = 2.2 // the rays' stroke width, as LinesFigure.svelte draws them
const HEAD = 12 // an arrowhead's length, and
const HEAD_W = 5.5 // half its width
const END_SPOT = 0.82 // where a point near a ray's end goes, along the half-ray
const RAD = Math.PI / 180

/** The figure laid out for LinesFigure.svelte, with what can be pointed at on it. */
export type AnglesLayout = ReturnType<typeof buildAngles>

export function buildAngles(s: Settings) {
  const FS = BASE_FS * LABEL_SCALE[s.labelSize]
  const NAME_FS = BASE_NAME_FS * LABEL_SCALE[s.labelSize]
  const { rays } = readRays(s)

  // Every half-ray, counterclockwise from the baseline: "+" along a ray's direction, "-" back through the vertex.
  const halves = rays
    .flatMap(({ ray, theta }) => [
      { half: `${ray.id}+`, ray, theta },
      ...(ray.twoSided ? [{ half: `${ray.id}-`, ray, theta: (theta + 180) % 360 }] : []),
    ])
    .sort((a, b) => a.theta - b.theta)

  // Turned, then in SVG's y-down coordinates, scaled to fit with the vertex at `v`.
  const turn = s.turn * RAD
  const toward = (deg: number): Vec => {
    const a = deg * RAD + turn
    return [Math.cos(a), -Math.sin(a)]
  }
  const tips = halves.map((h) => toward(h.theta))
  const xs = [0, ...tips.map((p) => p[0])]
  const ys = [0, ...tips.map((p) => p[1])]
  const scale = Math.min(FIT_W / (Math.max(...xs) - Math.min(...xs) || 1), FIT_H / (Math.max(...ys) - Math.min(...ys) || 1), RAY_MAX)
  const v: Vec = [-Math.min(...xs) * scale, -Math.min(...ys) * scale]
  const tipOf = (deg: number) => add(v, mul(toward(deg), scale))

  // Each ray as one segment: from its other end (or the vertex) to its tip.
  const back = (ray: Ray, theta: number) => (ray.twoSided ? tipOf(theta + 180) : v)
  const segments = rays.map(({ ray, theta }) => ({ id: ray.id, kind: 'r', from: back(ray, theta), to: tipOf(theta), style: ray.style }))

  const labels: PlacedLabel[] = []
  const boxAt = (box: MathBox, [cx, cy]: Vec) => ({ l: cx - box.w / 2 - 2, r: cx + box.w / 2 + 2, t: cy - (box.asc + box.desc) / 2 - 1, b: cy + (box.asc + box.desc) / 2 + 1 })
  const overlaps = (box: MathBox, c: Vec) => {
    const a = boxAt(box, c)
    return labels.some((l) => {
      const b = boxAt(l.box, [l.cx, l.cy])
      return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b
    })
  }
  const place = (part: string, box: MathBox, [cx, cy]: Vec, out: Vec) => {
    labels.push({ part, box, cx, cy, x: cx - box.w / 2, y: cy + (box.asc - box.desc) / 2, along: out, across: perp(out), offset: [0, 0] })
  }

  // The angles: each half-ray to the next counterclockwise, measured from the typed directions.
  const rounded = (n: number) => roundTo(n, s.round)
  const gaps = (halves.length < 2 ? [] : halves).map((h, i) => {
    const next = halves[(i + 1) % halves.length]
    const measure = (next.theta - h.theta + 360) % 360
    return { key: angleKey(h.half, next.half), from: h, to: next, measure, mid: toward(h.theta + measure / 2) }
  })

  // The vertex's point and name, in its widest unlabeled angle (its widest, if all are labeled),
  // placed before the angles' labels, which make way for it.
  const dots: Vec[] = []
  if ('v' in s.points) {
    dots.push(v)
    const name = s.points.v.trim()
    const box = name ? layoutMath(name, NAME_FS) : null
    if (box && gaps.length) {
      const free = gaps.filter((g) => (s.angles[g.key] ?? ANGLE_DEFAULTS).label === 'none')
      const widest = (free.length ? free : gaps).reduce((a, b) => (b.measure > a.measure + 1e-9 ? b : a))
      place('pt:v', box, add(v, mul(widest.mid, 8 + reach(box, widest.mid))), widest.mid)
    }
  }

  // Each angle: shading, arcs or a right-angle square, its label, and where the teacher can point at it.
  // An arc runs clockwise on the page from the later half-ray back to the earlier one.
  const arcs: string[] = []
  const shades: { d: string; fill: string }[] = []
  const squares: Vec[][] = []
  const marks = { arcs, squares }
  const MARK_SIZES = { arc: ARC, arcGap: ARC_GAP, square: SQUARE }
  const sector = (e1: Vec, e2: Vec, measure: number, r: number, closed: boolean) => sectorPath(v, e1, e2, r, closed, measure > 180)
  const angles = gaps.map((g) => {
    const style = s.angles[g.key] ?? ANGLE_DEFAULTS
    const [e1, e2] = [toward(g.to.theta), toward(g.from.theta)]
    const radius = Math.min(WEDGE, scale * 0.4)
    const fill = SHADES[style.shade]?.fill
    if (fill) shades.push({ d: sector(e1, e2, g.measure, radius, true), fill })
    const box = style.label === 'text' ? layoutMath(style.text, FS) : style.label === 'measure' ? layoutMath(rounded(g.measure), FS, { suffix: '°' }) : null
    // Only the mark the teacher set: a square at a right angle, or that many arcs.
    const right = Math.abs(g.measure - 90) < 1e-4
    const outer = angleMark(marks, v, e1, e2, style.mark, right, g.measure > 180, MARK_SIZES)
    // Far enough out to clear the arc, and, in an angle under 180°, to fit between its two rays.
    const half = g.measure < 180 ? Math.sin((g.measure * RAD) / 2) : 1
    const distance = (b: MathBox) => {
      const toSide = g.measure < 180 ? Math.max(...[e1, e2].map((e) => (reach(b, perp(e)) + 3) / half)) : 0
      return Math.max(outer + 5 + reach(b, g.mid), toSide, 12 + reach(b, g.mid))
    }
    if (box) {
      let d = distance(box)
      for (let n = 0; n < 12 && overlaps(box, add(v, mul(g.mid, d))); n++) d += 4 // clear of the vertex's name
      place(`angle:${g.key}`, box, add(v, mul(g.mid, d)), g.mid)
    }
    const ghostBox = layoutMath(rounded(g.measure), FS, { suffix: '°' })!
    return {
      key: g.key,
      crossing: 'v',
      rays: [g.from.half, g.to.half],
      measure: g.measure,
      /** Whether it's 90°, so its mark can be a right-angle square. */
      right,
      /** The wedge that's highlighted, and pointed at to pick the angle. */
      wedge: sector(e1, e2, g.measure, radius, true),
      /** Where its measure is written while it's highlighted. */
      ghost: { at: add(v, mul(g.mid, distance(ghostBox))), text: `${rounded(g.measure)}°` },
      /** Where its popup opens. */
      anchor: add(v, mul(g.mid, radius * 0.7)),
    }
  })

  // Each end's cap: a filled arrowhead or an open one pointing out, or a dot.
  // The vertex end of a one-sided ray has none. The ray itself stops short of
  // an arrow's tip, as on a Parallel Lines and Transversal.
  const heads: Vec[][] = []
  const openHeads: Vec[][] = []
  const drawn = new Map<string, [Vec, Vec]>()
  for (const [i, g] of segments.entries()) {
    const ray = rays[i].ray
    const ends: Vec[] = []
    for (const [cap, tip, from] of [[ray.twoSided ? ray.startCap : 'none', g.from, g.to], [ray.endCap, g.to, g.from]] as const) {
      const d = unit(sub(tip, from))
      const base = add(tip, mul(d, -HEAD))
      const head = [add(base, mul(perp(d), HEAD_W)), tip, add(base, mul(perp(d), -HEAD_W))]
      if (cap === 'triangle') heads.push(head)
      else if (cap === 'line') openHeads.push(head)
      else if (cap === 'circle') dots.push(tip)
      ends.push(cap === 'triangle' ? add(tip, mul(d, -HEAD * 0.6)) : cap === 'line' ? add(tip, mul(d, -LINE_W / 2)) : tip)
    }
    drawn.set(g.id, [ends[0], ends[1]])
  }

  // Where a point can go near the end of each half-ray, clear of its arrowhead.
  // Each one is drawn and named once it's turned on.
  const endSpots = halves.map((h) => {
    const key = `${h.ray.id}:${h.half.endsWith('+') ? 'end' : 'start'}`
    const d = toward(h.theta)
    const p = add(v, mul(d, scale * END_SPOT))
    if (key in s.points) {
      dots.push(p)
      const name = s.points[key].trim()
      const box = name ? layoutMath(name, NAME_FS) : null
      if (box) {
        const n = perp(d)
        const spots = [n, mul(n, -1)].map((out) => ({ at: add(p, mul(out, 8 + reach(box, out))), out }))
        const spot = spots.find((sp) => !overlaps(box, sp.at)) ?? spots[0]
        place(`pt:${key}`, box, spot.at, spot.out)
      }
    }
    return { key, at: p, line: h.ray.id as string | null }
  })

  // The frame holds the rays, their arrowheads and every label.
  const points: Vec[] = [v, ...segments.flatMap((g) => [g.from, g.to]), ...heads.flat(), ...openHeads.flat()]
  for (const l of labels) points.push([l.cx - l.box.w / 2, l.y - l.box.asc], [l.cx + l.box.w / 2, l.y + l.box.desc])
  const minX = Math.min(...points.map((p) => p[0])) - PAD
  const minY = Math.min(...points.map((p) => p[1])) - PAD
  const maxX = Math.max(...points.map((p) => p[0])) + PAD
  const maxY = Math.max(...points.map((p) => p[1])) + PAD
  const frame = { x: r1(minX), y: r1(minY), w: r1(maxX - minX), h: r1(maxY - minY) }

  const drawing = {
    frame,
    segments: segments.map((g) => ({ ...g, drawn: drawn.get(g.id)! })),
    heads,
    openHeads,
    shades,
    arcs,
    squares,
    arrows: [] as Vec[][],
    dots,
    labels,
    angles,
    crossings: [{ key: 'v', at: v, ids: rays.map((r) => r.ray.id) }],
    /** Every place a point can go, shown or not: the vertex, then near the end of each half-ray. */
    spots: [{ key: 'v', at: v, line: null as string | null }, ...endSpots],
  }
  return drawing satisfies Drawing
}
