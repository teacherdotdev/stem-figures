// Lays out a pie chart as plain numbers for PieChart.svelte to draw. The
// sectors run clockwise from 12 o'clock, as pie charts are drawn by hand, in
// the order typed or largest first; whatever isn't drawn (values left empty,
// or values that fall short of the whole) is one empty sector at the end.
//
// Everything is placed around the circle's center at (0, 0); the figure moves
// it into place. A label goes inside its sector where it fits, clear of the
// sector's edges and the dot at the center, or else outside with a short
// leader line, the outside ones fanned out round the circle so none overlap.

import { LABEL_SCALE } from '$shared/labelSize'
import { crosses, textWidth, type Box } from '$shared/graph/labels'
import { sectorPath } from '$lib/labeling/marks'
import type { Vec } from '$lib/shapes/vec'
import { ORDER, fillOf, isDark, isPattern, type Fill, type Look } from '$lib/stats/fills'
import { layoutSwatchKey, type KeyLayout } from '$lib/stats/swatchKey'
import { LABEL_MODES, fmt, nice, readPie, type LabelMode, type Part, type Settings } from './settings'

const BASE_FS = 14 // label size, at medium labels
export const R = 150 // the circle's radius
const PAD = 14
const GAP = 8 // between the circle and a label outside it
const MARGIN = 4 // kept between a label inside and its sector's edges
const DOT = 3.5 // the center dot's radius
/** The letters written for unknowns, in turn. */
export const LETTERS = ['x', 'y', 'z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'k']

/** The fills sectors take in turn. Black and white runs on to solid ink. */
const PIE_ORDER: Record<Look, Fill[]> = { color: ORDER.color, bw: [...ORDER.bw, 'ink'], white: ORDER.white }
/** A sector's fill; a tint is its color paler, for the 7th to 12th sectors in color. */
export type Paint = { fill: Fill; tint: boolean }
/** How pale a tint is: the color's opacity on white. */
export const TINT = 0.4

/** The direction `deg` degrees clockwise from 12 o'clock. */
export const dir = (deg: number): Vec => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180)]

/** A sector from `from` round to `to` degrees, clockwise from 12 o'clock: sectorPath with angles. */
export const sectorAt = (r: number, from: number, to: number, closed = true) => sectorPath([0, 0], dir(from), dir(to), r, closed, to - from > 180)

/** One line of a label: text, then a blank line to write on if `blank`. */
export type Line = { text: string; blank: boolean }
/** A label: its lines centered at (x, y), the box they take, and how they're colored. */
export type Label = {
  lines: Line[]
  /** how wide each line is */
  widths: number[]
  x: number
  y: number
  w: number
  h: number
  box: Box
  inside: boolean
  white: boolean
  halo: boolean
  /** from the circle to the label, for one outside */
  leader: Vec[] | null
  /** which sector it names, by its place in `sectors` */
  sector: number
}
export type Sector = {
  part: Part
  from: number
  to: number
  fill: Fill
  tint: boolean
  /** the path, or null for one sector that's the whole circle */
  path: string | null
  /** what's written for an unknown in it, if anything */
  letter: string | null
}

/** What a label shows: its name, if the mode names it, and its numbers. */
function readMode(p: Part, mode: LabelMode, kind: Settings['values']) {
  const own = p.label
  const m: LabelMode = own && own in LABEL_MODES ? (own as LabelMode) : mode
  const parts = m === 'none' ? [] : m.split('-')
  const numbers = parts.filter((x) => x !== 'name')
  const unitOf = (x: string) => (x === 'angle' ? '°' : x === 'percent' ? '%' : x === 'value' ? (kind === 'percent' ? '%' : kind === 'degrees' ? '°' : '') : '')
  const numberText = (x: string) => {
    if (x === 'value') return p.typed + unitOf('value')
    if (x === 'percent') return `${nice(p.percent!)}%`
    if (x === 'angle') return `${nice(p.angle!)}°`
    return p.fraction ? `${p.fraction.n}/${p.fraction.d}` : fmt(Math.round(p.percent! * 10) / 1000)
  }
  // A value and its percent: 12 (25%).
  const nums = numbers.map(numberText)
  const line = nums.length > 1 ? `${nums[0]} (${nums[1]})` : (nums[0] ?? '')
  return { name: parts.includes('name') ? p.name : '', numbers, unitOf, line, first: nums[0] ?? '' }
}

/**
 * A label's lines for a sector, from the chart's label mode and the sector's
 * own. A letter with no number to stand for is the sector's angle.
 */
export function labelLines(p: Part, mode: LabelMode, kind: Settings['values'], letter: string | null): Line[] {
  const { name: named, numbers, unitOf, line } = readMode(p, mode, kind)
  const text = (t: string): Line => ({ text: t, blank: false })
  const name = named ? [text(named)] : []
  if (p.label === 'blank') return numbers.length ? [...name, { text: '', blank: true }] : [{ text: '', blank: true }]
  if (p.label === 'letter') return [...name, text(`${letter}${numbers.length ? unitOf(numbers[0]) : '°'}`)]
  return numbers.length ? [...name, text(line)] : name
}

/** What a blank line or letter stands for in a sector's label: its numbers, or its angle (a blank with no numbers, its name). */
export function hiddenText(p: Part, mode: LabelMode, kind: Settings['values']): string {
  const { numbers, line, first } = readMode(p, mode, kind)
  if (p.label === 'letter') return numbers.length ? first : `${nice(p.angle!)}°`
  return numbers.length ? line : p.name || `${nice(p.angle!)}°`
}

const dist = (p: Vec) => Math.hypot(p[0], p[1])
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const grow = (b: Box, by: number): Box => ({ x0: b.x0 - by, y0: b.y0 - by, x1: b.x1 + by, y1: b.y1 + by })
/** How near the box comes to the center. */
function nearest(b: Box) {
  const x = Math.max(b.x0, Math.min(0, b.x1))
  const y = Math.max(b.y0, Math.min(0, b.y1))
  return Math.hypot(x, y)
}
/** How near the segment from a to b comes to the center. */
function offCenter(a: Vec, b: Vec) {
  const d: Vec = [b[0] - a[0], b[1] - a[1]]
  const len = d[0] ** 2 + d[1] ** 2
  const t = len ? Math.max(0, Math.min(1, -(a[0] * d[0] + a[1] * d[1]) / len)) : 0
  return dist([a[0] + d[0] * t, a[1] + d[1] * t])
}
/** A label's box centered at (x, y). */
const boxAt = (x: number, y: number, w: number, h: number): Box => ({ x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 })
/** How far the box reaches from the center. */
const farthest = (b: Box) => Math.hypot(Math.max(-b.x0, b.x1), Math.max(-b.y0, b.y1))

export function buildPieChart(s: Settings) {
  const read = readPie(s)
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const lineH = fs * 1.2
  const blankW = fs * 3.2
  /** How wide a line is: its text, then any blank line after a space. */
  const widthOf = (l: Line) => textWidth(l.text, fs) + (l.blank ? (l.text ? fs * 0.3 : 0) + blankW : 0)
  /** The size of a label's lines. */
  function sizeOf(lines: Line[]) {
    const widths = lines.map(widthOf)
    return { widths, w: Math.max(...widths), h: (lines.length - 1) * lineH + fs * 1.08 }
  }

  // The sectors drawn, clockwise from 12 o'clock.
  const drawn = read.parts.filter((p) => p.angle !== null && p.angle > 1e-9)
  if (s.order === 'largest') drawn.sort((a, b) => b.value! - a.value!)
  const undrawn = read.parts.filter((p) => !drawn.includes(p))
  // Fills in turn, drawn sectors first, so neighbors differ. In color the
  // colors come round again as tints; in black and white the last sector
  // isn't given the first's fill, which it touches.
  const turn = PIE_ORDER[s.look]
  const fillFor = new Map<Part, Paint>()
  ;[...drawn, ...undrawn].forEach((p, i) =>
    fillFor.set(p, p.fill ? { fill: fillOf(s.look, i, p.fill), tint: false } : { fill: turn[i % turn.length], tint: s.look === 'color' && i >= turn.length }),
  )
  const n = drawn.length
  const same = (a: Paint, b: Paint) => a.fill === b.fill && a.tint === b.tint
  if (n > 2 && s.look !== 'white' && !drawn[n - 1].fill && same(fillFor.get(drawn[n - 1])!, fillFor.get(drawn[0])!)) {
    const avoid = [fillFor.get(drawn[0])!, fillFor.get(drawn[n - 2])!]
    const tint = fillFor.get(drawn[n - 1])!.tint
    fillFor.set(drawn[n - 1], { fill: turn.find((f) => !avoid.some((a) => same(a, { fill: f, tint }))) ?? turn[0], tint })
  }

  let letters = 0
  let at = 0
  const sectors: Sector[] = drawn.map((p) => {
    const from = at
    const to = Math.min(360, Number((at + p.angle!).toPrecision(12)))
    at = to
    const whole = to - from > 359.999
    return { part: p, from, to, ...fillFor.get(p)!, path: whole ? null : sectorAt(R, from, to), letter: p.label === 'letter' ? LETTERS[letters++ % LETTERS.length] : null }
  })
  // What's left undrawn: one empty sector to the end, or the whole circle.
  const empty = read.gap > 1e-6 ? { from: 360 - read.gap, to: 360, path: n ? sectorAt(R, 360 - read.gap, 360) : null } : null
  const blankCircle = n === 0
  const centerDot = s.centerDot === 'on' || (s.centerDot === 'auto' && (!!empty || sectors.some((t) => t.letter || t.part.label === 'blank')))

  // The center zone the dot takes, which labels inside keep clear of.
  const clearOf = centerDot ? DOT + 8 : 0
  const placed: Box[] = []
  if (centerDot) placed.push({ x0: -DOT - 3, y0: -DOT - 3, x1: DOT + 3, y1: DOT + 3 })

  /**
   * The best place inside the sector, out along its middle from `near` to
   * `far`, where the lines fit clear of everything, nearest the middle of
   * that room.
   */
  function fitInside(t: { from: number; to: number }, lines: Line[], near: number, far: number, hug = false) {
    const { widths, w, h } = sizeOf(lines)
    const mid = dir((t.from + t.to) / 2)
    const rays = t.to - t.from > 359.999 ? [] : [t.from, t.to].map((a) => ({ x1: 0, y1: 0, x2: dir(a)[0] * R, y2: dir(a)[1] * R }))
    // Best toward the middle of the sector's room, then nearer the center or the rim.
    const steps: number[] = []
    for (let r = near; r <= far + 1e-9; r += 3) steps.push(r)
    const ideal = hug ? near : (near + far) / 2
    steps.sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal))
    for (const r of steps) {
      const box = boxAt(mid[0] * r, mid[1] * r, w, h)
      if (farthest(box) > R - MARGIN) continue
      if (nearest(box) < Math.max(near - 3, clearOf)) continue
      const room = grow(box, MARGIN)
      if (rays.some((ray) => crosses(ray, room))) continue
      if (placed.some((b) => overlaps(grow(b, 2), box))) continue
      placed.push(box)
      return { lines, widths, x: mid[0] * r, y: mid[1] * r, w, h, box, inside: true }
    }
    return null
  }

  // Each sector's label: inside if it fits, else outside.
  const measured = s.angleMarks === 'measures' && marked
  const labels: Label[] = []
  const outside: { i: number; lines: Line[]; widths: number[]; w: number; h: number; mid: number }[] = []
  sectors.forEach((t, i) => {
    let lines = labelLines(t.part, s.labels, s.values, t.letter, measured && !folded.has(i))
    if (folded.has(i)) lines = [...lines, { text: t.letter ? `${t.letter}°` : `${nice(t.part.angle!)}°`, blank: false }]
    if (!lines.length) return
    const whole = t.to - t.from > 359.999
    const spot = whole ? fitInside(t, lines, clearOf + 4, R * 0.75) : fitInside(t, lines, Math.max(clearOf + 4, R * 0.3), R - MARGIN)
    if (spot) {
      labels.push({ ...spot, white: isDark(t.fill) && !t.tint, halo: isPattern(t.fill), leader: null, sector: i })
      return
    }
    // Outside, on one line: Apples 25%.
    const one = [{ text: lines.map((l) => l.text).filter(Boolean).join(' '), blank: lines.some((l) => l.blank) }]
    const mid = (t.from + t.to) / 2
    outside.push({ i, lines: one, ...sizeOf(one), mid })
  })

  /**
   * An outside label at `a` degrees round the circle, for a sector whose
   * middle is at `mid`: its box as near the circle as it can sit, and its
   * leader, out from inside the sector to an elbow just past the rim, then
   * straight to the nearest point of the box. A label moved round from its
   * sector sits a little further out, so its leader keeps off the circle;
   * one moved far round has a leader that follows the circle round to it.
   */
  function outsideAt(a: number, mid: number, w: number, h: number) {
    const u = dir(a)
    const m = dir(mid)
    const ring = R + GAP * 0.6
    const from: Vec = [m[0] * (R - 4), m[1] * (R - 4)]
    const elbow: Vec = [m[0] * ring, m[1] * ring]
    const boxOut = (r: number) => boxAt(u[0] * r + (u[0] * w) / 2, u[1] * r + (u[1] * h) / 2, w, h)
    const nearOf = (box: Box): Vec => [Math.max(box.x0 - 2, Math.min(elbow[0], box.x1 + 2)), Math.max(box.y0 - 2, Math.min(elbow[1], box.y1 + 2))]
    let first: Box | null = null
    for (let r = R + GAP; r < R + GAP + 60; r += 2) {
      const box = boxOut(r)
      if (nearest(box) < R + GAP) continue
      first ??= box
      const near = nearOf(box)
      if (offCenter(elbow, near) >= R + 1) return { box, leader: dist([near[0] - elbow[0], near[1] - elbow[1]]) > 2 ? [from, elbow, near] : [from, near] }
    }
    // Round the circle just past its rim, then out to the label.
    let box = first ?? boxOut(R + GAP)
    for (let r = R + GAP; nearest(box) < R + GAP; r += 2) box = boxOut(r)
    const near = nearOf(box)
    const end = (Math.atan2(near[0], -near[1]) * 180) / Math.PI
    const turn = ((((end - mid) % 360) + 540) % 360) - 180
    const steps = Math.ceil(Math.abs(turn) / 12)
    const round = Array.from({ length: steps }, (_, k) => dir(mid + (turn * (k + 1)) / steps).map((c) => c * ring) as Vec)
    return { box, leader: [from, elbow, ...round, near] }
  }
  // Outside labels that would overlap fan out round the circle, each moving
  // a little at a time, keeping their order, until none do.
  const angle = outside.map((o) => o.mid)
  const before = (a: number, b: number) => (((b - a) % 360) + 360) % 360 < 180
  for (let round = 0; round < 800; round++) {
    const placed = outside.map((o, k) => outsideAt(angle[k], o.mid, o.w, o.h))
    // Whether a label's leader runs through another label.
    const through = (j: number, k: number) =>
      placed[j].leader.slice(1).some((p, n, l) => n > 0 && crosses({ x1: l[n - 1][0], y1: l[n - 1][1], x2: p[0], y2: p[1] }, grow(placed[k].box, 2)))
    let moved = false
    for (let j = 0; j < outside.length; j++)
      for (let k = j + 1; k < outside.length; k++) {
        if (!overlaps(grow(placed[j].box, 4), placed[k].box) && !through(j, k) && !through(k, j)) continue
        const [a, b] = before(angle[j], angle[k]) ? [j, k] : [k, j]
        angle[a] -= 0.5
        angle[b] += 0.5
        moved = true
      }
    if (!moved) break
  }
  outside.forEach((o, k) => {
    const { box, leader } = outsideAt(angle[k], o.mid, o.w, o.h)
    labels.push({ lines: o.lines, widths: o.widths, x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2, w: o.w, h: o.h, box, inside: false, white: false, halo: false, leader, sector: o.i })
  })
  labels.sort((a, b) => a.sector - b.sector)

  // How far the chart reaches, before the key and title.
  const all = [...labels.map((l) => l.box), { x0: -R - 1, y0: -R - 1, x1: R + 1, y1: R + 1 }]
  let x0 = Math.min(...all.map((b) => b.x0))
  let x1 = Math.max(...all.map((b) => b.x1))
  let y0 = Math.min(...all.map((b) => b.y0))
  let y1 = Math.max(...all.map((b) => b.y1))

  // The key, naming every category, drawn or not: on the right or below.
  let key: (KeyLayout & { x: number; y: number; tints: boolean[] }) | null = null
  if (s.keyAt !== 'none' && read.parts.length) {
    const order = [...drawn, ...undrawn]
    const entries = order.map((p) => ({ text: p.name || `Category ${p.row + 1}`, fill: fillFor.get(p)!.fill }))
    const tints = order.map((p) => fillFor.get(p)!.tint)
    if (s.keyAt === 'right') {
      const k = layoutSwatchKey(entries, fs, 'right')
      key = { ...k, x: x1 + fs * 1.6, y: -k.height / 2, tints }
      x1 = key.x + k.width
      y0 = Math.min(y0, key.y)
      y1 = Math.max(y1, key.y + k.height)
    } else {
      const k = layoutSwatchKey(entries, fs, 'below', Math.max(x1 - x0, fs * 16))
      key = { ...k, x: (x0 + x1) / 2 - k.width / 2, y: y1 + fs * 1.2, tints }
      x0 = Math.min(x0, key.x)
      x1 = Math.max(x1, key.x + k.width)
      y1 = key.y + k.height
    }
  }

  // The chart title over it all: text, or a blank line to write on.
  const titleFs = fs * 1.6
  const titleText = s.titleMode === 'text' ? s.title.trim() : ''
  let title: { x: number; y: number; text: string; fs: number } | null = null
  let titleBlank: { x1: number; x2: number; y: number } | null = null
  if (titleText || s.titleMode === 'blank') {
    const w = titleText ? textWidth(titleText, titleFs) : Math.min(260, x1 - x0)
    const mid = (x0 + x1) / 2
    const y = y0 - titleFs * 0.75
    if (titleText) title = { x: mid, y, text: titleText, fs: titleFs }
    else titleBlank = { x1: mid - w / 2, x2: mid + w / 2, y }
    x0 = Math.min(x0, mid - w / 2)
    x1 = Math.max(x1, mid + w / 2)
    y0 = y - titleFs * 0.9
  }

  return {
    read,
    fs,
    lineH,
    blankW,
    /** where the circle's center goes in the figure */
    cx: Math.round((PAD - x0) * 10) / 10,
    cy: Math.round((PAD - y0) * 10) / 10,
    width: Math.ceil(x1 - x0 + PAD * 2),
    height: Math.ceil(y1 - y0 + PAD * 2),
    sectors,
    empty,
    blankCircle,
    /** a radius up to 12 o'clock, to start drawing from */
    startRadius: blankCircle,
    centerDot,
    dot: DOT,
    arcs: marks.arcs,
    measures,
    labels,
    key,
    title,
    titleBlank,
    fills: [...new Set([...fillFor.values()].map((f) => f.fill))],
    /** each category's fill, by its place in read.parts */
    partFills: read.parts.map((p) => fillFor.get(p)!),
  }
}
export type PieLayout = ReturnType<typeof buildPieChart>
