// Where a food web's or food chain's organisms and arrows go. A web is drawn
// in rows by trophic level, producers along the bottom and top predators
// at the top, with decomposers in a column on the right.
// Each row's order is chosen to cut arrow crossings: a few barycentre sweeps,
// kept only when they cross less than the order the web was written in.
//
// An arrow runs from the top of the eaten's box to the bottom of its
// eater's name, straight when nothing is in the way. One that would pass
// through a row of organisms threads through the gap between two of them
// (or beside the row) instead, curving through the lanes between rows,
// where nothing else is; one between two organisms in the same row arcs
// over it. So no arrow ever passes through an organism.

import { textWidth, wrap } from '$lib/generators/cell-diagram/labels'
import { LABEL_SCALE, type LabelSize } from '$shared/labelSize'
import { levelsOf, nameOf, type Entry, type Placed, type Web } from './web'
import type { Direction, LabelMode, Wording } from './settings'

export const PICTURE = 64
/** the box around a picture: the picture and its padding */
export const BOX = PICTURE + 12
export const NAME_GAP = 5
const NAME_MAX = 116
export const BLANK_WIDTH = 84
const COL_GAP = 40
const ROW_GAP = 68
const PORT_GAP = 4
const LABEL_GAP = 28
const DECOMPOSER_GAP = 96
const CHAIN_ARROW = 58
/** how far an arrow keeps from any box it doesn't start or end at */
const CLEAR = 6

export interface Pt {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Node {
  key: string
  entry: Entry
  placed: Placed
  name: string
  /** the name as drawn, wrapped; empty when it is blank */
  lines: string[]
  /** the box's centre across, and its top */
  x: number
  top: number
  /** the box: a picture's, or for an organism with no picture, its name's */
  boxWidth: number
  boxHeight: number
  /** the node's width (box or name, whichever is wider) and height (box and name) */
  width: number
  height: number
}

export interface Arrow {
  from: string
  to: string
  /** the path, ending where the arrowhead's base sits */
  d: string
  /** the arrowhead's tip, and the direction it points */
  tip: Pt
  angle: number
  dashed: boolean
}

export interface SideLabel {
  text: string
  x: number
  y: number
  anchor: 'start' | 'middle'
}

export interface Layout {
  nodes: Node[]
  arrows: Arrow[]
  /** the dashed dead-matter lines to the decomposers' column (no heads) */
  lines: string[]
  labels: SideLabel[]
  width: number
  height: number
  font: number
}

export interface LayoutOptions {
  labelSize: LabelSize
  decomposers: boolean
  levelLabels: LabelMode
  wording: Wording
}

export const fontOf = (labelSize: LabelSize) => 15 * LABEL_SCALE[labelSize]
export const lineHeight = (font: number) => font * 1.2

/** Everything an organism takes up: its box and its name. */
export const extentOf = (n: Node): Rect => ({ x: n.x - n.width / 2, y: n.top, width: n.width, height: n.height })

const blankName = (e: Entry) => e.blank === 'n' || e.blank === 'b'

function sizeNode(entry: Entry, placed: Placed, font: number): Omit<Node, 'x' | 'top'> {
  const name = nameOf(entry)
  const lines = blankName(entry) ? [] : wrap(name, font, NAME_MAX)
  const textW = blankName(entry) ? BLANK_WIDTH : Math.max(...lines.map((l) => textWidth(l, font)))
  const rows = Math.max(1, lines.length)
  if (entry.picture === 'none') {
    // No picture: the name in a box of its own.
    const boxWidth = Math.max(BOX, textW + 24)
    const boxHeight = Math.max(BOX * 0.6, rows * lineHeight(font) + 18)
    return { key: entry.key, entry, placed, name, lines, boxWidth, boxHeight, width: boxWidth, height: boxHeight }
  }
  return { key: entry.key, entry, placed, name, lines, boxWidth: BOX, boxHeight: BOX, width: Math.max(BOX, textW), height: BOX + NAME_GAP + rows * lineHeight(font) }
}

// ---- Trophic level names ------------------------------------------------

const ORDINALS = ['', '', 'Primary', 'Secondary', 'Tertiary', 'Quaternary']

/** A trophic level's name, for a row (plural) or one organism. */
export function levelName(level: number | null, plural: boolean) {
  const s = plural ? 's' : ''
  if (level === null) return `Decomposer${s}`
  if (level === 1) return `Producer${s}`
  return level < ORDINALS.length ? `${ORDINALS[level]} consumer${s}` : `Level ${level} consumer${s}`
}

export type Diet = 'producer' | 'herbivore' | 'carnivore' | 'omnivore' | 'detritivore' | 'decomposer'

/** What an organism eats: plants (herbivore), animals (carnivore), both
 *  (omnivore), or dead matter (detritivore). */
export function dietOf(web: Web, placed: Map<string, Placed>, key: string): Diet {
  const p = placed.get(key)!
  if (p.role === 'decomposer') return 'decomposer'
  if (p.role === 'producer') return 'producer'
  const foods = p.entry.eats.map((k) => placed.get(k)!)
  const plants = foods.some((f) => f.role === 'producer')
  const animals = foods.some((f) => f.role === 'consumer')
  if (plants && animals) return 'omnivore'
  if (plants) return 'herbivore'
  if (animals) return 'carnivore'
  return 'detritivore'
}

const DIET_NAMES: Record<Diet, string> = {
  producer: 'Producer', herbivore: 'Herbivore', carnivore: 'Carnivore', omnivore: 'Omnivore',
  detritivore: 'Detritivore', decomposer: 'Decomposer',
}
export const dietName = (diet: Diet, plural: boolean) => (plural ? `${DIET_NAMES[diet]}s` : DIET_NAMES[diet])

/** A row's label in the diet wording: its organisms' diets, in a fixed order. */
function dietRowName(diets: Diet[]) {
  const order: Diet[] = ['producer', 'herbivore', 'detritivore', 'omnivore', 'carnivore', 'decomposer']
  const names = order.filter((d) => diets.includes(d)).map((d) => dietName(d, true).toLowerCase())
  const text = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// ---- Row order ----------------------------------------------------------

type Edge = [food: string, eater: string]

function properCross(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0
}

/** Each node at its index in its row, rows centred, one row apart. */
function slots(rows: string[][]) {
  const at = new Map<string, Pt>()
  rows.forEach((row, r) => row.forEach((k, i) => at.set(k, { x: i - (row.length - 1) / 2, y: r })))
  return at
}

/** How many pairs of arrows cross, drawn straight between slots. */
export function crossings(rows: string[][], edges: Edge[]) {
  const at = slots(rows)
  const segs = edges.filter(([a, b]) => at.has(a) && at.has(b)).map(([a, b]) => ({ a, b, p: at.get(a)!, q: at.get(b)! }))
  let n = 0
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++) {
      const s = segs[i], t = segs[j]
      if (s.a === t.a || s.a === t.b || s.b === t.a || s.b === t.b) continue
      if (properCross(s.p, s.q, t.p, t.q)) n++
    }
  return n
}

/** Rows reordered to cut crossings: barycentre sweeps down and up, each
 *  node moved toward the mean place of everything it's linked to. The best
 *  order seen is kept, starting from the order given, so it never crosses
 *  more than that. */
export function orderRows(rows: string[][], edges: Edge[], sweeps = 4): string[][] {
  const linked = new Map<string, string[]>()
  for (const [a, b] of edges) {
    linked.set(a, [...(linked.get(a) ?? []), b])
    linked.set(b, [...(linked.get(b) ?? []), a])
  }
  let best = rows.map((r) => [...r])
  let bestCount = crossings(best, edges)
  let current = best.map((r) => [...r])
  for (let s = 0; s < sweeps && bestCount > 0; s++) {
    const order = s % 2 === 0 ? current.map((_, i) => i) : current.map((_, i) => current.length - 1 - i)
    for (const r of order) {
      const at = slots(current)
      const row = current[r]
      const centre = (k: string, i: number) => {
        const others = (linked.get(k) ?? []).filter((o) => at.has(o) && at.get(o)!.y !== r)
        return others.length ? others.reduce((sum, o) => sum + at.get(o)!.x, 0) / others.length : at.get(k)!.x + 0 * i
      }
      current[r] = row
        .map((k, i) => ({ k, i, c: centre(k, i) }))
        .sort((a, b) => a.c - b.c || a.i - b.i)
        .map((n) => n.k)
    }
    const count = crossings(current, edges)
    if (count < bestCount) {
      best = current.map((r) => [...r])
      bestCount = count
    }
  }
  // Then neighbours swapped wherever that crosses less, until none does.
  for (let pass = 0; pass < 8 && bestCount > 0; pass++) {
    let better = false
    for (const row of best) {
      for (let i = 0; i + 1 < row.length; i++) {
        ;[row[i], row[i + 1]] = [row[i + 1], row[i]]
        const count = crossings(best, edges)
        if (count < bestCount) {
          bestCount = count
          better = true
        } else [row[i], row[i + 1]] = [row[i + 1], row[i]]
      }
    }
    if (!better) break
  }
  return best
}

// ---- Paths --------------------------------------------------------------

const f = (n: number) => String(Math.round(n * 10) / 10)

/** An arrowhead's length and half its width. */
export const HEAD = { length: 12, half: 5.5 }

/** The points along a path drawn from segments, sampled finely, for checking it clears every box. */
type Segment = { kind: 'line'; to: Pt } | { kind: 'cubic'; c1: Pt; c2: Pt; to: Pt } | { kind: 'quad'; c: Pt; to: Pt }

function sample(start: Pt, segs: Segment[], step = 3): Pt[] {
  const pts: Pt[] = [start]
  let at = start
  for (const s of segs) {
    const len = Math.hypot(s.to.x - at.x, s.to.y - at.y)
    const n = Math.max(2, Math.ceil(len / step))
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t
      if (s.kind === 'line') pts.push({ x: at.x + (s.to.x - at.x) * t, y: at.y + (s.to.y - at.y) * t })
      else if (s.kind === 'quad') pts.push({ x: u * u * at.x + 2 * u * t * s.c.x + t * t * s.to.x, y: u * u * at.y + 2 * u * t * s.c.y + t * t * s.to.y })
      else
        pts.push({
          x: u ** 3 * at.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t ** 3 * s.to.x,
          y: u ** 3 * at.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t ** 3 * s.to.y,
        })
    }
    at = s.to
  }
  return pts
}

const inside = (p: Pt, r: Rect, pad: number) => p.x > r.x - pad && p.x < r.x + r.width + pad && p.y > r.y - pad && p.y < r.y + r.height + pad

/** The arrow drawn from segments, shortened at its end by the arrowhead. */
function arrowFrom(from: string, to: string, start: Pt, segs: Segment[], dashed: boolean): Arrow {
  const last = segs[segs.length - 1]
  const prev = segs.length > 1 ? segs[segs.length - 2].to : start
  const toward = last.kind === 'line' ? prev : last.kind === 'quad' ? last.c : last.c2
  const len = Math.hypot(last.to.x - toward.x, last.to.y - toward.y) || 1
  const ux = (last.to.x - toward.x) / len, uy = (last.to.y - toward.y) / len
  const tip = last.to
  const base = { x: tip.x - ux * HEAD.length, y: tip.y - uy * HEAD.length }
  const shift = { x: base.x - tip.x, y: base.y - tip.y }
  const end: Segment =
    last.kind === 'line'
      ? { kind: 'line', to: base }
      : last.kind === 'quad'
        ? { kind: 'quad', c: last.c, to: base }
        : { kind: 'cubic', c1: last.c1, c2: { x: last.c2.x + shift.x, y: last.c2.y + shift.y }, to: base }
  const all = [...segs.slice(0, -1), end]
  let d = `M${f(start.x)} ${f(start.y)}`
  for (const s of all) {
    if (s.kind === 'line') d += `L${f(s.to.x)} ${f(s.to.y)}`
    else if (s.kind === 'quad') d += `Q${f(s.c.x)} ${f(s.c.y)} ${f(s.to.x)} ${f(s.to.y)}`
    else d += `C${f(s.c1.x)} ${f(s.c1.y)} ${f(s.c2.x)} ${f(s.c2.y)} ${f(s.to.x)} ${f(s.to.y)}`
  }
  return { from, to, d, tip, angle: (Math.atan2(uy, ux) * 180) / Math.PI, dashed }
}

/** The arrowhead at an arrow's tip, as a path. */
export function headPath(a: Pick<Arrow, 'tip' | 'angle'>) {
  const t = (a.angle * Math.PI) / 180
  const ux = Math.cos(t), uy = Math.sin(t)
  const bx = a.tip.x - ux * HEAD.length, by = a.tip.y - uy * HEAD.length
  return `M${f(a.tip.x)} ${f(a.tip.y)}L${f(bx - uy * HEAD.half)} ${f(by + ux * HEAD.half)}L${f(bx + uy * HEAD.half)} ${f(by - ux * HEAD.half)}Z`
}

// ---- Webs ---------------------------------------------------------------

export function layoutWeb(web: Web, o: LayoutOptions): Layout {
  const font = fontOf(o.labelSize)
  const placed = levelsOf(web)
  const shown = web.filter((e) => o.decomposers || placed.get(e.key)!.role !== 'decomposer')
  const sized = new Map(shown.map((e) => [e.key, sizeNode(e, placed.get(e.key)!, font)]))
  const ranked = shown.filter((e) => placed.get(e.key)!.level !== null)
  const decomposers = shown.filter((e) => placed.get(e.key)!.level === null)

  // Rows, top predators first; only levels something is at.
  const levels = [...new Set(ranked.map((e) => placed.get(e.key)!.level!))].sort((a, b) => b - a)
  const given = levels.map((l) => ranked.filter((e) => placed.get(e.key)!.level === l).map((e) => e.key))
  const edges: Edge[] = shown.flatMap((e) => e.eats.filter((k) => sized.has(k)).map((k) => [k, e.key] as Edge))
  const rows = orderRows(given, edges)

  // Rows' heights, and their tops.
  const rowHeight = rows.map((row) => Math.max(...row.map((k) => sized.get(k)!.height)))
  const tops: number[] = []
  let y = 0
  for (const h of rowHeight) {
    tops.push(y)
    y += h + ROW_GAP
  }
  const webHeight = y - ROW_GAP

  // Side labels, if any, take a column on the left.
  const rowLabels = rows.map((row, r) => {
    if (o.levelLabels === 'none') return ''
    if (o.wording === 'diet') return dietRowName(row.map((k) => dietOf(web, placed, k)))
    return levelName(levels[r], true)
  })
  // By diet, rows of carnivores above rows of carnivores: the top one is the top carnivores.
  if (o.wording === 'diet' && rowLabels.length > 1 && rowLabels[0] === rowLabels[1] && rowLabels[0] === dietName('carnivore', true)) {
    rowLabels[0] = 'Top carnivores'
  }
  const decomposerLabel = o.wording === 'diet' ? dietName('decomposer', true) : levelName(null, true)
  const labelWidth =
    o.levelLabels === 'none' ? 0 : o.levelLabels === 'blank' ? BLANK_WIDTH + LABEL_GAP : Math.max(...rowLabels.map((t) => textWidth(t, font))) + LABEL_GAP
  const rowWidth = rows.map((row) => row.reduce((w, k) => w + sized.get(k)!.width, 0) + (row.length - 1) * COL_GAP)
  const inner = Math.max(BOX, ...rowWidth)
  const nodes: Node[] = []
  rows.forEach((row, r) => {
    let x = labelWidth + (inner - rowWidth[r]) / 2
    for (const k of row) {
      const s = sized.get(k)!
      nodes.push({ ...s, x: x + s.width / 2, top: tops[r] + (rowHeight[r] - s.height) / 2 })
      x += s.width + COL_GAP
    }
  })
  const right = labelWidth + inner

  // Decomposers stacked down a column on the right, centred on the rows.
  const lines: string[] = []
  const arrows: Arrow[] = []
  let width = right
  if (decomposers.length) {
    const col = right + DECOMPOSER_GAP
    const total = decomposers.reduce((h, e) => h + sized.get(e.key)!.height, 0) + (decomposers.length - 1) * 28
    let dy = Math.max(0, (webHeight - total) / 2)
    const colWidth = Math.max(...decomposers.map((e) => sized.get(e.key)!.width))
    for (const e of decomposers) {
      const s = sized.get(e.key)!
      nodes.push({ ...s, x: col + colWidth / 2, top: dy })
      dy += s.height + 28
    }
    width = col + colWidth
  }
  const byKey = new Map(nodes.map((n) => [n.key, n]))
  const rowOf = new Map(rows.flatMap((row, r) => row.map((k) => [k, r] as const)))
  const obstacles = nodes.map((n) => ({ key: n.key, rect: extentOf(n) }))

  // Ports: each arrow's end on the top or bottom of a node, spread along it
  // in the order of whatever is at the arrow's other end.
  type Use = { edge: number; other: Node }
  const topUses = new Map<string, Use[]>()
  const bottomUses = new Map<string, Use[]>()
  const use = (m: Map<string, Use[]>, key: string, u: Use) => m.set(key, [...(m.get(key) ?? []), u])
  const routed = edges.filter(([a, b]) => rowOf.has(a) && rowOf.has(b))
  routed.forEach(([food, eater], i) => {
    const fr = rowOf.get(food)!, er = rowOf.get(eater)!
    const fn = byKey.get(food)!, en = byKey.get(eater)!
    if (er < fr) {
      use(topUses, food, { edge: i, other: en })
      use(bottomUses, eater, { edge: i, other: fn })
    } else if (er > fr) {
      use(bottomUses, food, { edge: i, other: en })
      use(topUses, eater, { edge: i, other: fn })
    } else {
      use(topUses, food, { edge: i, other: en })
      use(topUses, eater, { edge: i, other: fn })
    }
  })
  const portX = new Map<string, number>() // `${edge}:${key}`
  for (const uses of [topUses, bottomUses]) {
    for (const [key, list] of uses) {
      const n = byKey.get(key)!
      list.sort((a, b) => a.other.x - b.other.x || a.edge - b.edge)
      const spread = Math.min(14, (n.boxWidth - 20) / Math.max(1, list.length - 1))
      list.forEach((u, i) => portX.set(`${u.edge}:${key}`, n.x + (i - (list.length - 1) / 2) * spread))
    }
  }
  const topY = (n: Node) => n.top - PORT_GAP
  const bottomY = (n: Node) => n.top + n.height + PORT_GAP

  /** Free x ranges in a row, beside and between its organisms. */
  const gapsOf = (r: number) => {
    const row = rows[r].map((k) => byKey.get(k)!)
    const out: [number, number][] = []
    let left = -Infinity
    for (const n of row) {
      out.push([left, n.x - n.width / 2 - CLEAR - 3])
      left = n.x + n.width / 2 + CLEAR + 3
    }
    out.push([left, Infinity])
    return out
  }
  const clearOf = (pts: Pt[], skip: string[]) => pts.every((p) => obstacles.every((ob) => skip.includes(ob.key) || !inside(p, ob.rect, CLEAR - 2)))

  // Where each arrow passes the rows between its ends: through the gap
  // nearest where a straight arrow would cross the row, well inside it, the
  // arrows sharing a gap spread apart.
  type Passage = { edge: number; row: number; gap: number; lineX: number; x: number }
  const passages: Passage[] = []
  const ends = routed.map(([food, eater], i) => {
    const fn = byKey.get(food)!, en = byKey.get(eater)!
    const fr = rowOf.get(food)!, er = rowOf.get(eater)!
    const up = er < fr
    const a = { x: portX.get(`${i}:${food}`)!, y: fr === er || up ? topY(fn) : bottomY(fn) }
    const b = { x: portX.get(`${i}:${eater}`)!, y: fr === er ? topY(en) : up ? bottomY(en) : topY(en) }
    const straight = fr !== er && clearOf(sample(a, [{ kind: 'line', to: b }]), [food, eater])
    if (fr !== er && !straight) {
      for (const r of up ? range(fr - 1, er) : range(fr + 1, er)) {
        const midY = tops[r] + rowHeight[r] / 2
        const lineX = a.x + ((b.x - a.x) * (midY - a.y)) / (b.y - a.y)
        const gaps = gapsOf(r)
        const gap = gaps.reduce((best, g, gi) => (gapDistance(g, lineX) < gapDistance(gaps[best], lineX) ? gi : best), 0)
        passages.push({ edge: i, row: r, gap, lineX, x: lineX })
      }
    }
    return { a, b, up, same: fr === er, straight }
  })
  const shared = new Map<string, Passage[]>()
  for (const p of passages) shared.set(`${p.row}:${p.gap}`, [...(shared.get(`${p.row}:${p.gap}`) ?? []), p])
  for (const [id, list] of shared) {
    const [r, gi] = id.split(':').map(Number)
    const [lo, hi] = gapsOf(r)[gi]
    list.sort((p, q) => p.lineX - q.lineX || p.edge - q.edge)
    const step = 9
    const span = (list.length - 1) * step
    // Well inside the gap: its middle if it is narrow, otherwise near where the arrows would cross.
    const inset = 16
    const wantLo = Number.isFinite(lo) ? lo + inset : -Infinity
    const wantHi = Number.isFinite(hi) ? hi - inset : Infinity
    let start = list.reduce((sum, p) => sum + p.lineX, 0) / list.length - span / 2
    start = Math.max(wantLo, Math.min(wantHi - span, start))
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi - lo < span + 2 * inset) start = (lo + hi) / 2 - span / 2
    list.forEach((p, i) => (p.x = start + i * step))
  }

  routed.forEach(([food, eater], i) => {
    const { a, b, up, same, straight } = ends[i]
    if (same) {
      // Same row: an arc over it, from the top of one to the top of the other.
      const rise = Math.min(ROW_GAP * 1.5, 30 + Math.abs(b.x - a.x) * 0.25)
      const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - rise }
      arrows.push(arrowFrom(food, eater, a, [{ kind: 'quad', c, to: b }], false))
      return
    }
    if (straight) {
      arrows.push(arrowFrom(food, eater, a, [{ kind: 'line', to: b }], false))
      return
    }
    // Through each row between, straight up (or down) its gap, curving
    // through the lanes between rows, where nothing is.
    const segs: Segment[] = []
    let at = a
    const dir = up ? -1 : 1
    const curveTo = (to: Pt) => {
      const k = Math.abs(to.y - at.y) * 0.5
      segs.push({ kind: 'cubic', c1: { x: at.x, y: at.y + dir * k }, c2: { x: to.x, y: to.y - dir * k }, to })
      at = to
    }
    for (const p of passages.filter((p) => p.edge === i)) {
      const r = p.row
      const enter = up ? tops[r] + rowHeight[r] + 2 : tops[r] - 2
      const leave = up ? tops[r] - 2 : tops[r] + rowHeight[r] + 2
      curveTo({ x: p.x, y: enter })
      segs.push({ kind: 'line', to: { x: p.x, y: leave } })
      at = { x: p.x, y: leave }
    }
    curveTo(b)
    arrows.push(arrowFrom(food, eater, a, segs, false))
  })

  // Dead matter: a dashed line from the end of every row to a trunk beside
  // the decomposers, and an arrow from it to each one.
  const shownDecomposers = nodes.filter((n) => n.placed.level === null)
  if (shownDecomposers.length && rows.length) {
    const trunk = right + DECOMPOSER_GAP / 2
    const ys: number[] = []
    rows.forEach((row, r) => {
      const last = byKey.get(row[row.length - 1])!
      const yMid = last.top + last.boxHeight / 2
      lines.push(`M${f(last.x + last.width / 2 + PORT_GAP + 4)} ${f(yMid)}H${f(trunk)}`)
      ys.push(yMid)
    })
    for (const n of shownDecomposers) {
      const yMid = n.top + n.boxHeight / 2
      ys.push(yMid)
      const tip = { x: n.x - n.boxWidth / 2 - PORT_GAP, y: yMid }
      arrows.push(arrowFrom('', n.key, { x: trunk, y: yMid }, [{ kind: 'line', to: tip }], true))
    }
    lines.push(`M${f(trunk)} ${f(Math.min(...ys))}V${f(Math.max(...ys))}`)
  }

  const labels: SideLabel[] = []
  if (o.levelLabels !== 'none') {
    rows.forEach((row, r) => labels.push({ text: rowLabels[r], x: 0, y: tops[r] + rowHeight[r] / 2, anchor: 'start' }))
    for (const n of shownDecomposers) labels.push({ text: decomposerLabel, x: n.x, y: n.top + n.height + lineHeight(font) * 0.9, anchor: 'middle' })
  }
  const height = Math.max(webHeight, ...nodes.map((n) => n.top + n.height)) + (o.levelLabels !== 'none' && shownDecomposers.length ? lineHeight(font) * 1.4 : 0)
  return { nodes, arrows, lines, labels, width, height, font }
}

const range = (from: number, to: number) => {
  const out: number[] = []
  if (from < to) for (let i = from; i < to; i++) out.push(i)
  else for (let i = from; i > to; i--) out.push(i)
  return out
}
const gapDistance = ([lo, hi]: [number, number], x: number) => (x < lo ? lo - x : x > hi ? x - hi : 0)

// ---- Chains -------------------------------------------------------------

/** A food chain: its organisms left to right or bottom to top, an arrow
 *  from each to the next, and each one's level beside it if wanted. */
export function layoutChain(web: Web, keys: string[], direction: Direction, o: LayoutOptions): Layout {
  const font = fontOf(o.labelSize)
  const placed = levelsOf(web)
  const entries = keys.map((k) => web.find((e) => e.key === k)!).filter(Boolean)
  const sized = entries.map((e) => sizeNode(e, placed.get(e.key)!, font))
  // Its level in the chain: producer, primary consumer…
  const chainLevel = (i: number) => i + 1
  const text = (i: number) => {
    if (o.wording === 'diet') {
      const level = chainLevel(i)
      return level === 1 ? dietName('producer', false) : level === 2 ? dietName('herbivore', false) : dietName('carnivore', false)
    }
    return levelName(chainLevel(i), false)
  }
  const nodes: Node[] = []
  const arrows: Arrow[] = []
  const labels: SideLabel[] = []
  const lh = lineHeight(font)
  let width: number, height: number
  if (direction === 'right') {
    const labelH = o.levelLabels === 'none' ? 0 : lh * 1.6
    const tall = Math.max(...sized.map((s) => s.height))
    let x = 0
    sized.forEach((s, i) => {
      const w = Math.max(s.width, o.levelLabels === 'text' ? textWidth(text(i), font) : o.levelLabels === 'blank' ? BLANK_WIDTH : 0)
      nodes.push({ ...s, x: x + w / 2, top: labelH })
      if (o.levelLabels !== 'none') labels.push({ text: text(i), x: x + w / 2, y: lh * 0.6, anchor: 'middle' })
      x += w + CHAIN_ARROW
    })
    width = x - CHAIN_ARROW
    height = labelH + tall
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1], b = nodes[i]
      const y = labelH + BOX / 2
      arrows.push(arrowFrom(a.key, b.key, { x: a.x + a.boxWidth / 2 + PORT_GAP + 2, y }, [{ kind: 'line', to: { x: b.x - b.boxWidth / 2 - PORT_GAP - 2, y } }], false))
    }
  } else {
    const labelW = o.levelLabels === 'none' ? 0 : (o.levelLabels === 'blank' ? BLANK_WIDTH : Math.max(...sized.map((_, i) => textWidth(text(i), font)))) + LABEL_GAP
    const wide = Math.max(...sized.map((s) => s.width))
    let y = 0
    const tops: number[] = []
    for (let i = sized.length - 1; i >= 0; i--) {
      tops[i] = y
      y += sized[i].height + CHAIN_ARROW - 10
    }
    height = y - (CHAIN_ARROW - 10)
    width = labelW + wide
    sized.forEach((s, i) => {
      nodes.push({ ...s, x: labelW + wide / 2, top: tops[i] })
      if (o.levelLabels !== 'none') labels.push({ text: text(i), x: 0, y: tops[i] + sized[i].boxHeight / 2, anchor: 'start' })
    })
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1], b = nodes[i]
      arrows.push(arrowFrom(a.key, b.key, { x: a.x, y: a.top - PORT_GAP }, [{ kind: 'line', to: { x: b.x, y: b.top + b.height + PORT_GAP } }], false))
    }
  }
  return { nodes, arrows, lines: [], labels, width, height, font }
}
