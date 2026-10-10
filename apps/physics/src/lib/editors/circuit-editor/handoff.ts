// The Circuit Diagram Generator's figure as a Circuit Editor drawing, for its
// Edit by hand button: the parts where the generator drew them, and wires
// along the generator's own lines.
//
// The generator places things anywhere; the editor puts every part's middle
// on a grid point with its terminals two grid steps either side. So each
// axis is mapped on its own: every x the figure uses (part middles, wire
// corners) in order, each the next grid line along, about as far apart as
// they were and never closer than a part needs. Order is kept, so what was
// level stays level, nothing crosses that didn't, and the picture keeps its
// shape. Each run of joined wire becomes wires from one of its terminals to
// each of the others, along the figure's lines; where two of them share a
// stretch the editor draws them as one, so it looks the same, junction dots
// and all. The editor's drawing is replaced, so Undo there brings back the
// old one.

import { circuitOf } from '$lib/generators/circuit-diagram/circuit'
import { buildCircuit, labelBox, METER_R, symbolSize, type CircuitFigure, type Pt } from '$lib/generators/circuit-diagram/layout'
import type { CircuitSettings } from '$lib/generators/circuit-diagram/settings'
import {
  cropBox, GRID, HEIGHT, LEAD, simplify, WIDTH,
  type Part, type PartKind, type Rotation, type Schematic, type Wire,
} from './schematic'

/** Where the generator leaves a circuit for the editor to pick up. */
export const HANDOFF_KEY = 'physicsfigures.circuit-editor.handoff'

/** How much bigger the editor draws than the generator: a resistor's 68 units come out 4 grid steps. */
const SCALE = 1.2
/** Positions closer than this are the same one. */
const CLOSE = 0.5

const UNIT: Record<Rotation, Pt> = { 0: { x: 1, y: 0 }, 90: { x: 0, y: 1 }, 180: { x: -1, y: 0 }, 270: { x: 0, y: -1 } }

/** A part as the figure has it, before it's moved onto the grid. */
interface Placed {
  part: Omit<Part, 'x' | 'y'>
  at: Pt
  /** Its two ends where the figure's wires meet them, terminal 0 then 1. */
  ends: [Pt, Pt]
}

const near = (p: Pt, q: Pt) => Math.abs(p.x - q.x) < CLOSE && Math.abs(p.y - q.y) < CLOSE

/** The editor's drawing of the generator's figure for these settings. */
export function fromGenerator(s: CircuitSettings): Schematic {
  const fig = buildCircuit(circuitOf(s), { title: false, polarity: s.polarity })
  return fromFigure(s.mirror ? mirrored(fig) : fig, s, s.mirror)
}

/** A figure flipped left to right, as the generator draws it when mirrored. */
function mirrored(fig: CircuitFigure): CircuitFigure {
  const flip = (p: Pt) => ({ x: fig.width - p.x, y: p.y })
  return {
    ...fig,
    wires: fig.wires.map((w) => w.map(flip)),
    dots: fig.dots.map(flip),
    parts: fig.parts.map((p) => ({ ...p, ...flip(p), angle: (540 - p.angle) % 360 })),
    meters: fig.meters.map(flip),
    labels: fig.labels.map((l) => ({ ...l, ...flip(l) })),
  }
}

/** The editor's drawing of a laid-out figure; `mirror` when it has been flipped left to right. */
export function fromFigure(fig: CircuitFigure, s: Pick<CircuitSettings, 'symbols' | 'polarity' | 'voltmeterLabel'>, mirror = false): Schematic {
  const placed: Placed[] = fig.parts.map((p, i) => {
    const rotation = p.angle as Rotation
    const u = UNIT[rotation]
    const half = symbolSize(p.part).half
    // Its name goes on the side its frame calls up, (sin a, −cos a); mirrored, that's turned round.
    const r = (rotation * Math.PI) / 180
    const sign = mirror ? -1 : 1
    const up = { x: sign * Math.round(Math.sin(r)), y: -sign * Math.round(Math.cos(r)) }
    return {
      part: {
        id: `p${i + 1}`,
        kind: (p.part.kind === 'battery' ? (p.part.cells === 2 ? 'battery' : 'cell') : p.part.kind) as PartKind,
        rotation,
        name: { ...p.part.name },
        value: { ...p.part.value },
        flip: rotation % 180 === 0 ? up.y > 0 : up.x > 0,
        open: p.part.open,
      },
      at: { x: p.x, y: p.y },
      ends: [{ x: p.x - u.x * half, y: p.y - u.y * half }, { x: p.x + u.x * half, y: p.y + u.y * half }],
    }
  })
  // A voltmeter lies the way its leads reach it, with its reading on the side away from them.
  const wireEnds = fig.wires.flatMap((w) => [w[0], w.at(-1)!])
  fig.meters.forEach((m, i) => {
    const across = wireEnds.some((q) => near(q, { x: m.x + METER_R, y: m.y }))
    const rotation: Rotation = across ? 0 : 90
    const label = fig.labels
      .filter((l) => l.label.mode === s.voltmeterLabel.mode && l.label.text === s.voltmeterLabel.text)
      .sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0]
    const side = label ? (across ? Math.sign(labelMiddle(label).y - m.y) : Math.sign(labelMiddle(label).x - m.x)) : 1
    placed.push({
      part: { id: `m${i + 1}`, kind: 'voltmeter', rotation, name: { mode: 'none', text: 'V' }, value: { ...s.voltmeterLabel }, flip: side < 0, open: false },
      at: m,
      ends: across ? [{ x: m.x - METER_R, y: m.y }, { x: m.x + METER_R, y: m.y }] : [{ x: m.x, y: m.y - METER_R }, { x: m.x, y: m.y + METER_R }],
    })
  })

  // The wires as a network: every corner and end a point, every line split wherever another point sits on it.
  const points: Pt[] = []
  const pointAt = (p: Pt) => {
    const i = points.findIndex((q) => near(p, q))
    return i >= 0 ? i : points.push(p) - 1
  }
  for (const w of fig.wires) for (const p of w) pointAt(p)
  const links = new Map<number, Set<number>>(points.map((_, i) => [i, new Set()]))
  for (const w of fig.wires)
    for (let k = 1; k < w.length; k++) {
      const [a, b] = [w[k - 1], w[k]]
      const on = points
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => (Math.abs(a.x - b.x) < CLOSE ? Math.abs(p.x - a.x) < CLOSE && p.y > Math.min(a.y, b.y) - CLOSE && p.y < Math.max(a.y, b.y) + CLOSE : Math.abs(p.y - a.y) < CLOSE && p.x > Math.min(a.x, b.x) - CLOSE && p.x < Math.max(a.x, b.x) + CLOSE))
        .sort((m, n) => Math.hypot(m.p.x - a.x, m.p.y - a.y) - Math.hypot(n.p.x - a.x, n.p.y - a.y))
      for (let j = 1; j < on.length; j++) {
        links.get(on[j - 1].i)!.add(on[j].i)
        links.get(on[j].i)!.add(on[j - 1].i)
      }
    }
  const terminals = placed.flatMap((p) => p.ends.map((e, t) => ({ end: { part: p.part.id, t: t as 0 | 1 }, point: points.findIndex((q) => near(q, e)) }))).filter((t) => t.point >= 0)
  const isTerminal = new Set(terminals.map((t) => t.point))

  // Each axis mapped onto the grid, in order (see the top of this file).
  const q = (v: number) => Math.round(v / CLOSE) * CLOSE
  const xs = mapAxis(
    [...placed.map((p) => p.at.x), ...points.filter((_, i) => !isTerminal.has(i)).map((p) => p.x)].map(q),
    new Set(placed.filter((p) => p.part.rotation % 180 === 0).map((p) => q(p.at.x))),
  )
  const ys = mapAxis(
    [...placed.map((p) => p.at.y), ...points.filter((_, i) => !isTerminal.has(i)).map((p) => p.y)].map(q),
    new Set(placed.filter((p) => p.part.rotation % 180 !== 0).map((p) => q(p.at.y))),
  )
  const onGrid = (p: Pt) => ({ x: xs.get(q(p.x))!, y: ys.get(q(p.y))! })

  // Each run of joined wire: from its first terminal, the way along the network to each of the others.
  const wires: Wire[] = []
  const seen = new Set<number>()
  for (const root of terminals) {
    if (seen.has(root.point)) continue
    const from = new Map<number, number>([[root.point, -1]])
    const queue = [root.point]
    while (queue.length) {
      const here = queue.shift()!
      for (const next of links.get(here)!) {
        if (from.has(next) || (isTerminal.has(here) && here !== root.point)) continue
        from.set(next, here)
        queue.push(next)
      }
    }
    for (const t of terminals) {
      if (!from.has(t.point)) continue
      seen.add(t.point)
      if (t.point === root.point) continue
      const way: number[] = []
      for (let at = t.point; at !== -1; at = from.get(at)!) way.unshift(at)
      wires.push({ id: `w${wires.length + 1}`, a: root.end, b: t.end, via: simplify(way.map((i) => onGrid(points[i]))).slice(1, -1), auto: false })
    }
  }

  const drawing: Schematic = { parts: placed.map((p) => ({ ...p.part, ...onGrid(p.at) })), wires, symbols: s.symbols, polarity: s.polarity }
  return centered(drawing)
}

const labelMiddle = (l: CircuitFigure['labels'][number]) => {
  const box = labelBox(l)
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
}

/**
 * Grid positions for one axis's values, in order: each the next grid line
 * on, about as far from the last as the figure had it, and at least one
 * step (three from the middle of a part lying along this axis, so its
 * terminal and a little wire fit, and four between two such parts).
 */
function mapAxis(values: number[], middles: Set<number>): Map<number, number> {
  const sorted = [...new Set(values)].sort((a, b) => a - b)
  const out = new Map<number, number>()
  let at = 0
  sorted.forEach((v, i) => {
    if (i) {
      const prev = sorted[i - 1]
      const parts = Number(middles.has(v)) + Number(middles.has(prev))
      const least = [1, LEAD / GRID + 1, (2 * LEAD) / GRID][parts]
      at += Math.max(least, Math.round(((v - prev) * SCALE) / GRID)) * GRID
    }
    out.set(v, at)
  })
  return out
}

/** A drawing moved, in whole grid steps, to the middle of the page. */
function centered(s: Schematic): Schematic {
  const crop = cropBox(s)
  if (!crop) return s
  const dx = Math.round((WIDTH / 2 - (crop.x + crop.width / 2)) / GRID) * GRID
  const dy = Math.round((HEIGHT / 2 - (crop.y + crop.height / 2)) / GRID) * GRID
  const move = (p: Pt) => ({ x: p.x + dx, y: p.y + dy })
  return {
    ...s,
    parts: s.parts.map((p) => ({ ...p, ...move(p) })),
    wires: s.wires.map((w) => ({ ...w, via: w.via.map(move) })),
  }
}
