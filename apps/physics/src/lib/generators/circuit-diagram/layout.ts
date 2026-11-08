// Where everything in a Circuit Diagram goes, laid out from the tree.
//
// Each item is first laid out as a block in its own frame, with the current
// travelling along +x from (0, 0) to (len, 0). "Up" (−y) is the left of the
// direction of travel and "down" (+y) its right. A series run puts its blocks
// end to end; a parallel group stacks its branches downward between two
// buses. The loop is a rectangle traced clockwise, so the right of travel is
// always the inside of the loop: parallel groups bulge inward, and names go
// outside while values go inside. Each side's block is then turned into
// place. Blocks never overlap because each one's extents, labels included,
// are known before it's placed, so wires never cross.

import type { Label } from '$lib/shared/label'
import { labelRuns } from '$lib/shared/label'
import type { Segment } from '$lib/shared/vector'
import type { Arrow, Circuit, Group, Item, Part, PartKind } from './tree'

export interface Pt {
  x: number
  y: number
}

export type Anchor = 'start' | 'middle' | 'end'

export interface PlacedPart {
  part: Part
  x: number
  y: number
  /** Which way the current travels through it, in degrees clockwise from +x. */
  angle: number
}

export interface PlacedLabel {
  label: Label
  /** The middle, left or right end of its baseline (by anchor). */
  x: number
  y: number
  anchor: Anchor
}

export interface CircuitFigure {
  width: number
  height: number
  wires: Pt[][]
  /** Junction dots, where three wires meet. */
  dots: Pt[]
  parts: PlacedPart[]
  /** Voltmeters' circles (their letters are in letters). */
  meters: Pt[]
  /** Lettered points on wires (their letters are labels). */
  points: Pt[]
  /** Current arrows, beside their wires (their labels are in labels). */
  arrows: Segment[]
  labels: PlacedLabel[]
  /** Upright text centered on a point, like the letter in a meter. */
  letters: Letter[]
  /** Where the chart title's baseline middle goes, when it has one. */
  title: Pt | null
}

export interface Letter {
  text: string
  x: number
  y: number
  size: number
}

export interface LayoutOptions {
  title: boolean
  /** + and − beside each battery. */
  polarity: boolean
  /** A two-terminal network instead of a closed loop. */
  topology?: 'loop' | 'open'
}

export const LABEL_SIZE = 20
const ASCENT = LABEL_SIZE * 0.72
const DESCENT = LABEL_SIZE * 0.3
const LABEL_GAP = 6
const BLANK = 34
/** How long a part is along its wire, its symbol included. */
const PART_LEN = 68
const BUS = 16
const BRANCH_GAP = 14
const MIN_CORNER = 34
const CLEAR = 22
const MIN_SIDE = 150
/** How long the loop's top (then its right side) can get before parts move on round the loop. */
const MAX_TOP = 430
const MAX_RIGHT = 300
/** A top this long is kept whole; past it, the top takes about 60% of the loop and the rest goes down the right, so a long loop isn't one flat line. */
const EVEN_TOP = 280
const MARGIN = 16
const TITLE_SIZE = 24

/** Half a symbol's length along the wire, and its half-height either side of it. */
export function symbolSize(part: Part): { half: number; up: number; down: number } {
  const SIZES: Record<PartKind, { half: number; up: number; down: number }> = {
    battery: { half: part.cells * 10 - 5, up: 17, down: 17 },
    resistor: { half: 22, up: 9, down: 9 },
    bulb: { half: 15, up: 15, down: 15 },
    led: { half: 30, up: 20, down: 11.1 },
    diode: { half: 30, up: 11.1, down: 11.1 },
    switch: { half: 17, up: part.open ? 18 : 4, down: 4 },
    ammeter: { half: 15, up: 15, down: 15 },
  }
  return SIZES[part.kind]
}

// Label sizes, estimated from their text (a figure is drawn without a browser).

const shows = (label: Label | null): label is Label => !!label && (label.mode === 'blank' || (label.mode === 'text' && label.text.trim() !== ''))

/** How wide a label is drawn. */
export function labelWidth(label: Label): number {
  if (label.mode === 'blank') return BLANK
  return labelRuns(label.text).reduce((w, run) => w + [...run.text].length * LABEL_SIZE * 0.56 * (run.shift ? 0.7 : 1), 0)
}
const labelHeight = (label: Label) => ASCENT + DESCENT + (labelRuns(label.text).some((r) => r.shift === 'sub') ? LABEL_SIZE * 0.15 : 0)

/** How far a label reaches out from the wire's side, and how much room it takes along the wire. */
const labelReach = (label: Label, vertical: boolean) => (vertical ? labelWidth(label) : labelHeight(label))
const labelAlong = (label: Label, vertical: boolean) => (vertical ? labelHeight(label) : labelWidth(label))

// Blocks, in their own frame.

type Prim =
  | { t: 'wire'; pts: Pt[] }
  | { t: 'dot'; at: Pt }
  | { t: 'part'; part: Part; at: Pt }
  /** A voltmeter's circle. */
  | { t: 'meter'; at: Pt }
  /** A lettered point on a wire (its letter is a label). */
  | { t: 'point'; at: Pt }
  /** A current arrow, drawn beside its wire. */
  | { t: 'arrow'; from: Pt; to: Pt }
  /** A label beside `at`, on the up (−1) or down (+1) side. */
  | { t: 'label'; label: Label; at: Pt; side: -1 | 1 }
  /** Upright text centered on `at`: a meter's letter, or a battery's + or − (drawn only when polarity marks are on). */
  | { t: 'letter'; text: string; at: Pt; size: number; polarity: boolean }

interface Block {
  len: number
  up: number
  down: number
  prims: Prim[]
}

const shift = (prims: Prim[], du: number, dv: number): Prim[] =>
  prims.map((p) => {
    const move = (q: Pt) => ({ x: q.x + du, y: q.y + dv })
    if (p.t === 'wire') return { ...p, pts: p.pts.map(move) }
    if (p.t === 'arrow') return { ...p, from: move(p.from), to: move(p.to) }
    return { ...p, at: move(p.at) }
  })

function partBlock(part: Part, vertical: boolean): Block {
  const size = symbolSize(part)
  const name = shows(part.name) ? part.name : null
  const value = shows(part.value) ? part.value : null
  const along = Math.max(name ? labelAlong(name, vertical) : 0, value ? labelAlong(value, vertical) : 0)
  const len = Math.max(PART_LEN, 2 * size.half + 20, along + 16)
  const mid = len / 2
  const prims: Prim[] = [
    { t: 'wire', pts: [{ x: 0, y: 0 }, { x: mid - size.half, y: 0 }] },
    { t: 'wire', pts: [{ x: mid + size.half, y: 0 }, { x: len, y: 0 }] },
    { t: 'part', part, at: { x: mid, y: 0 } },
  ]
  if (part.kind === 'ammeter') prims.push({ t: 'letter', text: 'A', at: { x: mid, y: 0 }, size: 18, polarity: false })
  if (part.kind === 'battery') {
    // + by the long plate (forward, unless it's turned round) and − by the
    // short one, just off the ends of the plates, inside the symbol's height.
    const plus = part.flip ? -1 : 1
    const off = size.half + 9
    prims.push(
      { t: 'letter', text: '+', at: { x: mid + plus * off, y: -10 }, size: 16, polarity: true },
      { t: 'letter', text: '−', at: { x: mid - plus * off, y: -10 }, size: 16, polarity: true },
    )
  }
  if (name) prims.push({ t: 'label', label: name, at: { x: mid, y: -size.up }, side: -1 })
  if (value) prims.push({ t: 'label', label: value, at: { x: mid, y: size.down }, side: 1 })
  return {
    len,
    up: size.up + (name ? LABEL_GAP + labelReach(name, vertical) : 0),
    down: size.down + (value ? LABEL_GAP + labelReach(value, vertical) : 0),
    prims,
  }
}

/** Blocks end to end. A point in the gap after an item gets a stretch of wire of its own. */
function seriesBlock(items: Item[], vertical: boolean): Block {
  const block: Block = { len: 0, up: 0, down: 0, prims: [] }
  const add = (b: Block) => {
    block.prims.push(...shift(b.prims, block.len, 0))
    block.len += b.len
    block.up = Math.max(block.up, b.up)
    block.down = Math.max(block.down, b.down)
  }
  for (const item of items) {
    add(itemBlock(item, vertical))
    if (item.point) add(pointBlock(item.point, vertical))
  }
  return block
}

const POINT_LEAD = 30
export const POINT_R = 3.8

/** A stretch of wire with a lettered point in the middle, its label on the outer side. */
function pointBlock(label: Label, vertical: boolean): Block {
  const shown = shows(label) ? label : null
  const len = Math.max(POINT_LEAD, shown ? labelAlong(shown, vertical) + 12 : 0)
  const prims: Prim[] = [
    { t: 'wire', pts: [{ x: 0, y: 0 }, { x: len, y: 0 }] },
    { t: 'point', at: { x: len / 2, y: 0 } },
  ]
  if (shown) prims.push({ t: 'label', label: shown, at: { x: len / 2, y: -POINT_R }, side: -1 })
  return { len, up: POINT_R + (shown ? LABEL_GAP + labelReach(shown, vertical) : 0), down: POINT_R, prims }
}

const ARROW_LEN = 30
const ARROW_OFFSET = 11
export const ARROW_HEAD = 10

/** A stretch of wire before a block with a current arrow beside it, on the outer side, then the block. */
function withArrow(inner: Block, arrow: Arrow, vertical: boolean): Block {
  const shown = shows(arrow.label) ? arrow.label : null
  const lead = Math.max(ARROW_LEN + 20, shown ? labelAlong(shown, vertical) + 12 : 0)
  const [from, to] = arrow.dir === 'forward' ? [lead / 2 - ARROW_LEN / 2, lead / 2 + ARROW_LEN / 2] : [lead / 2 + ARROW_LEN / 2, lead / 2 - ARROW_LEN / 2]
  const prims: Prim[] = [
    { t: 'wire', pts: [{ x: 0, y: 0 }, { x: lead, y: 0 }] },
    { t: 'arrow', from: { x: from, y: -ARROW_OFFSET }, to: { x: to, y: -ARROW_OFFSET } },
    ...shift(inner.prims, lead, 0),
  ]
  const tip = ARROW_OFFSET + ARROW_HEAD * 0.45
  if (shown) prims.push({ t: 'label', label: shown, at: { x: lead / 2, y: -tip }, side: -1 })
  return {
    len: lead + inner.len,
    up: Math.max(inner.up, tip + (shown ? LABEL_GAP + labelReach(shown, vertical) : 0)),
    down: inner.down,
    prims,
  }
}

function parallelBlock(branches: Item[], vertical: boolean): Block {
  const blocks = branches.map((b) => itemBlock(b, vertical))
  const inner = Math.max(...blocks.map((b) => b.len))
  const x0 = BUS
  const x1 = BUS + inner
  const prims: Prim[] = [
    { t: 'wire', pts: [{ x: 0, y: 0 }, { x: x0, y: 0 }] },
    { t: 'wire', pts: [{ x: x1, y: 0 }, { x: x1 + BUS, y: 0 }] },
  ]
  let y = 0
  blocks.forEach((b, i) => {
    if (i) y += blocks[i - 1].down + BRANCH_GAP + b.up
    const start = x0 + (inner - b.len) / 2
    prims.push(...shift(b.prims, start, y))
    if (start > x0) prims.push({ t: 'wire', pts: [{ x: x0, y }, { x: start, y }] })
    if (start + b.len < x1) prims.push({ t: 'wire', pts: [{ x: start + b.len, y }, { x: x1, y }] })
    // Every branch but the last meets its bus at a T.
    if (i < blocks.length - 1) prims.push({ t: 'dot', at: { x: x0, y } }, { t: 'dot', at: { x: x1, y } })
  })
  prims.push({ t: 'wire', pts: [{ x: x0, y: 0 }, { x: x0, y }] }, { t: 'wire', pts: [{ x: x1, y: 0 }, { x: x1, y }] })
  return { len: inner + 2 * BUS, up: blocks[0].up, down: y + blocks.at(-1)!.down, prims }
}

function itemBlock(item: Item, vertical: boolean): Block {
  let block = item.type === 'part' ? partBlock(item, vertical) : item.type === 'series' ? seriesBlock(item.items, vertical) : parallelBlock(item.items, vertical)
  if (item.voltmeter) block = voltmeterBlock(block, item.voltmeter, vertical)
  // Only a branch of a parallel group has a current arrow (tidying sees to that).
  return item.current ? withArrow(block, item.current, vertical) : block
}

export const METER_R = 15
/** The wire before and after a measured block, where the voltmeter's leads tap it. */
const TAP = 18
const BRIDGE_GAP = 10

/**
 * A voltmeter across a block: its leads tap the wire just before and after
 * the block and rise on the outer (up) side, clear of the block and its
 * labels, to the meter in the middle of a bridge.
 */
function voltmeterBlock(inner: Block, label: Label, vertical: boolean): Block {
  const shown = shows(label) ? label : null
  const len = Math.max(inner.len + 2 * TAP, 2 * METER_R + 2 * TAP + 12, shown ? labelAlong(shown, vertical) + 16 : 0)
  const start = (len - inner.len) / 2
  const a = TAP / 2
  const b = len - TAP / 2
  const mid = len / 2
  const h = inner.up + BRIDGE_GAP + METER_R
  const prims: Prim[] = [
    ...shift(inner.prims, start, 0),
    { t: 'wire', pts: [{ x: 0, y: 0 }, { x: start, y: 0 }] },
    { t: 'wire', pts: [{ x: start + inner.len, y: 0 }, { x: len, y: 0 }] },
    { t: 'wire', pts: [{ x: a, y: 0 }, { x: a, y: -h }, { x: mid - METER_R, y: -h }] },
    { t: 'wire', pts: [{ x: mid + METER_R, y: -h }, { x: b, y: -h }, { x: b, y: 0 }] },
    { t: 'dot', at: { x: a, y: 0 } },
    { t: 'dot', at: { x: b, y: 0 } },
    { t: 'meter', at: { x: mid, y: -h } },
    { t: 'letter', text: 'V', at: { x: mid, y: -h }, size: 18, polarity: false },
  ]
  if (shown) prims.push({ t: 'label', label: shown, at: { x: mid, y: -h - METER_R }, side: -1 })
  return { len, up: h + METER_R + (shown ? LABEL_GAP + labelReach(shown, vertical) : 0), down: inner.down, prims }
}

// Placing blocks on the figure.

/** A frame: where a block's (0, 0) goes and which way it travels, in degrees clockwise from +x. */
interface Frame {
  origin: Pt
  angle: 0 | 90 | 180 | 270
}

function toScreen(frame: Frame, p: Pt): Pt {
  const { x: u, y: v } = p
  const [x, y] = { 0: [u, v], 90: [-v, u], 180: [-u, -v], 270: [v, -u] }[frame.angle]
  return { x: frame.origin.x + x, y: frame.origin.y + y }
}

interface Drawing {
  wires: Pt[][]
  dots: Pt[]
  parts: PlacedPart[]
  meters: Pt[]
  points: Pt[]
  arrows: Segment[]
  labels: PlacedLabel[]
  letters: (Letter & { polarity: boolean })[]
}

const emptyDrawing = (): Drawing => ({ wires: [], dots: [], parts: [], meters: [], points: [], arrows: [], labels: [], letters: [] })

/** A label's baseline point and anchor, given the side of `at` it sits on (as a direction on screen). */
function placeLabel(label: Label, at: Pt, dir: Pt): PlacedLabel {
  if (dir.y < 0) return { label, x: at.x, y: at.y - LABEL_GAP - DESCENT, anchor: 'middle' }
  if (dir.y > 0) return { label, x: at.x, y: at.y + LABEL_GAP + ASCENT, anchor: 'middle' }
  return { label, x: at.x + dir.x * LABEL_GAP, y: at.y + ASCENT * 0.45, anchor: dir.x < 0 ? 'end' : 'start' }
}

function draw(out: Drawing, block: Block, frame: Frame) {
  const s = (p: Pt) => toScreen(frame, p)
  const turn = (p: Pt) => toScreen({ origin: { x: 0, y: 0 }, angle: frame.angle }, p)
  for (const p of block.prims) {
    if (p.t === 'wire') out.wires.push(p.pts.map(s))
    else if (p.t === 'dot') out.dots.push(s(p.at))
    else if (p.t === 'part') out.parts.push({ part: p.part, ...s(p.at), angle: frame.angle })
    else if (p.t === 'letter') out.letters.push({ text: p.text, ...s(p.at), size: p.size, polarity: p.polarity })
    else if (p.t === 'meter') out.meters.push(s(p.at))
    else if (p.t === 'point') out.points.push(s(p.at))
    else if (p.t === 'arrow') {
      const [a, b] = [s(p.from), s(p.to)]
      out.arrows.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
    }
    else out.labels.push(placeLabel(p.label, s(p.at), turn({ x: 0, y: p.side })))
  }
}

/** Bring the first battery round to the start of the loop, so it's drawn on the left. */
function batteryFirst(items: Item[]): Item[] {
  const hasBattery = (item: Item): boolean => (item.type === 'part' ? item.kind === 'battery' : item.items.some(hasBattery))
  const at = items.findIndex(hasBattery)
  return at > 0 ? [...items.slice(at), ...items.slice(0, at)] : items
}

/** Share the loop's items out round its sides: the first on the left, then along the top, down the right, and back along the bottom. */
function sides(items: Item[]): { left: Item[]; top: Item[]; right: Item[]; bottom: Item[] } {
  const [first, ...rest] = items
  const top: Item[] = []
  const right: Item[] = []
  const bottom: Item[] = []
  let topLen = 0
  let rightLen = 0
  const total = rest.reduce((sum, item) => sum + itemBlock(item, false).len, 0)
  const maxTop = Math.min(MAX_TOP, Math.max(EVEN_TOP, total * 0.6))
  for (const item of rest) {
    const len = itemBlock(item, false).len
    if (!right.length && !bottom.length && (!top.length || topLen + len <= maxTop)) top.push(item), (topLen += len)
    else if (!bottom.length && (!right.length || rightLen + itemBlock(item, true).len <= MAX_RIGHT)) right.push(item), (rightLen += itemBlock(item, true).len)
    else bottom.push(item)
  }
  return { left: [first], top, right, bottom }
}

function loopDrawing(circuit: Circuit): Drawing {
  const out = emptyDrawing()
  const s = sides(batteryFirst(circuit.items))
  // The main loop's current arrow goes at the start of the left side, before its first part.
  const left = circuit.current ? withArrow(seriesBlock(s.left, true), circuit.current, true) : seriesBlock(s.left, true)
  const top = seriesBlock(s.top, false)
  const right = seriesBlock(s.right, true)
  const bottom = seriesBlock(s.bottom, false)

  // Top and bottom are kept clear of what the sides push into the loop, and
  // the loop is tall and wide enough for opposite sides not to meet.
  const cornerX = Math.max(MIN_CORNER, left.down + CLEAR, right.down + CLEAR)
  const cornerY = MIN_CORNER
  const W = Math.max(MIN_SIDE, Math.max(top.len, bottom.len) + 2 * cornerX, left.down + right.down + CLEAR)
  const H = Math.max(MIN_SIDE * 0.8, Math.max(left.len, right.len) + 2 * cornerY, top.down + bottom.down + CLEAR)

  const frames: Record<'left' | 'top' | 'right' | 'bottom', Frame> = {
    left: { origin: { x: 0, y: (H + left.len) / 2 }, angle: 270 },
    top: { origin: { x: (W - top.len) / 2, y: 0 }, angle: 0 },
    right: { origin: { x: W, y: (H - right.len) / 2 }, angle: 90 },
    bottom: { origin: { x: (W + bottom.len) / 2, y: H }, angle: 180 },
  }
  draw(out, left, frames.left)
  draw(out, top, frames.top)
  draw(out, right, frames.right)
  draw(out, bottom, frames.bottom)

  // The corners, from where one side's block ends to where the next begins.
  const end = (b: Block, f: Frame) => toScreen(f, { x: b.len, y: 0 })
  const start = (f: Frame) => f.origin
  out.wires.push(
    [end(left, frames.left), { x: 0, y: 0 }, start(frames.top)],
    [end(top, frames.top), { x: W, y: 0 }, start(frames.right)],
    [end(right, frames.right), { x: W, y: H }, start(frames.bottom)],
    [end(bottom, frames.bottom), { x: 0, y: H }, start(frames.left)],
  )
  return out
}

// A battery driving one parallel group is drawn as a ladder: the rest of the
// loop is the left rung, travelling up, and each branch is a rung to its
// right, travelling down between a top rail and a bottom rail.

const RUNG_GAP = 26
const MIN_RUNG_GAP = 72
const RAIL_LEAD = 26
/** Parts that can share the left rung with the battery, as the source side of the circuit. */
const SOURCE_KINDS = new Set<PartKind>(['battery', 'switch', 'ammeter'])
const MAX_SOURCE_PARTS = 3

/** The loop split into the source side and the parallel group, when it's drawn as a ladder. */
export function ladderOf(circuit: Circuit): { rest: Item[]; group: Group } | null {
  const at = circuit.items.findIndex((i) => i.type === 'parallel')
  const group = circuit.items[at]
  if (!group || group.type !== 'parallel') return null
  // Everything after the group, round to everything before it.
  const rest = [...circuit.items.slice(at + 1), ...circuit.items.slice(0, at)]
  const ok = rest.length > 0 && rest.length <= MAX_SOURCE_PARTS && rest.every((i) => i.type === 'part' && SOURCE_KINDS.has(i.kind))
  // A voltmeter across the whole group has nowhere to go on a ladder.
  return ok && !group.voltmeter && rest.some((i) => i.type === 'part' && i.kind === 'battery') ? { rest, group } : null
}

function ladderDrawing(rest: Item[], group: Group, current: Arrow | null): Drawing {
  const out = emptyDrawing()
  // The main loop's current arrow goes on the left rung, below its parts.
  const source = current ? withArrow(seriesBlock(rest, true), current, true) : seriesBlock(rest, true)
  const rungs = group.items.map((b) => itemBlock(b, true))
  const H = Math.max(...[source, ...rungs].map((b) => b.len)) + 2 * RAIL_LEAD
  // Going up, a block's up side is on the left; going down, on the right.
  const xs = [0]
  let right = source.down
  for (const b of rungs) {
    const x = xs.at(-1)! + Math.max(MIN_RUNG_GAP, right + RUNG_GAP + b.down)
    xs.push(x)
    right = b.up
  }
  const sourceFrame: Frame = { origin: { x: 0, y: (H + source.len) / 2 }, angle: 270 }
  draw(out, source, sourceFrame)
  out.wires.push([{ x: 0, y: H }, sourceFrame.origin], [toScreen(sourceFrame, { x: source.len, y: 0 }), { x: 0, y: 0 }])
  rungs.forEach((b, i) => {
    const x = xs[i + 1]
    const frame: Frame = { origin: { x, y: (H - b.len) / 2 }, angle: 90 }
    draw(out, b, frame)
    out.wires.push([{ x, y: 0 }, frame.origin], [toScreen(frame, { x: b.len, y: 0 }), { x, y: H }])
    if (i < rungs.length - 1) out.dots.push({ x, y: 0 }, { x, y: H })
  })
  const end = xs.at(-1)!
  out.wires.push([{ x: 0, y: 0 }, { x: end, y: 0 }], [{ x: 0, y: H }, { x: end, y: H }])
  // A point after the group, back to the source: on the bottom rail, between the first two rungs.
  if (group.point) {
    const at = { x: xs[1] / 2, y: H }
    out.points.push(at)
    if (shows(group.point)) out.labels.push(placeLabel(group.point, { x: at.x, y: H + POINT_R }, { x: 0, y: 1 }))
  }
  return out
}

// The whole figure.

export interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

export function labelBox(l: PlacedLabel): Box {
  const w = labelWidth(l.label)
  const left = l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - w : l.x - w / 2
  return { left, right: left + w, top: l.y - ASCENT, bottom: l.y + DESCENT + LABEL_SIZE * 0.15 }
}

/** The box round a current arrow, its head included. */
export function arrowBox(a: Segment): Box {
  const half = ARROW_HEAD * 0.45
  return { left: Math.min(a.x1, a.x2) - half, right: Math.max(a.x1, a.x2) + half, top: Math.min(a.y1, a.y2) - half, bottom: Math.max(a.y1, a.y2) + half }
}

export const pointBox = (p: Pt): Box => ({ left: p.x - POINT_R, right: p.x + POINT_R, top: p.y - POINT_R, bottom: p.y + POINT_R })

export const meterBox = (m: Pt): Box => ({ left: m.x - METER_R, right: m.x + METER_R, top: m.y - METER_R, bottom: m.y + METER_R })

/** The box round a placed part's symbol. */
export function partBox(p: PlacedPart): Box {
  const size = symbolSize(p.part)
  const frame: Frame = { origin: p, angle: p.angle as Frame['angle'] }
  const corners = [toScreen(frame, { x: -size.half, y: -size.up }), toScreen(frame, { x: size.half, y: size.down })]
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }
}

function openDrawing(circuit: Circuit): Drawing {
  const out = emptyDrawing()
  const block = seriesBlock(circuit.items, false)
  const lead = 34
  const y = Math.max(48, block.up + 18)
  const frame: Frame = { origin: { x: lead, y }, angle: 0 }
  draw(out, block, frame)
  out.wires.push([{ x: 0, y }, frame.origin], [toScreen(frame, { x: block.len, y: 0 }), { x: lead + block.len + lead, y }])
  out.labels.push(
    { label: { mode: 'text', text: 'X' }, x: 0, y: y + ASCENT * 0.45, anchor: 'end' },
    { label: { mode: 'text', text: 'Y' }, x: lead + block.len + lead, y: y + ASCENT * 0.45, anchor: 'start' },
  )
  return out
}

export function buildCircuit(circuit: Circuit, options: LayoutOptions): CircuitFigure {
  const ladder = ladderOf(circuit)
  const d = options.topology === 'open' ? openDrawing(circuit) : ladder ? ladderDrawing(ladder.rest, ladder.group, circuit.current) : loopDrawing(circuit)

  // Fit the figure round everything drawn.
  const boxes: Box[] = [
    ...d.wires.flat().map((p) => ({ left: p.x, right: p.x, top: p.y, bottom: p.y })),
    ...d.parts.map(partBox),
    ...d.meters.map(meterBox),
    ...d.labels.map(labelBox),
    ...d.arrows.map(arrowBox),
  ]
  const bounds = {
    left: Math.min(...boxes.map((b) => b.left)),
    right: Math.max(...boxes.map((b) => b.right)),
    top: Math.min(...boxes.map((b) => b.top)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  }
  const titleRoom = options.title ? TITLE_SIZE + 14 : 0
  const dx = MARGIN - bounds.left
  const dy = MARGIN + titleRoom - bounds.top
  const move = (p: Pt) => ({ x: round(p.x + dx), y: round(p.y + dy) })
  const width = Math.ceil(bounds.right - bounds.left + 2 * MARGIN)
  const height = Math.ceil(bounds.bottom - bounds.top + 2 * MARGIN + titleRoom)

  return {
    width,
    height,
    wires: joinWires(d.wires.map((w) => w.map(move))),
    dots: d.dots.map(move),
    parts: d.parts.map((p) => ({ ...p, ...move(p) })),
    meters: d.meters.map(move),
    points: d.points.map(move),
    arrows: d.arrows.map((a) => {
      const [p1, p2] = [move({ x: a.x1, y: a.y1 }), move({ x: a.x2, y: a.y2 })]
      return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
    }),
    labels: d.labels.map((l) => ({ ...l, ...move(l) })),
    letters: d.letters.filter((l) => options.polarity || !l.polarity).map(({ polarity: _, ...l }) => ({ ...l, ...move(l) })),
    title: options.title ? { x: width / 2, y: MARGIN + TITLE_SIZE * 0.8 } : null,
  }
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * Wires joined end to end into as few lines as possible, so they're drawn
 * without seams, and with points in the middle of straight runs dropped.
 * Wires meeting at a junction dot stay separate lines.
 */
function joinWires(wires: Pt[][]): Pt[][] {
  const key = (p: Pt) => `${p.x},${p.y}`
  const lines = wires.map((w) => w.filter((p, i) => i === 0 || key(p) !== key(w[i - 1]))).filter((w) => w.length > 1)
  const ends = new Map<string, number>()
  for (const w of lines) for (const p of [w[0], w.at(-1)!]) ends.set(key(p), (ends.get(key(p)) ?? 0) + 1)
  // Only join where exactly two wire ends meet.
  let joined = true
  while (joined) {
    joined = false
    for (let i = 0; i < lines.length && !joined; i++) {
      for (let j = 0; j < lines.length && !joined; j++) {
        if (i === j) continue
        for (const a of [lines[i], [...lines[i]].reverse()]) {
          const at = key(a.at(-1)!)
          if (ends.get(at) !== 2) continue
          let b = lines[j]
          if (key(b.at(-1)!) === at) b = [...b].reverse()
          if (key(b[0]) !== at) continue
          lines[i] = [...a, ...b.slice(1)]
          lines.splice(j, 1)
          joined = true
          break
        }
      }
    }
  }
  const straight = (a: Pt, b: Pt, c: Pt) => (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)
  return lines.map((w) => w.filter((p, i) => i === 0 || i === w.length - 1 || !straight(w[i - 1], p, w[i + 1])))
}
