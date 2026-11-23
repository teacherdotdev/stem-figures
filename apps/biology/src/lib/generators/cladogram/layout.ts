// Where everything on a cladogram goes, worked out apart from the drawing so
// it can be tested: the branches, the trait ticks and their labels, the taxon
// names at the tips, the node numbers, and the box around it all.
//
// The tree is laid out along two directions: t along the tips (tip i at
// i × the tip gap) and d from the tips toward the root. Those are then turned
// into x and y: a diagonal cladogram has its tips along the top (x = t,
// y = d), a rectangular tree down the right (x = −d, y = t). Everything is
// then shifted to start at (0, 0).
//
// Trait labels are written beside their branches. Where one would touch
// another label or a branch (inside the V of a balanced tree, say), the tips
// are spread farther apart and the tree laid out again.

import type { CladogramSettings } from './settings'
import { cladesOf, isClade, taxaOf, withTraits, type Clade, type Node } from './tree'

export const NAME_SIZE = 16
export const TRAIT_SIZE = 14
export const NUMBER_SIZE = 12
export const NUMBER_R = 10
/** a blank line for a taxon name or a trait */
export const NAME_BLANK_W = 70
export const TRAIT_BLANK_W = 70
/** half the length of a trait's tick across its branch */
export const TICK = 7
const TEXT_GAP = 5
/** the root stem, below the root */
const STEM = 36
/** tips along the top: the narrowest gap between them, and the widest a
 *  name's line can be before it wraps */
const TOP_GAP = 72
const NAME_WRAP = 110
export const NAME_LINE = 19
/** tips down the right: the gap between them */
const RIGHT_GAP = 44
/** rectangular trees: the narrowest step between levels */
const MIN_STEP = 56
const MARGIN = 4

/** About how wide a line of Arial is. */
export const textWidth = (text: string, size: number) => 0.56 * size * [...text].length

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Point {
  x: number
  y: number
}

export interface DrawnName {
  /** the taxon's name in lines, or [] for a blank line */
  lines: string[]
  /** where the text goes: its anchor point and how lines run from it */
  x: number
  y: number
  anchor: 'middle' | 'start'
  box: Box
}

export interface DrawnTrait {
  /** the trait as written, or '' for a blank line, or null for a tick alone */
  text: string | null
  /** a blank line's number, matching the answer key */
  number: number | null
  tick: [Point, Point]
  /** the text's or blank line's box */
  box: Box | null
}

export interface CladogramLayout {
  width: number
  height: number
  /** each branch as a polyline */
  branches: Point[][]
  names: DrawnName[]
  traits: DrawnTrait[]
  /** each clade's node, numbered from 1 at the root */
  nodes: { x: number; y: number; n: number }[]
  /** labels still touch after spreading the tips as far as they go */
  crowded: boolean
}

/** A name in lines no wider than `max`, broken at spaces. */
export function wrap(text: string, size: number, max: number): string[] {
  const lines: string[] = []
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1]
    if (last !== undefined && textWidth(`${last} ${word}`, size) <= max) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines
}

const traitShown = (n: Node, s: CladogramSettings) => s.traits !== 'none' && !!n.trait?.trim()

/** Where each clade's node and each taxon's tip sit, in t and d. */
function place(tree: Clade, s: CladogramSettings, gap: number, step: number) {
  const at = new Map<Node, { t: number; d: number }>()
  let tip = 0
  const height = (n: Node): number => (isClade(n) ? 1 + Math.max(...n.children.map(height)) : 0)
  const visit = (n: Node): { lo: number; hi: number } => {
    if (!isClade(n)) {
      const t = tip++ * gap
      at.set(n, { t, d: 0 })
      return { lo: t, hi: t }
    }
    const spans = n.children.map(visit)
    const lo = spans[0].lo
    const hi = spans[spans.length - 1].hi
    if (s.style === 'diagonal') at.set(n, { t: (lo + hi) / 2, d: (hi - lo) / 2 })
    else {
      const first = at.get(n.children[0])!
      const last = at.get(n.children[n.children.length - 1])!
      at.set(n, { t: (first.t + last.t) / 2, d: height(n) * step })
    }
    return { lo, hi }
  }
  visit(tree)
  return at
}

/** The traits drawn, in the order they're numbered: the root's first, each
 *  clade's before the clades inside it. */
export const shownTraits = (s: CladogramSettings) => (s.traits === 'none' ? [] : withTraits(s.tree))

/** A blank trait's number, then its line. */
export const blankLabel = (n: number) => `${n}.`
const blankW = (n: number) => textWidth(blankLabel(n), TRAIT_SIZE) + 4 + TRAIT_BLANK_W

const SPREAD = 16
const MAX_SPREADS = 16

export function layoutCladogram(s: CladogramSettings): CladogramLayout {
  let at = layoutOnce(s, 0)
  for (let i = 1; i <= MAX_SPREADS && at.crowded; i++) at = layoutOnce(s, i * SPREAD)
  return at
}

const inside = (p: Point, b: Box) => p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
/** Whether a line from p to q passes through a box, checked every 2 px. */
function crosses(p: Point, q: Point, b: Box) {
  const steps = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 2))
  for (let i = 0; i <= steps; i++) if (inside({ x: p.x + ((q.x - p.x) * i) / steps, y: p.y + ((q.y - p.y) * i) / steps }, b)) return true
  return false
}
const shrink = (b: Box, by: number): Box => ({ x: b.x + by, y: b.y + by, w: b.w - 2 * by, h: b.h - 2 * by })

/** Whether any trait label touches another label or a branch. */
export function isCrowded(at: Pick<CladogramLayout, 'branches' | 'names' | 'traits'>) {
  const boxes = at.traits.flatMap((t) => (t.box ? [shrink(t.box, -1)] : []))
  const names = at.names.map((n) => n.box)
  return boxes.some(
    (b, i) =>
      boxes.some((o, j) => j > i && overlap(b, o)) ||
      names.some((o) => overlap(b, o)) ||
      at.branches.some((line) => line.slice(1).some((q, k) => crosses(line[k], q, b))),
  )
}

function layoutOnce(s: CladogramSettings, spread: number): CladogramLayout {
  const tree = s.tree
  const taxa = taxaOf(tree)
  const clades = cladesOf(tree)
  const top = s.style === 'diagonal'
  const numbers = new Map(shownTraits(s).map((c, i) => [c, i + 1]))
  const nameLines = (name: string) => (s.taxa === 'blank' || !name.trim() ? [] : top ? wrap(name, NAME_SIZE, NAME_WRAP) : [name.trim()])
  const lineW = (lines: string[]) => (lines.length ? Math.max(...lines.map((l) => textWidth(l, NAME_SIZE))) : NAME_BLANK_W)
  const traitW = (c: Node) =>
    s.traits === 'names' ? textWidth((c.trait ?? '').trim(), TRAIT_SIZE) : s.traits === 'blank' ? blankW(numbers.get(c) ?? 1) : 0
  const shownTraitWs = shownTraits(s).map(traitW)
  const widestTrait = Math.max(0, ...shownTraitWs)

  // Tips along the top sit far enough apart for their names; down the
  // right, far enough apart for a line of text and a trait above a branch.
  const gap = spread + (top ? Math.max(TOP_GAP, ...taxa.map((x) => lineW(nameLines(x.name)) + 14)) : RIGHT_GAP)
  // Rectangular levels are wide enough for a trait over a branch.
  const step = spread + Math.max(MIN_STEP, widestTrait + 2 * TEXT_GAP + 6)

  const at = place(tree, s, gap, step)
  const xy = (t: number, d: number): Point => (top ? { x: t, y: d } : { x: -d, y: t })

  const branches: Point[][] = []
  const traits: DrawnTrait[] = []
  const root = at.get(tree)!
  // Long enough for the root's trait: over it on a rectangular tree, beside it on a diagonal one.
  const stem = traitShown(tree, s) ? (top ? STEM + 14 : Math.max(STEM, traitW(tree) + 2 * TEXT_GAP + 6)) : STEM

  /** A trait's tick across the branch from a to b (in t, d) at its middle,
   *  and its label on the branch's outer side: the side toward the root. */
  function trait(c: Node, a: { t: number; d: number }, b: { t: number; d: number }) {
    if (!traitShown(c, s)) return
    const mid = { t: (a.t + b.t) / 2, d: (a.d + b.d) / 2 }
    const len = Math.hypot(b.t - a.t, b.d - a.d) || 1
    // The normal to the branch with d increasing (toward the root), or +t
    // across a branch running straight along d.
    let n = { t: -(b.d - a.d) / len, d: (b.t - a.t) / len }
    if (n.d < 0 || (n.d === 0 && n.t < 0)) n = { t: -n.t, d: -n.d }
    const p1 = xy(mid.t - n.t * TICK, mid.d - n.d * TICK)
    const p2 = xy(mid.t + n.t * TICK, mid.d + n.d * TICK)
    const text = s.traits === 'names' ? (c.trait ?? '').trim() : s.traits === 'blank' ? '' : null
    if (text === null) {
      traits.push({ text, number: null, tick: [p1, p2], box: null })
      return
    }
    const w = traitW(c)
    const h = TRAIT_SIZE
    const o = xy(mid.t + n.t * (TICK + TEXT_GAP), mid.d + n.d * (TICK + TEXT_GAP))
    const dir = { x: p2.x - p1.x, y: p2.y - p1.y }
    const side = (v: number, size: number, start: number) => (Math.abs(v) < 1e-6 ? start - size / 2 : v > 0 ? start : start - size)
    let box: Box
    if (!top) {
      // Over a horizontal branch, centered.
      const m = xy(mid.t, mid.d)
      box = { x: m.x - w / 2, y: m.y - TICK - TEXT_GAP - h, w, h }
    } else {
      box = { x: side(dir.x, w, o.x), y: side(dir.y, h, o.y), w, h }
    }
    traits.push({ text, number: text ? null : (numbers.get(c) ?? null), tick: [p1, p2], box })
  }

  // The root stem, with the root's trait on it.
  const stemEnd = { t: root.t, d: root.d + stem }
  branches.push([xy(root.t, root.d), xy(stemEnd.t, stemEnd.d)])
  trait(tree, stemEnd, root)

  for (const c of clades) {
    const p = at.get(c)!
    if (s.style === 'rectangular') {
      const first = at.get(c.children[0])!
      const last = at.get(c.children[c.children.length - 1])!
      branches.push([xy(first.t, p.d), xy(last.t, p.d)])
    }
    for (const child of c.children) {
      const q = at.get(child)!
      const from = s.style === 'rectangular' ? { t: q.t, d: p.d } : p
      branches.push([xy(from.t, from.d), xy(q.t, q.d)])
      trait(child, from, q)
    }
  }

  const names: DrawnName[] = taxa.map((x) => {
    const p = xy(at.get(x)!.t, 0)
    const lines = nameLines(x.name)
    const w = lineW(lines)
    if (top) {
      const h = lines.length ? lines.length * NAME_LINE : 4
      return { lines, x: p.x, y: p.y - 8 - h, anchor: 'middle', box: { x: p.x - w / 2, y: p.y - 8 - h, w, h } }
    }
    const h = lines.length ? NAME_SIZE : 4
    return { lines, x: p.x + 8, y: p.y - h / 2, anchor: 'start', box: { x: p.x + 8, y: p.y - h / 2, w, h } }
  })

  const nodes = s.nodeNumbers ? clades.map((c, i) => ({ ...xy(at.get(c)!.t, at.get(c)!.d), n: i + 1 })) : []

  // Shift everything into a box from (0, 0).
  const xs: number[] = []
  const ys: number[] = []
  const add = (b: Box) => {
    xs.push(b.x, b.x + b.w)
    ys.push(b.y, b.y + b.h)
  }
  for (const line of branches) for (const pt of line) add({ x: pt.x, y: pt.y, w: 0, h: 0 })
  for (const tr of traits) {
    for (const pt of tr.tick) add({ x: pt.x, y: pt.y, w: 0, h: 0 })
    if (tr.box) add(tr.box)
  }
  for (const nm of names) add(nm.box)
  for (const nd of nodes) add({ x: nd.x - NUMBER_R, y: nd.y - NUMBER_R, w: 2 * NUMBER_R, h: 2 * NUMBER_R })
  const dx = MARGIN - Math.min(...xs)
  const dy = MARGIN - Math.min(...ys)
  const pt = (p: Point) => ({ x: p.x + dx, y: p.y + dy })
  const bx = (b: Box) => ({ ...b, x: b.x + dx, y: b.y + dy })

  const crowded = isCrowded({ branches, names, traits })
  return {
    crowded,
    width: Math.max(...xs) + dx + MARGIN,
    height: Math.max(...ys) + dy + MARGIN,
    branches: branches.map((line) => line.map(pt)),
    names: names.map((nm) => ({ ...nm, x: nm.x + dx, y: nm.y + dy, box: bx(nm.box) })),
    traits: traits.map((tr) => ({ ...tr, tick: [pt(tr.tick[0]), pt(tr.tick[1])], box: tr.box && bx(tr.box) })),
    nodes: nodes.map((nd) => ({ ...nd, ...pt(nd) })),
  }
}

const list = (items: string[]) =>
  items.length <= 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

/** The traits as written, from the root up. */
const traitNames = (tree: Clade) => withTraits(tree).map((n) => n.trait!.trim())

/** What the answer key prints: the taxa when their names are blank, and the
 *  traits when they're blank, each in the order drawn. */
export function answerLines(s: CladogramSettings): string[] {
  const lines: string[] = []
  const taxa = taxaOf(s.tree).map((x) => x.name.trim())
  if (s.taxa === 'blank' && taxa.some(Boolean)) lines.push(`Taxa: ${taxa.map((x) => x || '?').join(', ')}`)
  const traits = s.traits === 'blank' ? shownTraits(s) : []
  if (traits.length) lines.push(`Traits: ${traits.map((c, i) => `${blankLabel(i + 1)} ${(c.trait ?? '').trim()}`).join(', ')}`)
  return lines
}

/** The figure for a screen reader. */
export function describe(s: CladogramSettings): string {
  const taxa = taxaOf(s.tree).map((x) => x.name.trim())
  const kind = s.style === 'diagonal' ? 'A cladogram' : 'A phylogenetic tree'
  const named = s.taxa === 'names' && taxa.some(Boolean)
  const parts = [
    named
      ? `${kind} of ${taxa.length} taxa: ${list(taxa.map((x) => x || 'a blank'))}.`
      : `${kind} of ${taxa.length} taxa with blank names.`,
  ]
  const traits = traitNames(s.tree)
  if (traits.length && s.traits === 'names') parts.push(`Traits from the root: ${list(traits)}.`)
  else if (traits.length && s.traits !== 'none') parts.push(`${traits.length} traits marked on the branches${s.traits === 'blank' ? ' with blank lines' : ''}.`)
  if (s.nodeNumbers) parts.push('Nodes are numbered from 1 at the root.')
  return parts.join(' ')
}
