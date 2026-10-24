// Lays out a Venn diagram as plain numbers for VennDiagram.svelte to draw:
// the circles inside a box for the universal set, each set's name outside its
// circle, the universal set's symbol in the top left corner, each region's
// path for shading and clicking, and what's written in each region.
//
// What goes in a region is laid out in rows across it, centered on the point
// farthest from its edges, and every row is kept wholly inside the region.
// When something doesn't fit, the whole diagram grows (circles, box and all)
// rather than the text shrinking.

import { LABEL_SCALE } from '$shared/labelSize'
import { layoutMath, type MathBox } from '$lib/shared/mathSvg.js'
import { isPattern, type Fill } from '$lib/stats/fills'
import { buildRegions, circlesFor, clearance, freeSpans, maskAt, type Box, type Circle, type Vec } from './regions'
import { maskOf, readVenn, regionName, universeText, type RegionKey, type Settings } from './settings'

const BASE_FS = 20 // what's in the regions, at medium labels
const NAME_SCALE = 1.15 // the sets' names and the universal set's symbol
const BASE_R = 5.5 // a circle's radius, in font sizes, before it grows to fit
const GROW = 1.1
const MAX_GROWTH = 6
const EDGE = 4 // white space round the box, for its outline

/** Laid-out math: its left end and baseline. */
export type Placed = { x: number; y: number; box: MathBox; halo: boolean }
/** A write-on line for students, in an empty region. */
export type Blank = { x1: number; x2: number; y: number }
/** A region as drawn: its path, where its popup opens, its name, and its fill if shaded. */
export type DrawnRegion = { key: RegionKey; d: string; anchor: Vec; name: string; fill: Fill | null }
type Rect = { x0: number; y0: number; x1: number; y1: number }
/** Something to lay out in a region: math, or a blank line (box null). */
type Item = { box: MathBox | null; w: number; asc: number; desc: number }

/** Function names that stay math; any other run of letters is a word, written upright. */
const MATH_NAMES = /sqrt|pi|sin|cos|tan|log|ln/g
const isWord = (t: string) => /\p{L}{2,}/u.test(t.replace(MATH_NAMES, ''))
/** Typed text as math, or as an upright word or name. */
const lay = (t: string, fs: number) => (isWord(t) ? layoutMath('', fs, { suffix: t }) : layoutMath(t, fs))

const boxOf = (x: number, top: number, b: { w: number; asc: number; desc: number }): Rect => ({ x0: x, y0: top, x1: x + b.w, y1: top + b.asc + b.desc })
const meets = (a: Rect, b: Rect, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad
/** Whether a box comes within `pad` of a circle's edge, from inside or out. */
function crosses(r: Rect, c: Circle, pad: number) {
  const nx = Math.max(r.x0, Math.min(c.x, r.x1))
  const ny = Math.max(r.y0, Math.min(c.y, r.y1))
  const near = Math.hypot(nx - c.x, ny - c.y)
  const far = Math.max(...[[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]].map(([x, y]) => Math.hypot(x - c.x, y - c.y)))
  return near < c.r + pad && far > c.r - pad
}

/** Which way each set's name sits from its circle: up and left, up and right, or down and left. */
function nameSides(s: Settings): Vec[] {
  if (s.sets === 1) return [[-1, -1]]
  if (s.sets === 3) return [[-1, -1], [1, -1], [-1, 1]]
  // Inside A, B's name goes on its left, where A's ring is widest.
  return s.arrangement === 'subset' ? [[-1, -1], [-1, -1]] : [[-1, -1], [1, -1]]
}

export function buildVenn(s: Settings) {
  const read = readVenn(s)
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const nameFs = fs * NAME_SCALE
  const pad = fs * 0.3 // between writing and an edge

  // What each region holds, laid out: what was typed, the elements, or a
  // blank line for students where nothing was typed and blanks are asked for.
  const blankItem: Item = { box: null, w: fs * 1.8, asc: fs * 0.7, desc: fs * 0.2 }
  const items = new Map<RegionKey, Item[]>()
  for (const k of read.keys) {
    const list = (read.contents[k] ?? []).flatMap((t): Item[] => {
      const box = lay(t, fs)
      return box ? [{ box, w: box.w, asc: box.asc, desc: box.desc }] : []
    })
    if (!list.length && s.mode !== 'elements' && s.empty === 'line') list.push(blankItem)
    items.set(k, list)
  }
  const names = [s.nameA, s.nameB, s.nameC].slice(0, s.sets).map((t) => (t.trim() ? lay(t.trim(), nameFs) : null))
  const symbol = universeText(s)
  const universe = symbol ? lay(symbol, nameFs) : null

  let growth = 1
  let built = attempt(BASE_R * fs)
  while (!built.fits && growth < MAX_GROWTH) {
    growth *= GROW
    built = attempt(BASE_R * fs * growth)
  }
  return { ...built, read, fs, problem: built.fits ? null : 'There’s too much to fit in one region. Take some out, or choose a smaller label size.' }

  function attempt(R: number) {
    let circles = circlesFor(s.sets, s.arrangement, R)
    const gap = fs * 0.2

    // Each name just outside its circle, its nearest corner on the diagonal.
    let nameBoxes = names.map((box, i) => {
      if (!box) return null
      const c = circles[i]
      const [ux, uy] = nameSides(s)[i]
      const px = c.x + ((c.r + gap) * ux) / Math.SQRT2
      const py = c.y + ((c.r + gap) * uy) / Math.SQRT2
      const h = box.asc + box.desc
      return boxOf(ux < 0 ? px - box.w : px, uy < 0 ? py - h : py, box)
    })

    // The box round everything: a margin round the circles, room round the names.
    const margin = Math.max(0.3 * R, fs * 1.6)
    let frame: Rect = {
      x0: Math.min(...circles.map((c) => c.x - c.r)) - margin,
      y0: Math.min(...circles.map((c) => c.y - c.r)) - margin,
      x1: Math.max(...circles.map((c) => c.x + c.r)) + margin,
      y1: Math.max(...circles.map((c) => c.y + c.r)) + margin,
    }
    for (const b of nameBoxes) {
      if (!b) continue
      frame = { x0: Math.min(frame.x0, b.x0 - pad * 2), y0: Math.min(frame.y0, b.y0 - pad * 2), x1: Math.max(frame.x1, b.x1 + pad * 2), y1: Math.max(frame.y1, b.y1 + pad * 2) }
    }
    // The universal set's symbol in the top left corner; the box grows upward until it's clear of the names and circles.
    const corner = pad * 1.5
    const symbolAt = () => (universe ? boxOf(frame.x0 + corner, frame.y0 + corner, universe) : null)
    for (let k = 0; k < 60; k++) {
      const u = symbolAt()
      if (!u || (!nameBoxes.some((b) => b && meets(u, b, pad)) && !circles.some((c) => crosses(u, c, pad)))) break
      frame = { ...frame, y0: frame.y0 - fs * 0.25 }
    }

    // Everything moved so the box's corner is at (EDGE, EDGE).
    const dx = EDGE - frame.x0
    const dy = EDGE - frame.y0
    const move = (b: Rect | null) => b && { x0: b.x0 + dx, y0: b.y0 + dy, x1: b.x1 + dx, y1: b.y1 + dy }
    circles = circles.map((c) => ({ ...c, x: c.x + dx, y: c.y + dy }))
    nameBoxes = nameBoxes.map(move)
    frame = move(frame)!
    const symbolBox = symbolAt()
    const box: Box = { x: frame.x0, y: frame.y0, w: frame.x1 - frame.x0, h: frame.y1 - frame.y0 }
    const obstacles = [...nameBoxes, symbolBox].filter((b): b is Rect => !!b)
    const regions = buildRegions(circles, box)

    // Each region's middle: the point farthest from its edges (and from the
    // names and symbol), found by trying points on a fine grid through the
    // circles' middle, so a region the same both sides of it has its middle
    // on it. Outside the circles a tie goes to the lower right, where the
    // outside region's number usually goes.
    const inner: Box = { x: box.x + pad, y: box.y + pad, w: box.w - 2 * pad, h: box.h - 2 * pad }
    const step = R / 18
    const best = new Map<number, { p: Vec; score: number }>()
    // The region each name (or the symbol) sits in, which is the only one it takes room from.
    const obstacleMasks = obstacles.map((o) => maskAt(circles, [(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2]))
    const first = (from: number, mid: number) => mid - Math.floor((mid - from) / step) * step
    for (let y = first(inner.y, dy); y <= inner.y + inner.h; y += step) {
      for (let x = first(inner.x, dx); x <= inner.x + inner.w; x += step) {
        const p: Vec = [x, y]
        const mask = maskAt(circles, p)
        let room = Math.min(clearance(circles, p), x - box.x, box.x + box.w - x, y - box.y, box.y + box.h - y)
        obstacles.forEach((o, i) => obstacleMasks[i] === mask && (room = Math.min(room, Math.max(o.x0 - x, x - o.x1, o.y0 - y, y - o.y1))))
        if (room <= 0) continue
        const score = room + (mask ? 0 : (x + y) * 1e-4)
        if (score > (best.get(mask)?.score ?? -Infinity)) best.set(mask, { p, score })
      }
    }

    let fits = true
    const placed: Placed[] = []
    const blanks: Blank[] = []
    const drawn: DrawnRegion[] = read.keys.flatMap((key) => {
      const mask = maskOf(key)
      const region = regions.get(mask)
      if (!region) return []
      const middle = best.get(mask)?.p ?? [box.x + box.w / 2, box.y + box.h / 2]
      const shaded = s.shaded.includes(key)
      const list = items.get(key) ?? []
      const spots = place(list, mask, middle)
      if (!spots) fits = false
      ;(spots ?? []).forEach(({ x, y }, i) => {
        const it = list[i]
        if (it.box) placed.push({ x, y, box: it.box, halo: shaded && isPattern(s.shade) })
        else blanks.push({ x1: x, x2: x + it.w, y: y + fs * 0.1 })
      })
      return [{ key, d: region.d, anchor: middle, name: regionName(s, key), fill: shaded ? s.shade : null }]
    })

    // Names and the symbol on a halo too, whenever a region is hatched or dotted.
    const halo = isPattern(s.shade) && drawn.some((r) => r.fill)
    const nameItems: Placed[] = names.flatMap((b, i) => (b && nameBoxes[i] ? [{ x: nameBoxes[i]!.x0, y: nameBoxes[i]!.y0 + b.asc, box: b, halo }] : []))
    const universeItem: Placed | null = universe && symbolBox ? { x: symbolBox.x0, y: symbolBox.y0 + universe.asc, box: universe, halo } : null
    return {
      fits,
      width: box.w + 2 * EDGE,
      height: box.h + 2 * EDGE,
      box,
      circles,
      regions: drawn,
      names: nameItems,
      universe: universeItem,
      items: placed,
      blanks,
    }

    /**
     * A region's items in rows, as few as will hold them, the block of rows
     * centered on the region's middle if it fits there, or moved up or down
     * by half a row at a time until it does. Each row is as full as the
     * fullest must be, so the rows come out about even. A row keeps to one
     * stretch of the region if it can (the outside region's rows cross the
     * circles), so the items stay together. Returns each item's left end and
     * baseline, or null if they don't fit.
     */
    function place(list: Item[], mask: number, [mx, my]: Vec): { x: number; y: number }[] | null {
      if (!list.length) return []
      const h = Math.max(...list.map((it) => it.asc + it.desc))
      const rowH = h + fs * 0.35
      const across = fs * 0.55 // between items in a row
      const most = Math.max(1, Math.floor(box.h / rowH))
      const spansCache = new Map<number, [number, number][]>()
      const spansFor = (y: number) => {
        const key = Math.round(y * 100)
        let spans = spansCache.get(key)
        if (!spans) {
          const [y0, y1] = [y - h / 2 - pad, y + h / 2 + pad]
          spans = freeSpans(circles, mask, inner, y0, y1)
          for (const o of obstacles) if (o.y0 < y1 + pad && o.y1 > y0 - pad) spans = spans.flatMap(([a, b]) => cut([a, b], o.x0 - pad, o.x1 + pad))
          spans = spans.map(([a, b]): [number, number] => [a + pad, b - pad]).filter(([a, b]) => b > a)
          spansCache.set(key, spans)
        }
        return spans
      }
      const total = list.reduce((t, it) => t + it.w + across, 0)
      for (const together of [true, false]) {
        for (let k = 1; k <= most; k++) {
          for (let j = 0; j <= most * 2; j++) {
            for (const sign of j ? [1, -1] : [1]) {
              const center = my + (sign * j * rowH) / 2
              const rows = Array.from({ length: k }, (_, i) => center + (i - (k - 1) / 2) * rowH)
              const spans = rows.map((y) => {
                const all = spansFor(y)
                return together ? [...all].sort((p, q) => away(p, mx) - away(q, mx)).slice(0, 1) : all
              })
              const room = spans.flat().reduce((t, [a, b]) => t + b - a + across, 0)
              if (room < total) continue
              for (let cap = Math.ceil(list.length / k); cap <= list.length; cap++) {
                const spots = fill(list, rows, spans, cap, mx, h, across)
                if (spots) return spots
              }
            }
          }
        }
      }
      return null
    }
  }
}

/** How far x is from a stretch: 0 inside it. */
const away = ([a, b]: [number, number], x: number) => Math.max(a - x, x - b, 0)

/** A stretch with a part cut out of it. */
function cut([a, b]: [number, number], c0: number, c1: number): [number, number][] {
  if (c1 <= a || c0 >= b) return [[a, b]]
  return [[a, Math.min(b, c0)], [Math.max(a, c1), b]].filter(([p, q]) => q > p) as [number, number][]
}

/**
 * Items filled into rows in order, at most `cap` to a row, each row's
 * stretches tried nearest the middle first, and each stretch's items kept
 * together as near the middle as the stretch allows. Within a row the items
 * then read left to right.
 */
function fill(list: Item[], rows: number[], spans: [number, number][][], cap: number, mx: number, h: number, across: number) {
  const out: { x: number; y: number }[] = []
  let i = 0
  for (let r = 0; r < rows.length && i < list.length; r++) {
    // How many items each stretch takes, nearest the middle first.
    const groups: { span: [number, number]; count: number }[] = []
    let inRow = 0
    const order = [...spans[r]].sort((p, q) => Math.abs((p[0] + p[1]) / 2 - mx) - Math.abs((q[0] + q[1]) / 2 - mx))
    let k = i
    for (const span of order) {
      let w = 0
      let count = 0
      while (k < list.length && inRow < cap && w + (count ? across : 0) + list[k].w <= span[1] - span[0]) {
        w += (count ? across : 0) + list[k].w
        k++
        count++
        inRow++
      }
      if (count) groups.push({ span, count })
      if (inRow >= cap) break
    }
    // The same items again, left to right across the stretches, unless
    // that puts a wider item where a narrower one fitted.
    const widthOf = (from: number, count: number) => list.slice(from, from + count).reduce((t, it, n) => t + it.w + (n ? across : 0), 0)
    const leftToRight = [...groups].sort((p, q) => p.span[0] - q.span[0])
    let from = i
    const fits = leftToRight.every(({ span: [a, b], count }) => {
      const ok = widthOf(from, count) <= b - a
      from += count
      return ok
    })
    for (const { span: [a, b], count } of fits ? leftToRight : groups) {
      const w = widthOf(i, count)
      let x = Math.max(a, Math.min(mx - w / 2, b - w))
      for (const it of list.slice(i, i + count)) {
        // Each item's baseline puts its middle on the row's.
        out.push({ x, y: rows[r] - h / 2 + (h - it.asc - it.desc) / 2 + it.asc })
        x += it.w + across
      }
      i += count
    }
  }
  return i === list.length ? out : null
}

export type VennLayout = ReturnType<typeof buildVenn>
