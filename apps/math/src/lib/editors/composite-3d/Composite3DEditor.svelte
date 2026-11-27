<script lang="ts">
  // The Composite 3D Shape Editor, built like Tinkercad:
  //   - on the left, the shapes: drag one onto a flat face of the figure, or
  //     click it and then click a face. A see-through copy follows the
  //     pointer, snapped onto the face under it (its middle, an edge, or a
  //     half-unit grid). Switched to Hole, the shape is cut out as a hole instead.
  //     The figures to start from show on the empty canvas (after Clear).
  //   - in the middle, the 3D view: drag to turn the camera any way, right-drag
  //     to move it, scroll to zoom. Clicking a piece selects it, with a popup
  //     for its sizes, turns, place, lines and deleting it; dragging the
  //     selected piece moves it onto another face.
  //   - the figure as it prints (the textbook line drawing, from the 3D
  //     view's camera) isn't shown for now, while the building is worked on;
  //     copying, downloading and printing still give it.
  // The figure is kept in this browser (nothing goes in the address), with
  // undo and redo, and exports cropped to the figure and its labels.
  import { Box, Copy, FileDown, ImageDown, PanelRight, Printer, Redo2, RotateCcw, RotateCw, Settings, Trash2, Undo2, X, House, Rotate3d, Pencil, Maximize, ZoomIn, ZoomOut } from '@lucide/svelte'
  import { onMount } from 'svelte'
  import { copyPng, downloadPng, downloadSvg } from '$shared/exporting'
  import { cleanLabelSize, LABEL_SIZES, type LabelSize } from '$shared/labelSize'
  import LabelPicker from '$lib/labeling/LabelPicker.svelte'
  import Popover from '$lib/labeling/Popover.svelte'
  import { UNITS } from '$lib/shapes/parts.js'
  import MathInput from '$lib/shared/MathInput.svelte'
  import { SITE_NAME } from '$lib/site/config'
  import Drawing3D from './Drawing3D.svelte'
  import NumberField from './NumberField.svelte'
  import Viewport3D, { type Placing } from './Viewport3D.svelte'
  import { drawFigure, textbookView, LINE_NAMES, LINES_FOR, measureEdges, measureText, hiddenKeysOn, repickedEdges, type Vec } from './draw'
  import {
    ABOUT, canGoThrough, clone, newPiece, cubesPossible, CUT_KINDS, cutCanGoThrough, depthKey, describe, emptyFigure, faceAxes, MAX_SIZE, MIN_SIZE,
    ownFlatFaces, PIECE_KINDS, PIECE_NAMES, placeAll, SIZE_FIELDS, tidyFigure, touchingFace, turned, turnsTouching, viewAngle, withAttached,
    withoutPieces, mulRot, QUARTER, ROTATIONS, rotIndex, type Align, type Dir, type Figure, type LineKind, type Piece, type PieceKind, type Rot,
  } from './model'
  import { firstPreset, PRESETS } from './presets'
  import { pieceAt } from './snap'
  import { fittable } from './handles'

  let { name }: { name: string } = $props()

  const STORAGE_KEY = 'math-composite-3d-shape'
  const HISTORY_LIMIT = 100
  const GLYPH: Record<LabelSize, number> = { large: 19, medium: 15, small: 11 }
  const PAD = 18

  let fig = $state.raw<Figure>(emptyFigure())
  let labelSize = $state<LabelSize>('medium')
  let past = $state.raw<Figure[]>([])
  let future = $state.raw<Figure[]>([])
  let lastMerge: string | null = null
  let loaded = $state(false)
  let message = $state('')

  /** Whether the figure panel is slid out. */
  let showFigure = $state(false)
  /** How much of the window the figure panel takes, dragged on its divider: a quarter to three quarters. */
  let figureShare = $state(0.5)
  let settled = $state(false)
  let sizing = $state<{ id: number } | null>(null)
  function grabDivider(e: PointerEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    sizing = { id: e.pointerId }
    const move = (ev: PointerEvent) => (figureShare = Math.min(0.75, Math.max(0.25, 1 - ev.clientX / window.innerWidth)))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      sizing = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  /** The piece under the pointer in the figure panel, which a click shows the measures of. */
  let paneHover = $state<string | null>(null)
  let paneW = $state(0)
  let paneH = $state(0)
  let svg = $state<SVGSVGElement>()
  let exportSvg = $state<SVGSVGElement>()
  let viewport = $state<Viewport3D>()

  let selected = $state<string | null>(null)
  /** Every piece selected at once (Cmd/Ctrl+A), to delete them all. */
  let everything = $state(false)
  let hovered = $state<string | null>(null)
  let hoverPart = $state<string | null>(null)
  let doomed = $state<string[]>([])
  let placing = $state<Placing | null>(null)
  let holeMode = $state(false)
  let pieceMoved = $state<{ left: number; top: number } | null>(null)
  let settingsButton = $state<HTMLButtonElement>()
  type Popup =
    | { kind: 'piece'; at: { x: number; y: number } }
    | { kind: 'label'; key: string; at: { x: number; y: number }; around?: ScreenBox | null; side?: 'left' | 'right' }
    | { kind: 'settings'; at: { x: number; y: number } }
    /** A shape clicked in the figure: which of its measures show. */
    | { kind: 'measures'; piece: string; at: { x: number; y: number } }
    /** A face's + clicked: which shape to add onto it. */
    | { kind: 'add'; piece: string; face: Dir; at: { x: number; y: number } }
  let popup = $state.raw<Popup | null>(null)
  /** Where a label or measures card was dragged to; a new card starts in its usual place. */
  let cardMoved = $state<{ left: number; top: number } | null>(null)
  $effect(() => {
    void (popup?.kind === 'label' ? popup.key : popup?.kind === 'measures' ? popup.piece : null)
    cardMoved = null
  })
  /** Counts camera moves, so the piece popup keeps beside its piece as the view turns or zooms. */
  let viewTick = $state(0)
  /** The selected piece's box on the screen, which its popup sits beside rather than over. */
  const pieceBox = $derived.by(() => {
    void fig
    void viewTick
    return selected && viewport ? viewport.screenBox(selected) : null
  })
  /** The box round the piece a + menu adds onto, which the menu sits beside, so the shape it previews shows. */
  const addBox = $derived.by(() => {
    void fig
    void viewTick
    return popup?.kind === 'add' && viewport ? viewport.screenBox(popup.piece) : null
  })
  /** While a label is dragged, the figure pane holds its view still. */
  let frozen = $state.raw<{ x: number; y: number; w: number; h: number } | null>(null)

  const empty = $derived(!fig.pieces.length)
  const figureOpen = $derived(showFigure && !empty)
  /** The shape families in the toolbar, each with its variants (cylinder or half cylinder, say), and the variant each is on. */
  const FAMILIES: { id: string; kinds: PieceKind[] }[] = [
    { id: 'box', kinds: ['box'] }, { id: 'prism', kinds: ['prism'] }, { id: 'cylinder', kinds: ['cylinder', 'halfCylinder'] },
    { id: 'cone', kinds: ['cone', 'pyramid'] }, { id: 'sphere', kinds: ['sphere', 'hemisphere'] },
  ]
  let variant = $state<Record<string, PieceKind>>({ box: 'box', prism: 'prism', cylinder: 'cylinder', cone: 'cone', sphere: 'sphere' })
  /** The toolbar menu open above it: a family's variants, or the camera's views. */
  let toolMenu = $state<string | null>(null)
  const canBe = (kind: PieceKind) => !holeMode || (CUT_KINDS as readonly string[]).includes(kind)
  /** A family's tool shows its chosen variant, or its first that can be a hole in Hole mode. */
  const kindFor = (fam: { id: string; kinds: PieceKind[] }) => (canBe(variant[fam.id]) ? variant[fam.id] : (fam.kinds.find(canBe) ?? fam.kinds[0]))
  // The figure is drawn as a textbook would (see textbookView).
  const drawn = $derived(drawFigure({ ...fig, view: textbookView(fig) }, labelSize))
  const placed = $derived(placeAll(fig.pieces))
  const unitText = $derived(fig.unit.trim() ? ` ${fig.unit.trim()}` : '')
  const canCubes = $derived(cubesPossible(fig.pieces))
  /** The start-from figures, drawn small, while the canvas is empty (drawn only then: they take a moment). */
  /** Each base shape alone, drawn the same way, to start from. */
  const singles = $derived(empty && loaded ? PIECE_KINDS.map((kind) => ({ kind, drawn: drawFigure({ ...emptyFigure(), pieces: [newPiece(kind)] }, 'medium') })) : [])
  /** The figures the start screen offers: the most common, three rows of three, level with the shapes beside them. */
  const START_WITH = ['l-shape', 'stacked', 'house', 'tower', 'silo', 'pencil', 'ice-cream', 'cylinder-on-box', 'cube-hole']
  const previews = $derived(empty && loaded ? PRESETS.filter((p) => START_WITH.includes(p.id)).map((preset) => {
      const f = { ...preset.make(), labels: {} }
      return { preset, drawn: drawFigure({ ...f, view: textbookView(f) }, 'medium') }
    }) : [])

  /** How far the figure pane is zoomed from fitting the figure, and panned (in the figure's units). */
  let figZoom = $state(1)
  let figPan = $state.raw<[number, number]>([0, 0])
  /** Room kept free at the bottom of the pane for its view bar. */
  const DOCK = 76
  const fitScale = (W: number, H: number) => Math.min((W - 2 * PAD) / drawn.frame.w, (H - DOCK - 2 * PAD) / drawn.frame.h, 2.2)
  /** What the figure pane shows, in the figure's units: its frame centered above the view bar, then zoomed and panned. */
  const box = $derived.by(() => {
    if (frozen) return frozen
    const f = drawn.frame
    const W = paneW || 500
    const H = paneH || 500
    const s = fitScale(W, H) * figZoom
    const cx = f.x + f.w / 2 + figPan[0]
    const cy = f.y + f.h / 2 + figPan[1]
    return { x: cx - W / 2 / s, y: cy - (H - DOCK) / 2 / s, w: W / s, h: H / s }
  })
  /** Zooms the figure pane by `k`, keeping the spot under (px, py), in pixels from its corner, where it is. */
  function zoomFigure(k: number, px = (paneW || 500) / 2, py = ((paneH || 500) - DOCK) / 2) {
    const W = paneW || 500
    const H = paneH || 500
    const s0 = fitScale(W, H) * figZoom
    const z = Math.max(0.25, Math.min(8, figZoom * k))
    const s1 = fitScale(W, H) * z
    const p = [box.x + px / s0, box.y + py / s0]
    const f = drawn.frame
    figZoom = z
    figPan = [p[0] - px / s1 + W / 2 / s1 - (f.x + f.w / 2), p[1] - py / s1 + (H - DOCK) / 2 / s1 - (f.y + f.h / 2)]
  }
  const fitFigure = () => ((figZoom = 1), (figPan = [0, 0]))
  function figureWheel(event: WheelEvent) {
    event.preventDefault()
    const r = (event.currentTarget as Element).getBoundingClientRect()
    zoomFigure(Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002)), event.clientX - r.left, event.clientY - r.top)
  }
  // Dragging the empty page pans it; a press that doesn't move is still a click.
  let panGrab: { id: number; x: number; y: number; pan: [number, number]; moved: boolean } | null = null
  function panDown(event: PointerEvent) {
    if (event.button !== 0 || (event.target as Element).closest('g[role="button"]')) return
    panGrab = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: figPan, moved: false }
  }
  function panMove(event: PointerEvent) {
    if (!panGrab || event.pointerId !== panGrab.id) return
    const dx = event.clientX - panGrab.x
    const dy = event.clientY - panGrab.y
    if (!panGrab.moved && Math.hypot(dx, dy) < 5) return
    if (!panGrab.moved) (event.currentTarget as Element).setPointerCapture(event.pointerId)
    panGrab.moved = true
    const s = (paneW || 500) / box.w
    figPan = [panGrab.pan[0] - dx / s, panGrab.pan[1] - dy / s]
  }
  let justPanned = false
  function panUp(event: PointerEvent) {
    if (!panGrab || event.pointerId !== panGrab.id) return
    justPanned = panGrab.moved
    panGrab = null
  }
  /** Figure units per screen pixel. */
  const sc = $derived(box.w / (paneW || 500))

  onMount(() => {
    let saved: { figure?: unknown; labelSize?: unknown; panel?: { open?: unknown; share?: unknown } } | null = null
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    } catch {
      /* nothing saved, or storage blocked */
    }
    if (saved?.figure) {
      fig = tidyFigure(saved.figure)
      labelSize = cleanLabelSize(saved.labelSize)
    } else fig = firstPreset()
    // The figure panel as it was left: open or not, and how wide.
    showFigure = saved?.panel?.open === true
    const share = Number(saved?.panel?.share)
    if (share >= 0.25 && share <= 0.75) figureShare = share
    // Restored as it was, without sliding open; slides only when opened or closed from here on.
    setTimeout(() => (settled = true), 50)
    loaded = true
  })

  $effect(() => {
    const data = JSON.stringify({ figure: fig, labelSize, panel: { open: showFigure, share: figureShare } })
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, data)
    } catch {
      /* storage blocked or full: the figure lasts until the page closes */
    }
  })

  // ----- History

  /** Make a change. Changes sharing a `merge` key in a row (typing a measure, say) undo as one. */
  function commit(next: Figure, merge: string | null = null) {
    if (!merge || merge !== lastMerge) {
      past = [...past, fig].slice(-HISTORY_LIMIT)
      future = []
    }
    lastMerge = merge
    fig = next
  }
  function edit(fn: (f: Figure) => void, merge: string | null = null) {
    const next = clone(fig)
    fn(next)
    commit(next, merge)
  }
  function undo() {
    if (!past.length) return
    future = [fig, ...future]
    fig = past.at(-1)!
    past = past.slice(0, -1)
    lastMerge = null
    tidyUp()
  }
  function redo() {
    if (!future.length) return
    past = [...past, fig]
    fig = future[0]
    future = future.slice(1)
    lastMerge = null
    tidyUp()
  }
  function tidyUp() {
    if (selected && !fig.pieces.some((p) => p.id === selected)) select(null)
    doomed = []
  }

  // ----- Pieces

  function startFrom(make: () => Figure) {
    const next = make()
    commit({ ...next, hidden: fig.hidden, seams: fig.seams, view: { ...next.view, yaw: fig.view.yaw, pitch: fig.view.pitch } })
    select(null)
    message = ''
    setTimeout(() => viewport?.fit(), 0)
  }
  /** Starts a new figure from one shape, standing in the middle, its main measures shown. */
  function startOne(kind: PieceKind) {
    const p = newPiece(kind)
    place(p, { x: window.innerWidth / 2, y: window.innerHeight / 2 })
  }
  function clearAll() {
    commit({ ...emptyFigure(), unit: fig.unit, hidden: fig.hidden, seams: fig.seams, view: fig.view, labelStyle: fig.labelStyle })
    select(null)
  }

  const pieceOf = (id: string | null) => fig.pieces.find((p) => p.id === id) ?? null
  function setPiece(id: string, fn: (p: Piece) => void, merge: string | null = null) {
    edit((f) => {
      const p = f.pieces.find((q) => q.id === id)
      if (p) fn(p)
    }, merge)
  }
  /**
   * A measure filling the face a piece sits on, or fixed (Figma's "fill
   * container" and "fixed"): filling, it's kept the face's size, and the piece
   * centered on it that way.
   */
  function setFill(id: string, key: keyof Piece['size'], on: boolean) {
    const drawn = placed.get(id)?.piece.size ?? {}
    viewport?.preview(null)
    setPiece(id, (q) => {
      q.fill = { ...(q.fill ?? {}) }
      if (on) q.fill[key] = true
      // Back to fixed: it keeps the size it filled to.
      else (q.size[key] = drawn[key] ?? q.size[key]), delete q.fill[key]
    })
  }
  /** Measures changed by hand (typed, or dragged with a handle) stop filling the face. */
  function letGo(q: Piece, size: Piece['size'] | undefined) {
    if (!size || !q.fill) return
    const drawn = placed.get(q.id)?.piece.size ?? {}
    for (const k of Object.keys(size) as (keyof Piece['size'])[]) if (q.fill[k] && Math.abs((size[k] ?? 0) - (drawn[k] ?? 0)) > 1e-9) delete q.fill[k]
  }
  function setSize(id: string, key: string, v: number): boolean {
    if (!(v >= MIN_SIZE && v <= MAX_SIZE)) return false
    setPiece(id, (p) => {
      p.size[key as keyof Piece['size']] = v
      if (p.fill) delete p.fill[key as keyof Piece['size']]
    }, `size:${id}:${key}`)
    return true
  }

  function select(id: string | null, at: { x: number; y: number } | null = null) {
    everything = false
    if (id !== selected) pieceMoved = null
    selected = id
    doomed = []
    if (!id) {
      if (popup?.kind === 'piece') popup = null
      return
    }
    if (at) popup = { kind: 'piece', at }
  }

  /** A shape dropped in the 3D view: a new piece, or one moved to a new place. */
  function place(p: Piece, at: { x: number; y: number }) {
    const exists = fig.pieces.some((q) => q.id === p.id)
    if (exists) {
      edit((f) => {
        const i = f.pieces.findIndex((q) => q.id === p.id)
        f.pieces.splice(i, 1)
        // It now comes after its new parent, as pieces are placed in order.
        const at2 = f.pieces.findIndex((q) => q.id === p.on?.parent)
        const kids = withAttached([...f.pieces, p], p.id).slice(1)
        const moved = f.pieces.filter((q) => kids.includes(q.id))
        f.pieces = f.pieces.filter((q) => !kids.includes(q.id))
        const where = f.pieces.findIndex((q) => q.id === p.on?.parent)
        f.pieces.splice((where >= 0 ? where : at2) + 1, 0, clone(p), ...moved)
      })
    } else {
      const next = clone(fig)
      next.pieces.push(clone(p))
      // A first piece, or a round one, shows its main measures straight away.
      if (!p.on) next.labels = measureEdges(next)
      for (const line of LINES_FOR[p.kind].filter((l) => l === 'radius' || (l === 'height' && !p.on && p.kind !== 'prism'))) {
        next.pieces.at(-1)!.lines[line] = true
        next.labels[`${p.id}:${line}`] = { mode: 'measure', text: '' }
      }
      commit(next)
      if (!p.on) setTimeout(() => viewport?.fit(), 0)
    }
    select(p.id, at)
  }

  /** Shows a shape in the 3D view where it would go, while it's hovered in the + menu. */
  function previewOnto(kind: PieceKind, cut: boolean) {
    if (popup?.kind !== 'add') return
    viewport?.preview(pieceAt(fig, kind, cut, popup.piece, popup.face, [0, 0, 0]))
  }
  /** Adds a shape onto a face from its +: fitted to cover the face, or a hole inside it. */
  function addOnto(kind: PieceKind, cut: boolean) {
    if (popup?.kind !== 'add') return
    viewport?.preview(null)
    const { piece, face, at } = popup
    const p = pieceAt(fig, kind, cut, piece, face, [0, 0, 0])
    if (!p) return
    popup = null
    pieceMoved = null
    place(p, at)
  }

  function deletePiece(id: string) {
    const ids = withAttached(fig.pieces, id)
    commit(withoutPieces(fig, ids))
    select(null)
    popup = null
    message = ids.length > 1 ? `Deleted ${ids.length} pieces. Undo brings them back.` : ''
  }

  /** Dragging the view cube turns the camera, as dragging the 3D view does; a press that doesn't move is a click on a face. */
  let cubeDragged = false
  function grabCube(e: PointerEvent) {
    if (e.button !== 0 || !viewport) return
    const start = { x: e.clientX, y: e.clientY }
    const [y0, p0] = viewport.angles()
    cubeDragged = false
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x
      const dy = ev.clientY - start.y
      if (!cubeDragged && Math.hypot(dx, dy) < 4) return
      cubeDragged = true
      viewport?.look(y0 - dx * 0.6, Math.max(0, Math.min(89, p0 + dy * 0.6)), false)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setTimeout(() => (cubeDragged = false), 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** Picks up a shape from the palette: drag it onto a face, or click it and then click a face. */
  function pickUp(kind: PieceKind, e: PointerEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    const cut = holeMode && (CUT_KINDS as readonly string[]).includes(kind) && !empty
    placing = { kind, cut, moving: null }
    select(null)
    popup = null
    viewport?.startPlacing(e)
  }

  // ----- The figure pane: labeling edges and lines

  type ScreenBox = { x: number; y: number; w: number; h: number }
  /**
   * Where a part of the figure is on screen: its edge or line, its dimension
   * line and arrows, and its label. Its card goes beside all of that, on the
   * side away from the middle of the figure, so it never covers what it's for.
   */
  function partBox(key: string): { around: ScreenBox; side: 'left' | 'right' } | null {
    if (!svg) return null
    const pts: Vec[] = []
    for (const l of drawn.labelables) if (l.key === key) pts.push(l.a, l.b)
    for (const run of [...drawn.runs, ...drawn.unseen]) if (run.key === key) pts.push(...run.pts)
    drawn.dims.forEach((d, i) => drawn.dimOwner[i] === key && pts.push(...d))
    drawn.arrows.forEach((a, i) => drawn.arrowOwner[i] === key && pts.push(...a))
    drawn.leaders.forEach((d, i) => drawn.leaderOwner[i] === key && pts.push(...d))
    for (const l of drawn.labels) if (l.part === key) pts.push([l.x, l.y - l.box.asc], [l.x + l.box.w, l.y + l.box.desc])
    if (!pts.length) return null
    const r = svg.getBoundingClientRect()
    const s = Math.min(r.width / box.w, r.height / box.h)
    // The drawing is centered in the svg's box (preserveAspectRatio's default).
    const ox = r.left + (r.width - box.w * s) / 2
    const oy = r.top + (r.height - box.h * s) / 2
    const xs = pts.map((p) => ox + (p[0] - box.x) * s)
    const ys = pts.map((p) => oy + (p[1] - box.y) * s)
    const PAD = 6
    const around = { x: Math.min(...xs) - PAD, y: Math.min(...ys) - PAD, w: Math.max(...xs) - Math.min(...xs) + 2 * PAD, h: Math.max(...ys) - Math.min(...ys) + 2 * PAD }
    const mid = ox + (box.x + box.w / 2 - box.x) * s
    return { around, side: around.x + around.w / 2 > mid ? 'right' : 'left' }
  }

  function pagePoint(event: PointerEvent | MouseEvent): Vec | null {
    if (!svg) return null
    const r = svg.getBoundingClientRect()
    const s = r.width / box.w
    return [box.x + (event.clientX - r.left) / s, box.y + (event.clientY - r.top) / s]
  }
  const distTo = (p: Vec, a: Vec, b: Vec) => {
    const d: Vec = [b[0] - a[0], b[1] - a[1]]
    const L = d[0] * d[0] + d[1] * d[1]
    const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L)) : 0
    return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1])
  }
  function partAt(p: Vec): string | null {
    let best: string | null = null
    let bestD = 9 * sc
    for (const l of drawn.labelables) {
      const d = distTo(p, l.a, l.b)
      if (d < bestD) (bestD = d), (best = l.key)
    }
    // A measure's dimension line (with its arrows and end bars) is its too.
    for (const h of drawn.dimHits) {
      const d = distTo(p, h.a, h.b)
      if (d < bestD) (bestD = d), (best = h.key)
    }
    return best
  }
  /** The hidden line (dashed, or left out) at a spot, if any. */
  function hiddenAt(p: Vec): string | null {
    let best: string | null = null
    let bestD = 7 * sc
    for (const run of [...drawn.runs, ...drawn.unseen]) {
      if (run.look !== 'hidden' || !run.key) continue
      for (let i = 0; i + 1 < run.pts.length; i++) {
        const d = distTo(p, run.pts[i], run.pts[i + 1])
        if (d < bestD) (bestD = d), (best = run.key)
      }
    }
    return best
  }
  /** The measure whose number is at a spot, if any. */
  const labelAt = (p: Vec) => drawn.labels.find((l) => p[0] >= l.x - 3 && p[0] <= l.x + l.box.w + 3 && p[1] >= l.y - l.box.asc - 3 && p[1] <= l.y + l.box.desc + 3)?.part ?? null
  function paneMove(event: PointerEvent) {
    const q = pagePoint(event)
    const onLabel = q ? labelAt(q) : null
    paneHover = q && !onLabel && !partAt(q) && !hiddenAt(q) ? (drawn.pickAt(q)?.piece ?? null) : null
    if (onLabel && !frozen) return void (hoverPart = onLabel)
    if (frozen) return
    const p = pagePoint(event)
    hoverPart = p ? (partAt(p) ?? hiddenAt(p)) : null
  }
  function paneClick(event: MouseEvent) {
    if (justPanned) return void (justPanned = false)
    const p = pagePoint(event)
    if (!p) return
    const part = partAt(p)
    const at = { x: event.clientX, y: event.clientY }
    // A measure's own text opens its card as well as its line.
    const onLabel = labelAt(p)
    const key = onLabel ?? part ?? hiddenAt(p)
    if (key) popup = { kind: 'label', key, at, ...partBox(key) }
    else if (drawn.pickAt(p)) popup = { kind: 'measures', piece: drawn.pickAt(p)!.piece, at }
    else if (popup?.kind === 'label') popup = null
  }

  function keydown(event: KeyboardEvent) {
    const typing = (event.target as Element)?.closest?.('input, textarea, [contenteditable="true"], .caret')
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !typing) {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y' && !typing) {
      event.preventDefault()
      redo()
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a' && !typing && !empty) {
      event.preventDefault()
      select(null)
      popup = null
      everything = true
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && everything && !typing) {
      event.preventDefault()
      everything = false
      clearAll()
      message = 'Deleted everything. Undo brings it back.'
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && selected && !typing) {
      event.preventDefault()
      deletePiece(selected)
    } else if (event.key === 'Escape' && everything) everything = false
  }

  // ----- Labels

  const labelOf = (key: string) => fig.labels[key] ?? { mode: 'none' as const, text: '' }
  function setLabel(key: string, patch: Partial<Figure['labels'][string]>, merge: string | null = null) {
    edit((f) => (f.labels[key] = { ...(f.labels[key] ?? { mode: 'none', text: '' }), ...patch }), merge)
  }
  /** How far a label (or its dimension line) is set out from its line, keeping where it's slid along it. */
  function setOffset(key: string, across: number) {
    const o = fig.moved[key] ?? [0, 0]
    const v = Math.max(-200, Math.min(200, Math.round(across)))
    edit((f) => (v || o[0] ? (f.moved[key] = [o[0], v]) : delete f.moved[key]), `move:${key}`)
  }
  function scrubOffset(event: PointerEvent, key: string) {
    if (event.button !== 0) return
    event.preventDefault()
    const el = event.currentTarget as Element
    el.setPointerCapture(event.pointerId)
    const x0 = event.clientX
    const v0 = (fig.moved[key] ?? [0, 0])[1]
    const move = (e: PointerEvent) => setOffset(key, v0 + (e.clientX - x0) / 2)
    const up = () => (el.removeEventListener('pointermove', move as EventListener), el.removeEventListener('pointerup', up))
    el.addEventListener('pointermove', move as EventListener)
    el.addEventListener('pointerup', up)
  }
  // ----- Turning the figure for print
  type ViewTurn = { key: 'turn' | 'tip' | 'roll'; by: 1 | -1; name: string; d: string; head: string; rule?: boolean }
  const VIEW_TURNS: ViewTurn[] = [
    // About the up-down axis: an arc around a flat ring.
    { key: 'turn', by: -1, name: 'Turn left 90°', d: 'M19,10.5 C19,7.5 15.5,6 12,6 C7,6 4,8.5 4,11 C4,13.5 7.5,16 12,16 H15', head: 'M13,13.8 L15.5,16 L13,18.2' },
    { key: 'turn', by: 1, name: 'Turn right 90°', d: 'M5,10.5 C5,7.5 8.5,6 12,6 C17,6 20,8.5 20,11 C20,13.5 16.5,16 12,16 H9', head: 'M11,13.8 L8.5,16 L11,18.2' },
    // About the left-right axis: an arc around an upright ring.
    { key: 'tip', by: -1, name: 'Tip forward 90°', rule: true, d: 'M13.5,19 C10.5,19 9,15.5 9,12 C9,7 11.5,4 14,4 C16.5,4 19,7.5 19,12 V15', head: 'M16.8,13 L19,15.5 L21.2,13' },
    { key: 'tip', by: 1, name: 'Tip back 90°', d: 'M13.5,5 C10.5,5 9,8.5 9,12 C9,17 11.5,20 14,20 C16.5,20 19,16.5 19,12 V9', head: 'M16.8,11 L19,8.5 L21.2,11' },
    // About the front-back axis: around the face of the page.
    { key: 'roll', by: 1, name: 'Roll left 90°', rule: true, d: 'M18.4,9 A7,7 0 1 0 19,12', head: 'M19.5,5.5 L18.6,9.2 L15,8.3' },
    { key: 'roll', by: -1, name: 'Roll right 90°', d: 'M5.6,9 A7,7 0 1 1 5,12', head: 'M4.5,5.5 L5.4,9.2 L9,8.3' },
  ]
  let turnHover = $state<ViewTurn | null>(null)
  /** The figure bar's open drop-up, if any. */
  let dockMenu = $state<'turn' | 'hidden' | null>(null)
  let dockEl = $state<HTMLElement>()
  const closeDock = (e: PointerEvent) => dockMenu && dockEl && !dockEl.contains(e.target as Node) && ((dockMenu = null), (turnHover = null))
  /** Back to the figure as first drawn: not turned, tipped or rolled, and fitting the pane. */
  function resetView() {
    if (fig.view.orient) turnTo(0)
    fitFigure()
  }
  /** The quarter turn a button makes, about a fixed axis of the page whatever way the figure is turned now. */
  function quarterOf(t: Pick<ViewTurn, 'key' | 'by'>): number[] {
    const q = QUARTER[t.key === 'turn' ? 'spin' : t.key]
    // A turn the other way is the transpose.
    return t.by > 0 ? q : [q[0], q[3], q[6], q[1], q[4], q[7], q[2], q[5], q[8]]
  }
  function turnView(key: ViewTurn['key'], by: 1 | -1) {
    const m = mulRot(quarterOf({ key, by }) as Rot, ROTATIONS[fig.view.orient] ?? ROTATIONS[0])
    turnTo(Math.max(0, rotIndex(m)))
  }
  /** Turns the figure, then moves each edge measure to the best edge for the new view: one that shows, spread from the others. */
  function turnTo(orient: number) {
    edit((f) => {
      f.view.orient = orient
      const d = drawFigure({ ...f, view: textbookView(f) }, labelSize)
      const labeled = Object.keys(f.labels).filter((k) => f.labels[k].mode !== 'none')
      for (const [from, to] of repickedEdges(d, labeled)) {
        f.labels[to] = f.labels[from]
        delete f.labels[from]
        delete f.moved[from]
      }
    })
  }
  /**
   * The arrow drawn over the figure while a turn button is hovered, in the
   * pane's pixels: a ring in space around the figure about the axis it would
   * turn on, drawn the way the figure is (so it sits in its perspective), the
   * part nearest the viewer solid and ending in an arrowhead the way it turns.
   */
  const turnArrow = $derived.by(() => {
    const t = turnHover
    if (!t || !paneW) return null
    const ax = t.key === 'turn' ? 1 : t.key === 'tip' ? 0 : 2
    const [u, v] = [0, 1, 2].filter((i) => i !== ax)
    const { lo, hi } = drawn.turnedBox
    const c = [0, 1, 2].map((i) => (lo[i] + hi[i]) / 2)
    const R = 0.5 * Math.hypot(hi[u] - lo[u], hi[v] - lo[v])
    const at3 = (th: number) => {
      const q = [...c]
      q[u] += R * Math.cos(th)
      q[v] += R * Math.sin(th)
      return q as [number, number, number]
    }
    const s = paneW / box.w
    const screen = (th: number): [number, number] => {
      const p = drawn.turnedToPage(at3(th))
      return [(p[0] - box.x) * s, (p[1] - box.y) * s]
    }
    // Which way round it turns: where the quarter turn takes the first direction across.
    const m = quarterOf(t)
    const sign = Math.sign(m[v * 3 + u]) || 1
    // Where the solid part goes: nearest the viewer, or the top of the ring when it faces the viewer.
    const V = drawn.turnedViewer
    const facing = Math.abs(V[ax]) / Math.hypot(V[0], V[1], V[2]) > 0.75
    const N = 96
    let best = 0
    let bestScore = -Infinity
    for (let i = 0; i < N; i++) {
      const th = (i / N) * 2 * Math.PI
      const score = facing ? -screen(th)[1] : Math.cos(th) * V[u] + Math.sin(th) * V[v]
      if (score > bestScore) (bestScore = score), (best = th)
    }
    const ring = Array.from({ length: N + 1 }, (_, i) => screen((i / N) * 2 * Math.PI))
    const span = 1.1
    const arc = Array.from({ length: 41 }, (_, i) => screen(best - sign * span + (sign * 2 * span * i) / 40))
    const path = (pts: [number, number][]) => 'M' + pts.map((p) => p.map((x) => x.toFixed(1)).join(',')).join(' L')
    const end = arc[arc.length - 1]
    const prev = arc[arc.length - 3]
    return { back: path(ring), front: path(arc), tip: end, dir: [end[0] - prev[0], end[1] - prev[1]] as [number, number] }
  })


  function moveLabel(key: string, offset: [number, number]) {
    edit((f) => (f.moved[key] = offset), `move:${key}`)
  }
  function setLine(id: string, kind: LineKind, on: boolean) {
    edit((f) => {
      const q = f.pieces.find((x) => x.id === id)!
      q.lines[kind] = on
      // A line turned on shows its measure straight away.
      if (on && !f.labels[`${id}:${kind}`]) f.labels[`${id}:${kind}`] = { mode: 'measure', text: '' }
    })
  }
  /** A circle shows its radius, its diameter or neither. */
  function setCircle(id: string, v: 'radius' | 'diameter' | 'none') {
    edit((f) => {
      const q = f.pieces.find((x) => x.id === id)!
      q.lines.radius = v === 'radius'
      q.lines.diameter = v === 'diameter'
      if (v !== 'none' && !f.labels[`${id}:${v}`]) f.labels[`${id}:${v}`] = { mode: 'measure', text: '' }
    })
  }

  // ----- The view

  function setView(patch: Partial<Figure['view']>) {
    edit((f) => (f.view = { ...f.view, ...patch }))
  }
  /** The 3D view's camera moved: the figure follows it, without an undo step. */
  function cameraMoved(_yaw: number, _pitch: number) {}

  // ----- Getting it out

  function picture(): SVGSVGElement | null {
    const f = drawn.frame
    if (!exportSvg || empty) return null
    const copy = exportSvg.cloneNode(true) as SVGSVGElement
    copy.setAttribute('viewBox', `${f.x} ${f.y} ${f.w} ${f.h}`)
    copy.setAttribute('width', String(Math.ceil(f.w)))
    copy.setAttribute('height', String(Math.ceil(f.h)))
    copy.removeAttribute('class')
    copy.setAttribute('role', 'img')
    copy.setAttribute('aria-label', describe(fig))
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
    if (kind === 'png') downloadPng(p, 'composite-3d-shape.png')
    else downloadSvg(p, 'composite-3d-shape.svg')
    message = `Downloaded as ${kind.toUpperCase()}.`
  }

  const pts = (list: Vec[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const AXIS_ENDS: [string, string][] = [['Left', 'Right'], ['Bottom', 'Top'], ['Front', 'Back']]
  const AXIS_NAMES = ['Left to right', 'Up and down', 'Front to back']
  const FACE_NAMES: Record<string, string> = { '0,1': 'right side', '0,-1': 'left side', '1,1': 'top', '1,-1': 'bottom', '2,1': 'back', '2,-1': 'front' }
  const faceName = (d: Dir) => FACE_NAMES[`${d.axis},${d.sign}`]
  const pieceName = (p: Piece) => (p.cut ? `${PIECE_NAMES[p.kind]} hole` : PIECE_NAMES[p.kind])
  /** A piece's own flat faces, named for choosing which one touches what it's on. */
  function ownFaceName(p: Piece, d: Dir): string {
    if (p.kind === 'prism') return d.axis === 1 ? 'Rectangle base' : d.axis === 2 ? (d.sign < 0 ? 'Front triangle' : 'Back triangle') : 'Upright side'
    if (p.kind === 'halfCylinder') return d.axis === 1 ? 'Flat side' : d.sign < 0 ? 'Front half circle' : 'Back half circle'
    if (p.kind === 'cylinder') return d.sign < 0 ? 'Bottom circle' : 'Top circle'
    if (p.kind === 'box') return ({ '0,1': 'Right', '0,-1': 'Left', '1,1': 'Top', '1,-1': 'Bottom', '2,1': 'Back', '2,-1': 'Front' } as Record<string, string>)[`${d.axis},${d.sign}`]
    return 'Base'
  }
  const opposite = (d: Dir): Dir => ({ axis: d.axis, sign: (-d.sign) as 1 | -1 })
  const hasCircle = (k: PieceKind) => LINES_FOR[k].includes('radius')
</script>

<svelte:window onkeydown={keydown} onpointerdowncapture={closeDock} />

{#snippet pieceIcon(kind: PieceKind)}
  <svg viewBox="0 0 40 32" width="40" height="32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    {#if kind === 'box'}<path d="M6,12 L24,12 L24,28 L6,28 Z M6,12 L14,5 L32,5 L24,12 M32,5 L32,21 L24,28" />
    {:else if kind === 'prism'}<path d="M6,28 L24,28 L15,12 Z M15,12 L24,4 L33,20 L24,28 M33,20 L24,28" />
    {:else if kind === 'cylinder'}<path d="M9,8 L9,25 M31,8 L31,25" /><ellipse cx="20" cy="8" rx="11" ry="4" /><path d="M9,25 A11,4 0 0 0 31,25" />
    {:else if kind === 'halfCylinder'}<path d="M5,29 A10,10 0 0 1 25,29 Z M7.9,21.9 L16.9,12.9 M25,29 L34,20 M16.9,12.9 A10,10 0 0 1 34,20" />
    {:else if kind === 'cone'}<path d="M20,4 L9,25 M20,4 L31,25 M9,25 A11,4 0 0 0 31,25" /><path d="M9,25 A11,4 0 0 1 31,25" stroke-dasharray="3 3" />
    {:else if kind === 'pyramid'}<path d="M20,4 L7,24 L25,28 Z M20,4 L33,21 L25,28" />
    {:else if kind === 'sphere'}<circle cx="20" cy="16" r="12" /><path d="M8,16 A12,4 0 0 0 32,16" />
    {:else}<path d="M8,22 A12,12 0 0 1 32,22" /><ellipse cx="20" cy="22" rx="12" ry="4" />{/if}
  </svg>
{/snippet}

{#snippet exportButtons()}
  <button class="icon-btn" aria-label="Copy image" data-tip="Copy image" disabled={empty} onclick={copyImage}><Copy size={19} /></button>
  <button class="icon-btn" aria-label="Download PNG" data-tip="Download PNG" disabled={empty} onclick={() => download('png')}><ImageDown size={19} /></button>
  <button class="icon-btn" aria-label="Download SVG" data-tip="Download SVG" disabled={empty} onclick={() => download('svg')}><FileDown size={19} /></button>
  <button class="icon-btn" aria-label="Print" data-tip="Print" disabled={empty} onclick={() => window.print()}><Printer size={19} /></button>
{/snippet}

<div class="editor" class:figure-open={figureOpen} class:resizing={!!sizing} class:settled style="--figure-share: {figureOpen ? figureShare * 100 : 0}%">
  <h1 class="visually-hidden">{name}</h1>
  <div class="work">

  <header class="bar no-print">
    <a class="home" href="/" data-tip="All {SITE_NAME}"><img src="/favicon.svg" alt="" width="22" height="22" /><span>{SITE_NAME}</span></a>
    <span class="title">{name}</span>
    <div class="actions" role="toolbar" aria-label="Shape actions">
      <button class="icon-btn" aria-label="Undo" data-tip="Undo" disabled={!past.length} onclick={undo}><Undo2 size={19} /></button>
      <button class="icon-btn" aria-label="Redo" data-tip="Redo" disabled={!future.length} onclick={redo}><Redo2 size={19} /></button>
      <button type="button" class="clear" data-tip="Clear the figure (Undo brings it back)" disabled={empty} onclick={clearAll}>Clear</button>
    </div>
    <div class="actions right" role="toolbar" aria-label="Settings and export">
      <button
        bind:this={settingsButton} type="button" class="icon-btn" class:on={popup?.kind === 'settings'} aria-label="Settings"
        data-tip="Settings: unit, labels, hidden edges, seams" aria-expanded={popup?.kind === 'settings'}
        onclick={() => {
          if (popup?.kind === 'settings') return (popup = null)
          const r = settingsButton!.getBoundingClientRect()
          popup = { kind: 'settings', at: { x: r.left + r.width / 2, y: r.bottom } }
        }}
      ><Settings size={19} /></button>
      {#if !figureOpen}
        <span class="divider"></span>
        {@render exportButtons()}
        <button type="button" class="figure-btn" disabled={empty} data-tip="The figure as it prints" onclick={() => (showFigure = true)}>
          <PanelRight size={17} /> Figure
        </button>
      {/if}
    </div>
  </header>

  <div class="main">

    <!-- The 3D view, where the figure is built. -->
    <section class="build" aria-label="3D view">
      {#if loaded}
        <Viewport3D
          bind:this={viewport} {fig} {selected} {everything} bind:hovered {doomed} {placing}
          onselect={(id, at) => select(id, at)} onplace={place} oncamera={cameraMoved} onplacingend={() => ((placing = null), (toolMenu = null))} onviewchange={() => viewTick++}
          onadd={(piece, face, at) => (popup = { kind: 'add', piece, face, at })}
          onedit={(id, patch, merge) => setPiece(id, (q) => (letGo(q, patch.size), Object.assign(q, clone(patch))), merge)}
        />
      {/if}
      {#if loaded && !empty}
        {@const [yaw, pitch] = (void viewTick, viewport?.angles() ?? [35, 28])}
        <!-- The view cube, as Tinkercad has it: turns with the camera; click a face to look from that side, drag it to turn the view. -->
        <div class="viewcube no-print">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="cube-stage" onpointerdown={grabCube} title="Drag to turn the view; click a face to look from that side">
            <div class="cube" style="transform: rotateX({-pitch}deg) rotateY({-yaw}deg)">
              {#each [['front', 'Front', 0, 0], ['back', 'Back', 180, 0], ['right', 'Right', 90, 0], ['left', 'Left', -90, 0], ['top', 'Top', 0, 89], ['bottom', 'Bottom', 0, 0]] as const as [cls, name, y, p]}
                <button type="button" class="face {cls}" disabled={cls === 'bottom'} aria-label="Look from the {name.toLowerCase()}" onclick={() => !cubeDragged && viewport?.look(y, p, false)}>{name}</button>
              {/each}
            </div>
          </div>
          <div class="cube-buttons">
            <button type="button" class="icon-btn" aria-label="Home view" data-tip="Home view" onclick={() => viewport?.look(35, 28)}><House size={17} /></button>
            <button type="button" class="icon-btn" aria-label="Fit the figure in view" data-tip="Fit the figure in view" onclick={() => viewport?.fit()}><Maximize size={17} /></button>
            <button type="button" class="icon-btn" aria-label="Zoom in" data-tip="Zoom in" onclick={() => viewport?.zoomBy(1.25)}><ZoomIn size={17} /></button>
            <button type="button" class="icon-btn" aria-label="Zoom out" data-tip="Zoom out" onclick={() => viewport?.zoomBy(0.8)}><ZoomOut size={17} /></button>
          </div>
        </div>
      {/if}
      {#if empty && loaded}
        <!-- Two ways to start, side by side: a figure already built, or one shape. Both drawn as the figure will be. -->
        <div class="start-over">
          <div class="start-head left"><h2>Start from a figure</h2><p class="note">Pick one to build on.</p></div>
          <div class="start-head right"><h2>Start with one shape</h2><p class="note">Then add more onto its faces.</p></div>
          <div class="cards left">
            {#each previews as pv (pv.preset.id)}
              <button type="button" class="card" onclick={() => startFrom(pv.preset.make)}>
                <svg viewBox="{pv.drawn.frame.x} {pv.drawn.frame.y} {pv.drawn.frame.w} {pv.drawn.frame.h}" aria-hidden="true"><Drawing3D drawn={pv.drawn} /></svg>
                <span>{pv.preset.name}</span>
              </button>
            {/each}
          </div>
          <!-- The divider runs beside the cards only, with "or" in its middle, as Netflix sets two ways to sign in side by side. -->
          <div class="or" aria-hidden="true"><span>or</span></div>
          <div class="cards right">
            {#each singles as one (one.kind)}
              <button type="button" class="card" onclick={() => startOne(one.kind)}>
                <svg viewBox="{one.drawn.frame.x} {one.drawn.frame.y} {one.drawn.frame.w} {one.drawn.frame.h}" aria-hidden="true"><Drawing3D drawn={one.drawn} /></svg>
                <span>{PIECE_NAMES[one.kind]}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
      <!-- The toolbar, floating at the bottom like the stream table's: solid or hole, the shapes (variants in a menu above), and the camera. -->
      {#if loaded && !empty}
        <div class="dockbar no-print">
          {#if toolMenu && placing}
            <!-- The picked-up shape's variants, as the stream table shows a tool's options: above the bar, while it's picked up. -->
            <div class="tool-menu" role="radiogroup" aria-label="Which shape">
              {#each FAMILIES.find((f) => f.id === toolMenu)?.kinds ?? [] as kind}
                <button
                  type="button" role="radio" class="tile" aria-checked={placing.kind === kind} class:on={placing.kind === kind} disabled={!canBe(kind)}
                  onclick={() => {
                    if (!canBe(kind) || !toolMenu || !placing) return
                    variant[toolMenu] = kind
                    placing = { ...placing, kind }
                  }}
                >{@render pieceIcon(kind)}<span>{PIECE_NAMES[kind]}</span></button>
              {/each}
            </div>
          {/if}
          <div class="toolbar" role="toolbar" aria-label="Shapes and camera">
            <div class="mode" role="radiogroup" aria-label="Add shapes as">
              <button type="button" role="radio" aria-checked={!holeMode} class:on={!holeMode} onclick={() => (holeMode = false)}>
                <svg viewBox="0 0 16 16" width="21" height="21" aria-hidden="true"><path d="M2.5,5.5 L8,2.5 L13.5,5.5 L13.5,11 L8,14 L2.5,11 Z" fill="currentColor" opacity="0.85" /><path d="M2.5,5.5 L8,8.5 L13.5,5.5 M8,8.5 V14" fill="none" stroke="#fff" stroke-width="1.1" /></svg>Solid
              </button>
              <button type="button" role="radio" aria-checked={holeMode} class:on={holeMode} disabled={empty} onclick={() => (holeMode = true)}>
                <svg viewBox="0 0 16 16" width="21" height="21" aria-hidden="true">
                  <!-- A hatched cube, as Tinkercad draws holes. -->
                  <defs><clipPath id="hole-icon-clip"><path d="M2.5,5.5 L8,2.5 L13.5,5.5 L13.5,11 L8,14 L2.5,11 Z" /></clipPath></defs>
                  <path clip-path="url(#hole-icon-clip)" d="M-2,8 L8,-2 M-2,11 L11,-2 M-2,14 L14,-2 M0,15 L15,0 M3,15 L15,3 M6,15 L15,6 M9,15 L15,9" stroke="currentColor" stroke-width="0.9" opacity="0.6" />
                  <path d="M2.5,5.5 L8,2.5 L13.5,5.5 L13.5,11 L8,14 L2.5,11 Z M2.5,5.5 L8,8.5 L13.5,5.5 M8,8.5 V14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
                </svg>Hole
              </button>
            </div>
            <span class="bar-rule"></span>
            {#each FAMILIES as fam (fam.id)}
              {@const kind = kindFor(fam)}
              <span class="tool" class:on={placing?.kind && fam.kinds.includes(placing.kind)} class:hole={holeMode}>
                <button
                  type="button" class="tool-main" disabled={!canBe(kind)} aria-label="{PIECE_NAMES[kind]}{holeMode ? ' hole' : ''}: click, then click a face"
                  aria-pressed={!!placing?.kind && fam.kinds.includes(placing.kind)} title="{PIECE_NAMES[kind]}{holeMode ? ' hole' : ''}"
                  onpointerdown={(e) => {
                    if (!canBe(kind)) return
                    // Picked up, with its variants (if it has any) shown above the bar.
                    toolMenu = fam.kinds.length > 1 ? fam.id : null
                    pickUp(kind, e)
                  }}
                >{@render pieceIcon(kind)}</button>
              </span>
            {/each}
          </div>
        </div>
      {/if}
    </section>

    <!-- The figure as it prints, unseen: copying, downloading and printing give this line drawing. -->
    {#if !empty}
      <svg bind:this={exportSvg} class="export-source" xmlns="http://www.w3.org/2000/svg" viewBox="{drawn.frame.x} {drawn.frame.y} {drawn.frame.w} {drawn.frame.h}" aria-hidden="true">
        <rect x={drawn.frame.x} y={drawn.frame.y} width={drawn.frame.w} height={drawn.frame.h} fill="#fff" />
        <Drawing3D {drawn} />
      </svg>

    {/if}
  </div>
  </div>

  <!-- The figure panel: slides out from the right, the full height, to half the window (its divider can be dragged). -->
  {#if !empty}
    {#if figureOpen}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="divider-grip no-print" style="left: {(1 - figureShare) * 100}%" title="Drag to resize" onpointerdown={grabDivider}></div>
    {/if}
    <!-- The figure panel, slid out from the right: the figure as it prints, where its measures are labeled. -->
    <aside class="figure-drawer" aria-label="The figure as it prints" aria-hidden={!figureOpen} inert={!figureOpen}>
      <!-- Its top bar, level with the editor's: getting the figure out on the left, closing on the right. -->
      <div class="drawer-head no-print">
        {@render exportButtons()}
        <span class="drawer-title">Figure</span>
        <button type="button" class="icon-btn" aria-label="Close the figure" data-tip="Close the figure" onclick={() => (showFigure = false)}><X size={19} /></button>
      </div>
      <div class="pane-body" bind:clientWidth={paneW} bind:clientHeight={paneH}>
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
        <svg
          bind:this={svg} class="page" xmlns="http://www.w3.org/2000/svg" viewBox="{box.x} {box.y} {box.w} {box.h}"
          role="application" aria-label="The figure. {describe(fig)}. Click an edge to label it, or a shape for its measures."
          class:pointing={!!hoverPart || !!paneHover} onpointermove={(e) => (panMove(e), !panGrab?.moved && paneMove(e))} onpointerdown={panDown} onpointerup={panUp} onwheel={figureWheel} onpointerleave={() => ((hoverPart = null), (paneHover = null))} onclick={paneClick}
        >
          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="#fff" />
          {#each [...drawn.hulls] as [id, h] (id)}
            {#if !hoverPart && id === paneHover}<polygon class="lit" points={pts(h)} />{/if}
          {/each}
          <Drawing3D {drawn} ghosts onmove={moveLabel} ondrag={(on) => (frozen = on ? box : null)} hot={hoverPart ?? (popup?.kind === 'label' ? popup.key : null)} />
        </svg>
        {#if turnArrow}
          {@const a = turnArrow}
          {@const n = Math.hypot(a.dir[0], a.dir[1])}
          {@const [ux, uy] = [a.dir[0] / n, a.dir[1] / n]}
          <svg class="turn-preview" aria-hidden="true" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round">
            {#if a.back}<path d={a.back} stroke-dasharray="5 6" opacity="0.45" />{/if}
            <path d={a.front} />
            <path d="M{a.tip[0] + ux * 4},{a.tip[1] + uy * 4} L{a.tip[0] - ux * 12 - uy * 7},{a.tip[1] - uy * 12 + ux * 7} L{a.tip[0] - ux * 12 + uy * 7},{a.tip[1] - uy * 12 - ux * 7} Z" fill="#2563eb" stroke-linejoin="round" />
          </svg>
        {/if}
        <!-- Turning the figure for print, a quarter at a time about each of the three axes, and which corner it's seen from. -->
        <div class="figure-dock no-print" bind:this={dockEl}>
          <div class="toolbar" role="toolbar" aria-label="Figure view">
            <!-- Turning the figure: one button, its turns in a menu above it. -->
            <div class="dock-tool">
              <button type="button" class="tool-main view-btn" class:open={dockMenu === 'turn'} aria-haspopup="menu" aria-expanded={dockMenu === 'turn'} aria-label="Turn the figure" data-tip={dockMenu ? null : 'Turn the figure'}
                onclick={() => (dockMenu = dockMenu === 'turn' ? null : 'turn')}><Rotate3d /></button>
              {#if dockMenu === 'turn'}
                <div class="dock-menu toolbar" role="menu" aria-label="Turn the figure">
                  {#each VIEW_TURNS as t (t.key + t.by)}
                    {#if t.rule}<span class="bar-rule"></span>{/if}
                    <button type="button" role="menuitem" class="tool-main view-btn" aria-label={t.name} data-tip={t.name} onclick={() => turnView(t.key, t.by)}
                      onpointerenter={() => (turnHover = t)} onpointerleave={() => (turnHover = null)} onfocus={() => (turnHover = t)} onblur={() => (turnHover = null)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d={t.d} /><path d={t.head} /></svg>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
            <!-- How hidden lines are drawn, unless a line has been set on its own. -->
            <div class="dock-tool">
              <button type="button" class="tool-main view-btn" class:open={dockMenu === 'hidden'} aria-haspopup="menu" aria-expanded={dockMenu === 'hidden'}
                aria-label="Hidden lines: {fig.hidden ? 'dashed' : 'not drawn'}" data-tip={dockMenu ? null : 'Line style'}
                onclick={() => (dockMenu = dockMenu === 'hidden' ? null : 'hidden')}><Pencil /></button>
              {#if dockMenu === 'hidden'}
                <div class="dock-menu list" role="menu" aria-label="Hidden lines">
                  <span class="menu-head">Hidden lines</span>
                  {#each [[true, 'dashed', 'Dashed'], [false, 'off', 'Not drawn']] as const as [on, icon, name]}
                    <button type="button" role="menuitemradio" aria-checked={fig.hidden === on} onclick={() => ((dockMenu = null), fig.hidden !== on && edit((f) => (f.hidden = on)))}>
                      <span class="tick">{fig.hidden === on ? '✓' : ''}</span>{@render lineIcon(icon)}<span>{name}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
            <span class="bar-rule"></span>
            <button type="button" class="tool-main view-btn" aria-label="Reset the view" data-tip="Reset view" onclick={resetView}><House /></button>
            <button type="button" class="tool-main view-btn" aria-label="Zoom out" data-tip="Zoom out" onclick={() => zoomFigure(1 / 1.25)}><ZoomOut /></button>
            <button type="button" class="tool-main view-btn" aria-label="Fit the figure" data-tip="Fit" onclick={fitFigure}><Maximize /></button>
            <button type="button" class="tool-main view-btn" aria-label="Zoom in" data-tip="Zoom in" onclick={() => zoomFigure(1.25)}><ZoomIn /></button>
          </div>
        </div>
      </div>
      <p class="pane-how">Click a shape to choose its measures · click an edge to label it · drag a label to move it</p>
    </aside>
  {/if}
  {#if message}<p class="message no-print" aria-live="polite">{message}</p>{/if}
</div>

<!-- A selected piece's popup: its measures, turns, where it sits, its lines. -->
{#if popup?.kind === 'piece' && selected && pieceOf(selected)}
  {@const p = pieceOf(selected)!}
  {@const pl = placed.get(p.id)}
  {@const parent = p.on ? placed.get(p.on.parent) : null}
  <Popover focus={false} at={popup.at} side="left" around={pieceBox} movable title={pieceName(p)} bind:moved={pieceMoved} label={pieceName(p)} onclose={() => select(null)}>
    {@const fits = fittable(fig, p.id)}
    <div class="sizes">
      {#each SIZE_FIELDS[p.kind] as [key, label] (key)}
        {#if !(p.cut && depthKey(p.kind) === key && p.through)}
          <NumberField
            id="size-{key}" label={p.cut && depthKey(p.kind) === key ? 'Depth' : label} value={pl?.piece.size[key] ?? p.size[key] ?? 1} unit={fig.unit.trim()}
            onvalue={(v) => setSize(p.id, key, v)}
            mode={fits[key] === undefined ? null : p.fill?.[key] ? 'fill' : 'fixed'}
            onmode={(m) => setFill(p.id, key, m === 'fill')}
            onpreview={(m) => viewport?.preview(m === null ? null : { ...p, fill: { ...(p.fill ?? {}), [key]: m === 'fill' } })}
          />
        {/if}
      {/each}
    </div>
    {#if p.kind === 'prism'}
      <div class="group">
        <span class="name" id="tri-kind">Triangle</span>
        <div class="segmented" role="radiogroup" aria-labelledby="tri-kind">
          {#each [['isosceles', 'Isosceles'], ['right', 'Right']] as const as [v, t]}
            <button type="button" role="radio" aria-checked={p.triangle === v} class:on={p.triangle === v} onclick={() => setPiece(p.id, (q) => (q.triangle = v))}>{t}</button>
          {/each}
        </div>
      </div>
    {/if}
    {#if p.cut && parent && p.on && cutCanGoThrough(p.kind) && canGoThrough(parent, p.on.face)}
      <div class="group">
        <span class="name" id="cut-depth">Goes</span>
        <div class="segmented" role="radiogroup" aria-labelledby="cut-depth">
          <button type="button" role="radio" aria-checked={p.through} class:on={p.through} onclick={() => setPiece(p.id, (q) => (q.through = true))}>All the way through</button>
          <button type="button" role="radio" aria-checked={!p.through} class:on={!p.through} onclick={() => setPiece(p.id, (q) => (q.through = false))}>To a depth</button>
        </div>
      </div>
    {/if}
    {#if pl?.loose}<p class="problem">Its parent was turned, so the face it was on is gone. Delete it, or turn its parent back.</p>{/if}
    <button
      type="button" class="delete" onmouseenter={() => (doomed = withAttached(fig.pieces, p.id))} onmouseleave={() => (doomed = [])}
      onfocus={() => (doomed = withAttached(fig.pieces, p.id))} onblur={() => (doomed = [])} onclick={() => deletePiece(p.id)}
    ><Trash2 size={15} /> Delete{withAttached(fig.pieces, p.id).length > 1 ? ` with ${withAttached(fig.pieces, p.id).length - 1} attached` : ''}</button>
  </Popover>
{/if}

<!-- Adding a shape onto a face, from its +. -->
{#if popup?.kind === 'add'}
  <Popover at={popup.at} side="left" around={addBox} label="Add a shape onto this face" onclose={() => ((popup = null), viewport?.preview(null))}>
    <div class="pop-head"><span>Onto this {faceName(popup.face)}</span></div>
    <div class="add-list">
      {#each PIECE_KINDS as kind}
        <button
          type="button" class="add-option" onclick={() => addOnto(kind, false)}
          onpointerenter={() => previewOnto(kind, false)} onpointerleave={() => viewport?.preview(null)} onfocus={() => previewOnto(kind, false)} onblur={() => viewport?.preview(null)}
        >{@render pieceIcon(kind)}<span>{PIECE_NAMES[kind]}</span></button>
      {/each}
    </div>
    <div class="pop-head cut-head"><span>As a hole in it</span></div>
    <div class="add-list">
      {#each CUT_KINDS as kind}
        <button
          type="button" class="add-option" onclick={() => addOnto(kind, true)}
          onpointerenter={() => previewOnto(kind, true)} onpointerleave={() => viewport?.preview(null)} onfocus={() => previewOnto(kind, true)} onblur={() => viewport?.preview(null)}
        >{@render pieceIcon(kind)}<span>{PIECE_NAMES[kind]}</span></button>
      {/each}
    </div>
  </Popover>
{/if}

<!-- A shape's measures in the figure: its edges, and its height, radius or diameter and slant lines. -->
{#if popup?.kind === 'measures' && pieceOf(popup.piece)}
  {@const p = pieceOf(popup.piece)!}
  {@const edges = drawn.labelables.filter((l) => l.key.startsWith('e:') && l.key.includes(`${p.id}#`) && !l.hidden)}
  {@const edgesOn = edges.some((l) => fig.labels[l.key]?.mode && fig.labels[l.key].mode !== 'none')}
  <Popover at={popup.at} side="left" movable title="{pieceName(p)} measures" bind:moved={cardMoved} label="Measures for this shape" onclose={() => (popup = null)}>
    <div class="group checks">
      {#if edges.length}
        <label class="check"><input type="checkbox" checked={edgesOn} onchange={(e) => {
          const on = e.currentTarget.checked
          edit((f) => {
            for (const l of edges) {
              if (on && l.square) f.labels[l.key] = { ...(f.labels[l.key] ?? { text: '' }), mode: 'measure' }
              else if (!on) delete f.labels[l.key]
            }
          })
        }} /> Edge lengths</label>
      {/if}
      {#each LINES_FOR[p.kind].filter((k) => k !== 'radius' && k !== 'diameter') as kind (kind)}
        <label class="check"><input type="checkbox" checked={!!p.lines[kind]} onchange={(e) => setLine(p.id, kind, e.currentTarget.checked)} /> {LINE_NAMES[kind]}</label>
      {/each}
    </div>
    {#if hasCircle(p.kind)}
      <div class="group">
        <span class="name" id="circle-measure">Circle</span>
        <div class="segmented small" role="radiogroup" aria-labelledby="circle-measure">
          {#each [['radius', 'Radius'], ['diameter', 'Diameter'], ['none', 'Neither']] as const as [v, t]}
            {@const now = p.lines.radius ? 'radius' : p.lines.diameter ? 'diameter' : 'none'}
            <button type="button" role="radio" aria-checked={now === v} class:on={now === v} onclick={() => setCircle(p.id, v)}>{t}</button>
          {/each}
        </div>
      </div>
    {/if}
    <p class="note-small">Click a line in the figure to write a letter instead, or set it on a dimension line.</p>
  </Popover>
{/if}

{#snippet lineIcon(kind: 'edge' | 'line' | 'dashed' | 'off')}
  <svg viewBox="0 0 22 16" width="22" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6">
    {#if kind === 'edge'}<text x="11" y="8" text-anchor="middle" class="ico-a">a</text><path d="M2,13 H20" stroke-width="2.4" />
    {:else if kind === 'line'}<text x="11" y="8" text-anchor="middle" class="ico-a">a</text><path d="M2,10.5 V15.5 M20,10.5 V15.5 M2.5,13 H19.5" stroke-width="1.2" /><path d="M5.5,11 L2.5,13 L5.5,15 M16.5,11 L19.5,13 L16.5,15" stroke-width="1.2" fill="currentColor" stroke-linejoin="round" />
    {:else if kind === 'dashed'}<path d="M2,8 H20" stroke-dasharray="3.2 2.6" stroke-width="2" />
    {:else}<path d="M2,8 H20" stroke-dasharray="1 2.6" stroke-width="1.4" opacity="0.35" />{/if}
  </svg>
{/snippet}

{#snippet hiddenSwitch(keys: string[])}
  {#if keys.length}
    {@const off = keys.every((k) => fig.unseen[k] ?? !fig.hidden)}
    <div class="group">
      <span class="name" id="pop-hidden">Hidden line</span>
      <div class="segmented icons" role="radiogroup" aria-labelledby="pop-hidden">
        <button type="button" role="radio" aria-checked={!off} class:on={!off} title="Drawn dashed" onclick={() => edit((f) => keys.forEach((k) => (f.hidden ? delete f.unseen[k] : (f.unseen[k] = false))))}>{@render lineIcon('dashed')}Dashed</button>
        <button type="button" role="radio" aria-checked={off} class:on={off} title="Not drawn" onclick={() => edit((f) => keys.forEach((k) => (f.hidden ? (f.unseen[k] = true) : delete f.unseen[k])))}>{@render lineIcon('off')}Hidden</button>
      </div>
    </div>
  {/if}
{/snippet}

<!-- Labeling an edge or a line. -->
{#if popup?.kind === 'label'}
  {@const key = popup.key}
  {@const l = drawn.labelables.find((x) => x.key === key)}
  {#if key.startsWith('h:')}
    <Popover at={popup.at} around={popup.around ?? null} side={popup.side ?? 'below'} movable title="Hidden line" bind:moved={cardMoved} label="How this hidden line is drawn" onclose={() => (popup = null)}>
      {@render hiddenSwitch([key])}
    </Popover>
  {:else if l}
    {@const lab = labelOf(key)}
    <Popover at={popup.at} around={popup.around ?? null} side={popup.side ?? 'below'} movable title="{l.name} · {measureText(l.measure)}{unitText}" bind:moved={cardMoved} label="Label for this part of the shape" onclose={() => (popup = null)}>
      <div class="group">
        <span class="name" id="pop-label">Label</span>
        <LabelPicker id="pop-label" value={lab.mode} onpick={(v) => setLabel(key, { mode: v })} />
        {#if lab.mode === 'text'}<MathInput id="pop-text" aria-label="Label text" placeholder="x" bind:value={() => lab.text, (v) => setLabel(key, { text: v }, `text:${key}`)} />{/if}
      </div>
      {#if l.length && !l.dimension && lab.mode !== 'none'}
        {@const style = lab.style ?? fig.labelStyle}
        <div class="group">
          <span class="name" id="pop-style">Written</span>
          <div class="segmented icons" role="radiogroup" aria-labelledby="pop-style">
            <button type="button" role="radio" aria-checked={style === 'beside'} class:on={style === 'beside'} title="Beside the edge" onclick={() => setLabel(key, { style: 'beside' })}>{@render lineIcon('edge')}Edge</button>
            <button type="button" role="radio" aria-checked={style === 'dimension'} class:on={style === 'dimension'} title="On a dimension line" onclick={() => setLabel(key, { style: 'dimension' })}>{@render lineIcon('line')}Line</button>
          </div>
        </div>
      {/if}
      {@render hiddenSwitch(hiddenKeysOn(drawn, l))}
      {#if lab.mode !== 'none' || l.dimension}
        {@const o = fig.moved[key] ?? [0, 0]}
        <div class="offset-row">
          <!-- Figma's way: drag the name sideways to scrub the value. Dragging the label on the figure changes it too. -->
          <label for="pop-offset" class="scrub" onpointerdown={(e) => scrubOffset(e, key)}>Offset</label>
          <input
            id="pop-offset" class="offset-input" type="text" inputmode="decimal" autocomplete="off" value={Math.round(o[1])}
            onchange={(e) => { const v = Number(e.currentTarget.value); if (Number.isFinite(v)) setOffset(key, v) }}
          />
          <button type="button" class="icon-btn reset" title="Reset" aria-label="Reset the offset" disabled={!fig.moved[key]} onclick={() => edit((f) => delete f.moved[key])}><RotateCcw size={14} /></button>
        </div>
      {/if}
    </Popover>
  {/if}
{/if}

<!-- The figure's settings. -->
{#if popup?.kind === 'settings'}
  <Popover at={popup.at} owner={settingsButton} label="Settings" onclose={() => (popup = null)}>
    <div class="group">
      <label class="name" for="unit">Unit</label>
      <input id="unit" class="unit-input" list="units" value={fig.unit} maxlength="12" oninput={(e) => edit((f) => (f.unit = e.currentTarget.value), 'unit')} />
      <datalist id="units">{#each UNITS.filter(Boolean) as u}<option value={u}></option>{/each}</datalist>
    </div>
    <div class="group">
      <span class="name" id="label-size">Label size</span>
      <div class="label-size" role="radiogroup" aria-labelledby="label-size">
        {#each Object.entries(LABEL_SIZES) as [v, t]}
          <button type="button" role="radio" class="size" class:on={labelSize === v} aria-checked={labelSize === v} aria-label={t} data-tip={t}
            style="font-size: {GLYPH[v as LabelSize]}px" onclick={() => (labelSize = v as LabelSize)}>A</button>
        {/each}
      </div>
    </div>
    <div class="group">
      <span class="name" id="len-style">Lengths are written</span>
      <div class="segmented icons" role="radiogroup" aria-labelledby="len-style">
        <button type="button" role="radio" aria-checked={fig.labelStyle === 'beside'} class:on={fig.labelStyle === 'beside'} title="Beside the edges" onclick={() => edit((f) => (f.labelStyle = 'beside'))}>{@render lineIcon('edge')}Edge</button>
        <button type="button" role="radio" aria-checked={fig.labelStyle === 'dimension'} class:on={fig.labelStyle === 'dimension'} title="On dimension lines" onclick={() => edit((f) => (f.labelStyle = 'dimension'))}>{@render lineIcon('line')}Line</button>
      </div>
    </div>
    <div class="group checks">
      <span class="name">Overall measures</span>
      {#each [['height', 'Overall height'], ['width', 'Overall width'], ['depth', 'Overall depth']] as const as [k, t]}
        <label class="check"><input type="checkbox" checked={!!fig.overall[k]} onchange={(e) => {
          const on = e.currentTarget.checked
          edit((f) => {
            f.overall[k] = on
            if (on && !f.labels[`all:${k}`]) f.labels[`all:${k}`] = { mode: 'measure', text: '' }
          })
        }} /> {t}</label>
      {/each}
    </div>
    <div class="group checks">
      <span class="name">Lines</span>
      <label class="check"><input type="checkbox" checked={fig.seams} onchange={(e) => edit((f) => (f.seams = e.currentTarget.checked))} /> Seams where flush pieces meet</label>
      {#if canCubes}
        <label class="check"><input type="checkbox" checked={fig.cubes} onchange={(e) => edit((f) => (f.cubes = e.currentTarget.checked))} /> Unit cubes</label>
      {/if}
    </div>
  </Popover>
{/if}

<style>
  /* The editor and, slid out beside it, the figure panel: half the window each when it's open. */
  /* The editor and the figure panel side by side; the panel slides out by growing from nothing to its share of the window. */
  .editor { position: relative; display: flex; height: 100dvh; overflow: hidden; background: var(--bg); }
  .work { flex: 1 1 0; }
  .figure-drawer { flex: none; width: var(--figure-share); transition: width 0.32s cubic-bezier(0.2, 0.7, 0.2, 1); }
  .editor.resizing { cursor: col-resize; user-select: none; }
  .editor.resizing .figure-drawer, .editor:not(.settled) .figure-drawer { transition: none; }
  .divider-grip { position: absolute; z-index: 7; top: 0; bottom: 0; width: 10px; margin-left: -5px; cursor: col-resize; }
  .divider-grip:hover, .resizing .divider-grip { background: linear-gradient(to right, transparent 4px, var(--blue) 4px, var(--blue) 6px, transparent 6px); }
  /* Tooltips on buttons at the right edge open leftward, so they stay on the screen. */
  .actions.right :global([data-tip]:hover::after), .drawer-head :global(.icon-btn:last-child[data-tip]:hover::after), .figure-btn[data-tip]:hover::after {
    left: auto; right: 0; transform: none;
  }
  /* The figure panel's first button sits at its left edge, which clips: its tip opens rightward. */
  .drawer-head :global(.icon-btn:first-child[data-tip]:hover::after), .drawer-head :global(.icon-btn:first-child[data-tip]:focus-visible::after) {
    left: 0; transform: none;
  }
  .editor.figure-open { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .work { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .figure-drawer > :global(*) { min-width: 22rem; }
  .bar { position: relative; z-index: 6; display: flex; align-items: center; gap: 0.6rem; min-height: var(--bar-h, 3.4rem); padding: 0.5rem 0.75rem; background: #fff; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .home { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.6rem; border-radius: 10px; color: var(--ink); font-weight: 800; text-decoration: none; white-space: nowrap; }
  .home:hover { background: var(--blue-soft); }
  .title { font-weight: 700; color: var(--muted); white-space: nowrap; }
  .actions { display: flex; align-items: center; gap: 2px; }
  .actions.right { margin-left: auto; }
  .divider { width: 1px; height: 1.6rem; background: var(--border); margin: 0 0.3rem; flex: none; }
  .clear { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.65rem; border: 0; border-radius: 10px; background: none; color: var(--ink); font-size: 0.85rem; font-weight: 600; }
  .clear:hover:not(:disabled), .clear:focus-visible { background: var(--blue-soft); color: var(--blue-dark); }
  .clear:disabled { opacity: 0.45; cursor: default; }
  .icon-btn.on { background: var(--blue-soft); color: var(--blue-dark); }
  .name { font-size: 0.75rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .offset-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.86rem; font-weight: 600; }
  .scrub { flex: 1; cursor: ew-resize; user-select: none; touch-action: none; }
  .offset-input { width: 4rem; padding: 0.3rem 0.5rem; text-align: right; }
  .reset { display: grid; place-items: center; width: 1.8rem; height: 1.8rem; padding: 0; border: 0; border-radius: 7px; background: none; color: var(--muted); }
  .reset:hover:not(:disabled) { background: var(--blue-soft); color: var(--blue-dark); }
  .reset:disabled { opacity: 0.35; cursor: default; }
  .ico-a { fill: currentColor; stroke: none; font: italic 600 10px 'Times New Roman', Times, serif; }
  .segmented.icons button { display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; white-space: nowrap; }
  .segmented.small button { padding: 0.28rem 0.55rem; font-size: 0.78rem; }

  /* The figure panel is a third column that opens beside the 3D view, pushing it over (so the figure being built stays centered in what's left). */
  .main { position: relative; flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); overflow: hidden; }
  /* The view cube, top left of the 3D view, drawn as a CSS cube turned to match the camera. */
  .viewcube { position: absolute; z-index: 3; top: 0.9rem; left: 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .cube-stage { width: 84px; height: 84px; display: grid; place-items: center; cursor: grab; touch-action: none; }
  .cube { position: relative; width: 52px; height: 52px; transform-style: preserve-3d; }
  .face {
    position: absolute; inset: 0; display: grid; place-items: center; padding: 0; border: 1px solid #94a3b8; background: rgb(241 245 249 / 96%);
    color: #475569; font: 700 9.5px system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.03em; backface-visibility: hidden; cursor: pointer;
  }
  .face:hover:not(:disabled) { background: var(--blue-soft); color: var(--blue-dark); border-color: var(--blue); }
  .face:disabled { cursor: default; }
  .face.front { transform: translateZ(26px); }
  .face.back { transform: rotateY(180deg) translateZ(26px); }
  .face.right { transform: rotateY(90deg) translateZ(26px); }
  .face.left { transform: rotateY(-90deg) translateZ(26px); }
  .face.top { transform: rotateX(90deg) translateZ(26px); }
  .face.bottom { transform: rotateX(-90deg) translateZ(26px); }
  .cube-buttons { display: flex; flex-direction: column; gap: 2px; padding: 3px; border: 1px solid var(--border); border-radius: 12px; background: rgb(255 255 255 / 95%); box-shadow: 0 4px 14px -6px rgb(17 24 39 / 25%); }
  /* The toolbar, floating at the bottom middle of the 3D view. */
  .dockbar { position: absolute; z-index: 3; left: 50%; bottom: 1.8rem; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .toolbar {
    display: flex; align-items: center; gap: 3px; padding: 5px; border: 1px solid var(--border); border-radius: 16px; background: rgb(255 255 255 / 96%);
    box-shadow: 0 8px 24px -10px rgb(17 24 39 / 35%);
  }
  .bar-rule { width: 1px; height: 2rem; margin: 0 0.3rem; background: var(--border); }
  .mode { display: flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--bg); }
  .mode button {
    display: flex; align-items: center; gap: 0.4rem; height: 2.75rem; padding: 0 0.75rem; border: 0; border-radius: 9px; background: none;
    color: var(--muted); font-size: 0.82rem; font-weight: 700;
  }
  .mode button.on { background: #fff; color: var(--blue-dark); box-shadow: 0 1px 2px rgb(16 24 40 / 12%); }
  .mode button:disabled { opacity: 0.45; cursor: default; }
  .tool { position: relative; display: flex; align-items: center; border-radius: 12px; }
  .tool-main { display: grid; place-items: center; width: 3rem; height: 3rem; padding: 0; border: 0; border-radius: 12px; background: none; color: var(--ink); cursor: pointer; touch-action: none; }
  .tool-main :global(svg) { width: 30px; height: 26px; }
  .tool-main.fit :global(svg), .tool-main :global(.lucide) { width: 22px; height: 22px; }
  .tool-main:hover:not(:disabled) { background: var(--bg); }
  .tool-main:disabled { opacity: 0.3; cursor: default; }
  .tool.on .tool-main { background: var(--blue); color: #fff; }
  .tool.hole .tool-main :global(svg) { stroke-dasharray: 3 2; }
  .tool-menu {
    display: flex; gap: 6px; padding: 0.45rem; border: 1px solid var(--border); border-radius: 16px; background: rgb(255 255 255 / 96%);
    box-shadow: 0 10px 28px -10px rgb(17 24 39 / 35%);
  }
  .tile {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem; width: 6rem; height: 4.6rem; border: 0;
    border-radius: 12px; background: none; color: var(--muted); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em;
  }
  .tile :global(svg) { width: 34px; height: 28px; }
  .tile:hover:not(:disabled) { background: var(--bg); color: var(--ink); }
  .tile.on { background: var(--blue-soft); color: var(--blue-dark); box-shadow: inset 0 0 0 2px var(--blue); }
  .tile:disabled { opacity: 0.35; cursor: default; }
  .figure-drawer { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; background: #fff; }
  .figure-open .figure-drawer { border-left: 1px solid var(--border); }
  .figure-btn {
    display: inline-flex; align-items: center; gap: 0.4rem; margin-left: 0.4rem; padding: 0.45rem 0.85rem; border: 0; border-radius: 10px;
    background: var(--blue); color: #fff; font-weight: 700; font-size: 0.88rem; white-space: nowrap;
  }
  .figure-btn:hover:not(:disabled) { background: var(--blue-dark); }
  .figure-btn:disabled { opacity: 0.45; cursor: default; }
  /* As tall as the editor's top bar, so the divider runs straight up through both. */
  .drawer-head { display: flex; align-items: center; gap: 2px; min-height: var(--bar-h, 3.4rem); padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .drawer-title { flex: 1; text-align: center; font-weight: 800; }
  .pane-body { position: relative; flex: 1; min-height: 0; }
  .page { position: absolute; inset: 0; display: block; width: 100%; height: 100%; user-select: none; -webkit-user-select: none; }
  .page.pointing { cursor: pointer; }
  /* A measure's number is clicked for its card (and can still be dragged), so it shows the pointer, not the move cursor. */
  .page :global(g[role='button']) { cursor: pointer !important; }
  .lit { fill: rgb(37 99 235 / 8%); stroke: none; }
  .turn-preview { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
  .dock-tool { position: relative; display: flex; }
  .view-btn.open { background: var(--bg); color: var(--blue-dark); }
  .dock-menu { position: absolute; z-index: 4; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%); }
  .dock-menu.list {
    display: flex; flex-direction: column; min-width: 11rem; padding: 0.3rem; border: 1px solid var(--border); border-radius: 12px; background: #fff;
    box-shadow: 0 8px 24px -10px rgb(17 24 39 / 35%);
  }
  .menu-head { padding: 0.3rem 0.55rem 0.2rem; color: var(--muted); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .dock-menu.list button { display: flex; align-items: center; gap: 0.45rem; padding: 0.4rem 0.55rem; border: 0; border-radius: 8px; background: none; color: var(--ink); font-size: 0.84rem; font-weight: 600; text-align: left; white-space: nowrap; }
  .dock-menu.list button:hover { background: var(--bg); }
  .dock-menu .tick { width: 0.8rem; color: var(--blue-dark); }
  .figure-dock { position: absolute; z-index: 2; left: 50%; bottom: 0.9rem; transform: translateX(-50%); }
  .view-btn { width: 2.6rem; height: 2.6rem; }
  .view-btn :global(svg) { width: 22px !important; height: 22px !important; }
  .pane-how { margin: 0; padding: 0 0.9rem 0.6rem; color: var(--muted); font-size: 0.76rem; text-align: center; }
  .note-small { margin: 0; color: var(--muted); font-size: 0.78rem; max-width: 15rem; }

  .build { position: relative; min-width: 0; background: linear-gradient(#f8fafc, #eef2f7); }
  .start-over {
    position: absolute; inset: 0; z-index: 1; display: grid; grid-template-columns: minmax(0, 30rem) auto minmax(0, 30rem);
    grid-template-areas: 'lhead . rhead' 'lcards or rcards'; justify-content: center; align-content: start; column-gap: 2.5rem; row-gap: 0;
    padding: 3rem 3.5rem; overflow-y: auto; background: var(--bg);
  }
  .start-head { display: flex; flex-direction: column; gap: 0.3rem; }
  .start-head.left { grid-area: lhead; }
  .start-head.right { grid-area: rhead; }
  .cards.left { grid-area: lcards; }
  .cards.right { grid-area: rcards; align-self: start; }
  .or { grid-area: or; position: relative; display: grid; place-items: center; width: 2.4rem; }
  .or::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: var(--border); }
  .or span {
    position: relative; display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 1px solid var(--border); border-radius: 50%;
    background: var(--bg); color: var(--muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  }
  @media (max-width: 900px) {
    .start-over { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'lhead' 'lcards' 'or' 'rhead' 'rcards'; row-gap: 1rem; padding: 1.5rem 1rem; }
    .or { width: auto; height: 2.4rem; }
    .or::before { top: 50%; bottom: auto; left: 0; right: 0; width: auto; height: 1px; }
  }
  .start-over h2 { margin: 0; font-size: 1.15rem; font-weight: 800; }
  .start-over .note { margin: 0 0 0.7rem; color: var(--muted); font-size: 0.88rem; }
  .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; }
  .card {
    display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 0.6rem 0.5rem 0.55rem; border: 1.5px solid var(--border);
    border-radius: 14px; background: #fff; color: var(--ink); font-size: 0.84rem; font-weight: 600; transition: border-color 0.15s, background 0.15s, transform 0.15s;
  }
  .card:hover, .card:focus-visible { border-color: var(--blue-border); background: var(--blue-soft); transform: translateY(-1px); }
  .card svg { width: 100%; height: 6.5rem; }
  .add-list { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; }
  .cut-head { margin-top: 0.4rem; }
  .add-option {
    display: flex; align-items: center; gap: 0.5rem; padding: 0.2rem 0.6rem 0.2rem 0.3rem; border: 1.5px solid var(--border); border-radius: 10px;
    background: #fff; font-weight: 600; font-size: 0.84rem; text-align: left;
  }
  .add-option { min-width: 0; gap: 0.35rem; padding: 0.2rem 0.4rem 0.2rem 0.25rem; font-size: 0.8rem; line-height: 1.15; }
  /* The + menu's panel is a little wider than other popups', so each shape's name fits on its button. */
  :global(.panel:has(.add-list)) { width: 19.5rem; }
  .add-option svg { flex: none; width: 28px; height: 24px; color: var(--blue-dark); }
  .add-option:hover, .add-option:focus-visible { border-color: var(--blue-border); background: var(--blue-soft); }

  .export-source { position: absolute; width: 0; height: 0; overflow: hidden; visibility: hidden; pointer-events: none; }
  .message {
    position: absolute; z-index: 3; top: 3.6rem; left: 50%; transform: translateX(-50%); margin: 0; padding: 0.4rem 0.8rem; border-radius: 10px;
    background: rgb(17 24 39 / 82%); color: #fff; font-size: 0.84rem; pointer-events: none;
  }

  .sizes { display: grid; gap: 0.45rem; }
  .line-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.65rem; font-size: 0.82rem; border-radius: 9px; }
  .line-btn { align-self: flex-start; }
  .checks { display: flex; flex-direction: column; gap: 0.3rem; }
  .check { display: flex; align-items: center; gap: 0.45rem; font-size: 0.86rem; font-weight: 500; }
  .problem { margin: 0; color: var(--red); font-weight: 600; font-size: 0.82rem; max-width: 17rem; }
  .delete {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.45rem 0.7rem; border: 1.5px solid var(--border);
    border-radius: 10px; background: #fff; color: var(--red); font-weight: 600; font-size: 0.85rem;
  }
  .delete:hover, .delete:focus-visible { border-color: var(--red); background: var(--red-soft); }
  .unit-input { width: 100%; padding: 0.4rem 0.55rem; border: 1.5px solid var(--border); border-radius: 9px; font: inherit; }
  .label-size { display: flex; gap: 2px; }
  .size { width: 2.15rem; height: 2.15rem; display: grid; place-items: center; border: 0; border-radius: 8px; background: none; color: var(--muted); font-family: 'Times New Roman', Times, serif; }
  .size:hover, .size.on { background: var(--blue-soft); color: var(--blue-dark); }

  /* Narrow screens: the shapes across the top, the 3D view, then the figure. */
  @media (max-width: 900px) {
    .main { grid-template-columns: 1fr; grid-template-rows: auto minmax(22rem, 1fr); overflow-y: auto; }
    .title { display: none; }
  }

  @media print {
    .editor { height: auto; display: block; background: #fff; }
    .main { display: block; }
    .no-print, .build { display: none !important; }
  }
</style>
