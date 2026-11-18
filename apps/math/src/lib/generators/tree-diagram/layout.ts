// Lays out a tree diagram as plain numbers for TreeDiagram.svelte to draw:
// each branch as a line, each label (outcome names at the ends of branches,
// probabilities beside them, the start label, stage titles and the outcome
// column) as laid-out math centered on a point, blank lines for students, and
// a box round each label the teacher can click to make it a blank.
//
// It works along two directions: the depth of the tree (across when it grows
// left to right, down when top to bottom) and its breadth. Leaves are spread
// evenly along the breadth and each node sits midway between its first and
// last child. A probability sits partway along its branch, pushed off the line
// on the outer side just far enough to clear it. When labels would overlap,
// the leaves are spread farther apart and the tree is laid out again, rather
// than the text shrinking.

import { LABEL_SCALE } from '$shared/labelSize'
import { layoutMath, type MathBox } from '$lib/shared/mathSvg.js'
import { readTree, type Settings, type Show, type TreeNode } from './settings'

const BASE_FS = 20 // every label, at medium labels
const EDGE = 6 // white space round the figure
const ALONG = 0.62 // how far along its branch a probability sits
const FAN = 0.9 // a branch's least length for how far it spreads, so a fan is no steeper than about 1 in 1
const GROW = 1.12
const TRIES = 14

type Vec = [number, number]
/** Laid-out math, centered on (cx, cy); box null for a blank line. */
export type Label = { cx: number; cy: number; box: MathBox | null; w: number; h: number; asc: number; desc: number }
/** A label as drawn: its left end and baseline. */
export type Placed = { x: number; y: number; box: MathBox }
export type Line = { x1: number; y1: number; x2: number; y2: number }
/** A label the teacher can click: its key, its box, and what a screen reader hears. */
export type Pick = { key: string; x: number; y: number; w: number; h: number; name: string }
type Rect = { x0: number; y0: number; x1: number; y1: number }

/** Outcome names and stage titles are words, written upright; probabilities are math. */
const word = (t: string, fs: number) => layoutMath('', fs, { suffix: t })

export function buildTree(s: Settings) {
  const read = readTree(s)
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const pad = fs * 0.35
  const down = s.direction === 'down'
  const blanks = new Set(s.blanks)
  // A blank line takes a line of writing room above it, as tall as a
  // fraction, so a student's answer fits on it clear of the branches.
  const blankSize = { w: fs * 2.4, asc: fs * 1.3, desc: fs * 0.15 }
  // In a row of text (outcomes, path names and their probabilities) a blank
  // line sits on the text's baseline, so it lines up with the words beside it.
  const letter = word('H', fs)!
  const rowBlank = { w: fs * 2.4, asc: letter.asc, desc: letter.desc }

  /**
   * A label's contents by what's typed and how its kind is shown: math, a
   * blank line, or nothing. `empty` labels (nothing typed) are always blanks.
   */
  function content(show: Show, key: string, make: () => MathBox | null, empty: boolean, blank = blankSize): { box: MathBox | null; size: typeof blankSize; pick: boolean } | null {
    if (show === 'hide') return null
    if (show === 'blank' || empty || blanks.has(key)) return { box: null, size: blank, pick: show === 'show' && !empty }
    const box = make()
    return box ? { box, size: box, pick: true } : { box: null, size: blank, pick: false }
  }

  // Each node's outcome name and probability, and each path's name and probability.
  const outcomeOf = (n: TreeNode) => content(s.showOutcomes, `o${n.id}`, () => word(n.outcome, fs), !n.outcome, rowBlank)
  const probOf = (n: TreeNode) => content(s.showProbs, `p${n.id}`, () => layoutMath(n.prob, fs), !n.prob)
  const outcomes = read.nodes.map((stage) => stage.map(outcomeOf))
  const probs = read.nodes.map((stage) => stage.map(probOf))
  const names = read.paths.map((p) => content(s.showNames, `n${p.id}`, () => word(p.name, fs), p.nameBlank, rowBlank))
  const pathProbs = read.paths.map((p) => content(s.showPathProbs, `q${p.id}`, () => layoutMath(p.prob!.text, fs), !p.prob, rowBlank))
  const column = names.some(Boolean) || pathProbs.some(Boolean)
  const start = s.start.trim() ? word(s.start.trim(), fs) : null
  const titles = s.stageTitles ? s.stages.map((st) => (st.title.trim() ? word(st.title.trim(), fs * 0.95) : null)) : []

  const h = (c: { size: { asc: number; desc: number } } | null) => (c ? c.size.asc + c.size.desc : 0)
  const w = (c: { size: { w: number } } | null) => (c ? c.size.w : 0)
  // How far a label reaches along the depth, and along the breadth.
  const depthOf = (c: Parameters<typeof h>[0] & Parameters<typeof w>[0]) => (down ? h(c) : w(c))
  const breadthOf = (c: Parameters<typeof h>[0] & Parameters<typeof w>[0]) => (down ? w(c) : h(c))

  const leaves = read.paths.length
  const maxOf = (list: number[]) => Math.max(0, ...list)
  // Each leaf's room along the breadth: its outcome name, path name and
  // probability, and (top to bottom) its branch's probability.
  const last = read.nodes.length - 1
  const leafNeeds = read.paths.map((_, i) =>
    down
      ? Math.max(w(outcomes[last][i]), w(names[i]), w(pathProbs[i])) + fs * 1.2
      : Math.max(h(outcomes[last][i]), column ? h(names[i]) : 0, column ? h(pathProbs[i]) : 0) + fs * 0.9,
  )
  let spacing = Math.max(fs * (down ? 2.6 : 1.9), maxOf(leafNeeds))

  function layOut(spacing: number) {
    const labels: { key: string; name: string; label: Label; pick: boolean }[] = []
    const branches: Line[] = []
    const at = (depth: number, breadth: number): Vec => (down ? [breadth, depth] : [depth, breadth])
    const add = (key: string, name: string, c: NonNullable<ReturnType<typeof content>>, [cx, cy]: Vec) =>
      labels.push({ key, name, pick: c.pick, label: { cx, cy, box: c.box, w: c.size.w, h: c.size.asc + c.size.desc, asc: c.size.asc, desc: c.size.desc } })

    // Breadth: the leaves evenly, each node midway between its outer children.
    const breadth = new Map<string, number>()
    read.paths.forEach((p, i) => breadth.set(p.id, i * spacing))
    for (let k = last - 1; k >= 0; k--) {
      for (const n of read.nodes[k]) {
        const kids = read.nodes[k + 1].filter((c) => c.id.startsWith(`${n.id}-`))
        breadth.set(n.id, (breadth.get(kids[0].id)! + breadth.get(kids[kids.length - 1].id)!) / 2)
      }
    }
    const rootBreadth = read.nodes[0].length
      ? (breadth.get(read.nodes[0][0].id)! + breadth.get(read.nodes[0][read.nodes[0].length - 1].id)!) / 2
      : 0

    // Depth: the start label, then each stage's branches, then its outcome names.
    let depth = 0
    if (start) {
      add('', '', { box: start, size: start, pick: false }, at(depthOf({ size: start }) / 2, rootBreadth))
      depth = depthOf({ size: start }) + pad
    }
    /** Where each node's branches leave from, along the depth. */
    const from = new Map<string, number>([['', depth]])
    const titleAt: { depth: number; breadth: number }[] = []
    for (let k = 0; k <= last; k++) {
      const stage = read.nodes[k]
      const probRoom = maxOf(probs[k].map((c) => (down ? h(c) : w(c))))
      // Long enough for its probabilities, and for its widest fan not to be
      // steeper than about one in one, so there's room for a probability
      // between two branches, and spreading the leaves spreads the labels.
      const span = maxOf(stage.map((n) => {
        const parent = n.t.slice(0, -1).join('-')
        return Math.abs(breadth.get(n.id)! - (parent ? breadth.get(parent)! : rootBreadth))
      }))
      const base = probs[k].some(Boolean) ? Math.max(fs * (down ? 3.6 : 4.5), probRoom * 1.8 + fs * 1.5) : fs * (down ? 2.6 : 3.2)
      const length = Math.max(base, span * FAN)
      const begin = maxOf(stage.map((n) => from.get(n.t.slice(0, -1).join('-'))!))
      const end = begin + length
      stage.forEach((n, i) => {
        const parent = n.t.slice(0, -1).join('-')
        const a = at(from.get(parent)!, parent ? breadth.get(parent)! : rootBreadth)
        const b = at(end, breadth.get(n.id)!)
        branches.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] })
        const o = outcomes[k][i]
        const oDepth = o ? depthOf(o) : 0
        if (o) add(`o${n.id}`, `Outcome ${n.outcome || 'blank'}`, o, at(end + pad + oDepth / 2, breadth.get(n.id)!))
        from.set(n.id, end + (o ? pad + oDepth + pad : 0))

        // The probability, partway along, pushed off the line on the outer side.
        const p = probs[k][i]
        if (!p) return
        const dx = b[0] - a[0]
        const dy = b[1] - a[1]
        const len = Math.hypot(dx, dy) || 1
        const offBreadth = breadth.get(n.id)! - (parent ? breadth.get(parent)! : rootBreadth)
        // The normal pointing to the smaller breadth for a branch going that way or straight, else the larger.
        let nx = dy / len
        let ny = -dx / len
        const toward = down ? nx : ny
        if ((offBreadth <= 1e-6 && toward > 0) || (offBreadth > 1e-6 && toward < 0)) [nx, ny] = [-nx, -ny]
        const pw = p.size.w
        const ph = p.size.asc + p.size.desc
        const off = Math.abs(nx) * pw / 2 + Math.abs(ny) * ph / 2 + fs * 0.25
        const px = a[0] + dx * ALONG + nx * off
        const py = a[1] + dy * ALONG + ny * off
        add(`p${n.id}`, `Probability of ${n.outcome || 'this outcome'}`, p, [px, py])
      })
      titleAt.push({ depth: (begin + end) / 2, breadth: 0 })
    }

    // The outcome column (an outcome row when the tree grows downward).
    const endDepth = maxOf(read.paths.map((p) => from.get(p.id)!))
    if (column) {
      const gap = fs * (down ? 0.6 : 1.4)
      const nameRoom = maxOf(names.map(depthOf))
      read.paths.forEach((p, i) => {
        const b = breadth.get(p.id)!
        const n = names[i]
        const q = pathProbs[i]
        if (n) add(`n${p.id}`, `Path ${p.name || 'blank'}`, n, at(endDepth + gap + depthOf(n) / 2, b))
        if (q) {
          const qDepth = depthOf(q)
          const d = endDepth + gap + (n ? nameRoom + (down ? fs * 0.45 : fs * 1.2) : 0) + qDepth / 2
          add(`q${p.id}`, `Probability of ${p.name || 'this path'}`, q, at(d, b))
        }
      })
    }

    // Stage titles, over each stage's branches (beside them when top to bottom).
    const minBreadth = Math.min(rootBreadth, ...labels.map((l) => (down ? l.label.cx - l.label.w / 2 : l.label.cy - l.label.h / 2)), ...branches.flatMap((l) => (down ? [l.x1, l.x2] : [l.y1, l.y2])))
    titles.forEach((t, k) => {
      if (!t) return
      const room = breadthOf({ size: t })
      add('', '', { box: t, size: t, pick: false }, at(titleAt[k].depth, minBreadth - fs * 0.8 - room / 2))
    })

    return { labels, branches }
  }

  const rectOf = (l: Label, grow = 0): Rect => ({ x0: l.cx - l.w / 2 - grow, y0: l.cy - l.h / 2 - grow, x1: l.cx + l.w / 2 + grow, y1: l.cy + l.h / 2 + grow })
  const meets = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
  /** Whether a line passes through a box. */
  function crosses(l: Line, r: Rect) {
    const steps = 24
    for (let i = 1; i < steps; i++) {
      const x = l.x1 + ((l.x2 - l.x1) * i) / steps
      const y = l.y1 + ((l.y2 - l.y1) * i) / steps
      if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return true
    }
    return false
  }
  function clashes(g: ReturnType<typeof layOut>) {
    const boxes = g.labels.map((l) => rectOf(l.label, fs * 0.08))
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) if (meets(boxes[i], boxes[j])) return true
      if (g.labels[i].key.startsWith('p') && g.branches.some((b) => crosses(b, boxes[i]))) return true
    }
    return false
  }

  let g = layOut(spacing)
  for (let i = 0; i < TRIES && clashes(g); i++) g = layOut((spacing *= GROW))

  // Everything moved so the figure starts at its top left corner, with a white edge.
  const rects = [...g.labels.map((l) => rectOf(l.label)), ...g.branches.map((b) => ({ x0: Math.min(b.x1, b.x2), y0: Math.min(b.y1, b.y2), x1: Math.max(b.x1, b.x2), y1: Math.max(b.y1, b.y2) }))]
  const x0 = Math.min(...rects.map((r) => r.x0)) - EDGE
  const y0 = Math.min(...rects.map((r) => r.y0)) - EDGE
  const width = Math.max(...rects.map((r) => r.x1)) - x0 + EDGE
  const height = Math.max(...rects.map((r) => r.y1)) - y0 + EDGE

  const texts: Placed[] = []
  const blankLines: Line[] = []
  const picks: Pick[] = []
  for (const { key, name, label: l, pick } of g.labels) {
    const cx = l.cx - x0
    const cy = l.cy - y0
    if (l.box) texts.push({ x: cx - l.w / 2, y: cy + (l.asc - l.desc) / 2, box: l.box })
    // A blank line on the baseline, where its text would sit.
    else blankLines.push({ x1: cx - l.w / 2, x2: cx + l.w / 2, y1: cy + (l.asc - l.desc) / 2, y2: cy + (l.asc - l.desc) / 2 })
    if (pick) picks.push({ key, x: cx - l.w / 2 - 3, y: cy - l.h / 2 - 3, w: l.w + 6, h: l.h + 6, name })
  }
  const branches = g.branches.map((b) => ({ x1: b.x1 - x0, y1: b.y1 - y0, x2: b.x2 - x0, y2: b.y2 - y0 }))

  return { width, height, fs, branches, texts, blankLines, picks, read }
}

export type TreeLayout = ReturnType<typeof buildTree>
