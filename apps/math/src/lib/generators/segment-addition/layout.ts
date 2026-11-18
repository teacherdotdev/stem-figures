// Lays out a segment addition figure for SegmentFigure.svelte to draw.
//
// It's worked out along the line first: a point's place is how far along it
// is, and anything off the line is a distance above or below it. Part labels
// and congruence ticks go above the line, point names just below, and spans
// as braces under the names, a row each where they would overlap. Then the
// whole figure is turned, with its labels kept upright, and framed.
//
// Each part is drawn as long as its typed size, or else its length as solved
// (so 2x + 1 and 3x − 4 with x = 6 come out 13 to 14), or else all the same;
// none shorter than a fifth of the longest, or longer than needed to fit its
// label.

import { LABEL_SCALE } from '$shared/labelSize'
import { parseNumber } from '$lib/shared/math.js'
import { layoutMath, type MathBox } from '$lib/shared/mathSvg.js'
import type { PlacedLabel } from '$lib/shapes/layout.js'
import { add, mul, perp, r1, reach, sub, unit, type Vec } from '$lib/shapes/vec.js'
import { tickMarks } from '$lib/labeling/marks.js'
import { partName, spanName, type End, type Settings } from './settings.js'
import { solve, type Solved } from './solve.js'

const BASE_FS = 21 // part and span labels, at medium labels
const BASE_NAME_FS = 21 // point names
const FIT = 420 // the line from first point to last, before it grows to fit labels
const MAX_LENGTH = 1000
const MIN_SHARE = 0.2 // the shortest part, as a share of the longest
const EXT = 42 // how far the line runs on past an end point to its arrow
const HEAD = 13 // an arrowhead's length, and
const HEAD_W = 6 // half its width
const DOT_R = 4.2
const TICK_HALF = 8
const TICK_GAP = 5
const CROSS = 72 // how far a crossing line runs each way from its point
const SQUARE = 12
const BRACE = 11 // a brace's depth
const PAD = 12
const RAD = Math.PI / 180

export type Blank = { x1: number; x2: number; y: number }
export type SegmentLayout = ReturnType<typeof buildSegments>

/** The drawn length of each part, before scaling. */
function sizesOf(s: Settings, solved: Solved) {
  const raw = s.parts.map((p, k) => {
    const typed = parseNumber(p.size)
    if (typed !== null && typed > 0) return typed
    const v = solved.parts[k]
    return v !== null && v > 0 && !solved.problem ? v : null
  })
  const known = raw.filter((v): v is number => v !== null)
  // Parts with no length of their own are drawn as long as the others' average.
  const fill = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1
  const sizes = raw.map((v) => v ?? fill)
  const most = Math.max(...sizes)
  return sizes.map((v) => Math.max(v, most * MIN_SHARE))
}

export function buildSegments(s: Settings) {
  const FS = BASE_FS * LABEL_SCALE[s.labelSize]
  const NAME_FS = BASE_NAME_FS * LABEL_SCALE[s.labelSize]
  const solved = solve(s)

  // Each label's box: typed math, or a blank line's room.
  const blankBox = (): MathBox => ({ w: FS * 2.6, asc: FS * 0.75, desc: FS * 0.1, items: [] })
  const boxOf = (label: string, mode: string) => (mode === 'blank' ? blankBox() : mode === 'text' ? layoutMath(label, FS) : null)
  const partBoxes = s.parts.map((p) => boxOf(p.label, p.mode))
  const spanBoxes = s.spans.map((sp) => boxOf(sp.label, sp.mode))

  // Along the line: where each point is.
  const sizes = sizesOf(s, solved)
  const total = sizes.reduce((a, b) => a + b, 0)
  const need = Math.max(...sizes.map((v, k) => (Math.max(48, (partBoxes[k]?.w ?? 0) + 16, s.parts[k].ticks * TICK_GAP + 24)) / v))
  const scale = Math.min(MAX_LENGTH / total, Math.max(FIT / total, need))
  const at: number[] = [0]
  for (const v of sizes) at.push(at[at.length - 1] + v * scale)

  // Turned: t runs along the line, up is above it, on the page (y down).
  const a = s.turn * RAD
  const t: Vec = [Math.cos(a), -Math.sin(a)]
  const up: Vec = [-Math.sin(a), -Math.cos(a)]
  const down = mul(up, -1)
  const P = (u: number, v = 0): Vec => add(mul(t, u), mul(up, v))
  const points = at.map((u) => P(u))

  const labels: PlacedLabel[] = []
  const blanks: Blank[] = []
  /** Put a label (or a blank) centered at c. */
  const place = (part: string, box: MathBox, [cx, cy]: Vec, out: Vec) => {
    const y = cy + (box.asc - box.desc) / 2
    if (!box.items.length) blanks.push({ x1: cx - box.w / 2, x2: cx + box.w / 2, y })
    else labels.push({ part, box, cx, cy, x: cx - box.w / 2, y, along: out, across: perp(out), offset: [0, 0] })
  }

  // The line, running on past an end to an arrow, or stopping at its end point.
  const ends: { cap: End; tip: Vec; dir: Vec }[] = [
    { cap: s.start, tip: P(-(s.start === 'none' ? 0 : EXT)), dir: mul(t, -1) },
    { cap: s.end, tip: P(at[at.length - 1] + (s.end === 'none' ? 0 : EXT)), dir: t },
  ]
  const heads: Vec[][] = []
  const openHeads: Vec[][] = []
  const arrowhead = (tip: Vec, d: Vec) => {
    const base = add(tip, mul(d, -HEAD))
    return [add(base, mul(perp(d), HEAD_W)), tip, add(base, mul(perp(d), -HEAD_W))]
  }
  const stop = (cap: End, tip: Vec, d: Vec) => (cap === 'triangle' ? add(tip, mul(d, -HEAD * 0.6)) : tip)
  for (const e of ends) {
    if (e.cap === 'triangle') heads.push(arrowhead(e.tip, e.dir))
    if (e.cap === 'line') openHeads.push(arrowhead(e.tip, e.dir))
  }
  const lines: [Vec, Vec][] = [[stop(ends[0].cap, ends[0].tip, ends[0].dir), stop(ends[1].cap, ends[1].tip, ends[1].dir)]]

  // A line crossing at a point, as a bisector does: its direction, turned from the line by its angle.
  const crossing = s.cross >= 0 ? s.cross : null
  let crossDir: Vec | null = null
  const squares: Vec[][] = []
  if (crossing !== null) {
    const th = s.crossAngle * RAD
    crossDir = add(mul(t, Math.cos(th)), mul(up, Math.sin(th)))
    const c = points[crossing]
    const [hi, lo] = [add(c, mul(crossDir, CROSS)), add(c, mul(crossDir, -CROSS))]
    heads.push(arrowhead(hi, crossDir), arrowhead(lo, mul(crossDir, -1)))
    lines.push([stop('triangle', lo, mul(crossDir, -1)), stop('triangle', hi, crossDir)])
    if (s.crossAngle === 90 && s.crossSquare) {
      // In the corner past the point, away from the part label before it.
      squares.push([add(c, mul(t, SQUARE)), add(c, add(mul(t, SQUARE), mul(up, SQUARE))), add(c, mul(up, SQUARE))])
    }
    const name = s.crossName.trim() ? layoutMath(s.crossName.trim(), NAME_FS) : null
    if (name) {
      const out = unit(add(crossDir, mul(t, -0.35)))
      place('cross', name, add(hi, mul(out, 6 + reach(name, out))), out)
    }
  }

  // Above the line: each part's ticks and label.
  const tickLines: [Vec, Vec][] = []
  s.parts.forEach((p, k) => {
    const m = P((at[k] + at[k + 1]) / 2)
    if (p.ticks) tickLines.push(...tickMarks(m, t, up, p.ticks, TICK_HALF, TICK_GAP))
    const box = partBoxes[k]
    if (box) place(`part:${k}`, box, add(m, mul(up, TICK_HALF + 6 + reach(box, up))), up)
  })

  // Just below: each point's dot and name, beside a crossing line rather than on it.
  const dots = s.points.flatMap((p, k) => (p.dot ? [points[k]] : []))
  let nameDepth = 0
  s.points.forEach((p, k) => {
    const box = p.name.trim() ? layoutMath(p.name.trim(), NAME_FS) : null
    if (!box) return
    let out = down
    if (k === crossing && crossDir) {
      // The crossing line leaves downward one way; the name goes down the other.
      const side = s.crossAngle <= 90 ? 1 : -1
      out = unit(add(down, mul(t, side * 1.3)))
    }
    const d = (k === crossing ? 12 : 9) + reach(box, out)
    place(`point:${k}`, box, add(points[k], mul(out, d)), out)
    nameDepth = Math.max(nameDepth, d + reach(box, down))
  })

  // Under the names: each span's brace and label, shorter spans nearer the line.
  const braces: string[] = []
  const order = s.spans.map((sp, k) => ({ sp, k })).sort((p, q) => p.sp.to - p.sp.from - (q.sp.to - q.sp.from) || p.sp.from - q.sp.from)
  const rows: { from: number; to: number }[][] = []
  const rowOf = new Map<number, number>()
  for (const { sp, k } of order) {
    let r = rows.findIndex((row) => row.every((o) => sp.to <= o.from || sp.from >= o.to))
    if (r < 0) r = rows.push([]) - 1
    rows[r].push(sp)
    rowOf.set(k, r)
  }
  // Below the names, and below the crossing line's arrow too.
  const crossDepth = crossing !== null ? CROSS * Math.sin(s.crossAngle * RAD) + 4 : 0
  let depth = Math.max(nameDepth, TICK_HALF, crossDepth) + 8
  const tips: Vec[] = []
  for (let r = 0; r < rows.length; r++) {
    let rowDepth = BRACE
    for (const { sp, k } of order) {
      if (rowOf.get(k) !== r) continue
      const [x1, x2] = [at[sp.from], at[sp.to]]
      braces.push(bracePath(P(x1, -depth), P(x2, -depth), down, BRACE))
      tips.push(P(x1, -depth), P(x2, -depth), P((x1 + x2) / 2, -depth - BRACE))
      const box = spanBoxes[k]
      if (box) {
        const tip = P((x1 + x2) / 2, -depth - BRACE)
        const d = 5 + reach(box, down)
        place(`span:${k}`, box, add(tip, mul(down, d)), down)
        rowDepth = Math.max(rowDepth, BRACE + d + reach(box, down))
      }
    }
    depth += rowDepth + 10
  }

  // The frame holds everything drawn.
  const all: Vec[] = [...points, ...lines.flat(), ...heads.flat(), ...openHeads.flat(), ...squares.flat(), ...tickLines.flat()]
  all.push(...tips)
  for (const l of labels) all.push([l.x, l.y - l.box.asc], [l.x + l.box.w, l.y + l.box.desc])
  for (const b of blanks) all.push([b.x1, b.y + 2], [b.x2, b.y - FS * 0.8])
  const minX = Math.min(...all.map((p) => p[0])) - PAD
  const minY = Math.min(...all.map((p) => p[1])) - PAD
  const maxX = Math.max(...all.map((p) => p[0])) + PAD
  const maxY = Math.max(...all.map((p) => p[1])) + PAD
  const frame = { x: r1(minX), y: r1(minY), w: r1(maxX - minX), h: r1(maxY - minY) }

  return {
    frame,
    lines,
    heads,
    openHeads,
    dots,
    dotR: DOT_R,
    tickLines,
    squares,
    braces,
    labels,
    blanks,
    solved,
    description: describe(s),
  }
}

/**
 * A curly brace from a to b, bulging `depth` toward n, with its point in the
 * middle: quarter curves at each end and either side of the point.
 */
export function bracePath(a: Vec, b: Vec, n: Vec, depth: number) {
  const along = sub(b, a)
  const L = Math.hypot(along[0], along[1])
  const t = unit(along)
  const q = Math.min(depth / 2, L / 4) // each curve's reach along the brace
  const h = depth / 2
  const m = mul(add(a, b), 0.5)
  const pt = (p: Vec) => `${r1(p[0])},${r1(p[1])}`
  const at = (base: Vec, u: number, v: number) => add(base, add(mul(t, u), mul(n, v)))
  return [
    `M${pt(a)}`,
    `Q${pt(at(a, 0, h))} ${pt(at(a, q, h))}`,
    `L${pt(at(m, -q, h))}`,
    `Q${pt(at(m, 0, h))} ${pt(at(m, 0, depth))}`,
    `Q${pt(at(m, 0, h))} ${pt(at(m, q, h))}`,
    `L${pt(at(b, -q, h))}`,
    `Q${pt(at(b, 0, h))} ${pt(b)}`,
  ].join(' ')
}

/** The figure in words, for screen readers. */
function describe(s: Settings) {
  const names = s.points.map((p, k) => p.name.trim() || `point ${k + 1}`)
  const kind = s.start === 'none' && s.end === 'none' ? 'a segment' : s.start !== 'none' && s.end !== 'none' ? 'a line' : 'a ray'
  const said = (label: string, mode: string) => (mode === 'blank' ? 'left blank' : mode === 'text' && label.trim() ? label.trim() : '')
  const parts = s.parts.map((p, k) => {
    const what = said(p.label, p.mode)
    const ticks = p.ticks ? ` with ${p.ticks} tick${p.ticks > 1 ? 's' : ''}` : ''
    if (!what && !ticks) return ''
    return `${partName(s, k)}${what ? (what === 'left blank' ? ' is left blank' : ` is ${what}`) : ''}${ticks}`
  })
  const spans = s.spans.map((sp) => {
    const what = said(sp.label, sp.mode)
    return `a brace under ${spanName(s, sp)}${what ? (what === 'left blank' ? ', left blank' : ` labeled ${what}`) : ''}`
  })
  const cross =
    s.cross >= 0 ? `A line${s.crossName.trim() ? ` ${s.crossName.trim()}` : ''} crosses at ${names[s.cross]}${s.crossAngle === 90 ? ', at a right angle' : ` at ${s.crossAngle}°`}.` : ''
  return [
    `Points ${names.join(', ')} in order on ${kind}.`,
    [...parts, ...spans].filter(Boolean).join('; ') + '.',
    cross,
  ]
    .filter((x) => x && x !== '.')
    .join(' ')
}
