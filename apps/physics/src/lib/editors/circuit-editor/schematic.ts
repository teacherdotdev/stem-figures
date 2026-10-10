// A circuit drawn by hand in the Circuit Editor: parts placed on a square
// grid, each with two terminals, and the wires joining terminals. A wire is a
// run of horizontal and vertical lines through its bends. It routes itself
// round the parts when it's drawn, and keeps the bends a teacher drags (or the
// Circuit Diagram Generator hands over). Junction dots come from the drawing
// itself: wherever three or more lines meet. Everything here is plain data
// and arithmetic, so the page (CircuitEditor.svelte) only handles pointers.

import {
  labelBox, placeLabel, shows, symbolSize, type Letter, type PlacedLabel, type Pt, type SymbolPart,
} from '$lib/generators/circuit-diagram/layout'
import { cleanLabel, type Label } from '$lib/shared/label'

export const PART_KINDS = ['cell', 'battery', 'resistor', 'bulb', 'switch', 'ammeter', 'voltmeter'] as const
export type PartKind = (typeof PART_KINDS)[number]

export const PART_NAMES: Record<PartKind, string> = {
  cell: 'Cell',
  battery: 'Battery',
  resistor: 'Resistor',
  bulb: 'Bulb',
  switch: 'Switch',
  ammeter: 'Ammeter',
  voltmeter: 'Voltmeter',
}

export const ROTATIONS = [0, 90, 180, 270] as const
export type Rotation = (typeof ROTATIONS)[number]

export interface Part {
  id: string
  kind: PartKind
  /** Its middle, on a grid point. */
  x: number
  y: number
  /** Clockwise from lying left to right with terminal 0 on the left. A cell's + is terminal 1. */
  rotation: Rotation
  name: Label
  value: Label
  /** Name and value swapped round: the name below (or right of) the part, and the value above (or left). */
  flip: boolean
  /** A switch drawn open. */
  open: boolean
}

/** One end of a wire: a part's terminal 0 or 1. */
export interface End {
  part: string
  t: 0 | 1
}

export interface Wire {
  id: string
  a: End
  b: End
  /** Its bends, in order from a to b. */
  via: Pt[]
  /** Routed automatically, so it routes itself again when a part it joins
   *  moves. Dragging one of its bends makes it the teacher's. */
  auto: boolean
}

export type SymbolStyle = 'us' | 'iec'

export interface Schematic {
  parts: Part[]
  wires: Wire[]
  /** US or IEC symbols, for the whole drawing. */
  symbols: SymbolStyle
  /** + and − beside every cell and battery. */
  polarity: boolean
}

/** The drawing page, in SVG units, and its grid. A part's middle and both its
 *  terminals sit on grid points, never on the page's edge. */
export const WIDTH = 1040
export const HEIGHT = 660
export const GRID = 20
/** How far a part's terminals are from its middle. */
export const LEAD = 2 * GRID
/** White space around an exported circuit. */
export const EXPORT_PAD = 14
export const INK = '#111827'

export const emptySchematic = (): Schematic => ({ parts: [], wires: [], symbols: 'us', polarity: false })

export const cloneSchematic = (s: Schematic): Schematic => structuredClone(s)

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const key = (p: Pt) => `${p.x},${p.y}`
const same = (p: Pt, q: Pt) => p.x === q.x && p.y === q.y

/** The grid point nearest a point on the page, for a part's middle: far
 *  enough in that both its terminals are on the page whichever way it lies. */
export const snap = (x: number, y: number) => ({
  x: clamp(Math.round(x / GRID) * GRID, LEAD + GRID, WIDTH - LEAD - GRID),
  y: clamp(Math.round(y / GRID) * GRID, LEAD + GRID, HEIGHT - LEAD - GRID),
})

/** The grid point nearest a point on the page, for a wire's bend. */
export const snapPoint = (x: number, y: number) => ({
  x: clamp(Math.round(x / GRID) * GRID, GRID, WIDTH - GRID),
  y: clamp(Math.round(y / GRID) * GRID, GRID, HEIGHT - GRID),
})

// A part's shape.

const DIRECTIONS: Record<Rotation, Pt> = { 0: { x: 1, y: 0 }, 90: { x: 0, y: 1 }, 180: { x: -1, y: 0 }, 270: { x: 0, y: -1 } }

/** The way a part lies, from terminal 0 to terminal 1. */
export const axis = (p: Part): Pt => DIRECTIONS[p.rotation]

export const lying = (p: Part) => (p.rotation % 180 === 0 ? 'across' : 'upright')

export function terminal(p: Part, t: 0 | 1): Pt {
  const u = axis(p)
  const s = t ? LEAD : -LEAD
  return { x: p.x + u.x * s, y: p.y + u.y * s }
}

/** The way a wire leaves a terminal: straight out of the part. */
export function outward(p: Part, t: 0 | 1): Pt {
  const u = axis(p)
  return t ? u : { x: -u.x, y: -u.y }
}

/** What PartSymbol draws for a part. */
export const symbolOf = (p: Pick<Part, 'kind' | 'open'>): SymbolPart =>
  p.kind === 'cell' || p.kind === 'battery' ? { kind: 'battery', cells: p.kind === 'battery' ? 2 : 1 } : { kind: p.kind, open: p.open }

/** A point in a part's own frame (lying left to right) on the page. */
function turn(p: Part, u: number, v: number): Pt {
  const r = (p.rotation * Math.PI) / 180
  const [c, s] = [Math.round(Math.cos(r)), Math.round(Math.sin(r))]
  return { x: p.x + u * c - v * s, y: p.y + u * s + v * c }
}

/** Where a part's name and value go: the name above a part lying across and
 *  left of an upright one, the value opposite, unless they're swapped. */
export function partMarks(p: Part, polarity: boolean): { labels: PlacedLabel[]; letters: Letter[] } {
  const size = symbolSize(symbolOf(p))
  const across = lying(p) === 'across'
  const side = across ? { x: 0, y: p.flip ? 1 : -1 } : { x: p.flip ? 1 : -1, y: 0 }
  // The symbol's own "up" (its −y before turning), to tell how far it reaches on each side.
  const up = { x: turn(p, 0, -1).x - p.x, y: turn(p, 0, -1).y - p.y }
  const reach = (d: Pt) => (d.x === up.x && d.y === up.y ? size.up : size.down)
  const at = (d: Pt) => ({ x: p.x + d.x * reach(d), y: p.y + d.y * reach(d) })
  const opposite = { x: -side.x, y: -side.y }
  const labels: PlacedLabel[] = []
  if (shows(p.name)) labels.push(placeLabel(p.name, at(side), side))
  if (shows(p.value)) labels.push(placeLabel(p.value, at(opposite), opposite))
  const letters: Letter[] = []
  if (p.kind === 'ammeter' || p.kind === 'voltmeter') letters.push({ text: p.kind === 'ammeter' ? 'A' : 'V', x: p.x, y: p.y, size: 18 })
  if (polarity && (p.kind === 'cell' || p.kind === 'battery')) {
    // + by the long plate (terminal 1's side) and − by the short one, as the generator marks them.
    const off = size.half + 9
    letters.push({ text: '+', ...turn(p, off, -10), size: 16 }, { text: '−', ...turn(p, -off, -10), size: 16 })
  }
  return { labels, letters }
}

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

/** The box round a part's symbol and its leads, out to its terminals. */
export function partBox(p: Part): Box {
  const size = symbolSize(symbolOf(p))
  const across = Math.max(size.up, size.down)
  const [hx, hy] = lying(p) === 'across' ? [LEAD, across] : [across, LEAD]
  return { left: p.x - hx, right: p.x + hx, top: p.y - hy, bottom: p.y + hy }
}

const letterBox = (l: Letter): Box => ({ left: l.x - l.size * 0.35, right: l.x + l.size * 0.35, top: l.y - l.size * 0.5, bottom: l.y + l.size * 0.5 })

// New parts.

const PREFIX: Partial<Record<PartKind, string>> = { resistor: 'R', bulb: 'L' }
const VALUE_TEXT: Record<PartKind, string> = {
  cell: '1.5 V',
  battery: '12 V',
  resistor: '4 Omega',
  bulb: '6 Omega',
  switch: '',
  ammeter: '0.5 A',
  voltmeter: '6 V',
}

/** A new part, lying across. Resistors and bulbs are named R₁, L₁… after
 *  those already drawn; other names and every value start off, ready to type. */
export function newPart(s: Schematic, kind: PartKind, at: Pt): Part {
  const prefix = PREFIX[kind]
  let name: Label = { mode: 'none', text: kind === 'cell' || kind === 'battery' ? 'epsilon' : '' }
  if (prefix) {
    const used = new Set(s.parts.map((p) => p.name.text))
    let n = 1
    while (used.has(`${prefix}_${n}`)) n++
    name = { mode: 'text', text: `${prefix}_${n}` }
  }
  return {
    id: crypto.randomUUID(),
    kind,
    ...at,
    rotation: 0,
    name,
    value: { mode: 'none', text: VALUE_TEXT[kind] },
    flip: false,
    open: false,
  }
}

/** A free grid point for a part added without dragging it: the page's
 *  middle, or the nearest point to it where a part lying across is clear of
 *  every part and wire, working outward. */
export function freeSpot(s: Schematic): Pt {
  const boxes = s.parts.map(partBox)
  const lines = s.wires.flatMap((w) => segments(wirePath(s, w)))
  const free = (p: Pt) => {
    const mine = { left: p.x - LEAD - GRID, right: p.x + LEAD + GRID, top: p.y - 2 * GRID, bottom: p.y + 2 * GRID }
    const overlaps = (b: Box) => b.left < mine.right && mine.left < b.right && b.top < mine.bottom && mine.top < b.bottom
    return !boxes.some(overlaps) && !lines.some(([a, b]) => overlaps({ left: Math.min(a.x, b.x), right: Math.max(a.x, b.x), top: Math.min(a.y, b.y), bottom: Math.max(a.y, b.y) }))
  }
  const mid = snap(WIDTH / 2, HEIGHT / 2)
  for (let ring = 0; ring < WIDTH / GRID; ring++)
    for (let dy = -ring; dy <= ring; dy++)
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
        const p = { x: mid.x + dx * GRID, y: mid.y + dy * GRID }
        if (!same(snap(p.x, p.y), p)) continue
        if (free(p)) return p
      }
  return mid
}

// Moving, turning and deleting.

/** How far a group of parts moves when dragged by (dx, dy): whole grid
 *  steps, stopping where the first part would reach the page's edge. */
export function groupShift(origins: Pt[], dx: number, dy: number) {
  const xs = origins.map((p) => p.x)
  const ys = origins.map((p) => p.y)
  const lo = LEAD + GRID
  return {
    dx: clamp(Math.round(dx / GRID) * GRID, lo - Math.min(...xs), WIDTH - lo - Math.max(...xs)),
    dy: clamp(Math.round(dy / GRID) * GRID, lo - Math.min(...ys), HEIGHT - lo - Math.max(...ys)),
  }
}

/** The parts whose middles are inside a box dragged either way. */
export function partsIn(s: Schematic, box: { x1: number; y1: number; x2: number; y2: number }) {
  const [left, right] = [Math.min(box.x1, box.x2), Math.max(box.x1, box.x2)]
  const [top, bottom] = [Math.min(box.y1, box.y2), Math.max(box.y1, box.y2)]
  return s.parts.filter((p) => p.x >= left && p.x <= right && p.y >= top && p.y <= bottom).map((p) => p.id)
}

/** The drawing without these parts, or the wires joined to them. */
export function withoutParts(s: Schematic, ids: Iterable<string>): Schematic {
  const gone = new Set(ids)
  return {
    ...s,
    parts: s.parts.filter((p) => !gone.has(p.id)),
    wires: s.wires.filter((w) => !gone.has(w.a.part) && !gone.has(w.b.part)),
  }
}

/** Wires whose ends moved, followed: one routed automatically routes itself
 *  again, and one with the teacher's bends keeps them, its ends squared up
 *  when it's drawn. */
function follow(s: Schematic, wires: Set<string>): Schematic {
  let next = s
  for (const w of s.wires) {
    if (!w.auto || !wires.has(w.id)) continue
    next = { ...next, wires: next.wires.map((x) => (x.id === w.id ? { ...x, via: route(next, w.a, w.b, w.id) } : x)) }
  }
  return next
}

const touching = (s: Schematic, parts: Set<string>) => new Set(s.wires.filter((w) => parts.has(w.a.part) || parts.has(w.b.part)).map((w) => w.id))

/**
 * Parts moved by (dx, dy) from where they were in `before`. A wire between
 * two moved parts moves with them, bends and all; one with only one end
 * moved follows it.
 */
export function moveParts(before: Schematic, ids: Iterable<string>, dx: number, dy: number): Schematic {
  const moved = new Set(ids)
  const shifted: Schematic = {
    ...before,
    parts: before.parts.map((p) => (moved.has(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p)),
    wires: before.wires.map((w) => (moved.has(w.a.part) && moved.has(w.b.part) ? { ...w, via: w.via.map((q) => ({ x: q.x + dx, y: q.y + dy })) } : w)),
  }
  return follow(shifted, new Set(before.wires.filter((w) => moved.has(w.a.part) !== moved.has(w.b.part)).map((w) => w.id)))
}

/** Parts turned a quarter turn clockwise, each about its own middle. */
export function rotateParts(s: Schematic, ids: Iterable<string>): Schematic {
  const turned = new Set(ids)
  const next = {
    ...s,
    parts: s.parts.map((p) => (turned.has(p.id) ? { ...p, rotation: ((p.rotation + 90) % 360) as Rotation, ...snap(p.x, p.y) } : p)),
  }
  return follow(next, touching(s, turned))
}

export function updatePart(s: Schematic, id: string, change: Partial<Omit<Part, 'id'>>): Schematic {
  return { ...s, parts: s.parts.map((p) => (p.id === id ? { ...p, ...change } : p)) }
}

// Wires.

const partOf = (s: Schematic, id: string) => s.parts.find((p) => p.id === id)!

export const sameEnd = (a: End, b: End) => a.part === b.part && a.t === b.t

/** The wire between two terminals, if there is one. */
export const wireBetween = (s: Schematic, a: End, b: End) =>
  s.wires.find((w) => (sameEnd(w.a, a) && sameEnd(w.b, b)) || (sameEnd(w.a, b) && sameEnd(w.b, a)))

/** Why these two terminals can't be joined, or null when they can. */
export function cantJoin(s: Schematic, a: End, b: End): string | null {
  if (sameEnd(a, b)) return 'That’s the same terminal.'
  if (wireBetween(s, a, b)) return 'Those terminals are already joined.'
  return null
}

/** A new wire between two terminals, routed round the parts. */
export function addWire(s: Schematic, a: End, b: End): Schematic {
  return { ...s, wires: [...s.wires, { id: crypto.randomUUID(), a, b, via: route(s, a, b), auto: true }] }
}

export const withoutWire = (s: Schematic, id: string): Schematic => ({ ...s, wires: s.wires.filter((w) => w.id !== id) })

/**
 * Points with every step between them horizontal or vertical, adding a
 * corner wherever two in a row aren't lined up. A corner carries on the way
 * the line was going (`first` is the way it starts) before turning, except
 * into the last point, which the line reaches going the way `last` says:
 * straight into a part's terminal. A line of just two points that has to
 * start and end the same way jogs across halfway.
 */
export function orthogonal(points: Pt[], first: Pt, last?: Pt): Pt[] {
  const out = [points[0]]
  let dir = first
  points.slice(1).forEach((q, i) => {
    const p = out.at(-1)!
    if (p.x !== q.x && p.y !== q.y) {
      const across = (d: Pt) => d.x !== 0
      if (!last || i < points.length - 2) out.push(across(dir) ? { x: q.x, y: p.y } : { x: p.x, y: q.y })
      else if (i > 0 || across(first) !== across(last)) out.push(across(last) ? { x: p.x, y: q.y } : { x: q.x, y: p.y })
      else if (across(last)) {
        const mid = Math.round((p.x + q.x) / 2 / GRID) * GRID
        out.push({ x: mid, y: p.y }, { x: mid, y: q.y })
      } else {
        const mid = Math.round((p.y + q.y) / 2 / GRID) * GRID
        out.push({ x: p.x, y: mid }, { x: q.x, y: mid })
      }
    }
    const from = out.at(-1)!
    out.push(q)
    if (!same(from, q)) dir = { x: Math.sign(q.x - from.x), y: Math.sign(q.y - from.y) }
  })
  return simplify(out)
}

/** A line without repeated points, or points in the middle of a straight run. */
export function simplify(points: Pt[]): Pt[] {
  const out = points.filter((p, i) => i === 0 || !same(p, points[i - 1]))
  for (let i = 1; i < out.length - 1; ) {
    const [a, b, c] = [out[i - 1], out[i], out[i + 1]]
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) out.splice(i, 1)
    else i++
  }
  return out
}

/** A wire as drawn: from terminal to terminal through its bends, squared up. */
export function wirePath(s: Schematic, w: Wire): Pt[] {
  const [pa, pb] = [partOf(s, w.a.part), partOf(s, w.b.part)]
  const into = outward(pb, w.b.t)
  return orthogonal([terminal(pa, w.a.t), ...w.via, terminal(pb, w.b.t)], outward(pa, w.a.t), { x: -into.x, y: -into.y })
}

const segments = (path: Pt[]) => path.slice(1).map((q, i) => [path[i], q] as const)

/**
 * A wire's bend moved to a grid point. The lines either side of it keep
 * running the way they did, so their other ends move with it, as far as the
 * next bend; a terminal stays put and gets a corner instead.
 */
export function moveBend(before: Schematic, wireId: string, index: number, to: Pt): Schematic {
  const w = before.wires.find((x) => x.id === wireId)!
  const path = wirePath(before, w).map((q) => ({ ...q }))
  const i = index + 1
  const p = path[i]
  for (const j of [i - 1, i + 1]) {
    if (j <= 0 || j >= path.length - 1) continue
    if (path[j].y === p.y) path[j].y = to.y
    else path[j].x = to.x
  }
  path[i] = { ...to }
  return { ...before, wires: before.wires.map((x) => (x.id === wireId ? { ...x, via: path.slice(1, -1), auto: false } : x)) }
}

/** A wire's bends squared up as drawn, so a drag starts from what's on the page. */
export const bendsOf = (s: Schematic, w: Wire) => wirePath(s, w).slice(1, -1)

// Routing: the cheapest way along grid lines from one terminal out of its
// part to the other terminal, into its part, with each bend costing as much
// as a few steps. Parts are in the way; running along another wire, or
// turning on one, would look joined to it, so it costs extra unless the two
// wires share a terminal; crossing one is cheap.

const COLS = WIDTH / GRID
const ROWS = HEIGHT / GRID
const STEPS = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }]
const BEND = 3
const ALONG = 10
const CROSS = 1
const OVER_LABEL = 4

const stepOf = (d: Pt) => STEPS.findIndex((q) => q.x === d.x && q.y === d.y)

/** The bends of a wire routed from `a` to `b` (none when they line up), leaving `skip` (the wire itself) out of the way. */
export function route(s: Schematic, a: End, b: End, skip?: string): Pt[] {
  const [pa, pb] = [partOf(s, a.part), partOf(s, b.part)]
  const start = terminal(pa, a.t)
  const goal = terminal(pb, b.t)
  const into = outward(pb, b.t)
  const fallback = () => orthogonal([start, goal], outward(pa, a.t), { x: -into.x, y: -into.y }).slice(1, -1)
  if (same(start, goal)) return []
  const cell = (p: Pt) => (p.y / GRID) * (COLS + 1) + p.x / GRID

  const blocked = new Set<number>()
  const labelled = new Set<number>()
  for (const p of s.parts) {
    // The symbol and a grid step round it, but not the terminals.
    for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) blocked.add(cell(turn(p, u * GRID, v * GRID)))
    for (const t of [0, 1] as const) {
      const q = terminal(p, t)
      if (!same(q, start) && !same(q, goal)) blocked.add(cell(q))
    }
    for (const l of partMarks(p, s.polarity).labels) {
      const box = labelBox(l)
      for (let x = Math.ceil(box.left / GRID) * GRID; x <= box.right; x += GRID)
        for (let y = Math.ceil(box.top / GRID) * GRID; y <= box.bottom; y += GRID) labelled.add(cell({ x, y }))
    }
  }
  // Other wires: where they run, and which way, unless they share a terminal with this one.
  const runs = new Map<number, Set<number>>()
  for (const w of s.wires) {
    if (w.id === skip || [w.a, w.b].some((e) => sameEnd(e, a) || sameEnd(e, b))) continue
    for (const [p, q] of segments(wirePath(s, w))) {
      const d = { x: Math.sign(q.x - p.x), y: Math.sign(q.y - p.y) }
      for (let r = p; ; r = { x: r.x + d.x * GRID, y: r.y + d.y * GRID }) {
        const c = cell(r)
        if (!runs.has(c)) runs.set(c, new Set())
        runs.get(c)!.add(stepOf(d) % 2)
        if (same(r, q)) break
      }
    }
  }

  // A* over (grid point, the way it's heading).
  const n = (COLS + 1) * (ROWS + 1) * 4
  const cost = new Float64Array(n).fill(Infinity)
  const from = new Int32Array(n).fill(-1)
  const heap: [number, number][] = []
  const push = (f: number, state: number) => {
    heap.push([f, state])
    for (let i = heap.length - 1; i > 0; ) {
      const parent = (i - 1) >> 1
      if (heap[parent][0] <= heap[i][0]) break
      ;[heap[parent], heap[i]] = [heap[i], heap[parent]]
      i = parent
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      for (let i = 0; ; ) {
        const [l, r] = [2 * i + 1, 2 * i + 2]
        let m = i
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i], heap[m]]
        i = m
      }
    }
    return top
  }
  const h = (p: Pt) => (Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y)) / GRID
  const pointOf = (c: number) => ({ x: (c % (COLS + 1)) * GRID, y: Math.floor(c / (COLS + 1)) * GRID })
  const arrive = stepOf({ x: -into.x, y: -into.y })
  const first = stepOf(outward(pa, a.t))
  const begin = cell(start) * 4 + first
  cost[begin] = 0
  push(h(start), begin)
  let end = -1
  while (heap.length) {
    const [, state] = pop()
    const c = state >> 2
    const d = state & 3
    const here = pointOf(c)
    if (c === cell(goal)) {
      if (d === arrive) {
        end = state
        break
      }
      continue
    }
    for (let d2 = 0; d2 < 4; d2++) {
      if (d2 === (d + 2) % 4) continue
      // A wire leaves its terminal straight out of the part.
      if (state === begin && d2 !== first) continue
      const next = { x: here.x + STEPS[d2].x * GRID, y: here.y + STEPS[d2].y * GRID }
      if (next.x < 0 || next.x > WIDTH || next.y < 0 || next.y > HEIGHT) continue
      const c2 = cell(next)
      if (blocked.has(c2) && c2 !== cell(goal)) continue
      let step = 1 + (d2 !== d ? BEND : 0)
      const there = runs.get(c2)
      if (there) step += there.has(d2 % 2) ? ALONG : CROSS
      if (d2 !== d && runs.has(c)) step += ALONG
      if (labelled.has(c2)) step += OVER_LABEL
      const s2 = c2 * 4 + d2
      if (cost[state] + step < cost[s2]) {
        cost[s2] = cost[state] + step
        from[s2] = state
        push(cost[s2] + h(next), s2)
      }
    }
  }
  if (end < 0) return fallback()
  const path: Pt[] = []
  for (let st = end; st >= 0; st = from[st]) path.unshift(pointOf(st >> 2))
  return simplify(path).slice(1, -1)
}

/** Junction dots: wherever three or more lines meet, counting a part's lead
 *  into its terminal as one. Wires that only cross get no dot. */
export function junctions(s: Schematic): Pt[] {
  const lines = s.wires.flatMap((w) => segments(wirePath(s, w)))
  const leads = new Map<string, Pt[]>()
  for (const p of s.parts)
    for (const t of [0, 1] as const) {
      const q = key(terminal(p, t))
      leads.set(q, [...(leads.get(q) ?? []), { x: -outward(p, t).x, y: -outward(p, t).y }])
    }
  const points = new Map<string, Pt>()
  for (const [a, b] of lines) points.set(key(a), a).set(key(b), b)
  const dots: Pt[] = []
  for (const [k, p] of points) {
    const arms = new Set((leads.get(k) ?? []).map(key))
    for (const [a, b] of lines) {
      const onIt = a.x === b.x ? p.x === a.x && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y) : p.y === a.y && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x)
      if (!onIt) continue
      const toward = (q: Pt) => key({ x: Math.sign(q.x - p.x), y: Math.sign(q.y - p.y) })
      if (!same(p, a)) arms.add(toward(a))
      if (!same(p, b)) arms.add(toward(b))
    }
    if (arms.size >= 3) dots.push(p)
  }
  return dots
}

// Getting the circuit out.

/** The part of the page an export keeps: every part, label and wire, plus a
 *  margin. Null when there is nothing drawn. */
export function cropBox(s: Schematic) {
  if (!s.parts.length) return null
  const boxes: Box[] = s.parts.flatMap((p) => {
    const marks = partMarks(p, s.polarity)
    return [partBox(p), ...marks.labels.map(labelBox), ...marks.letters.map(letterBox)]
  })
  for (const w of s.wires) for (const q of wirePath(s, w)) boxes.push({ left: q.x, right: q.x, top: q.y, bottom: q.y })
  const left = Math.min(...boxes.map((b) => b.left)) - EXPORT_PAD
  const right = Math.max(...boxes.map((b) => b.right)) + EXPORT_PAD
  const top = Math.min(...boxes.map((b) => b.top)) - EXPORT_PAD
  const bottom = Math.max(...boxes.map((b) => b.bottom)) + EXPORT_PAD
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** A few words saying what is drawn, for screen readers and the image's
 *  label. Labels are left out, so a blank is never given away. */
export function describe(s: Schematic) {
  if (!s.parts.length) return 'An empty circuit'
  const counts = new Map<PartKind, number>()
  for (const p of s.parts) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1)
  const plural = (kind: PartKind) => (kind === 'switch' ? 'switches' : kind === 'battery' ? 'batteries' : `${kind}s`)
  const parts = [...counts].map(([kind, n]) => (n === 1 ? `1 ${kind}` : `${n} ${plural(kind)}`)).join(', ')
  return `A circuit diagram of ${parts}, joined by ${s.wires.length} wire${s.wires.length === 1 ? '' : 's'}`
}

/** A drawing read back from browser storage (or handed over by the
 *  generator), keeping only well-formed parts on the page and wires between
 *  two of their terminals. */
export function tidySchematic(stored: unknown): Schematic {
  if (!stored || typeof stored !== 'object') return emptySchematic()
  const { parts, wires, symbols, polarity } = stored as Record<string, unknown>
  const ids = new Set<string>()
  const good: Part[] = []
  for (const p of Array.isArray(parts) ? parts : []) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id) || !PART_KINDS.includes(p.kind) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue
    ids.add(p.id)
    good.push({
      id: p.id,
      kind: p.kind,
      ...snap(p.x, p.y),
      rotation: ROTATIONS.includes(p.rotation) ? p.rotation : 0,
      name: cleanLabel(p.name, { mode: 'none', text: '' }),
      value: cleanLabel(p.value, { mode: 'none', text: '' }),
      flip: p.flip === true,
      open: p.kind === 'switch' && p.open === true,
    })
  }
  const end = (e: unknown): End | null => {
    const v = e as Partial<End> | null
    return v && typeof v.part === 'string' && ids.has(v.part) && (v.t === 0 || v.t === 1) ? { part: v.part, t: v.t } : null
  }
  const joined: Wire[] = []
  for (const w of Array.isArray(wires) ? wires : []) {
    const [a, b] = [end(w?.a), end(w?.b)]
    if (!a || !b || sameEnd(a, b) || typeof w.id !== 'string' || joined.some((x) => x.id === w.id)) continue
    const via = (Array.isArray(w.via) ? w.via : []).filter((q: Pt) => q && Number.isFinite(q.x) && Number.isFinite(q.y)).map((q: Pt) => snapPoint(q.x, q.y))
    joined.push({ id: w.id, a, b, via, auto: w.auto !== false })
  }
  return { parts: good, wires: joined, symbols: symbols === 'iec' ? 'iec' : 'us', polarity: polarity === true }
}
