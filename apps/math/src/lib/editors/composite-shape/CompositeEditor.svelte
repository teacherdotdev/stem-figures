<script lang="ts">
  // The Composite Shape Editor: unlike the generators, there are no settings
  // to turn into a figure. The teacher picks a piece or a starter, then works
  // on the canvas in one of two modes:
  //   - Edit, styled after Figma: hovering a piece tints it and shows its
  //     size; clicking selects it, with handles in the middle of its sides
  //     (a triangle's on its tip) and a popup to type its sizes, which can
  //     be dragged out of the way. Hovering just outside a straight side
  //     lights it up with a +, to add a piece there. A side being dragged
  //     snaps to lines of snap dots (a slanted one to whole lengths); a
  //     triangle's tip to the dots, or square over its base; holding Cmd
  //     (Ctrl) stops the snapping. Extra lines are hidden, leaving just the
  //     pieces.
  //   - Label, showing the figure exactly as it prints: clicking a side,
  //     angle, corner, curve or extra line labels it, with the same popups
  //     as the Parallel Lines and Transversal and the Angles Generator.
  //     Dragging from a corner draws an extra line across the inside.
  // The canvas pans and zooms like FigJam: scroll or drag the empty canvas
  // (or hold Space) to pan, pinch or Cmd-scroll to zoom. The shape is drawn
  // at one fixed scale and the view only moves when the teacher moves it,
  // or asks it to fit the shape.
  // The drawing is kept in this browser (nothing goes in the address), with
  // undo and redo, and exports cropped to just the shape and its labels.
  import { Copy, FileDown, ImageDown, Minus, Plus, Redo2, PenLine, Settings, Shapes, Tag, Undo2, X } from '@lucide/svelte'
  import { onMount, untrack } from 'svelte'
  import { copyPng, downloadPng, downloadSvg } from '$shared/exporting'
  import { cleanLabelSize, LABEL_SIZES, type LabelSize } from '$shared/labelSize'
  import AngleOptions from '$lib/labeling/AngleOptions.svelte'
  import CountPicker from '$lib/labeling/CountPicker.svelte'
  import LabelPicker from '$lib/labeling/LabelPicker.svelte'
  import PickLayer from '$lib/labeling/PickLayer.svelte'
  import PointOptions from '$lib/labeling/PointOptions.svelte'
  import ScrubAngle from '$lib/labeling/ScrubAngle.svelte'
  import { SITE_NAME } from '$lib/site/config'
  import Popover from '$lib/labeling/Popover.svelte'
  import Swatches from '$lib/labeling/Swatches.svelte'
  import type { Part } from '$lib/labeling/pick.js'
  import FigureLabels from '$lib/shapes/FigureLabels.svelte'
  import { INK } from '$lib/shapes/parts.js'
  import LineStylePicker from '$lib/shapes/LineStylePicker.svelte'
  import MathInput from '$lib/shared/MathInput.svelte'
  import CapPicker from '$lib/generators/parallel-lines/CapPicker.svelte'
  import CompositeDrawing from './CompositeDrawing.svelte'
  import MeasureField from './MeasureField.svelte'
  import {
    ANGLE_DEFAULTS, heightFoot, baseOf, change, clone, describe, emptyComposite, firstPiece, lineEnds, lineTargets, MIN_SIZE, newId,
    outwardOf, cornerPieces, PIECE_NAMES, SIDE_KINDS, anchorPoints, arcTarget, linesOnShape, onArc, ontoTipPath, outline, pieceOn, placeAll, pointFor, retypeTriangle, tipPath, roundTo, SEMI_DEFAULTS, setBase, SIDE_DEFAULTS, starter,
    STARTER_NAMES, STARTERS, tidyComposite, triangleParts, vec, withoutPieces, deletedBy, linedUpSides, moveLinedUp, acrossEdge, pieceAcross, mergeCheck, mergePieces, type LinedUp,
    type AngleStyle, type Cap, type Composite, type ExtraLine, LINE_WEIGHTS, type LineWeight, type ExtraStyle, NO_RAY, type RayEnds, type Piece, type PieceKind, type Placed, type SemiStyle, type SideStyle,
    type Point, type Starter, type Target, type Stretch, type TrianglePart, type Vec,
  } from './composite'
  import { drawComposite, piecePath, seamLine } from './figure'

  let { name }: { name: string } = $props()

  const { add, sub, mul, dot, len, unit, perp } = vec
  const STORAGE_KEY = 'math-composite-shape'
  const HISTORY_LIMIT = 100
  const LABEL_ORDER: LabelSize[] = ['large', 'medium', 'small']
  const GLYPH: Record<LabelSize, number> = { large: 19, medium: 15, small: 11 }
  /** Page units to one of the shape's own: the shape is always drawn at this scale. */
  const K = 48
  /** How far the canvas zooms out and in, in screen pixels per page unit. */
  const MIN_ZOOM = 0.1
  const MAX_ZOOM = 8
  /** How close a drag comes to something, in screen pixels, to snap to it. */
  const SNAP = 10
  const BLUE = '#2563eb'

  let comp = $state.raw<Composite>(emptyComposite())
  let labelSize = $state<LabelSize>('medium')
  /** Edit builds the shape, Lines draws extra lines on it, Label names and marks it. */
  type Mode = 'edit' | 'lines' | 'label'
  let mode = $state<Mode>('edit')
  let past = $state.raw<Composite[]>([])
  let future = $state.raw<Composite[]>([])
  let lastMerge: string | null = null
  let message = $state('')
  let svg = $state<SVGSVGElement>()
  let stage = $state<HTMLDivElement>()
  let stageW = $state(0)
  let stageH = $state(0)
  /** The view: the page point at the canvas's top left, and screen pixels per page unit. */
  let view = $state({ x: 0, y: 0, zoom: 1 })
  /** Whether the view should fit the shape once the canvas has a size: on opening, and after starting a new shape. */
  let needsFit = true
  let spaceDown = $state(false)
  /** A pan under way, by dragging the canvas: where it began, on screen and in the view. */
  let panning = $state.raw<{ pointerId: number; x: number; y: number; from: { x: number; y: number }; moved: boolean; empty: boolean } | null>(null)
  const touches = new Map<number, { x: number; y: number }>()
  let pinch: { dist: number; zoom: number } | null = null
  let loaded = false

  /** The selected pieces: a click picks one, Shift-click adds or removes one. */
  let picks = $state<string[]>([])
  /** The one selected piece, when just one is. */
  const selected = $derived(picks.length === 1 ? picks[0] : null)
  let hoverPiece = $state<string | null>(null)
  let hoverZone = $state<string | null>(null)
  /** The selected piece's popup: open or not, where it was dragged to, and why the last change didn't take. */
  let pieceOpen = $state(false)
  let pieceMoved = $state<{ left: number; top: number } | null>(null)
  let pieceProblem = $state('')
  /** A part of the selected piece a popup field is about, lit on the figure. */
  let hint = $state<{ piece: string; part: TrianglePart | 'width' | 'height' } | null>(null)

  type Popup =
    | { kind: 'part'; part: Part; at: { x: number; y: number } }
    | { kind: 'add'; stretch: Stretch; at: { x: number; y: number }; side: 'below' | 'above' | 'left' | 'right'; around: { x: number; y: number; w: number; h: number } }
    | { kind: 'figure'; at: { x: number; y: number } }
    /** An extra line's card in lines mode: what shape it is, or delete it. */
    | { kind: 'line'; id: string; at: { x: number; y: number } }
  let popup = $state.raw<Popup | null>(null)
  /** The add menu's option being hovered, to preview: a piece kind, or `corner:` and its place in the corner options. */
  let previewKind = $state<string | null>(null)
  let figureButton = $state<HTMLButtonElement>()

  /** A handle being dragged, from the shape as it was when the drag began. */
  type Handle = { kind: 'side'; side: number } | { kind: 'tip' }
  /** What a drag is snapping to or held on: a side lined up, a snap dot, or a path the tip follows, with a right-angle square where it meets the base. */
  type Guide = { line: [Vec, Vec]; to: Vec | null } | { dot: Vec } | { path: Vec[]; square: Vec[] | null; held: boolean }
  let drag = $state.raw<{ pointerId: number; piece: string; handle: Handle; before: Composite; pl: Placed; others: Vec[]; moved: boolean } | null>(null)
  /** Several selected pieces' lined-up sides being dragged together. */
  let lineDrag = $state.raw<{ pointerId: number; line: LinedUp; before: Composite; others: Vec[]; moved: boolean } | null>(null)
  let guide = $state.raw<Guide | null>(null)
  /** Further lines a dragged tip is lined up on, beside `guide`. */
  let moreGuides = $state.raw<{ line: [Vec, Vec]; to: Vec | null }[]>([])
  /** An extra line being drawn from a corner, and the spot it would end on. */
  /** Until it's moved a few pixels (`pending`), it may still be a click on the corner. */
  let drawing = $state.raw<{ pointerId: number; point: Point; from: Vec; to: Vec; targets: Target[]; target: Target | null; start: [number, number]; pending: boolean } | null>(null)
  let labelBefore: Composite | null = null

  /** What's drawn: in edit mode, the shape without its extra lines, which belong to labeling. */
  // Each mode shows what it's for: edit the pieces alone, lines the pieces and lines without labels, label everything.
  const shown = $derived(
    mode === 'edit' ? { ...comp, lines: [], sides: {}, angles: {}, points: {}, semis: {}, turn: 0 }
    : mode === 'lines' ? {
        ...comp, sides: {}, angles: {}, points: {}, semis: {}, turn: 0,
        // The picked line as the hovered choice in its card would make it.
        lines: comp.lines.map((l) => ({
          ...l, label: 'none' as const, ticks: 0,
          ...(previewRuns && l.id === pickedLineId ? { ray: { a: previewRuns.includes('a') ? 'triangle' as const : null, b: previewRuns.includes('b') ? 'triangle' as const : null } } : {}),
        })),
      }
    : comp,
  )
  // Rays run on out of sight while the shape is built, and stop past it with their caps in label mode, as they print.
  const drawn = $derived(drawComposite(shown, labelSize, K, mode !== 'label'))
  /** The figure as it prints, labels and all, whatever the mode: what's copied and downloaded. */
  const full = $derived(mode === 'label' ? drawn : drawComposite(comp, labelSize, K))
  let exportSvg = $state<SVGSVGElement>()
  const o = $derived(drawn.o)
  /** The outline before extra lines split its sides: whose middles lines can end at. */
  const plain = $derived(outline(comp.pieces))
  /** In lines mode, everywhere a line can start or end. */
  const anchors = $derived(mode === 'lines' ? anchorPoints(o, plain, comp.lines) : [])
  const k = $derived(drawn.k)
  const selectedPlaced = $derived(selected ? (o.placed.get(selected) ?? null) : null)
  const empty = $derived(!comp.pieces.length)

  /** What the canvas shows, in page units. */
  const box = $derived({ x: view.x, y: view.y, w: (stageW || 800) / view.zoom, h: (stageH || 500) / view.zoom })
  /** Page units per screen pixel, so handles and the like keep their size on screen. */
  const sc = $derived(1 / view.zoom)

  onMount(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      comp = tidyComposite(saved?.composite)
      labelSize = cleanLabelSize(saved?.labelSize)
    } catch {
      /* nothing saved, or storage blocked */
    }
    loaded = true
  })

  $effect(() => {
    const data = JSON.stringify({ composite: comp, labelSize })
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, data)
    } catch {
      /* storage blocked or full: the drawing lasts until the page closes */
    }
  })

  // ----- History

  /** Make a change. Changes sharing a `merge` key in a row (typing a label, say) undo as one. */
  function commit(next: Composite, merge: string | null = null) {
    if (!merge || merge !== lastMerge) {
      past = [...past, comp].slice(-HISTORY_LIMIT)
      future = []
    }
    lastMerge = merge
    comp = next
  }
  function edit(fn: (c: Composite) => void, merge: string | null = null) {
    const next = clone(comp)
    fn(next)
    commit(next, merge)
  }
  function undo() {
    if (!past.length) return
    future = [comp, ...future]
    comp = past.at(-1)!
    past = past.slice(0, -1)
    lastMerge = null
    tidyUp()
  }
  function redo() {
    if (!future.length) return
    past = [...past, comp]
    comp = future[0]
    future = future.slice(1)
    lastMerge = null
    tidyUp()
  }
  /** Let go of anything that no longer exists. */
  function tidyUp() {
    if (picks.some((id) => !comp.pieces.some((p) => p.id === id))) picks = picks.filter((id) => comp.pieces.some((p) => p.id === id))
    popup = null
  }

  // ----- Starting, and modes

  function start(kind: PieceKind | Starter) {
    const pieces = (SIDE_KINDS as readonly string[]).includes(kind) ? [firstPiece(kind as PieceKind)] : starter(kind as Starter)
    commit({ ...emptyComposite(), unit: comp.unit, round: comp.round, angleRound: comp.angleRound, pieces })
    select(null)
    popup = null
    mode = 'edit'
    needsFit = true
    message = ''
  }

  function startOver() {
    commit({ ...emptyComposite(), unit: comp.unit, round: comp.round, angleRound: comp.angleRound })
    select(null)
    popup = null
    message = 'Undo brings your shape back.'
  }

  /** The anchor point under the pointer in lines mode, to say what it is. */
  let hoverAnchor = $state.raw<Target | null>(null)
  /** What's named beside the pointer: the point a line being drawn would end at, else the one hovered. */
  const named = $derived(mode !== 'lines' ? null : drawing ? (drawing.pending ? null : drawing.target) : hoverAnchor)
  // The figure's turn as typed, kept apart from it so a half-typed "−" isn't undone; undo still shows through.
  let turnText = $state(untrack(() => String(comp.turn)))
  $effect(() => {
    const t = comp.turn
    untrack(() => Number(turnText) !== t && (turnText = String(t)))
  })
  $effect(() => {
    const v = Number(turnText)
    if (Number.isFinite(v) && turnText.trim() !== '' && untrack(() => Math.round(v) !== comp.turn))
      edit((c) => (c.turn = Math.max(-180, Math.min(180, Math.round(v)))), 'turn')
  })
  /** The extra line picked in lines mode, with its card open. */
  let pickedLineId = $state<string | null>(null)
  /** The ends a choice in the line card is about, while it's hovered, ringed on the figure. */
  let hoverEnds = $state.raw<('a' | 'b')[]>([])
  /** The ends a hovered choice would run on past, previewed on the figure; null while none is hovered. */
  let previewRuns = $state.raw<('a' | 'b')[] | null>(null)
  function deleteLine(id: string) {
    edit((c) => (c.lines = c.lines.filter((l) => l.id !== id)))
    pickedLineId = null
    popup = null
    hoverEnds = []
    previewRuns = null
  }
  const pickedCard = $derived(popup?.kind === 'line' ? comp.lines.find((x) => x.id === (popup as { id: string }).id) : undefined)
  /** Which way each end of a line lies on screen, from the other end, to name it in the line card. */
  function endNames(l: ExtraLine): { a: string; b: string } {
    const ends = lineEnds(o.placed, l)
    if (!ends) return { a: 'one', b: 'other' }
    const [dx, dy] = sub(ends[0], ends[1])
    return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? { a: 'left', b: 'right' } : { a: 'right', b: 'left' }) : dy < 0 ? { a: 'top', b: 'bottom' } : { a: 'bottom', b: 'top' }
  }
  /** Runs a line on past the ends given, and stops it at the others; an end that keeps running keeps its cap. */
  function setRay(id: string, runs: ('a' | 'b')[]) {
    const l = comp.lines.find((x) => x.id === id)
    if (!l) return
    const was = l.ray ?? NO_RAY
    const ray: RayEnds = { a: runs.includes('a') ? (was.a ?? 'triangle') : null, b: runs.includes('b') ? (was.b ?? 'triangle') : null }
    setLine(id, { ray })
  }
  function setMode(next: Mode) {
    // Leaving edit mode, lines whose ends the changes left inside the shape go (Undo brings them back).
    const kept = mode === 'edit' && next !== 'edit' ? linesOnShape(comp.pieces, comp.lines) : comp.lines
    const dropped = comp.lines.length - kept.length
    if (dropped) edit((c) => (c.lines = kept))
    mode = next
    select(null)
    pickedLineId = null
    hoverEnds = []
    previewRuns = null
    popup = null
    message = dropped
      ? `${dropped === 1 ? 'A line was' : `${dropped} lines were`} dropped: ${dropped === 1 ? 'its end is' : 'their ends are'} no longer on the outside of the shape. Undo brings ${dropped === 1 ? 'it' : 'them'} back.`
      : ''
  }

  function select(id: string | null) {
    picks = id ? [id] : []
    pieceOpen = !!id
    pieceProblem = ''
    hint = null
    if (!id) pieceMoved = null
  }

  // ----- Pointers

  /** A point in the shape's own units, from a pointer's place on screen. */
  function shapePoint(clientX: number, clientY: number): Vec {
    const p = new DOMPoint(clientX, clientY).matrixTransform(svg!.getScreenCTM()!.inverse())
    return [p.x / k, p.y / k]
  }
  /** A box on the page (in page units), on screen. */
  function screenBox(pts: Vec[]) {
    const ctm = svg!.getScreenCTM()!
    const on = pts.map(([x, y]) => new DOMPoint(x, y).matrixTransform(ctm))
    const xs = on.map((p) => p.x)
    const ys = on.map((p) => p.y)
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  }
  const pieceBox = (pl: Placed) => {
    const path = piecePath(pl, k)
    const nums = path.match(/-?\d+(\.\d+)?/g)!.map(Number)
    return screenBox(Array.from({ length: nums.length / 2 }, (_, i) => [nums[2 * i], nums[2 * i + 1]] as Vec))
  }

  function pressPiece(event: PointerEvent, id: string) {
    if (event.button !== 0) return
    event.stopPropagation()
    if (event.shiftKey && picks.length) {
      // Shift-click: adds or removes it, the popup showing what can be done with them all.
      const next = picks.includes(id) ? picks.filter((x) => x !== id) : [...picks, id]
      if (next.length === 1) select(next[0])
      else ((picks = next), (pieceOpen = true), (pieceProblem = ''), (hint = null))
      message = ''
    } else if (selected !== id) {
      select(id)
      message = ''
    } else pieceOpen = true
  }

  function startLineDrag(event: PointerEvent, line: LinedUp) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    const moving = new Set(line.sides.map((x) => x.piece))
    const others = [...o.placed.values()].filter((x) => !moving.has(x.piece.id)).flatMap((x) => x.corners)
    lineDrag = { pointerId: event.pointerId, line, before: comp, others, moved: false }
    svg!.setPointerCapture(event.pointerId)
  }

  function startHandle(event: PointerEvent, piece: string, handle: Handle) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    const pl = o.placed.get(piece)!
    // Other pieces' corners and the tops of their curves, to line sides up with.
    const others = [...o.placed.values()]
      .filter((x) => x.piece.id !== piece)
      .flatMap((x) => [...x.corners, ...(x.arc && x.arc.lo < 90 && x.arc.hi > 90 ? [onArc(x, 90)] : [])])
    drag = { pointerId: event.pointerId, piece, handle, before: comp, pl, others, moved: false }
    svg!.setPointerCapture(event.pointerId)
  }

  /** The nearest of `options` to `raw` within reach, or raw itself. */
  function snapTo<T extends { value: number }>(raw: number, options: T[], free: boolean): { value: number; hit: T | null } {
    if (free) return { value: raw, hit: null }
    const reach = (SNAP * sc) / k
    let best: T | null = null
    for (const opt of options) if (Math.abs(opt.value - raw) <= reach && (!best || Math.abs(opt.value - raw) < Math.abs(best.value - raw))) best = opt
    return best ? { value: best.value, hit: best } : { value: raw, hit: null }
  }

  /**
   * A length being dragged, for a side moving along `dir` from `from`,
   * snapped to `ends` (the ends of the side the piece sits on, which it can
   * run past) and, moving straight across or up and down, to lines of snap
   * dots (those shown, five units apart when zoomed far out), whatever
   * lengths the pieces around it have. A slanted side can't line up with
   * the dots, so it snaps to whole lengths instead. Either way it also
   * snaps level with other pieces' corners and the tops of their curves,
   * and says which (`to`), to show a guide to it.
   */
  function snapLength(raw: number, ends: number[], free: boolean, from: Vec, dir: Vec) {
    const axis = Math.abs(dir[0]) > 1 - 1e-9 ? 0 : Math.abs(dir[1]) > 1 - 1e-9 ? 1 : null
    const options: { value: number; to: Vec | null }[] = ends.map((value) => ({ value, to: null }))
    if (axis === null) {
      if (raw > 0.5) options.push({ value: Math.round(raw), to: null })
    } else {
      const at = from[axis] + dir[axis] * raw
      for (const c of [Math.floor(at / dotStep) * dotStep, Math.ceil(at / dotStep) * dotStep]) options.push({ value: (c - from[axis]) / dir[axis], to: null })
    }
    // Level with another piece's corner: where the moving side, kept square to `dir`, passes through it.
    for (const p of drag!.others) options.push({ value: dot(sub(p, from), dir), to: p })
    // Of options equally near, one lining up with something wins, so its guide shows.
    const r = snapTo(raw, options.filter((opt) => opt.value >= MIN_SIZE), free)
    const tie = r.hit && options.find((opt) => opt.to && Math.abs(opt.value - r.value) < 1e-6)
    return tie ? { value: r.value, hit: tie } : r
  }

  /** Points round a circle above a triangle's base (in its own directions), for drawing a locked tip's path. */
  function circlePoints({ c, r }: { c: Vec; r: number }): Vec[] {
    const from = Math.asin(Math.max(-1, Math.min(1, -c[1] / r)))
    const to = Math.PI - from
    return Array.from({ length: 97 }, (_, i): Vec => {
      const th = from + ((to - from) * i) / 96
      return [c[0] + r * Math.cos(th), c[1] + r * Math.sin(th)]
    })
  }

  /** The pieces with a handle dragged to g (in the shape's units). */
  function dragged(d: NonNullable<typeof drag>, g: Vec, free: boolean) {
    const { pl } = d
    const piece = pl.piece
    const rel = sub(g, pl.a)
    const [s, t] = [dot(rel, pl.u), dot(rel, pl.out)]
    const W = baseOf(piece)
    const sideLength = () => {
      const parent = placeAll(d.before.pieces).get(piece.mount!.parent)!
      const [p, q] = parent.sides[piece.mount!.side]
      return len(sub(q, p))
    }
    let dotAt: Vec | null = null
    let snapped = false
    let tipGuide: Guide | null = null
    let lined: Vec | null = null
    let moreGuides: { line: [Vec, Vec]; to: Vec | null }[] = []
    if (d.handle.kind === 'tip' && tipPath(piece) === 'held') return { problem: 'Two locked parts hold this tip in place. Unlock one to move it.' }
    const result = change(d.before.pieces, (draft, pinned) => {
      const p = draft.find((x) => x.id === piece.id)!
      if (d.handle.kind === 'tip') {
        const toPage = (v: Vec): Vec => add(add(pl.a, mul(pl.u, v[0])), mul(pl.out, v[1]))
        const held = tipPath(piece)
        if (held && held !== 'held') {
          // Locked: along the path its locks leave it.
          const at = ontoTipPath(held, [s, t])
          p.tip = at[0]
          p.depth = at[1]
          tipGuide = { path: 'ray' in held ? [held.ray, add(held.ray, mul(held.dir, Math.max(t, at[1]) * 3 + W))].map(toPage) : circlePoints(held).map(toPage), square: null, held: true }
          return
        }
        // The tip: onto a snap dot, or onto lines it can line up with: straight up from the middle of the base or either end
        // (a right angle), level with or straight above another piece's corner, or on the line of another piece's side.
        // Where two such lines cross near it, it goes there, on both.
        type Along = { p: Vec; d: Vec; foot: number | null; guide: { line: [Vec, Vec]; to: Vec | null } | null }
        const lines: Along[] = [W / 2, 0, W].map((foot) => ({ p: toPage([foot, 0]), d: pl.out, foot, guide: null }))
        for (const c of d.others)
          for (const dir of [[1, 0], [0, 1]] as Vec[]) lines.push({ p: c, d: dir, foot: null, guide: { line: [c, c], to: null } })
        for (const other of placeAll(d.before.pieces).values())
          if (other.piece.id !== piece.id)
            for (const sd of other.sides)
              // Not the line its own base is on, which would flatten it.
              if (len(sub(sd[1], sd[0])) > 1e-9 && !(Math.abs(vec.cross(pl.u, sub(sd[0], pl.a))) < 1e-6 && Math.abs(vec.cross(pl.u, sub(sd[1], pl.a))) < 1e-6))
                lines.push({ p: sd[0], d: unit(sub(sd[1], sd[0])), foot: null, guide: { line: sd, to: null } })
        const reach = (SNAP * sc) / k
        const onto = (a: Along): Vec => add(a.p, mul(a.d, dot(sub(g, a.p), a.d)))
        const near = lines.filter((a) => len(sub(onto(a), g)) <= reach)
        let at = g
        let on: Along[] = []
        const gridDot: Vec = [Math.round(g[0] / dotStep) * dotStep, Math.round(g[1] / dotStep) * dotStep]
        if (!free) {
          let best = Infinity
          for (let i = 0; i < near.length; i++)
            for (let j = i + 1; j < near.length; j++) {
              const [a, b] = [near[i], near[j]]
              const den = vec.cross(a.d, b.d)
              if (Math.abs(den) < 1e-9) continue
              const x = add(a.p, mul(a.d, vec.cross(sub(b.p, a.p), b.d) / den))
              const dist = len(sub(x, g))
              if (dist <= reach && dist < best - 1e-9) ((best = dist), (at = x), (on = [a, b]))
            }
          if (!on.length) {
            if (len(sub(gridDot, g)) <= reach) ((at = gridDot), (dotAt = gridDot))
            else
              for (const a of near) {
                const x = onto(a)
                if (len(sub(x, g)) < best) ((best = len(sub(x, g))), (at = x), (on = [a]))
              }
          }
        }
        p.tip = dot(sub(at, pl.a), pl.u)
        p.depth = dot(sub(at, pl.a), pl.out)
        const square = on.find((a) => a.foot !== null)
        if (square) {
          // The line it's on: up from the base, square to it.
          const foot = toPage([square.foot!, 0])
          const along = square.foot! > W / 2 ? mul(pl.u, -1) : pl.u
          const q = 0.4
          tipGuide = { path: [foot, toPage([square.foot!, p.depth + 1])], square: [add(foot, mul(pl.out, q)), add(foot, add(mul(pl.out, q), mul(along, q))), add(foot, mul(along, q))], held: false }
        }
        // Lined up with another piece: from its corner, or along its side, out to the tip.
        moreGuides = on.flatMap((a) => (a.guide ? [{ line: (a.guide.line[0] === a.guide.line[1] ? [a.p, at] : a.guide.line) as [Vec, Vec], to: a.guide.line[0] === a.guide.line[1] ? null : at }] : []))
        if (!square && moreGuides.length) {
          tipGuide = { ...moreGuides[0] }
          moreGuides = moreGuides.slice(1)
        }
        return
      }
      const side = d.handle.side
      if (side === 2) {
        const r = snapLength(t, [], free, pl.a, pl.out)
        snapped = !!r.hit
        lined = r.hit?.to ?? null
        p.depth = r.value
      } else if (side === 0) {
        // The first piece's base, moving out: it gets deeper, and moves down.
        const r = snapLength(piece.depth - t, [], free, add(pl.a, mul(pl.out, piece.depth)), mul(pl.out, -1))
        snapped = !!r.hit
        lined = r.hit?.to ?? null
        p.at = add(piece.at, mul(pl.out, piece.depth - r.value))
        p.depth = r.value
      } else if (side === 1) {
        // Past the end of the side it sits on, if it likes; that end is a place to snap to.
        const r = snapLength(s, piece.mount ? [sideLength() - piece.mount.from] : [], free, pl.a, pl.u)
        snapped = !!r.hit
        lined = r.hit?.to ?? null
        p.width = r.value
        if (p.mount) {
          p.mount = { ...p.mount, to: p.mount.from + r.value }
          pinned.add(p.id)
        }
      } else {
        const r = snapLength(W - s, piece.mount ? [piece.mount.to] : [], free, pl.b, mul(pl.u, -1))
        snapped = !!r.hit
        lined = r.hit?.to ?? null
        p.width = r.value
        if (p.mount) {
          p.mount = { ...p.mount, from: p.mount.to - r.value }
          pinned.add(p.id)
        } else p.at = add(piece.at, mul(pl.u, W - r.value))
      }
    })
    if ('problem' in result) return result
    const now = placeAll(result.pieces).get(piece.id)!
    const g2: Guide | null = dotAt ? { dot: dotAt } : tipGuide ?? (d.handle.kind === 'side' && snapped ? { line: now.sides[d.handle.side], to: lined } : null)
    return { pieces: result.pieces, guide: g2, more: moreGuides }
  }

  function movePointer(event: PointerEvent) {
    const free = event.metaKey || event.ctrlKey
    if (lineDrag && event.pointerId === lineDrag.pointerId) {
      const { line } = lineDrag
      const g = shapePoint(event.clientX, event.clientY)
      const raw = dot(sub(g, line.p), line.out)
      // Snapped to a line of snap dots (when it moves straight across or up and down), or level with another piece's corner.
      const axis = Math.abs(line.out[0]) > 1 - 1e-9 ? 0 : Math.abs(line.out[1]) > 1 - 1e-9 ? 1 : null
      const options: number[] = lineDrag.others.map((p) => dot(sub(p, line.p), line.out))
      if (axis !== null) {
        const at = line.p[axis] + line.out[axis] * raw
        for (const c of [Math.floor(at / dotStep) * dotStep, Math.ceil(at / dotStep) * dotStep]) options.push((c - line.p[axis]) / line.out[axis])
      }
      const t = snapTo(raw, options.map((value) => ({ value })), free).value
      const r = change(lineDrag.before.pieces, (d, pinned) => moveLinedUp(d, line, add(line.p, mul(line.out, t)), pinned))
      if ('problem' in r) return void (message = r.problem)
      message = ''
      lineDrag = { ...lineDrag, moved: true }
      comp = { ...comp, pieces: r.pieces }
      return
    }
    if (drawing && event.pointerId === drawing.pointerId) {
      if (drawing.pending && Math.hypot(event.clientX - drawing.start[0], event.clientY - drawing.start[1]) < 4) return
      const g = shapePoint(event.clientX, event.clientY)
      const reach = (14 * sc) / k
      let target: Target | null = null
      for (const tg of drawing.targets) if (len(sub(tg.at, g)) <= reach && (!target || len(sub(tg.at, g)) < len(sub(target.at, g)))) target = tg
      // Anywhere on a semicircle's curve, as for a radius.
      target ??= arcTarget(o, drawing.from, g, reach, event.metaKey || event.ctrlKey)
      drawing = { ...drawing, to: target?.at ?? g, target, pending: false }
      return
    }
    if (!drag || event.pointerId !== drag.pointerId) return
    const r = dragged(drag, shapePoint(event.clientX, event.clientY), free)
    if ('problem' in r) {
      message = r.problem
      return
    }
    message = ''
    guide = r.guide
    moreGuides = r.more
    drag = { ...drag, moved: true }
    comp = { ...comp, pieces: r.pieces }
  }

  function endPointer(event: PointerEvent) {
    if (lineDrag && event.pointerId === lineDrag.pointerId) {
      if (event.type === 'pointercancel') comp = lineDrag.before
      else if (lineDrag.moved) {
        past = [...past, lineDrag.before].slice(-HISTORY_LIMIT)
        future = []
        lastMerge = null
      }
      lineDrag = null
      return
    }
    if (drawing && event.pointerId === drawing.pointerId) {
      const { point, target, pending } = drawing
      drawing = null
      if (event.type === 'pointercancel') return
      // Not dragged: a click, which draws nothing.
      if (pending) return
      if (!target) {
        message = 'Drop the line’s end on a corner, the middle of a side, where a height meets a side, or where two lines cross.'
        return
      }
      const a = point
      // A height's foot hangs on the corner it's dropped from as found now. Only a foot offered as one: a corner that's
      // another height's foot is just that point.
      const b = target.kind === 'foot' && target.point.at === 'foot' ? { ...target.point, from: a } : target.point
      const line: ExtraLine = { id: newId(), a, b, style: 'dashed', label: 'none', text: '', ticks: 0, right: true }
      edit((c) => c.lines.push(line))
      message = ''
      return
    }
    if (!drag || event.pointerId !== drag.pointerId) return
    if (event.type === 'pointercancel') comp = drag.before
    else if (drag.moved) {
      past = [...past, drag.before].slice(-HISTORY_LIMIT)
      future = []
      lastMerge = null
    }
    drag = null
    guide = null
    moreGuides = []
  }

  // ----- Drawing extra lines from corners

  /** Pressing an anchor point: dragging away draws a line from it. */
  function pressAnchor(event: PointerEvent, anchor: Target) {
    if (event.button !== 0 || spaceDown) return
    event.stopPropagation()
    event.preventDefault()
    popup = null
    const at = anchor.at
    drawing = { pointerId: event.pointerId, point: anchor.point, from: at, to: at, targets: lineTargets(o, plain, comp.lines, anchor.point), target: null, start: [event.clientX, event.clientY], pending: true }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  }

  // ----- Panning and zooming

  /** The view showing the whole shape and its labels, with room around them. */
  function fit() {
    needsFit = false
    const crop = drawn.crop
    if (!crop || !stageW || !stageH) return
    const room = 80
    const zoom = Math.max(MIN_ZOOM, Math.min(2, (stageW - 2 * room) / crop.w, (stageH - 2 * room) / crop.h))
    view = { zoom, x: crop.x + crop.w / 2 - stageW / zoom / 2, y: crop.y + crop.h / 2 - stageH / zoom / 2 }
  }
  $effect(() => {
    if (needsFit && stageW && stageH && drawn.crop) untrack(fit)
  })

  /** Zooms by `factor`, keeping the page point under (clientX, clientY) where it is; the middle of the canvas if not given. */
  function zoomBy(factor: number, clientX?: number, clientY?: number) {
    const r = stage!.getBoundingClientRect()
    const [px, py] = [clientX === undefined ? r.width / 2 : clientX - r.left, clientY === undefined ? r.height / 2 : clientY - r.top]
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom * factor))
    view = { zoom, x: view.x + px / view.zoom - px / zoom, y: view.y + py / view.zoom - py / zoom }
    closeFloating()
  }
  const panBy = (dx: number, dy: number) => {
    view = { ...view, x: view.x + dx / view.zoom, y: view.y + dy / view.zoom }
    closeFloating()
  }
  /** Moving the view leaves popups pointing at nothing, so they close, except the piece's own, which stays where it is. */
  const closeFloating = () => popup && popup.kind !== 'figure' && (popup = null)

  // Scrolling pans; pinching a trackpad (a wheel with Ctrl) or Cmd-scrolling zooms. Safari's trackpad pinch comes as gestures.
  $effect(() => {
    const el = stage
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (empty) return
      e.preventDefault()
      // A trackpad's pinch comes in small steps; a mouse wheel's in big ones, each kept to about a quarter.
      const step = Math.max(-25, Math.min(25, e.deltaY * (e.deltaMode ? 33 : 1)))
      if (e.ctrlKey || e.metaKey) zoomBy(Math.exp(-step * 0.01), e.clientX, e.clientY)
      else panBy(e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX, e.shiftKey && !e.deltaX ? 0 : e.deltaY)
    }
    let gestureZoom = 1
    const gestureStart = (e: Event) => (e.preventDefault(), (gestureZoom = view.zoom))
    const gestureChange = (e: Event) => {
      e.preventDefault()
      const g = e as Event & { scale: number; clientX: number; clientY: number }
      zoomBy((gestureZoom * g.scale) / view.zoom, g.clientX, g.clientY)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('gesturestart', gestureStart)
    el.addEventListener('gesturechange', gestureChange)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('gesturestart', gestureStart)
      el.removeEventListener('gesturechange', gestureChange)
    }
  })

  /** A press outside the canvas and outside any popup closes the piece's popup, as clicking away from a popup does. */
  function pressAnywhere(event: PointerEvent) {
    const t = event.target as Element
    if (pieceOpen && !stage?.contains(t) && !t.closest?.('[role=dialog]')) pieceOpen = false
  }

  /** Before anything else hears it: Space or the middle button pans from anywhere, and two fingers pinch. */
  function pressStageFirst(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (touches.size === 2) {
        const [a, b] = [...touches.values()]
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom }
        panning = null
        event.stopPropagation()
        return
      }
    }
    if (spaceDown || event.button === 1) {
      event.stopPropagation()
      event.preventDefault()
      startPan(event, false)
      stage!.setPointerCapture(event.pointerId)
      panning = { ...panning!, moved: true }
    }
  }
  /** Pressing the canvas where nothing took the press: dragging pans, and a click on nothing lets go of the selection. */
  function pressStage(event: PointerEvent) {
    if (event.defaultPrevented || (event.button !== 0 && event.button !== 1) || panning || pinch) return
    const t = event.target as Element
    // The bars floating over the canvas are buttons, not canvas.
    if (t.closest?.('.dock, .zoom')) return
    startPan(event, t === svg || t === stage || t.classList.contains('backdrop') || t.classList.contains('layer'))
  }
  function startPan(event: PointerEvent, empty: boolean) {
    panning = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, from: { x: view.x, y: view.y }, moved: false, empty }
  }
  function moveStage(event: PointerEvent) {
    if (pinch && touches.has(event.pointerId)) {
      const before = [...touches.values()]
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const [a, b] = [...touches.values()]
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const was = { x: (before[0].x + before[1].x) / 2, y: (before[0].y + before[1].y) / 2 }
      panBy(was.x - mid.x, was.y - mid.y)
      zoomBy((pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.dist / view.zoom, mid.x, mid.y)
      return
    }
    if (!panning || event.pointerId !== panning.pointerId) return
    const [dx, dy] = [event.clientX - panning.x, event.clientY - panning.y]
    if (!panning.moved) {
      if (Math.hypot(dx, dy) < 4) return
      panning = { ...panning, moved: true }
      stage!.setPointerCapture(event.pointerId)
    }
    view = { ...view, x: panning.from.x - dx / view.zoom, y: panning.from.y - dy / view.zoom }
    closeFloating()
  }
  function releaseStage(event: PointerEvent) {
    touches.delete(event.pointerId)
    if (touches.size < 2) pinch = null
    if (!panning || event.pointerId !== panning.pointerId) return
    if (!panning.moved && panning.empty && mode === 'edit') select(null)
    if (!panning.moved && panning.empty) pickedLineId = null
    panning = null
  }

  // ----- Adding pieces

  const stretchZone = (st: Stretch) => {
    const [p, q] = [mul(st.p, k), mul(st.q, k)]
    const out = mul(perp(unit(sub(q, p))), -1)
    const mid = mul(add(p, q), 0.5)
    const zone = 64 * sc
    return { p, q, out, mid, far: add(mid, mul(out, zone)), plus: add(mid, mul(out, 26 * sc)), poly: [p, q, add(q, mul(out, zone)), add(p, mul(out, zone))] }
  }
  /** Every straight stretch of outline: where a piece can go. */
  const zones = $derived(mode === 'edit' && !drag && !drawing ? o.stretches : [])

  const addOptions = $derived(popup?.kind === 'add' ? SIDE_KINDS.map((kind) => ({ key: kind as string, kind, result: pieceOn(comp.pieces, (popup as Extract<Popup, { kind: 'add' }>).stretch, kind) })) : [])
  /** What fits in an inside corner at either end of the side: right triangles and quarter circles. */
  const cornerOptions = $derived(popup?.kind === 'add' ? cornerPieces(comp.pieces, o, popup.stretch).map((opt, i) => ({ ...opt, key: `corner:${i}` })) : [])
  // Several pieces selected: what can go across a side they line up along, whether they merge, and their lined-up sides.
  const several = $derived(mode === 'edit' && picks.length > 1)
  const across = $derived(several ? acrossEdge(o, picks) : null)
  const acrossOptions = $derived(across ? SIDE_KINDS.map((kind) => ({ key: `across:${kind}`, kind, result: pieceAcross(comp.pieces, across, kind) })) : [])
  const mergeable = $derived(several ? mergeCheck(comp.pieces, picks) : null)
  const linedUp = $derived(several && !drawing ? linedUpSides(o, picks) : [])
  const preview = $derived.by(() => {
    const opt = [...addOptions, ...cornerOptions, ...acrossOptions].find((x) => x.key === previewKind)
    if (!opt || !('piece' in opt.result)) return null
    const pl = placeAll([...comp.pieces, opt.result.piece]).get(opt.result.piece.id)
    return pl ? piecePath(pl, k) : null
  })

  /** The add menu, opened just past the side's zone on its outer side, so it never covers the preview. */
  function openAdd(event: MouseEvent, st: Stretch) {
    event.stopPropagation()
    const z = stretchZone(st)
    const reach = Math.max(64 * sc, 3 * k, (len(sub(st.q, st.p)) / 2) * k)
    const around = screenBox([z.p, z.q, add(z.q, mul(z.out, reach)), add(z.p, mul(z.out, reach))])
    const side = Math.abs(z.out[0]) > 0.5 ? (z.out[0] > 0 ? 'right' : 'left') : z.out[1] > 0 ? 'below' : 'above'
    popup = { kind: 'add', stretch: st, at: { x: around.x, y: around.y }, side, around }
    previewKind = null
    pieceOpen = false
  }

  function addPiece(piece: Piece) {
    edit((c) => c.pieces.push(piece))
    popup = null
    previewKind = null
    select(piece.id)
    message = ''
  }

  /** The pieces whose Delete is hovered: they, and any they'd leave floating, are tinted as what would go. */
  let doomed = $state<string[] | null>(null)
  const doomedAll = $derived(doomed ? [...deletedBy(comp.pieces, doomed)] : [])
  function deletePieces(ids: string[]) {
    commit(withoutPieces(comp, ids))
    select(null)
    doomed = null
    popup = null
  }

  // ----- The selected piece: handles, popup and sizes

  const handles = $derived.by(() => {
    const pl = selectedPlaced
    if (!pl || mode !== 'edit' || drawing) return []
    const list: { handle: Handle; at: Vec; along: Vec; label: string }[] = []
    if (pl.piece.kind === 'rectangle')
      pl.sides.forEach(([p, q], side) => {
        if (side === 0 && pl.piece.mount) return
        list.push({ handle: { kind: 'side', side }, at: mul(add(p, q), 0.5), along: unit(sub(q, p)), label: 'Drag to move this side' })
      })
    if (pl.piece.kind === 'triangle') list.push({ handle: { kind: 'tip' }, at: pl.corners[2], along: pl.u, label: 'Drag the tip' })
    return list
  })

  /**
   * Sizes shown on a hovered or selected piece, as blue pills just inside its
   * sides, and a triangle's locked parts on every piece, with a lock: a side's
   * length, or an angle's size inside its corner.
   */
  const pills = $derived.by(() => {
    if (mode !== 'edit' || drawing) return []
    const shown = new Set([hoverPiece, selected].filter((x): x is string => !!x))
    const list: { key: string; at: Vec; text: string; lock: boolean }[] = []
    for (const pl of o.placed.values()) {
      const id = pl.piece.id
      const locks = pl.piece.kind === 'triangle' ? pl.piece.locks : []
      if (!shown.has(id) && !locks.length) continue
      const which = pl.piece.kind === 'rectangle' ? [0, 1] : pl.piece.kind === 'triangle' ? [0, 1, 2] : [0]
      for (const side of which) {
        const lock = locks.includes((['c', 'a', 'b'] as const)[side])
        if (!shown.has(id) && !lock) continue
        const [p, q] = pl.sides[side]
        // Just inside the side, clear of its handle and of the + outside it.
        list.push({ key: `${id}:${side}`, at: add(mul(mul(add(p, q), 0.5), k), mul(outwardOf(pl, [p, q]), -24 * sc)), text: roundTo(len(sub(q, p)), 2), lock })
      }
      if (pl.piece.kind !== 'triangle') continue
      const parts = triangleParts(pl.piece)
      ;(['A', 'B', 'C'] as const).forEach((n, i) => {
        if (!locks.includes(n)) return
        const at = pl.corners[i]
        const [e1, e2] = [pl.corners[(i + 1) % 3], pl.corners[(i + 2) % 3]].map((x) => unit(sub(x, at)))
        const inward = unit(add(e1, e2))
        const text = `${roundTo(parts[n], 1)}°`
        // Far enough in that the pill clears both sides, more so in a sharp corner.
        const half = (text.length * 7.2 + 24) / 2 + 6
        const away = Math.max(30, half / Math.max(0.2, Math.sin((parts[n] * Math.PI) / 360)))
        list.push({ key: `${id}:${n}`, at: add(mul(at, k), mul(inward, away * sc)), text, lock: true })
      })
    }
    return list
  })

  const piecePopup = $derived(mode === 'edit' && pieceOpen && selectedPlaced && !drag && !drawing && popup?.kind !== 'add' ? selectedPlaced : null)
  // Its popup gone, so is any tint of what Delete would take.
  $effect(() => {
    if (!piecePopup && !(several && pieceOpen)) doomed = null
  })
  // Where the popup first opens: beside the whole shape, on the side nearer the piece, as they were when it was picked,
  // so it covers none of the shape and doesn't jump about as the piece changes.
  let pieceAround = $state<{ box: { x: number; y: number; w: number; h: number }; side: 'left' | 'right' } | null>(null)
  $effect(() => {
    const id = picks[0] ?? null
    void mode, svg
    untrack(() => {
      const pl = id ? o.placed.get(id) : null
      const crop = drawn.crop
      if (!pl || !svg || !crop) return (pieceAround = null)
      const shape = screenBox([[crop.x, crop.y], [crop.x + crop.w, crop.y + crop.h]])
      const own = pieceBox(pl)
      pieceAround = { box: shape, side: own.x + own.w / 2 < shape.x + shape.w / 2 ? 'left' : 'right' }
    })
  })

  /** Tries a change to the pieces from the popup, saying why when it can't be. */
  function tryChange(fn: Parameters<typeof change>[1], merge: string) {
    const r = change(comp.pieces, fn)
    if ('problem' in r) {
      pieceProblem = r.problem
      return false
    }
    pieceProblem = ''
    commit({ ...comp, pieces: r.pieces }, merge)
    return true
  }
  const setWidth = (id: string, v: number) => tryChange((d, pinned) => setBase(d, id, v, pinned), `width:${id}`)
  const setHeight = (id: string, v: number) => tryChange((d) => (d.find((p) => p.id === id)!.depth = v), `height:${id}`)
  function setTriangle(p: Piece, part: TrianglePart, v: number) {
    const r = retypeTriangle(p, part, v)
    if ('problem' in r) {
      pieceProblem = r.problem
      return false
    }
    return tryChange((d, pinned) => {
      // Its own locks were kept in working it out, and a locked part can still be typed.
      const t = d.find((x) => x.id === p.id)!
      const locks = t.locks
      t.locks = []
      setBase(d, p.id, r.width, pinned)
      t.locks = locks
      t.tip = r.tip
      t.depth = r.depth
    }, `triangle-${part}:${p.id}`)
  }
  function shapeTriangle(p: Piece, shape: 'right' | 'isosceles' | 'equilateral') {
    const W = baseOf(p)
    tryChange((d) => {
      const t = d.find((x) => x.id === p.id)!
      t.tip = shape === 'right' ? 0 : W / 2
      if (shape === 'equilateral') t.depth = (W * Math.sqrt(3)) / 2
    }, `triangle-${shape}:${p.id}`)
  }
  const toggleLock = (p: Piece, part: TrianglePart) =>
    edit((c) => {
      const t = c.pieces.find((x) => x.id === p.id)!
      t.locks = t.locks.includes(part) ? t.locks.filter((n) => n !== part) : [...t.locks, part]
    })
  const showHint = (piece: string, part: NonNullable<typeof hint>['part'], on: boolean) => {
    if (on) hint = { piece, part }
    else if (hint?.piece === piece && hint.part === part) hint = null
  }

  /** The part of the selected piece a field is about: a side, or a corner's wedge, on the page. */
  const hinted = $derived.by((): { line: [Vec, Vec] } | { wedge: string } | null => {
    const pl = hint ? o.placed.get(hint.piece) : null
    if (!pl || !hint) return null
    const sideNo: Record<string, number> = { width: 0, c: 0, height: 1, a: 1, b: 2 }
    if (hint.part in sideNo) {
      const [p, q] = pl.sides[sideNo[hint.part]]
      return { line: [mul(p, k), mul(q, k)] }
    }
    const i = { A: 0, B: 1, C: 2 }[hint.part as 'A' | 'B' | 'C']
    const at = pl.corners[i]
    const [prev, next] = [pl.corners[(i + 2) % 3], pl.corners[(i + 1) % 3]]
    const r = 26 * sc
    const [e1, e2] = [unit(sub(next, at)), unit(sub(prev, at))]
    const c = mul(at, k)
    const [p1, p2] = [add(c, mul(e1, r)), add(c, mul(e2, r))]
    const sweep = e1[0] * e2[1] - e1[1] * e2[0] > 0 ? 1 : 0
    return { wedge: `M${c[0]},${c[1]} L${p1[0]},${p1[1]} A${r},${r} 0 0 ${sweep} ${p2[0]},${p2[1]} Z` }
  })

  // ----- Keys

  function keydown(event: KeyboardEvent) {
    const target = event.target as Element | null
    if (target?.closest?.('input, textarea, select, .caret-field, [contenteditable]')) return
    const key = event.key.toLowerCase()
    if (event.key === ' ' && !empty) {
      event.preventDefault()
      spaceDown = true
    } else if (event.shiftKey && event.code === 'Digit1' && !empty) fit()
    else if ((event.metaKey || event.ctrlKey) && (key === '=' || key === '+' || key === '-' || key === '0') && !empty) {
      event.preventDefault()
      if (key === '0') zoomBy(1 / view.zoom)
      else zoomBy(key === '-' ? 1 / 1.25 : 1.25)
    } else if ((event.metaKey || event.ctrlKey) && !event.altKey && (key === 'z' || key === 'y')) {
      event.preventDefault()
      if (key === 'y' || event.shiftKey) redo()
      else undo()
    } else if (!event.metaKey && !event.ctrlKey && !event.altKey && (key === 'e' || key === 'l' || key === 't') && !empty) {
      setMode(key === 'e' ? 'edit' : key === 'l' ? 'lines' : 'label')
    } else if (event.key === 'Escape') {
      if (!popup) select(null)
      pickedLineId = null
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && pickedLineId && mode === 'lines') {
      event.preventDefault()
      deleteLine(pickedLineId)
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && picks.length && mode === 'edit' && !popup) {
      event.preventDefault()
      deletePieces(picks)
    }
  }

  // ----- Label mode: the popups

  const sideOf = (key: string): SideStyle => comp.sides[key] ?? SIDE_DEFAULTS
  const angleOf = (key: string): AngleStyle => comp.angles[key] ?? ANGLE_DEFAULTS
  const semiOf = (id: string): SemiStyle => ({ ...SEMI_DEFAULTS, ...comp.semis[id] })
  const setSide = (key: string, patch: Partial<SideStyle>, merge: string | null = null) => edit((c) => (c.sides[key] = { ...sideOf(key), ...patch }), merge)
  const setAngle = (key: string, patch: Partial<AngleStyle>, merge: string | null = null) => edit((c) => (c.angles[key] = { ...angleOf(key), ...patch }), merge)
  const setSemi = (id: string, patch: Partial<SemiStyle>, merge: string | null = null) => edit((c) => (c.semis[id] = { ...semiOf(id), ...patch }), merge)
  const setLine = (id: string, patch: Partial<ExtraLine>, merge: string | null = null) =>
    edit((c) => (c.lines = c.lines.map((l) => (l.id === id ? { ...l, ...patch } : l))), merge)
  function setPoint(key: string, name: string | undefined, merge?: string) {
    edit((c) => {
      if (name === undefined) delete c.points[key]
      else c.points[key] = name
    }, merge ? `point:${key}` : null)
  }

  const picked = $derived(popup?.kind === 'part' ? popup.part : null)
  const pickedEdge = $derived(picked?.kind === 'line' && picked.key.startsWith('s:') ? o.loops.flat().find((e) => e.key === picked.key.slice(2)) : undefined)
  const pickedLine = $derived(picked?.kind === 'line' && picked.key.startsWith('l:') ? comp.lines.find((l) => l.id === picked.key.slice(2)) : undefined)
  // An angle or point, at a corner or where lines meet, as the figure offers it.
  const pickedAngle = $derived(picked?.kind === 'angle' ? drawn.pick.angles.find((a) => a.key === picked.key) : undefined)
  const pickedSpot = $derived(picked?.kind === 'point' ? drawn.pick.spots.find((p) => p.key === picked.key) : undefined)
  const unitText = $derived(comp.unit.trim() ? ` ${comp.unit.trim()}` : '')
  // A part that's gone (its piece deleted, say) closes its popup.
  $effect(() => {
    const p = picked
    if (!p) return
    const there =
      p.kind === 'curve' ? o.placed.has(p.key)
      : p.kind === 'line' ? !!pickedEdge || !!pickedLine
      : !!pickedAngle || !!pickedSpot
    if (!there) popup = null
  })

  // ----- Getting the shape out, cropped to just the shape and its labels

  function picture() {
    const crop = full.crop
    if (!exportSvg || !crop) return null
    const copy = exportSvg.cloneNode(true) as SVGSVGElement
    copy.setAttribute('viewBox', `${crop.x} ${crop.y} ${crop.w} ${crop.h}`)
    copy.setAttribute('width', String(Math.ceil(crop.w)))
    copy.setAttribute('height', String(Math.ceil(crop.h)))
    copy.removeAttribute('class')
    copy.setAttribute('role', 'img')
    copy.setAttribute('aria-label', describe(comp))
    return copy
  }
  async function copyImage() {
    const p = picture()
    if (!p) return
    try {
      await copyPng(p)
      message = 'Image copied. Paste it into your document.'
    } catch {
      message = 'Your browser blocked copying. Try downloading a PNG instead.'
    }
  }
  function download(kind: 'png' | 'svg') {
    const p = picture()
    if (!p) return
    if (kind === 'png') downloadPng(p, 'composite-shape.png')
    else downloadSvg(p, 'composite-shape.svg')
    message = `Downloaded as ${kind.toUpperCase()}.`
  }

  /** Enter or Space on a part of the canvas clicks it, below its middle. */
  function activate(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    const r = (event.currentTarget as Element).getBoundingClientRect()
    event.currentTarget!.dispatchEvent(new MouseEvent('click', { clientX: r.x + r.width / 2, clientY: r.bottom, bubbles: true }))
  }

  const pts = (list: Vec[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const pv = (p: Vec): Vec => mul(p, k)
  /** The snap dots: one unit apart, or five when that's too dense to see. */
  const dotStep = $derived(k / sc >= 9 ? 1 : 5)
</script>

<svelte:window onpointerdowncapture={pressAnywhere} onkeydown={keydown} onkeyup={(e) => e.key === ' ' && (spaceDown = false)} onblur={() => (spaceDown = false)} />

{#snippet drawnAs(cur: { style?: ExtraStyle; weight?: LineWeight }, set: (patch: { style?: ExtraStyle; weight?: LineWeight }) => void, id: string)}
  <!-- How a line, side or curve is drawn: its style, or hidden, and how thick. -->
  <LineStylePicker id="{id}-style" hidden bind:value={() => cur.style ?? 'solid', (v) => set({ style: v })} />
  {#if cur.style !== 'hidden'}
    <div class="group">
      <span class="name" id="{id}-weight">Thickness</span>
      <div class="segmented" role="radiogroup" aria-labelledby="{id}-weight">
        {#each Object.entries(LINE_WEIGHTS) as [w, title]}
          {@const on = (cur.weight ?? 'regular') === w}
          <button type="button" role="radio" aria-checked={on} aria-label={title} {title} class:on onclick={() => set({ weight: w as LineWeight })}>
            <svg viewBox="0 0 28 12" width="28" height="12" aria-hidden="true"><line x1="3" y1="6" x2="25" y2="6" stroke="currentColor" stroke-width={w === 'thin' ? 1.2 : w === 'thick' ? 3.6 : 2.2} /></svg>
          </button>
        {/each}
      </div>
    </div>
  {/if}
{/snippet}

{#snippet shapeIcon(ends: [Vec, Vec] | null, runs: ('a' | 'b')[])}
  <!-- The line at its own slant, with an arrow on each end that runs on. -->
  {@const d = ends ? unit(sub(ends[1], ends[0])) : ([1, 0] as Vec)}
  {@const [a, b] = [add([14, 14], mul(d, -9)), add([14, 14], mul(d, 9))]}
  <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    {#each [['a', a, mul(d, -1)], ['b', b, d]] as const as [end, at, dir]}
      {#if runs.includes(end)}
        {@const tip = add(at, mul(dir, 3))}
        {@const base = add(tip, mul(dir, -6))}
        <polygon points={pts([add(base, mul(perp(dir), 3.5)), tip, add(base, mul(perp(dir), -3.5))])} fill="currentColor" />
      {:else}
        <circle cx={at[0]} cy={at[1]} r="2.4" fill="currentColor" />
      {/if}
    {/each}
  </svg>
{/snippet}

{#snippet anchorDots()}
  <!-- Lines mode: every point a line can start from, shown, each dragged from to draw: corners as dots, middles of sides as diamonds, crossings as rings. -->
  {#each anchors as anchor (anchor.at.join())}
    {@const at = pv(anchor.at)}
    {@const on = !!drawing && drawing.from === anchor.at}
    <g
      class="anchor {anchor.kind}" class:on transform="translate({at[0]} {at[1]}) scale({sc})"
      role="button" tabindex="-1" aria-label="{anchor.name}: drag to draw a line"
      onpointerdown={(e) => pressAnchor(e, anchor)}
      onpointerenter={() => (hoverAnchor = anchor)}
      onpointerleave={() => hoverAnchor === anchor && (hoverAnchor = null)}
      onpointermove={(e) => (e.stopPropagation(), movePointer(e))}
      onpointerup={(e) => (e.stopPropagation(), endPointer(e))}
      onpointercancel={(e) => (e.stopPropagation(), endPointer(e))}
    >
      <circle class="anchor-hit" r="12" />
      {#if anchor.kind === 'mid'}<rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" />
      {:else if anchor.kind === 'center'}<circle r="4.5" /><path class="cross-hair" d="M-7,0 H7 M0,-7 V7" />
      {:else if anchor.kind === 'cross'}<circle r="5" class="ring" />
      {:else}<circle r="4.5" />{/if}
    </g>
  {/each}
{/snippet}

{#snippet pieceIcon(kind: PieceKind | Starter | 'right-triangle')}
  <svg viewBox="0 0 40 28" width="52" height="36" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    {#if kind === 'rectangle'}<rect x="5" y="6" width="30" height="18" />
    {:else if kind === 'triangle'}<path d="M5,24 L35,24 L20,5 Z" />
    {:else if kind === 'semicircle'}<path d="M5,23 L35,23 A15,15 0 0 0 5,23 Z" />
    {:else if kind === 'right-triangle'}<path d="M9,24 L33,24 L9,5 Z" />
    {:else if kind === 'quarter'}<path d="M9,24 L29,24 A20,20 0 0 0 9,4 Z" />
    {:else if kind === 'l-shape'}<path d="M5,25 L35,25 L35,15 L16,15 L16,3 L5,3 Z" />
    {:else if kind === 'house'}<path d="M8,26 L32,26 L32,13 L20,3 L8,13 Z" />
    {:else if kind === 'circle'}<circle cx="20" cy="14" r="11" />
    {:else}<path d="M8,26 L32,26 L32,14 A12,12 0 0 0 8,14 Z" />{/if}
  </svg>
{/snippet}

<div class="editor">
  <h1 class="visually-hidden">{name}</h1>
    <div
      bind:this={stage} class="stage" class:hand={spaceDown} class:panning={panning?.moved} role="presentation"
      bind:clientWidth={stageW} bind:clientHeight={stageH}
      onpointerdowncapture={pressStageFirst} onpointerdown={pressStage} onpointermove={moveStage} onpointerup={releaseStage} onpointercancel={releaseStage}
    >
      <!-- The way home and history at the top left, and settings and getting it out at the top right, floating over the canvas. -->
      <div class="top-left no-print">
      <a class="dock home" href="/" data-tip="All {SITE_NAME}"><img src="/favicon.svg" alt="" width="22" height="22" /><span>{SITE_NAME}</span></a>
      <div class="dock actions" role="toolbar" aria-label="Shape actions">
        <button class="icon-btn" aria-label="Undo" data-tip="Undo" disabled={!past.length} onclick={undo}><Undo2 size={19} /></button>
        <button class="icon-btn" aria-label="Redo" data-tip="Redo" disabled={!future.length} onclick={redo}><Redo2 size={19} /></button>
        <span class="divider"></span>
        <button type="button" class="clear" data-tip="Clear the shape (Undo brings it back)" disabled={empty} onclick={startOver}>Clear</button>
      </div>
      </div>
      <div class="dock exports no-print" role="toolbar" aria-label="Settings and export">
        <button
          bind:this={figureButton} type="button" class="icon-btn" class:on={popup?.kind === 'figure'} aria-label="Settings" data-tip="Settings: unit, rounding, label size"
          aria-expanded={popup?.kind === 'figure'}
          onclick={() => {
            if (popup?.kind === 'figure') return (popup = null)
            const r = figureButton!.getBoundingClientRect()
            popup = { kind: 'figure', at: { x: r.left + r.width / 2, y: r.bottom } }
          }}
        ><Settings size={19} /></button>
        <span class="divider"></span>
        <button class="icon-btn" aria-label="Copy image" data-tip="Copy image" disabled={empty} onclick={copyImage}><Copy size={19} /></button>
        <button class="icon-btn" aria-label="Download PNG" data-tip="Download PNG" disabled={empty} onclick={() => download('png')}><ImageDown size={19} /></button>
        <button class="icon-btn" aria-label="Download SVG" data-tip="Download SVG" disabled={empty} onclick={() => download('svg')}><FileDown size={19} /></button>
      </div>
      {#if message}<p class="message no-print" aria-live="polite">{message}</p>{/if}
      {#if empty}
        <section class="start-menu" aria-labelledby="start-with">
          <h2 id="start-with">Start with</h2>
          <p class="note">One piece, or a shape already built from pieces. Then add more pieces onto any straight side.</p>
          <div class="tray">
            {#each [...SIDE_KINDS, ...STARTERS] as kind}
              <button type="button" class="start" onclick={() => start(kind)}>
                {@render pieceIcon(kind)}
                <span>{(PIECE_NAMES as Record<string, string>)[kind] ?? STARTER_NAMES[kind as Starter]}</span>
              </button>
            {/each}
          </div>
        </section>
      {:else}
        <!-- The figure as it prints, unseen, for copying and downloading. -->
        <svg bind:this={exportSvg} class="export-source" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <CompositeDrawing drawn={full} />
        </svg>
        <svg
          bind:this={svg}
          class="page"
          class:dragging={!!drag}
          class:drawing={!!drawing}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="{box.x} {box.y} {box.w} {box.h}"
          role="application"
          aria-label="Drawing page. {describe(comp)}."
          onpointermove={movePointer}
          onpointerup={endPointer}
          onpointercancel={endPointer}
        >
          <defs data-no-export>
            <pattern id="snap-dots" width={k * dotStep} height={k * dotStep} patternUnits="userSpaceOnUse">
              <circle cx="0" cy="0" r={1.4 * sc} fill="#c3c8d2" />
              <circle cx={k * dotStep} cy="0" r={1.4 * sc} fill="#c3c8d2" />
              <circle cx="0" cy={k * dotStep} r={1.4 * sc} fill="#c3c8d2" />
              <circle cx={k * dotStep} cy={k * dotStep} r={1.4 * sc} fill="#c3c8d2" />
            </pattern>
            {#each zones as st, i (st.key)}
              {@const z = stretchZone(st)}
              <linearGradient id="zone-{i}" gradientUnits="userSpaceOnUse" x1={z.mid[0]} y1={z.mid[1]} x2={z.far[0]} y2={z.far[1]}>
                <stop offset="0" stop-color={BLUE} stop-opacity="0.16" />
                <stop offset="1" stop-color={BLUE} stop-opacity="0" />
              </linearGradient>
            {/each}
          </defs>
          <rect class="backdrop" x={box.x - box.w} y={box.y - box.h} width={box.w * 3} height={box.h * 3} fill="#fff" />
          {#if mode === 'edit'}<rect data-no-export class="backdrop" x={box.x} y={box.y} width={box.w} height={box.h} fill="url(#snap-dots)" />{/if}

          <!-- Add zones: just outside each straight side, lit with a + when hovered. -->
          <g data-no-export>
            {#each zones as st, i (st.key)}
              {@const z = stretchZone(st)}
              {@const lit = hoverZone === st.key || (popup?.kind === 'add' && popup.stretch.key === st.key)}
              <polygon
                class="zone" points={pts(z.poly)} fill={lit ? `url(#zone-${i})` : 'transparent'} role="button" tabindex="-1" aria-label="Add a piece on this side"
                onpointerenter={() => (hoverZone = st.key)} onpointerleave={() => hoverZone === st.key && (hoverZone = null)}
                onpointerdown={(e) => e.stopPropagation()} onclick={(e) => openAdd(e, st)} onkeydown={activate}
              />
            {/each}
          </g>

          {#if preview}<path data-no-export d={preview} class="ghost" />{/if}

          <!-- Pieces: tinted on hover, click to select. -->
          {#if mode === 'edit'}
            <g data-no-export>
              {#each [...o.placed.values()] as pl (pl.piece.id)}
                <path
                  class="piece-hit" class:lit={hoverPiece === pl.piece.id && !drag} d={piecePath(pl, k)} role="button" tabindex="0"
                  aria-label="Select this {PIECE_NAMES[pl.piece.kind].toLowerCase()}"
                  onpointerenter={() => (hoverPiece = pl.piece.id)} onpointerleave={() => hoverPiece === pl.piece.id && (hoverPiece = null)}
                  onpointerdown={(e) => pressPiece(e, pl.piece.id)}
                  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(pl.piece.id))}
                />
              {/each}
            </g>
          {/if}

          <CompositeDrawing {drawn} faint={mode === 'lines'} />

          {#if mode === 'edit'}
            <g data-no-export pointer-events="none">
              <!-- Seams, faintly, where they aren't drawn as a line. -->
              {#each o.seams as seam (seam.key)}
                {#if !seamLine(shown, o.placed, seam)}
                  {@const [p, q] = [pv(seam.p), pv(seam.q)]}
                  <line class="seam" x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke-width={1.3 * sc} stroke-dasharray="{5 * sc} {4 * sc}" />
                {/if}
              {/each}
              {#each picks as id (id)}
                {@const pl = o.placed.get(id)}
                {#if pl}<path class="selected" d={piecePath(pl, k)} stroke-width={2 * sc} />{/if}
              {/each}
              {#each doomedAll as id (id)}
                {@const pl = o.placed.get(id)}
                {#if pl}<path class="doomed" d={piecePath(pl, k)} stroke-width={2 * sc} />{/if}
              {/each}
              {#if hinted && 'line' in hinted}<line class="hint" x1={hinted.line[0][0]} y1={hinted.line[0][1]} x2={hinted.line[1][0]} y2={hinted.line[1][1]} stroke-width={5 * sc} />{/if}
              {#if hinted && 'wedge' in hinted}<path class="hint-wedge" d={hinted.wedge} />{/if}
            </g>


            <!-- The selected piece's + on each of its outer sides, and the hovered side's. -->
            {#if !drag && !drawing && popup?.kind !== 'add'}
              <g data-no-export>
                {#each zones as st (st.key)}
                  {#if st.piece === selected || hoverZone === st.key}
                    {@const z = stretchZone(st)}
                    <g
                      class="plus" transform="translate({z.plus[0]} {z.plus[1]}) scale({sc})" role="button" tabindex="0" aria-label="Add a piece on this side"
                      onpointerenter={() => (hoverZone = st.key)} onpointerdown={(e) => e.stopPropagation()} onclick={(e) => openAdd(e, st)} onkeydown={activate}
                    >
                      <circle r="12" />
                      <path d="M-5.5,0 H5.5 M0,-5.5 V5.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" />
                    </g>
                  {/if}
                {/each}
              </g>
            {/if}

            <!-- Handles: in the middle of a rectangle's sides, on a triangle's tip. -->
            {#if selectedPlaced}
              <g data-no-export>
                {#each handles as h (JSON.stringify(h.handle))}
                  {@const at = pv(h.at)}
                  {@const deg = (Math.atan2(h.along[1], h.along[0]) * 180) / Math.PI}
                  <g
                    class="handle" transform="translate({at[0]} {at[1]}) rotate({h.handle.kind === 'tip' ? 0 : deg}) scale({sc})"
                    role="button" tabindex="-1" aria-label={h.label} onpointerdown={(e) => startHandle(e, selectedPlaced.piece.id, h.handle)}
                  >
                    {#if h.handle.kind === 'tip'}<circle r="6.5" />{:else}<rect x="-11" y="-4.5" width="22" height="9" rx="4.5" />{/if}
                  </g>
                {/each}
              </g>
            {/if}

            <!-- Several selected: a handle on each line their sides line up along, moving them all. -->
            {#if !drag}
              <g data-no-export>
                {#each linedUp as line, i (i)}
                  {@const at = pv(mul(add(line.p, line.q), 0.5))}
                  {@const d = sub(line.q, line.p)}
                  {@const deg = (Math.atan2(d[1], d[0]) * 180) / Math.PI}
                  <g
                    class="handle" transform="translate({at[0]} {at[1]}) rotate({deg}) scale({sc})"
                    role="button" tabindex="-1" aria-label="Drag to move these lined-up sides together" onpointerdown={(e) => startLineDrag(e, line)}
                  ><rect x="-14" y="-4.5" width="28" height="9" rx="4.5" /></g>
                {/each}
              </g>
            {/if}

            <!-- Sizes, as Figma shows them. -->
            <g data-no-export pointer-events="none">
              {#each pills as pill (pill.key)}
                {@const lockW = pill.lock ? 12 : 0}
                {@const w = (pill.text.length * 7.2 + 12 + lockW) * sc}
                <g transform="translate({pill.at[0]} {pill.at[1]})">
                  <rect class="pill" class:locked={pill.lock} x={-w / 2} y={-9 * sc} width={w} height={18 * sc} rx={5 * sc} />
                  {#if pill.lock}
                    <!-- A small padlock before the size. -->
                    <g transform="translate({-w / 2 + 6 * sc} {-5 * sc}) scale({sc})" class="pill-lock">
                      <rect x="0" y="4.5" width="8" height="6" rx="1.2" />
                      <path d="M1.8,4.5 V3 a2.2,2.2 0 0 1 4.4,0 V4.5" fill="none" stroke-width="1.4" />
                    </g>
                  {/if}
                  <text class="pill-text" x={(lockW / 2) * sc} y={4.2 * sc} font-size={12 * sc} text-anchor="middle">{pill.text}</text>
                </g>
              {/each}
            </g>

            <!-- Snapping: the side lined up, the dot it landed on, or the line a tip is on. -->
            {#each moreGuides as more}
              {@const [p, q] = more.line.map(pv)}
              {@const d = mul(unit(sub(q, p)), 40 * sc)}
              <line class="guide" data-no-export pointer-events="none" x1={p[0] - d[0]} y1={p[1] - d[1]} x2={q[0] + d[0]} y2={q[1] + d[1]} stroke-width={1 * sc} />
              {#if more.to}
                {@const t = pv(more.to)}
                {@const near = len(sub(t, p)) < len(sub(t, q)) ? p : q}
                <line class="guide" data-no-export pointer-events="none" x1={near[0]} y1={near[1]} x2={t[0]} y2={t[1]} stroke-width={1 * sc} stroke-dasharray="{4 * sc} {3 * sc}" />
              {/if}
            {/each}
            {#if guide}
              <g data-no-export pointer-events="none">
                {#if 'dot' in guide}
                  {@const at = pv(guide.dot)}
                  <circle class="snap-dot" cx={at[0]} cy={at[1]} r={5 * sc} stroke-width={1.5 * sc} />
                {:else if 'path' in guide}
                  <polyline class="guide" points={pts(guide.path.map(pv))} fill="none" stroke-width={(guide.held ? 1.5 : 1) * sc} stroke-dasharray={guide.held ? `${6 * sc} ${4 * sc}` : undefined} />
                  {#if guide.square}<polyline class="guide" points={pts(guide.square.map(pv))} fill="none" stroke-width={1.5 * sc} />{/if}
                {:else}
                  {@const [p, q] = guide.line.map(pv)}
                  {@const d = mul(unit(sub(q, p)), 40 * sc)}
                  <line class="guide" x1={p[0] - d[0]} y1={p[1] - d[1]} x2={q[0] + d[0]} y2={q[1] + d[1]} stroke-width={1 * sc} />
                  {#if guide.to}
                    <!-- Lined up with another piece's corner: the side carried on to it. -->
                    {@const t = pv(guide.to)}
                    {@const near = len(sub(t, p)) < len(sub(t, q)) ? p : q}
                    <line class="guide" x1={near[0]} y1={near[1]} x2={t[0]} y2={t[1]} stroke-width={1 * sc} stroke-dasharray="{4 * sc} {3 * sc}" />
                    <circle class="snap-dot" cx={t[0]} cy={t[1]} r={4 * sc} stroke-width={1.5 * sc} />
                  {/if}
                {/if}
              </g>
            {/if}

          {/if}

            {#if mode === 'lines'}
              <!-- Extra lines: click one to pick it, then delete it with its × or the Delete key. -->
              <g data-no-export>
                {#each drawn.lines.filter((l) => comp.lines.some((x) => x.id === l.id)) as l (l.id)}
                  <line
                    class="line-hit" x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} stroke-width={14 * sc}
                    role="button" tabindex="-1" aria-label="Extra line: click to pick it"
                    onpointerdown={(e) => (e.stopPropagation(), (pickedLineId = l.id), (hoverEnds = []), (previewRuns = null), (popup = { kind: 'line', id: l.id, at: { x: e.clientX, y: e.clientY } }))}
                  />
                {/each}
                {#each drawn.lines.filter((l) => l.id === pickedLineId) as l (l.id)}
                  {@const [from, to] = l.seg ?? [l.from, l.to]}
                  <line class="line-picked" x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke-width={3 * sc} pointer-events="none" />
                {/each}
                {@render anchorDots()}
                <!-- The ends a hovered choice in its card is about. -->
                {#each comp.lines.filter((x) => x.id === pickedLineId) as l (l.id)}
                  {@const ends = lineEnds(o.placed, l)}
                  {#if ends}
                    {#if previewRuns}
                      <!-- What the hovered choice would make: its run-ons, out of sight. -->
                      {#each previewRuns as end}
                        {@const [from, other] = end === 'a' ? [ends[0], ends[1]] : [ends[1], ends[0]]}
                        {@const at = pv(from)}
                        {@const to = add(at, mul(unit(sub(from, other)), 1e5))}
                        <line class="ray-preview" x1={at[0]} y1={at[1]} x2={to[0]} y2={to[1]} stroke-width={2 * sc} stroke-dasharray="{7 * sc} {5 * sc}" pointer-events="none" />
                      {/each}
                    {/if}
                    {#each hoverEnds as end}
                      {@const at = pv(ends[end === 'a' ? 0 : 1])}
                      <circle class="end-ring" cx={at[0]} cy={at[1]} r={9 * sc} stroke-width={2 * sc} pointer-events="none" />
                    {/each}
                  {/if}
                {/each}
              </g>
            {/if}
            {#if named}
              <!-- What the point is, in a small dark tag above it. -->
              {@const at = pv(named.at)}
              {@const w = (named.name.length * 6.6 + 16) * sc}
              <g data-no-export pointer-events="none" transform="translate({at[0]} {at[1] - 22 * sc})">
                <rect class="anchor-tag" x={-w / 2} y={-11 * sc} width={w} height={20 * sc} rx={6 * sc} />
                <text class="anchor-tag-text" y={3.6 * sc} font-size={11.5 * sc} text-anchor="middle">{named.name}</text>
              </g>
            {/if}

            <!-- An extra line being drawn, and where it can end. -->
            {#if drawing && !drawing.pending}
              {@const from = pv(drawing.from)}
              {@const to = pv(drawing.to)}
              <g data-no-export pointer-events="none">
                {#each drawing.targets as tg}
                  {@const at = pv(tg.at)}
                  {#if tg.kind === 'foot'}
                    <!-- A height's foot: a small square, as it'll be marked. -->
                    <rect class="target" class:on={drawing.target === tg} x={at[0] - 4.5 * sc} y={at[1] - 4.5 * sc} width={9 * sc} height={9 * sc} stroke-width={1.5 * sc} />
                  {:else}
                    <circle class="target" class:on={drawing.target === tg} cx={at[0]} cy={at[1]} r={5 * sc} stroke-width={1.5 * sc} />
                  {/if}
                {/each}
                <line class="drawn-line" x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke-width={2 * sc} stroke-dasharray="{6 * sc} {5 * sc}" />
              </g>
            {/if}
        </svg>

        {#if mode === 'label'}
          <PickLayer figure={{ ...drawn.pick, frame: box }} selected={picked} onpick={(part, at) => (popup = { kind: 'part', part, at })}>
            <!-- The labels again, unseen, over everything, so they can be dragged. -->
            <g opacity="0">
              <FigureLabels
                labels={drawn.labels} ink={INK}
                onmove={(part, offset) => (comp = { ...comp, moved: { ...comp.moved, [part]: offset } })}
                ondrag={(on) => {
                  if (on) labelBefore = comp
                  else {
                    if (labelBefore && labelBefore !== comp) {
                      past = [...past, labelBefore].slice(-HISTORY_LIMIT)
                      future = []
                      lastMerge = null
                    }
                    labelBefore = null
                  }
                }}
              />
            </g>
          </PickLayer>
        {/if}

        <!-- The mode, at the bottom in the middle, as Figma keeps its tools. -->
        <div class="modes dock no-print" role="radiogroup" aria-label="Mode">
          <button type="button" role="radio" aria-checked={mode === 'edit'} class:on={mode === 'edit'} aria-label="Edit" data-tip="Edit: build the shape (E)" onclick={() => setMode('edit')}>
            <Shapes size={20} /><span>Edit</span>
          </button>
          <button type="button" role="radio" aria-checked={mode === 'lines'} class:on={mode === 'lines'} aria-label="Lines" data-tip="Lines: draw heights and other lines (L)" onclick={() => setMode('lines')}>
            <PenLine size={20} /><span>Lines</span>
          </button>
          <button type="button" role="radio" aria-checked={mode === 'label'} class:on={mode === 'label'} aria-label="Label" data-tip="Label: mark and name its parts (T)" onclick={() => setMode('label')}>
            <Tag size={20} /><span>Label</span>
          </button>
        </div>

        {#if mode === 'label' && !empty}
          <!-- The whole figure's turn, as it's labeled and printed: dragged on the ↻ or typed. -->
          <div class="turn dock no-print" data-tip="Turn the whole figure">
            <ScrubAngle id="figure-turn" label="the figure's turn" symbol="↻" min={-180} max={180} bind:value={turnText} />
          </div>
        {/if}

        <div class="zoom no-print" role="toolbar" aria-label="Zoom">
          <button type="button" aria-label="Zoom out" data-tip="Zoom out" onclick={() => zoomBy(1 / 1.25)}><Minus size={16} /></button>
          <button type="button" class="level" aria-label="Zoom to 100%" data-tip="Zoom to 100%" onclick={() => zoomBy(1 / view.zoom)}>{Math.round(view.zoom * 100)}%</button>
          <button type="button" aria-label="Zoom in" data-tip="Zoom in" onclick={() => zoomBy(1.25)}><Plus size={16} /></button>
          <button type="button" class="fit" aria-label="Fit the shape in view" data-tip="Fit the shape (Shift+1)" onclick={fit}>Fit</button>
        </div>
      {/if}
    </div>
</div>

{#if piecePopup && pieceAround}
  {@const piece = piecePopup.piece}
  {@const id = piece.id}
  <Popover
    at={{ x: pieceAround.box.x, y: pieceAround.box.y }} around={pieceAround.box} side={pieceAround.side} movable bind:moved={pieceMoved}
    title={PIECE_NAMES[piece.kind]} label="{PIECE_NAMES[piece.kind]} sizes" onclose={() => (pieceOpen = false)}
  >
    {#if piece.kind === 'rectangle'}
      <div class="sizes">
        <MeasureField id="width" label="Width" symbol="↔" unit={unitText} value={baseOf(piece)} onvalue={(v) => setWidth(id, v)} onhint={(on) => showHint(id, 'width', on)} />
        <MeasureField id="height" label="Height" symbol="↕" unit={unitText} value={piece.depth} onvalue={(v) => setHeight(id, v)} onhint={(on) => showHint(id, 'height', on)} />
      </div>
      <p class="hint">Or drag the handles on its sides.</p>
    {:else if piece.kind === 'semicircle'}
      <MeasureField id="diameter" label="Diameter" symbol="⌀" unit={unitText} value={baseOf(piece)} onvalue={(v) => setWidth(id, v)} onhint={(on) => showHint(id, 'width', on)} />
    {:else if piece.kind === 'quarter'}
      <MeasureField id="radius" label="Radius" symbol="r" unit={unitText} value={baseOf(piece)} onvalue={(v) => setWidth(id, v)} onhint={(on) => showHint(id, 'width', on)} />
    {:else}
      {@const t = triangleParts(piece)}
      {@const locked = (n: TrianglePart) => piece.locks.includes(n)}
      <div class="group">
        <span class="name">Angles</span>
        {#each ([['A', 'Angle at one end of the base'], ['B', 'Angle at the other end of the base'], ['C', 'Angle at the tip']] as const) as [n, label]}
          <MeasureField
            id="angle-{n}" {label} symbol="∠" angle value={t[n]} locked={locked(n)} onlock={() => toggleLock(piece, n)}
            onvalue={(v) => setTriangle(piece, n, v)} onhint={(on) => showHint(id, n, on)}
          />
        {/each}
      </div>
      <div class="group">
        <span class="name">Sides</span>
        {#each ([['c', 'Base', '—'], ['a', 'Side from the base’s other end', '╱'], ['b', 'Side from the base’s start', '╲']] as const) as [n, label, symbol]}
          <MeasureField
            id="side-{n}" {label} {symbol} unit={unitText} value={t[n]} locked={locked(n)} onlock={() => toggleLock(piece, n)}
            onvalue={(v) => setTriangle(piece, n, v)} onhint={(on) => showHint(id, n, on)}
          />
        {/each}
      </div>
      <div class="presets">
        <button type="button" class="btn-ghost" onclick={() => shapeTriangle(piece, 'right')}>Right</button>
        <button type="button" class="btn-ghost" onclick={() => shapeTriangle(piece, 'isosceles')}>Isosceles</button>
        <button type="button" class="btn-ghost" onclick={() => shapeTriangle(piece, 'equilateral')}>Equilateral</button>
      </div>
    {/if}
    {#if pieceProblem}<p class="problem" role="alert">{pieceProblem}</p>{/if}
    <div class="group">
      <span class="name" id="piece-shade">Shading</span>
      <Swatches id="piece-shade" value={piece.shade} onpick={(i) => edit((c) => (c.pieces.find((p) => p.id === id)!.shade = i))} />
    </div>
    <button
      type="button" class="btn-ghost delete" onclick={() => deletePieces([id])}
      onpointerenter={() => (doomed = [id])} onpointerleave={() => (doomed = null)} onfocus={() => (doomed = [id])} onblur={() => (doomed = null)}
    >
      Delete
    </button>
  </Popover>
{/if}

{#if several && pieceOpen && pieceAround && !drag && !lineDrag && !drawing && popup?.kind !== 'add'}
  <Popover
    at={{ x: pieceAround.box.x, y: pieceAround.box.y }} around={pieceAround.box} side={pieceAround.side} movable bind:moved={pieceMoved}
    title="{picks.length} pieces" label="{picks.length} pieces selected" onclose={() => (pieceOpen = false)}
  >
    <div class="group">
      <span class="name" id="many-shade">Shading</span>
      <Swatches
        id="many-shade" value={comp.pieces.find((p) => p.id === picks[0])?.shade ?? 0}
        onpick={(i) => edit((c) => c.pieces.forEach((p) => picks.includes(p.id) && (p.shade = i)))}
      />
    </div>
    {#if across}
      <div class="group">
        <span class="name">Add across their sides</span>
        <div class="add-list" role="menu" tabindex="-1" onpointerleave={() => (previewKind = null)}>
          {#each acrossOptions as opt (opt.key)}
            {@const ok = 'piece' in opt.result}
            <button
              type="button" role="menuitem" class="add-option" disabled={!ok}
              onpointerenter={() => (previewKind = opt.key)} onfocus={() => (previewKind = opt.key)} onblur={() => (previewKind = null)}
              onclick={() => 'piece' in opt.result && addPiece(opt.result.piece)}
            >
              {@render pieceIcon(opt.kind)}
              <span>{PIECE_NAMES[opt.kind]}{#if !ok && 'problem' in opt.result}<span class="why">{opt.result.problem}</span>{/if}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
    {#if mergeable}
      <button
        type="button" class="btn-ghost line-btn" disabled={'problem' in mergeable}
        onclick={() => {
          const r = mergePieces(comp, picks)
          if ('problem' in r) return void (pieceProblem = r.problem)
          commit(r.comp)
          select(r.id)
        }}
      >Merge into one rectangle</button>
      {#if 'problem' in mergeable}<p class="hint">{mergeable.problem}</p>{/if}
    {/if}
    {#if pieceProblem}<p class="problem" role="alert">{pieceProblem}</p>{/if}
    <button
      type="button" class="btn-ghost delete" onclick={() => deletePieces(picks)}
      onpointerenter={() => (doomed = [...picks])} onpointerleave={() => (doomed = null)} onfocus={() => (doomed = [...picks])} onblur={() => (doomed = null)}
    >
      Delete
    </button>
  </Popover>
{/if}

{#if popup?.kind === 'add'}
  <Popover at={popup.at} side={popup.side} around={popup.around} onclose={() => ((popup = null), (previewKind = null))} label="Add a piece">
    <div class="pop-head"><span>Add on this side</span></div>
    <div class="add-list" role="menu" tabindex="-1" onpointerleave={() => (previewKind = null)}>
      {#each addOptions as opt (opt.key)}
        {@const ok = 'piece' in opt.result}
        <button
          type="button" role="menuitem" class="add-option" disabled={!ok}
          onpointerenter={() => (previewKind = opt.key)} onfocus={() => (previewKind = opt.key)}
          onclick={() => 'piece' in opt.result && addPiece(opt.result.piece)}
        >
          {@render pieceIcon(opt.kind)}
          <span>{PIECE_NAMES[opt.kind]}{#if !ok && 'problem' in opt.result}<span class="why">{opt.result.problem}</span>{/if}</span>
        </button>
      {/each}
      {#if cornerOptions.length}
        <div class="pop-head corner-head"><span>Add in this corner</span></div>
        {#each cornerOptions as opt (opt.key)}
          {@const ok = 'piece' in opt.result}
          <button
            type="button" role="menuitem" class="add-option" disabled={!ok}
            onpointerenter={() => (previewKind = opt.key)} onfocus={() => (previewKind = opt.key)}
            onclick={() => 'piece' in opt.result && addPiece(opt.result.piece)}
          >
            {@render pieceIcon(opt.kind === 'triangle' ? 'right-triangle' : 'quarter')}
            <span>{opt.kind === 'triangle' ? 'Right triangle' : 'Quarter circle'}{#if !ok && 'problem' in opt.result}<span class="why">{opt.result.problem}</span>{/if}</span>
          </button>
        {/each}
      {/if}
    </div>
  </Popover>
{:else if popup?.kind === 'figure'}
  <Popover at={popup.at} owner={figureButton} onclose={() => (popup = null)} label="Settings">
    <label class="group">
      <span class="name">Unit</span>
      <input type="text" maxlength="8" placeholder="cm" value={comp.unit} oninput={(e) => edit((c) => (c.unit = e.currentTarget.value), 'unit')} />
    </label>
    {#each ([['round', 'Round lengths to'], ['angleRound', 'Round angles to']] as const) as [field, title]}
      <div class="group">
        <span class="name" id="{field}-name">{title}</span>
        <div class="segmented" role="radiogroup" aria-labelledby="{field}-name">
          {#each ([[0, 'Whole'], [1, 'Tenths'], [2, 'Hundredths']] as const) as [r, label]}
            <button type="button" role="radio" aria-checked={comp[field] === r} class:on={comp[field] === r} onclick={() => edit((c) => (c[field] = r))}>{label}</button>
          {/each}
        </div>
      </div>
    {/each}
    <div class="group">
      <span class="name" id="label-size">Label size</span>
      <div class="label-size" role="radiogroup" aria-labelledby="label-size">
        {#each LABEL_ORDER as v (v)}
          <button
            type="button" role="radio" class="size" class:on={labelSize === v} aria-checked={labelSize === v} aria-label="{LABEL_SIZES[v]} labels"
            onclick={() => (labelSize = v)}
          ><span style="font-size: {GLYPH[v]}px" aria-hidden="true">A</span></button>
        {/each}
      </div>
    </div>
  </Popover>
{:else if popup?.kind === 'line' && pickedCard}
  {@const l = pickedCard}
  {@const names = endNames(l)}
  {@const ray = l.ray ?? NO_RAY}
  {@const ends = lineEnds(o.placed, l)}
  {@const runs = [...(ray.a !== null ? ['a' as const] : []), ...(ray.b !== null ? ['b' as const] : [])]}
  <Popover at={popup.at} onclose={() => ((popup = null), (pickedLineId = null), (hoverEnds = []), (previewRuns = null))} label="This line">
    <div class="pop-head"><span>{heightFoot(l) ? 'Height' : 'Extra line'}</span></div>
    <div class="group">
      <span class="name" id="pop-line-shape">Shape</span>
      <div class="shapes" role="radiogroup" aria-labelledby="pop-line-shape">
        {#each [
          { label: 'Segment', tip: 'Segment: stops at both ends', ends: [] as ('a' | 'b')[] },
          { label: `Ray past the ${names.a} end`, tip: `Ray: runs on past the ${names.a} end`, ends: ['a' as const] },
          { label: `Ray past the ${names.b} end`, tip: `Ray: runs on past the ${names.b} end`, ends: ['b' as const] },
          { label: 'Line', tip: 'Line: runs on past both ends', ends: ['a' as const, 'b' as const] },
        ] as choice}
          {@const on = choice.ends.length === runs.length && choice.ends.every((e) => runs.includes(e))}
          <button
            type="button" role="radio" aria-checked={on} class:on aria-label={choice.label} data-tip={choice.tip}
            onclick={() => setRay(l.id, choice.ends)} onpointerenter={() => ((hoverEnds = choice.ends.length ? choice.ends : ['a', 'b']), (previewRuns = choice.ends))} onpointerleave={() => ((hoverEnds = []), (previewRuns = null))}
          >
            {@render shapeIcon(ends, choice.ends)}
          </button>
        {/each}
      </div>
    </div>
    <button type="button" class="btn-ghost delete" onclick={() => deleteLine(l.id)}>Delete</button>
  </Popover>
{:else if popup?.kind === 'part' && picked}
  <Popover at={popup.at} onclose={() => (popup = null)} label="Labels for this part of the shape">
    {#if pickedEdge && pickedEdge.kind === 'line'}
      {@const key = pickedEdge.key}
      {@const s = sideOf(key)}
      <div class="pop-head"><span>Side</span><span class="measure">{roundTo(len(sub(pickedEdge.q, pickedEdge.p)), comp.round)}{unitText}</span></div>
      <div class="group">
        <span class="name" id="pop-label">Label</span>
        <LabelPicker id="pop-label" value={s.label} onpick={(v) => setSide(key, { label: v })} />
        {#if s.label === 'text'}<MathInput id="pop-text" aria-label="Label text" placeholder="x" bind:value={() => s.text, (v) => setSide(key, { text: v }, `side-text:${key}`)} />{/if}
      </div>
      <div class="group">
        <span class="name" id="pop-ticks">Congruence ticks</span>
        <CountPicker id="pop-ticks" value={s.ticks} glyph="|" onpick={(n) => setSide(key, { ticks: n })} />
      </div>
      <div class="group">
        <span class="name" id="pop-arrows">Parallel arrows</span>
        <CountPicker id="pop-arrows" value={s.arrows} glyph="›" onpick={(n) => setSide(key, { arrows: n })} />
      </div>
      {@render drawnAs(s, (patch) => setSide(key, patch), 'pop-side')}
    {:else if pickedLine}
      {@const l = pickedLine}
      {@const ends = lineEnds(o.placed, l)}
      {@const height = !!heightFoot(l)}
      <div class="pop-head"><span>{height ? 'Height' : 'Extra line'}</span><span class="measure">{ends ? roundTo(len(sub(ends[1], ends[0])), comp.round) : ''}{unitText}</span></div>
      <div class="group">
        <span class="name" id="pop-line-label">Label</span>
        <LabelPicker id="pop-line-label" value={l.label} onpick={(v) => setLine(l.id, { label: v })} />
        {#if l.label === 'text'}<MathInput id="pop-line-text" aria-label="Label text" placeholder="h" bind:value={() => l.text, (v) => setLine(l.id, { text: v }, `line-text:${l.id}`)} />{/if}
      </div>
      {@render drawnAs(l, (patch) => setLine(l.id, patch), 'pop-line')}
      {@const ray = l.ray ?? NO_RAY}
      {#if ray.a !== null || ray.b !== null}
        {@const names = endNames(l)}
        <div class="group">
          <span class="name">Ends</span>
          <div class="caps">
            {#each [['a', ray.a], ['b', ray.b]] as const as [end, cap]}
              {#if cap !== null}
                <CapPicker
                  side={names[end] === 'left' || names[end] === 'top' ? 'start' : 'end'} label="{names[end][0].toUpperCase()}{names[end].slice(1)} end"
                  bind:value={() => cap, (v: Cap) => setLine(l.id, { ray: { ...ray, [end]: v } })}
                />
              {/if}
            {/each}
          </div>
        </div>
      {/if}
      <div class="group">
        <span class="name" id="pop-line-ticks">Congruence ticks</span>
        <CountPicker id="pop-line-ticks" value={l.ticks} glyph="|" onpick={(n) => setLine(l.id, { ticks: n })} />
      </div>
      {#if height}
        <div class="group">
          <span class="name" id="pop-line-right">Right-angle mark</span>
          <div class="segmented" role="radiogroup" aria-labelledby="pop-line-right">
            <button type="button" role="radio" aria-checked={!l.right} class:on={!l.right} onclick={() => setLine(l.id, { right: false })}>Hide</button>
            <button type="button" role="radio" aria-checked={l.right} class:on={l.right} onclick={() => setLine(l.id, { right: true })}>Show</button>
          </div>
        </div>
      {/if}
      <button type="button" class="btn-ghost delete" onclick={() => (edit((c) => (c.lines = c.lines.filter((x) => x.id !== l.id))), (popup = null))}>Delete</button>
    {:else if picked.kind === 'angle' && pickedAngle}
      {@const key = pickedAngle.key}
      <div class="pop-head"><span>{key.endsWith('|ext') ? 'Exterior angle' : 'Angle'}</span><span class="measure">{roundTo(pickedAngle.measure, comp.angleRound)}°</span></div>
      <AngleOptions
        value={angleOf(key)} right={Math.abs(pickedAngle.measure - 90) < 1e-4}
        onchange={(patch, merge) => setAngle(key, patch, merge ? `angle-${merge}:${key}` : null)}
      />
    {:else if picked.kind === 'point' && pickedSpot}
      {@const key = pickedSpot.key}
      <div class="pop-head"><span>{pickedSpot.name ?? 'Point'}</span></div>
      <PointOptions name={comp.points[key]} onchange={(n, merge) => setPoint(key, n, merge)} />
    {:else if picked.kind === 'curve'}
      {@const id = picked.key}
      {@const semi = semiOf(id)}
      {@const pl = o.placed.get(id)}
      <div class="pop-head"><span>{pl ? PIECE_NAMES[pl.piece.kind] : 'Curve'}</span>{#if pl?.arc}<span class="measure">r = {roundTo(pl.arc.r, comp.round)}{unitText}</span>{/if}</div>
      <label class="group">
        <span class="name">Label on the curve</span>
        <MathInput id="pop-arc-text" aria-label="Label on the curve" placeholder="none" bind:value={() => semi.arcText, (v) => setSemi(id, { arcText: v }, `arc:${id}`)} />
      </label>
      {@render drawnAs(sideOf(`${id}:arc`), (patch) => setSide(`${id}:arc`, patch), 'pop-curve')}
      <div class="group">
        <span class="name" id="pop-radius">Radius</span>
        <div class="segmented" role="radiogroup" aria-labelledby="pop-radius">
          <button type="button" role="radio" aria-checked={!semi.radius} class:on={!semi.radius} onclick={() => setSemi(id, { radius: false })}>Hide</button>
          <button type="button" role="radio" aria-checked={semi.radius} class:on={semi.radius} onclick={() => setSemi(id, { radius: true })}>Show</button>
        </div>
        {#if semi.radius}
          <LabelPicker id="pop-radius" value={semi.radiusLabel} onpick={(v) => setSemi(id, { radiusLabel: v })} />
          {#if semi.radiusLabel === 'text'}<MathInput id="pop-radius-text" aria-label="Radius label" placeholder="r" bind:value={() => semi.radiusText, (v) => setSemi(id, { radiusText: v }, `radius:${id}`)} />{/if}
        {/if}
      </div>
      <div class="group">
        <span class="name" id="pop-center">Center point</span>
        <div class="segmented" role="radiogroup" aria-labelledby="pop-center">
          <button type="button" role="radio" aria-checked={semi.center === null} class:on={semi.center === null} aria-label="No point" title="No point" onclick={() => setSemi(id, { center: null })}><X size={15} /></button>
          <button type="button" role="radio" aria-checked={semi.center !== null} class:on={semi.center !== null} onclick={() => setSemi(id, { center: semi.center ?? '' })}>Show</button>
        </div>
        {#if semi.center !== null}<input type="text" maxlength="4" placeholder="O" aria-label="Center name" value={semi.center} oninput={(ev) => setSemi(id, { center: ev.currentTarget.value }, `center:${id}`)} />{/if}
      </div>
    {/if}
  </Popover>
{/if}

<style>
  /* The whole window under the top bar, with no card: the canvas is the page. */
  .editor { position: relative; height: 100dvh; background: #fff; }

  /* Bars floating over the canvas. */
  .dock {
    position: absolute; z-index: 2; display: flex; align-items: center; gap: 2px; padding: 4px;
    border: 1px solid var(--border); border-radius: 14px; background: #fff; box-shadow: 0 6px 20px -8px rgb(17 24 39 / 30%);
  }
  .top-left { position: absolute; z-index: 2; top: 0.75rem; left: 0.75rem; display: flex; gap: 0.5rem; }
  .top-left .dock { position: static; }
  .home { gap: 0.5rem; height: 2.85rem; padding: 0 0.85rem 0 0.6rem; color: var(--ink); font-weight: 800; font-size: 1rem; text-decoration: none; white-space: nowrap; }
  .home:hover { background: var(--blue-soft); }
  .exports { top: 0.75rem; right: 0.75rem; }
  .divider { width: 1px; height: 1.6rem; background: var(--border); margin: 0 0.3rem; flex: none; }
  .clear { padding: 0.4rem 0.7rem; border: 0; border-radius: 10px; background: none; color: var(--ink); font-size: 0.88rem; font-weight: 600; }
  .clear:hover:not(:disabled), .clear:focus-visible { background: #fef2f2; color: #dc2626; }
  .clear:disabled { opacity: 0.45; cursor: default; }
  .icon-btn.on { background: var(--blue-soft); color: var(--blue-dark); }
  .message {
    position: absolute; z-index: 2; top: 0.95rem; left: 50%; transform: translateX(-50%); max-width: min(34rem, calc(100% - 26rem));
    margin: 0; padding: 0.4rem 0.8rem; border-radius: 10px; background: rgb(17 24 39 / 82%); color: #fff; font-size: 0.84rem; text-align: center; pointer-events: none;
  }
  .turn { right: 0.75rem; bottom: 4.1rem; width: 8.5rem; padding: 2px 6px; }
  .modes { bottom: 1rem; left: 50%; transform: translateX(-50%); gap: 4px; padding: 6px; border-radius: 16px; }
  .modes button {
    display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 3.6rem; padding: 0.45rem 0.6rem 0.35rem;
    border: 0; border-radius: 11px; background: none; color: var(--ink); font-size: 0.72rem; font-weight: 600;
  }
  .modes button:hover { background: var(--blue-soft); color: var(--blue-dark); }
  .modes button.on { background: #2563eb; color: #fff; }
  @media (max-width: 720px) {
    .message { top: auto; bottom: 5.4rem; max-width: calc(100% - 1.5rem); }
  }

  .export-source { position: absolute; width: 0; height: 0; overflow: hidden; visibility: hidden; pointer-events: none; }
  .stage { position: absolute; inset: 0; overflow: hidden; touch-action: none; }
  .stage.hand, .stage.hand :global(*) { cursor: grab !important; }
  .stage.panning, .stage.panning :global(*) { cursor: grabbing !important; }
  .zoom {
    position: absolute; right: 0.75rem; bottom: 0.75rem; display: flex; align-items: center; gap: 2px; padding: 3px;
    border: 1px solid var(--border); border-radius: 12px; background: #fff; box-shadow: 0 4px 14px -6px rgb(17 24 39 / 25%);
  }
  .zoom button { display: grid; place-items: center; min-width: 2rem; height: 2rem; padding: 0 0.4rem; border: 0; border-radius: 9px; background: none; color: var(--ink); font-size: 0.8rem; font-weight: 600; }
  .zoom button:hover { background: var(--blue-soft); color: var(--blue-dark); }
  .zoom .level { min-width: 3.2rem; font-variant-numeric: tabular-nums; }
  .zoom .fit { padding: 0 0.6rem; border-left: 1px solid var(--border); border-radius: 0 9px 9px 0; }
  .page { position: absolute; inset: 0; display: block; width: 100%; height: 100%; touch-action: none; user-select: none; -webkit-user-select: none; }

  .start-menu { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 1.5rem; text-align: center; }
  .start-menu h2 { font-size: 1.25rem; font-weight: 800; }
  .note { margin: 0; color: var(--muted); font-size: 0.9rem; max-width: 30rem; }
  .tray { display: grid; grid-template-columns: repeat(4, minmax(0, 9rem)); gap: 0.7rem; margin-top: 1rem; }
  .start {
    display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 0.9rem 0.6rem 0.75rem;
    border: 1.5px solid var(--border); border-radius: 14px; background: #fff; color: var(--ink); font-size: 0.9rem; font-weight: 600;
    transition: border-color 0.15s, background 0.15s, transform 0.15s;
  }
  .start:hover, .start:focus-visible { border-color: var(--blue-border); background: var(--blue-soft); transform: translateY(-1px); }
  .start svg { color: var(--blue-dark); }

  .zone { cursor: pointer; outline: none; }
  .plus { cursor: pointer; }
  .plus circle { fill: #1d4ed8; }
  .plus:hover circle { fill: #1e40af; }
  .ghost { fill: rgb(37 99 235 / 10%); stroke: #2563eb; stroke-width: 2; stroke-dasharray: 6 5; pointer-events: none; }
  .piece-hit { fill: transparent; cursor: pointer; outline: none; }
  .piece-hit.lit, .piece-hit:focus-visible { fill: rgb(37 99 235 / 8%); }
  .seam { stroke: #9aa3b2; }
  .selected { fill: none; stroke: #2563eb; }
  .doomed { fill: rgb(220 38 38 / 18%); stroke: #dc2626; stroke-linejoin: round; }
  .hint { stroke: rgb(37 99 235 / 45%); stroke-linecap: round; }
  .hint-wedge { fill: rgb(37 99 235 / 25%); }
  .line-hit { stroke: transparent; cursor: pointer; outline: none; }
  .line-picked { stroke: #2563eb; stroke-linecap: round; }
  .end-ring { fill: none; stroke: #2563eb; }
  .ray-preview { stroke: #2563eb; opacity: 0.6; }
  .shapes { display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: #f1f3f6; }
  .shapes button { flex: 1; display: grid; place-items: center; height: 2.3rem; padding: 0; border: 0; border-radius: 8px; background: none; color: var(--muted); }
  .shapes button:hover { color: var(--blue-dark); }
  .shapes button.on { background: #fff; color: var(--blue-dark); box-shadow: 0 1px 2px rgba(16, 24, 40, 0.12); }
  .caps { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .anchor { cursor: crosshair; outline: none; }
  .anchor-tag { fill: rgb(17 24 39 / 88%); }
  .anchor-tag-text { fill: #fff; font-family: system-ui, sans-serif; font-weight: 600; }
  .anchor-hit { fill: transparent; stroke: none; }
  .anchor circle:not(.anchor-hit), .anchor rect { fill: #fff; stroke: #2563eb; stroke-width: 1.6; }
  .anchor .ring { fill: none; stroke-dasharray: 2.5 2; }
  .anchor .cross-hair { stroke: #2563eb; stroke-width: 1.4; }
  .anchor:hover circle:not(.anchor-hit), .anchor:hover rect, .anchor.on circle:not(.anchor-hit), .anchor.on rect { fill: #2563eb; }
  .handle { cursor: grab; outline: none; }
  .handle rect, .handle circle { fill: #fff; stroke: #2563eb; stroke-width: 1.8; }
  .handle:hover rect, .handle:hover circle { fill: #dbeafe; }
  .page.dragging, .page.dragging * { cursor: grabbing; }
  .page.drawing, .page.drawing * { cursor: crosshair; }
  .pill { fill: #2563eb; }
  .pill.locked { fill: #1e3a8a; }
  .pill-lock rect { fill: #fff; }
  .pill-lock path { stroke: #fff; }
  .pill-text { fill: #fff; font-family: system-ui, sans-serif; font-weight: 600; }
  .guide { stroke: #3b82f6; }
  .snap-dot { fill: none; stroke: #3b82f6; }
  .target { fill: #fff; stroke: #2563eb; }
  .target.on { fill: #2563eb; }
  .drawn-line { stroke: #2563eb; }

  .sizes { display: grid; gap: 0.45rem; }
  .group :global(.measure) + :global(.measure) { margin-top: 0.1rem; }
  .presets { display: flex; gap: 0.35rem; }
  .presets button { flex: 1; padding: 0.4rem 0.3rem; font-size: 0.82rem; border-radius: 9px; }
  .problem { margin: 0; color: var(--red); font-weight: 600; font-size: 0.84rem; }
  .line-btn { font-size: 0.85rem; padding: 0.45rem 0.8rem; border-radius: 10px; align-self: flex-start; }
  .add-list { display: flex; flex-direction: column; gap: 0.3rem; }
  .corner-head { margin-top: 0.5rem; }
  .add-option {
    display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0.7rem 0.35rem 0.4rem;
    border: 1.5px solid var(--border); border-radius: 10px; background: #fff; font-weight: 600; font-size: 0.9rem; text-align: left;
  }
  .add-option svg { flex: none; color: var(--blue-dark); }
  .add-option > span { display: flex; flex-direction: column; }
  .add-option:hover:not(:disabled), .add-option:focus-visible { border-color: var(--blue-border); background: var(--blue-soft); }
  .add-option:disabled { color: #9aa0aa; cursor: default; }
  .add-option:disabled svg { color: #c3c8d2; }
  .why { font-weight: 400; font-size: 0.78rem; }
  .label-size { display: flex; gap: 2px; }
  .size { width: 2.15rem; height: 2.15rem; display: grid; place-items: center; border: 0; border-radius: 8px; background: none; color: var(--muted); font-family: 'Times New Roman', Times, serif; }
  .size:hover, .size.on { background: var(--blue-soft); color: var(--blue-dark); }

  /* Phones: the mode bar moves to the left, clear of the zoom bar, and the start menu takes two columns. */
  @media (max-width: 640px) {
    .modes { left: 0.75rem; transform: none; }
    .modes button { min-width: 3rem; }
    .tray { grid-template-columns: repeat(2, minmax(0, 9rem)); }
  }
</style>
