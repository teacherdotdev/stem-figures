<script lang="ts" module>
  /** What's being placed: a new shape from the palette, or a piece already in the figure being moved. */
  export type Placing = { kind: import('./model').PieceKind; cut: boolean; moving: string | null }
</script>

<script lang="ts">
  // The 3D view the figure is built in, like Tinkercad: the pieces shaded,
  // a camera that orbits freely (drag, or right-drag to pan, scroll to zoom),
  // and pieces placed by dragging. While a shape is being placed (dragged in
  // from the palette, or a piece dragged to a new spot), a see-through copy of
  // it follows the pointer, snapped onto the face underneath (see snap.ts).
  // Holes show as see-through grey, as Tinkercad shows them; the figure
  // pane draws the shape with them taken away.
  //
  // Space here is the model's (x right, y up, z back); three.js has z toward
  // the viewer, so everything sits in a group mirrored along z.
  import { onMount, untrack } from 'svelte'
  import type * as T from 'three'
  import type { OrbitControls as OC } from 'three/examples/jsm/controls/OrbitControls.js'
  import { ABOUT, faceAxes, newPiece, placeAll, touchingFace, turned, type Dir, type Figure, type Piece, type Placed, type V3 } from './model'
  import { footprintOf, resizeCorner, resizeHeight, slide, type Footprint } from './handles'
  import { measureText } from './draw'
  import { pieceAt } from './snap'
  import { halfRing, solidOf, triangleOf } from './solid'

  let {
    fig, selected, everything = false, hovered = $bindable(null), doomed, placing, onselect, onplace, oncamera, onplacingend, onviewchange, onadd, onedit,
  }: {
    fig: Figure
    selected: string | null
    /** Every piece is selected (Cmd/Ctrl+A): all outlined, no handles. */
    everything?: boolean
    hovered?: string | null
    doomed: string[]
    placing: Placing | null
    onselect: (id: string | null, at: { x: number; y: number } | null) => void
    /** A shape dropped: a new piece, or a moved one with its new place. */
    onplace: (piece: Piece, at: { x: number; y: number }) => void
    oncamera: (yaw: number, pitch: number) => void
    onplacingend: () => void
    /** The camera moved at all (turning, moving, zooming), so anything placed by the screen should follow. */
    onviewchange?: () => void
    /** A face's + was clicked: add a piece onto that face. `at` is the + on the screen. */
    onadd: (piece: string, face: Dir, at: { x: number; y: number }) => void
    /** The selected piece resized or slid with its handles; changes sharing `merge` undo as one. */
    onedit: (id: string, patch: Partial<Pick<Piece, 'size' | 'on' | 'turn'>>, merge: string) => void
  } = $props()

  let host = $state<HTMLDivElement>()
  const current = $derived(placing)
  let hint = $state('')
  let ready = $state(false)
  /** The flat face under the pointer, lit, with a + to add a piece onto it. */
  let hoverFace = $state.raw<{ piece: string; face: Dir } | null>(null)
  /** The face whose + the pointer is on: the only face lit, so it's clear which face the + adds to. */
  let plusFace = $state.raw<{ piece: string; face: Dir } | null>(null)
  /** The +s showing: on the hovered face, and on each face of the selected piece that faces the camera (as the 2D editor shows them on a selected piece's sides). */
  let pluses = $state.raw<{ key: string; piece: string; face: Dir; x: number; y: number; hot: boolean }[]>([])

  const SELECT_BLUE = '#2b9bf4'
  const DELETE_RED = '#dc2626'
  const OUTLINE_PX = 3
  const COLORS = ['#60a5fa', '#f59e0b', '#34d399', '#f472b6', '#a78bfa', '#fb7185', '#2dd4bf', '#facc15']
  const toSpace = (v: T.Vector3): V3 => [v.x, v.y, -v.z]

  // Filled in once three.js has loaded (it can't run on the server).
  let three: typeof T
  let renderer: T.WebGLRenderer
  let scene: T.Scene
  let camera: T.OrthographicCamera
  let controls: OC
  let root: T.Group
  let ghostGroup: T.Group
  let faceGlow: T.Mesh | null = null
  /** three.js's wide lines, loaded with it. */
  let wide: {
    LineSegments2: typeof import('three/examples/jsm/lines/LineSegments2.js').LineSegments2
    LineSegmentsGeometry: typeof import('three/examples/jsm/lines/LineSegmentsGeometry.js').LineSegmentsGeometry
    LineMaterial: typeof import('three/examples/jsm/lines/LineMaterial.js').LineMaterial
  } | null = null
  let grid: T.GridHelper
  const meshes = new Map<string, T.Mesh>()
  let raf = 0
  let dirty = true
  const draw = () => (dirty = true)

  /** The camera's turn and tip, the way the figure pane's camera view reads them. */
  function cameraAngles(): [number, number] {
    const d = camera.position.clone().sub(controls.target).normalize()
    const V: V3 = [d.x, d.y, -d.z]
    return [Math.round((Math.atan2(V[0], -V[2]) * 180) / Math.PI), Math.round((Math.asin(Math.max(-1, Math.min(1, V[1]))) * 180) / Math.PI)]
  }
  /** Points the camera at the figure from a turn and a tip, fitting it in view. */
  export function look(yaw: number, pitch: number, fit = true) {
    if (!camera) return
    const y = (yaw * Math.PI) / 180
    const p = (pitch * Math.PI) / 180
    const { center, size } = bounds()
    if (fit) controls.target.set(center[0], center[1], -center[2])
    const dir = new three.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p))
    camera.position.copy(controls.target).addScaledVector(dir, size * 4 + 20)
    if (fit) {
      camera.zoom = 1
      frame(size)
    }
    camera.updateProjectionMatrix()
    controls.update()
    oncamera(...cameraAngles())
    draw()
  }

  function bounds() {
    const placed = [...placeAll(fig.pieces).values()]
    if (!placed.length) return { center: [0, 1, 0] as V3, size: 6 }
    const lo = [0, 1, 2].map((i) => Math.min(...placed.map((p) => p.min[i])))
    const hi = [0, 1, 2].map((i) => Math.max(...placed.map((p) => p.max[i])))
    // Its size: the box round it, corner to corner, so it fits seen from any side.
    return { center: lo.map((l, i) => (l + hi[i]) / 2) as V3, size: Math.max(Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), 2) }
  }
  let viewSize = 10
  function frame(size: number) {
    viewSize = size * 1.15
    resize()
  }
  function resize() {
    if (!host || !renderer) return
    const w = host.clientWidth || 1
    const h = host.clientHeight || 1
    renderer.setSize(w, h, false)
    // The figure fits across the narrower way.
    const a = w / h
    const tall = a < 1 ? viewSize / a : viewSize
    camera.left = (-tall * a) / 2
    camera.right = (tall * a) / 2
    camera.top = tall / 2
    camera.bottom = -tall / 2
    camera.updateProjectionMatrix()
    if (selected) frameSelected()
    // Drawn again at once: resizing clears the canvas, and waiting for the next frame would flash it blank.
    if (ready) renderer.render(scene, camera)
    draw()
  }

  // ---- Building the pieces' meshes ----

  /** A piece's shape in its own frame, centered on its middle. */
  function geometryOf(pl: Placed): T.BufferGeometry {
    const [ex, ey, ez] = pl.ext
    const k = pl.piece.kind
    let g: T.BufferGeometry
    if (k === 'box') g = new three.BoxGeometry(ex, ey, ez)
    else if (k === 'cylinder') g = new three.CylinderGeometry(ex / 2, ex / 2, ey, 64)
    else if (k === 'cone') g = new three.ConeGeometry(ex / 2, ey, 64)
    else if (k === 'pyramid') {
      g = new three.ConeGeometry((ex / 2) * Math.SQRT2, ey, 4)
      g.rotateY(Math.PI / 4)
    } else if (k === 'sphere') g = new three.SphereGeometry(ex / 2, 48, 24)
    else if (k === 'hemisphere') {
      const r = ex / 2
      const dome = new three.SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2)
      const lid = new three.CircleGeometry(r, 48)
      lid.rotateX(Math.PI / 2)
      g = mergeTwo(dome, lid)
      g.translate(0, -ey / 2, 0)
    } else {
      // A triangular prism or a half cylinder: its end shape, pushed back through its length.
      const shape = new three.Shape()
      const pts = k === 'prism' ? triangleOf(pl).map(([x, y]) => [x, y] as const) : halfRing(ex / 2, 0).map(([x, y]) => [x, y] as const)
      shape.moveTo(pts[0][0], pts[0][1])
      for (const [x, y] of pts.slice(1)) shape.lineTo(x, y)
      shape.closePath()
      g = new three.ExtrudeGeometry(shape, { depth: ez, bevelEnabled: false, curveSegments: 24 })
      g.translate(-ex / 2, -ey / 2, -ez / 2)
    }
    return g
  }
  function mergeTwo(a: T.BufferGeometry, b: T.BufferGeometry): T.BufferGeometry {
    const out = new three.BufferGeometry()
    const pa = a.toNonIndexed()
    const pb = b.toNonIndexed()
    for (const name of ['position', 'normal']) {
      const x = pa.getAttribute(name).array as Float32Array
      const y = pb.getAttribute(name).array as Float32Array
      const all = new Float32Array(x.length + y.length)
      all.set(x)
      all.set(y, x.length)
      out.setAttribute(name, new three.BufferAttribute(all, 3))
    }
    return out
  }
  /** Places a mesh where its piece is: turned, then moved to its middle. */
  function setMatrix(o: T.Object3D, pl: Placed) {
    const r = pl.rot
    o.matrixAutoUpdate = false
    o.matrix.set(r[0], r[1], r[2], pl.center[0], r[3], r[4], r[5], pl.center[1], r[6], r[7], r[8], pl.center[2], 0, 0, 0, 1)
  }
  function meshOf(pl: Placed, i: number, ghost = false, blocked = false): T.Mesh {
    const g = geometryOf(pl)
    const solid = !pl.piece.cut
    const mat = new three.MeshStandardMaterial({
      color: blocked ? '#dc2626' : ghost ? '#2563eb' : solid ? COLORS[i % COLORS.length] : '#9ca3af',
      transparent: ghost || !solid, opacity: ghost ? 0.45 : solid ? 1 : 0.4, depthWrite: !(ghost || !solid),
      roughness: 0.75, metalness: 0, side: solid && !ghost ? three.DoubleSide : three.FrontSide, // Solids sit back a touch so their edge lines show; holes come forward, so their ends don't flicker on the face they're cut into.
      polygonOffset: true, polygonOffsetFactor: solid && !ghost ? 1 : -2, polygonOffsetUnits: solid && !ghost ? 1 : -2,
    })
    const m = new three.Mesh(g, mat)
    const lines = new three.LineSegments(
      new three.EdgesGeometry(g, 25),
      new three.LineBasicMaterial({ color: blocked ? '#b91c1c' : ghost ? '#1d4ed8' : solid ? '#1f2937' : '#6b7280', transparent: ghost, opacity: ghost ? 0.8 : 1 }),
    )
    m.add(lines)
    // A ghost (a shape being placed or previewed) shows through anything in front of it, so it's never lost behind another piece.
    if (ghost) {
      for (const o of [m, lines]) {
        ;(o.material as T.Material).depthTest = false
        o.renderOrder = 10
      }
    }
    setMatrix(m, pl)
    m.userData = { piece: pl.piece.id, cut: pl.piece.cut }
    return m
  }

  /** A flat face's corners in space, in order round it, and its middle. */
  function faceCorners(id: string, face: Dir): { pts: V3[]; mid: V3 } | null {
    const pl = placeAll(fig.pieces).get(id)
    if (!pl) return null
    const level = face.sign > 0 ? pl.max[face.axis] : pl.min[face.axis]
    const on = solidOf(pl).corners.filter((p) => Math.abs(p[face.axis] - level) < 1e-6)
    if (on.length < 3) return null
    const [u, v] = faceAxes(face.axis)
    const mid = [0, 1, 2].map((i) => on.reduce((t, p) => t + p[i], 0) / on.length) as V3
    const pts = [...on].sort((a, b) => Math.atan2(a[v] - mid[v], a[u] - mid[u]) - Math.atan2(b[v] - mid[v], b[u] - mid[u]))
    return { pts, mid }
  }
  /** Lights the hovered face, just off its surface. */
  function glow() {
    if (!root) return
    if (faceGlow) {
      root.remove(faceGlow)
      disposeOf(faceGlow)
      faceGlow = null
    }
    const hf = plusFace
    const fc = hf && !current ? faceCorners(hf.piece, hf.face) : null
    if (fc && hf) {
      const lift = (p: V3): V3 => {
        const q: V3 = [...p]
        q[hf.face.axis] += hf.face.sign * 0.01
        return q
      }
      const pos: number[] = []
      for (let i = 1; i + 1 < fc.pts.length; i++) pos.push(...lift(fc.pts[0]), ...lift(fc.pts[i]), ...lift(fc.pts[i + 1]))
      const g = new three.BufferGeometry()
      g.setAttribute('position', new three.Float32BufferAttribute(pos, 3))
      faceGlow = new three.Mesh(g, new three.MeshBasicMaterial({ color: '#2563eb', transparent: true, opacity: 0.28, side: three.DoubleSide, depthWrite: false }))
      root.add(faceGlow)
    }
    draw()
  }
  /** Where the +s go: the hovered face's, and the selected piece's faces that face the camera. */
  function placePluses() {
    if (!ready || current || clickPlacing || press || turnHover !== null) {
      pluses = []
      if (plusFace) (plusFace = null), glow()
      return
    }
    camera.updateMatrixWorld()
    const r = renderer.domElement.getBoundingClientRect()
    const toCamera = camera.position.clone().sub(controls.target).normalize()
    const want: { piece: string; face: Dir; hot: boolean }[] = []
    void toCamera
    // The selected piece is being edited, so it shows its handles, not +s.
    if (hoverFace && hoverFace.piece !== selected) {
      const hf = hoverFace
      const same = want.find((w) => w.piece === hf.piece && w.face.axis === hf.face.axis && w.face.sign === hf.face.sign)
      if (same) same.hot = true
      else want.push({ ...hf, hot: true })
    }
    const v = new three.Vector3()
    pluses = want.flatMap((w) => {
      if (w.piece === selected) return []
      const fc = faceCorners(w.piece, w.face)
      if (!fc) return []
      v.set(fc.mid[0], fc.mid[1], -fc.mid[2]).project(camera)
      return [{ key: `${w.piece}:${w.face.axis}:${w.face.sign}`, ...w, x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height }]
    })
    // A + that's gone takes its face's light with it.
    const pf = plusFace
    if (pf && !pluses.some((p) => p.piece === pf.piece && p.face.axis === pf.face.axis && p.face.sign === pf.face.sign)) {
      plusFace = null
      glow()
    }
  }
  // ---- The selected piece's handles ----

  type Handles = {
    fp: Footprint
    foot: [number, number][]
    corners: { i: number; j: number; x: number; y: number }[]
    base: [number, number]
    top: [number, number]
    labels: { x: number; y: number; text: string }[]
    /** Arrows to turn the piece: about the line up from its plane (spinning it), and about the plane's two directions (tipping it over). */
    turns: { axis: 0 | 1 | 2; shape: [number, number][] }[]
  }
  let handles = $state.raw<Handles | null>(null)
  /** A point of the plane (u, v) a piece sits on, `up` out from it, on the screen (inside the 3D view). */
  function onScreen(fp: Footprint, uv: [number, number], up = 0): [number, number] {
    camera.updateMatrixWorld()
    const p: V3 = [0, 0, 0]
    p[fp.u] = uv[0]
    p[fp.v] = uv[1]
    p[fp.axis] = fp.level + fp.out * up
    const v = new three.Vector3(p[0], p[1], -p[2]).project(camera)
    const r = renderer.domElement.getBoundingClientRect()
    return [((v.x + 1) / 2) * r.width, ((1 - v.y) / 2) * r.height]
  }
  function placeHandles() {
    const fp = ready && selected && !current && !clickPlacing ? footprintOf(fig, selected) : null
    if (!fp) return (handles = null)
    const c = (i: number, j: number): [number, number] => [i ? fp.hi[0] : fp.lo[0], j ? fp.hi[1] : fp.lo[1]]
    const order: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]
    const foot = order.map(([i, j]) => onScreen(fp, c(i, j)))
    const mid: [number, number] = [(fp.lo[0] + fp.hi[0]) / 2, (fp.lo[1] + fp.hi[1]) / 2]
    const unit = fig.unit.trim() ? ` ${fig.unit.trim()}` : ''
    const label = (a: [number, number], b: [number, number], n: number) => {
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      return { x: m[0], y: m[1], text: `${measureText(n)}${unit}` }
    }
    // Each length on whichever of its two edges is lower on the screen, so it's clear of the piece.
    const lower = (e1: [number, number][], e2: [number, number][]) => (e1[0][1] + e1[1][1] > e2[0][1] + e2[1][1] ? e1 : e2)
    const eu = lower([foot[0], foot[1]], [foot[3], foot[2]])
    const ev = lower([foot[1], foot[2]], [foot[0], foot[3]])
    const base = onScreen(fp, mid)
    const top = onScreen(fp, mid, fp.height)
    // The turn arrows, drawn in space on the plane each one turns the piece in, so they show the way it'll go.
    const pl = placeAll(fig.pieces).get(selected!)!
    // Only turns that still join flat face to flat face, and that change something (a cylinder spun is the same cylinder).
    const axes = ([fp.axis, fp.u, fp.v] as (0 | 1 | 2)[]).filter((axis) => (pl.piece.cut ? axis === fp.axis : true) && nextTurn(pl.piece, axis) !== null)
    // While an arrow is hovered it stays where it is, so it can be clicked again and again as the piece turns.
    const keep = turnHover !== null && handles ? handles.turns : null
    const turns: Handles['turns'] = keep ?? axes.flatMap((axis) => {
      const arrow = turnArrow(pl, fp, axis)
      return arrow ? [{ axis, shape: arrow }] : []
    })
    handles = {
      fp, foot, base, top, turns,
      corners: order.map(([i, j], k) => ({ i, j, x: foot[k][0], y: foot[k][1] })),
      labels: [label(eu[0], eu[1], fp.hi[0] - fp.lo[0]), label(ev[0], ev[1], fp.hi[1] - fp.lo[1]), { ...label(base, top, fp.height), x: (base[0] + top[0]) / 2 + 14 }],
    }
  }

  /** A point in space on the screen (inside the 3D view). */
  function project(p: V3): [number, number] {
    const v = new three.Vector3(p[0], p[1], -p[2]).project(camera)
    const r = renderer.domElement.getBoundingClientRect()
    return [((v.x + 1) / 2) * r.width, ((1 - v.y) / 2) * r.height]
  }

  /** Space per pixel on the screen, so things drawn in space can keep a size on the screen. */
  function perPixel(): number {
    const r = renderer.domElement.getBoundingClientRect()
    return (camera.top - camera.bottom) / camera.zoom / Math.max(1, r.height)
  }
  /**
   * A double-headed arc arrow lying in space on the plane a turn about `axis`
   * happens in, as Tinkercad draws them, projected onto the screen. A spin's
   * arrow lies on the plane the piece sits on, curving round its footprint
   * just past the edge nearest the bottom of the screen; a tip's stands on the
   * side face (the one toward the viewer) and arches over its top edge.
   */
  function turnArrow(pl: Placed, fp: Footprint, axis: 0 | 1 | 2): [number, number][] | null {
    const px = perPixel()
    const [a, b] = faceAxes(axis)
    const c: V3 = [...pl.center]
    let R: number
    let mid: number
    if (axis === fp.axis) {
      // Round the footprint, toward whichever side is lowest on the screen.
      c[axis] = fp.level + fp.out * 2 * px
      R = 0.5 * Math.hypot(pl.max[a] - pl.min[a], pl.max[b] - pl.min[b]) + 30 * px
      let best = 0
      let low = -Infinity
      for (let k = 0; k < 16; k++) {
        const t = (k / 16) * 2 * Math.PI
        const p: V3 = [...c]
        p[a] += R * Math.cos(t)
        p[b] += R * Math.sin(t)
        const y = project(p)[1]
        if (y > low) (low = y), (best = t)
      }
      mid = best
    } else {
      // On the side face square to `axis` that faces the viewer, over its top edge.
      const toCam = camera.position.clone().sub(controls.target)
      const toward = (axis === 2 ? -toCam.z : axis === 1 ? toCam.y : toCam.x) >= 0 ? 1 : -1
      c[axis] = toward > 0 ? pl.max[axis] + 2 * px : pl.min[axis] - 2 * px
      const up = fp.axis
      c[up] = fp.out > 0 ? pl.max[up] : pl.min[up]
      R = 32 * px
      // The angle pointing out from the plane (up the height), in this plane's own a–b terms.
      mid = up === a ? (fp.out > 0 ? 0 : Math.PI) : fp.out > 0 ? Math.PI / 2 : -Math.PI / 2
    }
    const w = 4.5 * px
    const span = axis === fp.axis ? Math.min(0.9, (80 * px) / R) : 1.2
    const head = Math.min(span / 3, (12 * px) / R)
    const at = (t: number, r: number): [number, number] => {
      const p: V3 = [...c]
      p[a] += r * Math.cos(t)
      p[b] += r * Math.sin(t)
      return project(p)
    }
    const t0 = mid - span / 2
    const t1 = mid + span / 2
    const arc = (from: number, to: number, r: number) => Array.from({ length: 13 }, (_, i) => at(from + ((to - from) * i) / 12, r))
    return [
      at(t0 - head, R),
      at(t0, R + w * 2.4),
      ...arc(t0, t1, R + w),
      at(t1, R + w * 2.4),
      at(t1 + head, R),
      at(t1, R - w * 2.4),
      ...arc(t1, t0, R - w),
      at(t0, R - w * 2.4),
    ]
  }

  /** The turn arrow hovered: it stays put, so it can be clicked again and again. */
  let turnHover = $state<0 | 1 | 2 | null>(null)
  /**
   * The next turn about `axis`, a quarter at a time, that leaves a flat face of
   * the piece against what it's on (in the face, for a hole) and changes its
   * shape there; null when there's none (a cylinder or a cone can't be tipped
   * onto a flat face, and spinning one changes nothing).
   */
  function nextTurn(p: Piece, axis: 0 | 1 | 2): number | null {
    const toward: Dir = !p.on ? { axis: 1, sign: -1 } : p.cut ? p.on.face : { axis: p.on.face.axis, sign: (-p.on.face.sign) as 1 | -1 }
    const shape = (q: Piece) => {
      const pl = placeAll(fig.pieces.map((x) => (x.id === q.id ? q : x))).get(q.id)
      return pl ? solidOf(pl).corners.map((c) => c.map((v) => Math.round(v * 1e4) / 1e4).join(',')).sort().join(';') : ''
    }
    const now = shape(p)
    let turn = p.turn
    for (let k = 1; k < 4; k++) {
      turn = turned(turn, ABOUT[axis])
      const q = { ...p, turn }
      if (touchingFace(q, toward) && shape(q) !== now) return turn
    }
    return null
  }
  /** The selected piece at its next turn about `axis`. */
  function turnedPiece(axis: 0 | 1 | 2): Piece | null {
    const p = fig.pieces.find((q) => q.id === selected)
    const turn = p ? nextTurn(p, axis) : null
    return p && turn !== null ? { ...p, turn } : null
  }
  function hoverTurn(axis: 0 | 1 | 2 | null) {
    turnHover = axis
  }
  /** A click on a turn arrow turns the piece a quarter; the arrow stays put while it's hovered. */
  function clickTurn(e: MouseEvent, axis: 0 | 1 | 2) {
    e.stopPropagation()
    const p = turnedPiece(axis)
    if (!p || !selected) return
    onedit(selected, { turn: p.turn }, `turn:${selected}:${axis}`)
  }

  /** Where the pointer meets the plane a piece sits on, as (u, v) on it. */
  function planeAt(e: { clientX: number; clientY: number }, fp: Footprint): [number, number] | null {
    const rc = pointerRay(e) ?? rayAnywhere(e)
    const o = rc.ray.origin
    const d = rc.ray.direction
    const comp = (v: T.Vector3, a: number) => (a === 0 ? v.x : a === 1 ? v.y : -v.z)
    const den = comp(d, fp.axis)
    if (Math.abs(den) < 1e-9) return null
    const t = (fp.level - comp(o, fp.axis)) / den
    const p = o.clone().addScaledVector(d, t)
    const q: V3 = [p.x, p.y, -p.z]
    return [q[fp.u], q[fp.v]]
  }
  /** How far out from its plane, along the line up from `uv`, the pointer is. */
  function heightAt(e: { clientX: number; clientY: number }, fp: Footprint, uv: [number, number]): number {
    const rc = rayAnywhere(e)
    const b: V3 = [0, 0, 0]
    b[fp.u] = uv[0]
    b[fp.v] = uv[1]
    b[fp.axis] = fp.level
    const n: V3 = [0, 0, 0]
    n[fp.axis] = fp.out
    const B = new three.Vector3(b[0], b[1], -b[2])
    const N = new three.Vector3(n[0], n[1], -n[2])
    const d = rc.ray.direction
    const w0 = rc.ray.origin.clone().sub(B)
    const a = d.dot(d)
    const bb = d.dot(N)
    const c = N.dot(N)
    const dd = d.dot(w0)
    const ee = N.dot(w0)
    const den = a * c - bb * bb
    return Math.abs(den) < 1e-9 ? fp.height : (a * ee - bb * dd) / den
  }
  /** A ray through the pointer even when it's outside the 3D view (a handle dragged past its edge). */
  function rayAnywhere(e: { clientX: number; clientY: number }): T.Raycaster {
    const r = renderer.domElement.getBoundingClientRect()
    const rc = ray()
    rc.setFromCamera(new three.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
    return rc
  }

  /** Dragging a corner handle (resizing across the plane) or the top handle (the height). */
  function grabHandle(e: PointerEvent, which: { i: number; j: number } | 'top') {
    if (e.button !== 0 || !handles || !selected) return
    e.preventDefault()
    e.stopPropagation()
    const id = selected
    const fp = handles.fp
    const fixed: [number, number] = which === 'top' ? [0, 0] : [which.i ? fp.lo[0] : fp.hi[0], which.j ? fp.lo[1] : fp.hi[1]]
    const mid: [number, number] = [(fp.lo[0] + fp.hi[0]) / 2, (fp.lo[1] + fp.hi[1]) / 2]
    const merge = `handle:${id}:${Date.now()}`
    dragging = true
    controls.enabled = false
    const move = (ev: PointerEvent) => {
      if (which === 'top') {
        const size = resizeHeight(fig, id, heightAt(ev, fp, mid))
        if (size) onedit(id, { size }, merge)
      } else {
        const to = planeAt(ev, fp)
        const r = to && resizeCorner(fig, id, fixed, to)
        if (r) onedit(id, r.on ? { size: r.size, on: r.on } : { size: r.size }, merge)
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      dragging = false
      controls.enabled = true
      placeHandles()
      keepInView()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  let dragging = $state(false)

  function addAt(e: MouseEvent, piece: string, face: Dir) {
    e.stopPropagation()
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect()
    onadd(piece, face, { x: b.left + b.width / 2, y: b.top + b.height / 2 })
  }

  function rebuild() {
    if (!root) return
    for (const m of meshes.values()) disposeOf(m)
    root.clear()
    selectionBox = null
    meshes.clear()
    let i = 0
    for (const pl of placeAll(fig.pieces).values()) {
      const m = meshOf(pl, pl.piece.cut ? 0 : i++)
      meshes.set(pl.piece.id, m)
      root.add(m)
    }
    const { size } = bounds()
    grid.scale.setScalar(Math.max(1, Math.ceil(size / 10)))
    // Nothing built yet: no grid, just the figures to start from over a plain view.
    grid.visible = fig.pieces.length > 0
    faceGlow = null
    if (hoverFace && !placeAll(fig.pieces).has(hoverFace.piece)) hoverFace = null
    glow()
    tint()
    placePluses()
    placeHandles()
  }
  function disposeOf(o: T.Object3D) {
    o.traverse((x) => {
      const m = x as T.Mesh
      m.geometry?.dispose()
      const mat = m.material as T.Material | T.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((y) => y.dispose())
      else mat?.dispose()
    })
  }
  /** Lights up the selected, hovered and about-to-be-deleted pieces. */
  function tint() {
    for (const [id, m] of meshes) {
      const mat = m.material as T.MeshStandardMaterial
      const sel = everything || id === selected
      const c = doomed.includes(id) ? '#dc2626' : sel ? '#1d4ed8' : id === hovered ? '#60a5fa' : '#000000'
      mat.emissive.set(c)
      mat.emissiveIntensity = doomed.includes(id) ? 0.6 : sel ? 0.12 : id === hovered ? 0.2 : 0
      // The selected piece's own edges go blue too.
      const edges = m.children[0] as T.LineSegments | undefined
      ;(edges?.material as T.LineBasicMaterial | undefined)?.color.set(doomed.includes(id) ? DELETE_RED : sel ? SELECT_BLUE : m.userData.cut ? '#6b7280' : '#1f2937')
    }
    frameSelected()
    draw()
  }

  /**
   * Tinkercad's way of showing what's selected: the piece outlined in blue
   * (a slightly bigger blue copy of it seen from behind, so it shows as a rim
   * round its outline, curved sides too) and its own edges drawn thick and
   * blue. Browsers only draw plain WebGL lines a pixel wide, so the edges use
   * three.js's wide lines.
   */
  let selectionBox: T.Group | null = null
  function frameSelected() {
    if (!root || !wide) return
    if (selectionBox) {
      root.remove(selectionBox)
      disposeOf(selectionBox)
      selectionBox = null
    }
    const all = placeAll(fig.pieces)
    // Selected pieces outlined blue; those about to be deleted (Delete hovered) red, attached ones included.
    const ids = new Set([...(everything ? [...all.keys()] : selected ? [selected] : []), ...doomed])
    const picked = [...ids].map((id) => all.get(id)).filter((p) => !!p)
    if (!picked.length) return
    selectionBox = new three.Group()
    // The rim: about OUTLINE_PX on the screen, whatever the zoom.
    const r = renderer.domElement.getBoundingClientRect()
    const t = ((camera.top - camera.bottom) / camera.zoom / Math.max(1, r.height)) * OUTLINE_PX
    for (const pl of picked) {
      const g = geometryOf(pl)
      const color = doomed.includes(pl.piece.id) ? DELETE_RED : SELECT_BLUE
      const rim = new three.Mesh(g, new three.MeshBasicMaterial({ color, side: three.BackSide }))
      const k = pl.ext.map((e) => (e + 2 * t) / Math.max(e, 1e-6))
      const R = pl.rot
      rim.matrixAutoUpdate = false
      rim.matrix.set(
        R[0] * k[0], R[1] * k[1], R[2] * k[2], pl.center[0],
        R[3] * k[0], R[4] * k[1], R[5] * k[2], pl.center[1],
        R[6] * k[0], R[7] * k[1], R[8] * k[2], pl.center[2],
        0, 0, 0, 1,
      )
      selectionBox.add(rim)
      // Its edges, thick and blue.
      const edgePts = new three.EdgesGeometry(g, 25).getAttribute('position').array as Float32Array
      const lg = new wide.LineSegmentsGeometry()
      lg.setPositions(Array.from(edgePts))
      const lm = new wide.LineMaterial({ color, linewidth: 3 })
      lm.resolution.set(r.width, r.height)
      const edges = new wide.LineSegments2(lg, lm)
      setMatrix(edges, pl)
      selectionBox.add(edges)
    }
    root.add(selectionBox)
  }

  // ---- Pointing ----

  const ray = () => new three.Raycaster()
  function pointerRay(e: { clientX: number; clientY: number }): T.Raycaster | null {
    if (!renderer) return null
    const r = renderer.domElement.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null
    const rc = ray()
    rc.setFromCamera(new three.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
    return rc
  }
  /** The piece under the pointer, the flat face it's on (if one square to the axes), and the spot in space. */
  function hitAt(e: { clientX: number; clientY: number }, skip: string[] = [], solidsOnly = false) {
    const rc = pointerRay(e)
    if (!rc) return null
    const targets = [...meshes.entries()].filter(([id, m]) => !skip.includes(id) && !(solidsOnly && m.userData.cut)).map(([, m]) => m)
    const hit = rc.intersectObjects(targets, false)[0]
    if (!hit) return { piece: null, face: null, spot: null }
    const id = hit.object.userData.piece as string
    let face: Dir | null = null
    if (hit.face) {
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
      const v = toSpace(n)
      for (const axis of [0, 1, 2] as const) if (Math.abs(Math.abs(v[axis]) - 1) < 1e-3) face = { axis, sign: v[axis] > 0 ? 1 : -1 }
    }
    const pl = placeAll(fig.pieces).get(id)
    if (face && pl && !pl.faces.some((f) => f.axis === face!.axis && f.sign === face!.sign)) face = null
    return { piece: id, face, spot: toSpace(hit.point) }
  }

  // ---- Placing: the ghost following the pointer ----

  let ghost: { piece: Piece; at: { x: number; y: number } } | null = null
  function showGhost(e: { clientX: number; clientY: number }) {
    const pl0 = current
    if (!pl0 || !ghostGroup) return
    ghostGroup.clear()
    ghost = null
    if (!pointerRay(e)) {
      hint = ''
      return draw()
    }
    let p: Piece | null = null
    if (!fig.pieces.length) {
      // Nothing yet: the first piece stands in the middle of the ground.
      p = newPiece(pl0.kind)
      hint = 'Let go to put it down'
    } else {
      const hit = hitAt(e, [], true)
      if (!hit?.piece || !hit.face || !hit.spot) {
        hint = hit?.piece ? 'Only flat faces take a shape' : 'Drop it onto a flat face'
        return draw()
      }
      p = pieceAt(fig, pl0.kind, pl0.cut, hit.piece, hit.face, hit.spot)
      hint = pl0.cut ? 'Let go to cut it out here' : 'Let go to attach it here'
    }
    if (!p) return
    const all = placeAll([...fig.pieces.filter((q) => q.id !== p!.id), p])
    const pl = all.get(p.id)
    if (!pl) return
    // A piece can't run into another (a hole can: it only takes away).
    const carried = [p.id]
    const blocked = !p.cut && [...all.values()].some((q) => !q.piece.cut && !carried.includes(q.piece.id) && q.piece.id !== p!.on?.parent && overlap(q, pl) > 1e-6)
    ghostGroup.add(meshOf(pl, 0, true, blocked))
    if (blocked) hint = 'It would run into another piece'
    else ghost = { piece: p, at: { x: e.clientX, y: e.clientY } }
    draw()
  }
  /** How much two pieces' boxes overlap, as a volume: none when they only touch. */
  function overlap(a: Placed, b: Placed) {
    let v = 1
    for (let i = 0; i < 3; i++) v *= Math.max(0, Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i]) - 1e-6)
    return v
  }
  function withAttachedIds(id: string): string[] {
    const out = [id]
    for (let i = 0; i < out.length; i++) for (const p of fig.pieces) if (p.on?.parent === out[i] && !out.includes(p.id)) out.push(p.id)
    return out
  }
  /** Puts the shape down where its ghost is, if it's anywhere. */
  function drop(e: { clientX: number; clientY: number }): boolean {
    showGhost(e)
    if (!ghost) return false
    onplace(ghost.piece, ghost.at)
    return true
  }
  function endPlacing() {
    ghostGroup?.clear()
    ghost = null
    hint = ''
    clickPlacing = false
    onplacingend()
    draw()
  }

  /** Called by the palette when a shape is picked up: dragged in, or clicked and then clicked onto a face. */
  export function startPlacing(e: PointerEvent) {
    const start = { x: e.clientX, y: e.clientY }
    let dragged = false
    const move = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 5) dragged = true
      showGhost(ev)
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (!dragged) {
        // A click: the shape stays on the pointer until it's clicked onto a face (or Escape).
        clickPlacing = true
        hint = fig.pieces.length ? 'Click a flat face to put it there (Esc to cancel)' : 'Click to put it down'
        return
      }
      drop(ev)
      endPlacing()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  let clickPlacing = $state(false)

  // ---- The canvas's own pointer handling: hovering, selecting, dragging a piece to move it ----

  /** A press on the 3D view: a click (to select), the camera being turned, or the selected piece being slid on its plane. */
  let press: { x: number; y: number; piece: string | null; slide: { fp: Footprint; from: [number, number]; center: [number, number]; merge: string } | null } | null = null
  function down(e: PointerEvent) {
    // Nothing built yet: the view holds still (the start-from figures sit over it).
    if (!fig.pieces.length && !clickPlacing && !current) {
      e.stopPropagation()
      return
    }
    if (clickPlacing || (e.target as Element).closest?.('.plus, .handle, .turn')) return
    const hit = e.button === 0 ? hitAt(e) : null
    press = { x: e.clientX, y: e.clientY, piece: hit?.piece ?? null, slide: null }
    // Dragging the selected piece slides it on the plane it sits on, rather than turning the camera.
    const p = hit?.piece && hit.piece === selected ? fig.pieces.find((q) => q.id === hit.piece) : null
    const fp = p?.on ? footprintOf(fig, p.id) : null
    const from = fp ? planeAt(e, fp) : null
    if (fp && from) {
      controls.enabled = false
      press.slide = { fp, from, center: [(fp.lo[0] + fp.hi[0]) / 2, (fp.lo[1] + fp.hi[1]) / 2], merge: `slide:${p!.id}:${Date.now()}` }
    }
  }
  function moveOn(e: PointerEvent) {
    if (clickPlacing) return showGhost(e)
    if (press?.slide && press.piece && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 4) {
      const sl = press.slide
      const q = planeAt(e, sl.fp)
      if (!q) return
      const on = slide(fig, press.piece, [sl.center[0] + q[0] - sl.from[0], sl.center[1] + q[1] - sl.from[1]])
      if (on) onedit(press.piece, { on }, sl.merge)
      return
    }
    if (!press) {
      if ((e.target as Element).closest?.('.plus')) return
      // On a handle or a turn arrow, no face is being pointed at, so no + shows.
      if ((e.target as Element).closest?.('.handle, .turn')) {
        if (hoverFace) {
          hoverFace = null
          placePluses()
        }
        return
      }
      const hit = hitAt(e)
      const id = hit?.piece ?? null
      if (id !== hovered) {
        hovered = id
        tint()
      }
      const cut = id ? fig.pieces.find((p) => p.id === id)?.cut : true
      const hf = hit?.piece && hit.face && !cut ? { piece: hit.piece, face: hit.face } : null
      if (hf?.piece !== hoverFace?.piece || hf?.face.axis !== hoverFace?.face.axis || hf?.face.sign !== hoverFace?.face.sign) {
        hoverFace = hf
        glow()
        placePluses()
        placeHandles()
      }
    }
  }
  function up(e: PointerEvent) {
    if (!clickPlacing && !press && (e.target as Element).closest?.('.plus')) return
    if (clickPlacing) {
      if (e.button === 0 && drop(e)) endPlacing()
      return
    }
    const p = press
    press = null
    controls.enabled = true
    placePluses()
    placeHandles()
    if (!p) return
    // A click, not a drag of the camera: select what's under it.
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5 && e.button === 0) onselect(p.piece, p.piece ? { x: e.clientX, y: e.clientY } : null)
  }
  function keydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && (clickPlacing || current)) endPlacing()
  }

  onMount(() => {
    let alive = true
    let observer: ResizeObserver | null = null
    ;(async () => {
      three = await import('three')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      const [{ LineSegments2 }, { LineSegmentsGeometry }, { LineMaterial }] = await Promise.all([
        import('three/examples/jsm/lines/LineSegments2.js'),
        import('three/examples/jsm/lines/LineSegmentsGeometry.js'),
        import('three/examples/jsm/lines/LineMaterial.js'),
      ])
      wide = { LineSegments2, LineSegmentsGeometry, LineMaterial }
      if (!alive || !host) return
      renderer = new three.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
      host.appendChild(renderer.domElement)
      scene = new three.Scene()
      camera = new three.OrthographicCamera(-5, 5, 5, -5, -1000, 1000)
      scene.add(new three.HemisphereLight('#ffffff', '#cbd5e1', 1.6))
      const sun = new three.DirectionalLight('#ffffff', 1.4)
      sun.position.set(0.6, 1, 0.8)
      camera.add(sun)
      scene.add(camera)
      root = new three.Group()
      ghostGroup = new three.Group()
      const mirrored = new three.Group()
      mirrored.scale.set(1, 1, -1)
      mirrored.add(root, ghostGroup)
      scene.add(mirrored)
      grid = new three.GridHelper(20, 20, '#cbd5e1', '#e5e7eb')
      grid.position.y = -0.001
      scene.add(grid)
      controls = new OrbitControls(camera, renderer.domElement)
      controls.mouseButtons = { LEFT: three.MOUSE.ROTATE, MIDDLE: three.MOUSE.DOLLY, RIGHT: three.MOUSE.PAN }
      // The camera stays above the ground, as Tinkercad's does unless asked.
      controls.maxPolarAngle = Math.PI / 2 - 0.02
      controls.addEventListener('change', () => {
        if (selected || everything) frameSelected()
        draw()
        onviewchange?.()
      })
      controls.addEventListener('end', () => oncamera(...cameraAngles()))
      observer = new ResizeObserver(resize)
      observer.observe(host)
      rebuild()
      look(35, 28)
      ready = true
      const loop = () => {
        raf = requestAnimationFrame(loop)
        if (!dirty) return
        dirty = false
        renderer.render(scene, camera)
        // The +s and handles are laid over the picture, so they're placed here, from the camera that just drew it, in step every frame.
        placePluses()
        placeHandles()
      }
      loop()
    })()
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      observer?.disconnect()
      controls?.dispose()
      renderer?.dispose()
      renderer?.domElement.remove()
    }
  })

  // Rebuild when the pieces change; retint when the selection does.
  $effect(() => {
    void fig.pieces
    untrack(() => ready && (rebuild(), !dragging && keepInView()))
  })
  $effect(() => {
    void selected
    void everything
    void doomed
    untrack(() => ready && (tint(), (placePluses(), placeHandles())))
  })
  $effect(() => {
    void current
    void clickPlacing
    untrack(() => ready && (glow(), (placePluses(), placeHandles())))
  })
  /** Shows a piece where it would go, see-through, without adding it (a shape hovered in the + menu); null takes it away. */
  export function preview(p: Piece | null) {
    if (!ghostGroup || current) return
    ghostGroup.clear()
    if (p) {
      const pl = placeAll([...fig.pieces.filter((q) => q.id !== p.id), p]).get(p.id)
      if (pl) ghostGroup.add(meshOf(pl, 0, true))
    }
    draw()
  }

  /** Where a piece is on the screen, as a box round it, for its popup to sit beside. */
  export function screenBox(id: string): { x: number; y: number; w: number; h: number } | null {
    if (!ready || !renderer) return null
    const pl = placeAll(fig.pieces).get(id)
    if (!pl) return null
    camera.updateMatrixWorld()
    const r = renderer.domElement.getBoundingClientRect()
    const v = new three.Vector3()
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const [x, y, z] of solidOf(pl).corners) {
      v.set(x, y, -z).project(camera)
      const sx = r.left + ((v.x + 1) / 2) * r.width
      const sy = r.top + ((1 - v.y) / 2) * r.height
      ;[x0, y0, x1, y1] = [Math.min(x0, sx), Math.min(y0, sy), Math.max(x1, sx), Math.max(y1, sy)]
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  }

  /** The camera's turn and tip now, in degrees, for the view cube. */
  export function angles(): [number, number] {
    if (!camera || !controls) return [35, 28]
    const d = camera.position.clone().sub(controls.target).normalize()
    return [(Math.atan2(d.x, d.z) * 180) / Math.PI, (Math.asin(Math.max(-1, Math.min(1, d.y))) * 180) / Math.PI]
  }
  /** Zooms the view in (k > 1) or out. */
  export function zoomBy(k: number) {
    if (!camera) return
    camera.zoom = Math.min(20, Math.max(0.1, camera.zoom * k))
    camera.updateProjectionMatrix()
    controls.update()
    draw()
  }

  /**
   * Once the shape has grown past the edge of the view, eases the camera out
   * and back onto its middle, keeping the way it looks at it, so the whole
   * shape shows again. A shape that still fits is left where the teacher put it.
   */
  let easing = 0
  /** The shape's box when last checked: only a shape that's grown out of it is chased. */
  let lastBox: { lo: number[]; hi: number[] } | null = null
  function keepInView() {
    if (!camera || !fig.pieces.length) return void (lastBox = null)
    const placed = [...placeAll(fig.pieces).values()]
    const lo = [0, 1, 2].map((i) => Math.min(...placed.map((p) => p.min[i])))
    const hi = [0, 1, 2].map((i) => Math.max(...placed.map((p) => p.max[i])))
    const grew = !lastBox || [0, 1, 2].some((i) => lo[i] < lastBox!.lo[i] - 1e-9 || hi[i] > lastBox!.hi[i] + 1e-9)
    lastBox = { lo, hi }
    if (!grew) return
    camera.updateMatrixWorld()
    const MARGIN = 0.9
    let out = false
    for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) {
      const v = new three.Vector3(x, y, -z).project(camera)
      if (Math.abs(v.x) > MARGIN || Math.abs(v.y) > MARGIN) out = true
    }
    if (!out) return
    const { center, size } = bounds()
    const target = new three.Vector3(center[0], center[1], -center[2])
    const dir = camera.position.clone().sub(controls.target).normalize()
    const from = { target: controls.target.clone(), zoom: camera.zoom, view: viewSize }
    const to = { zoom: 1, view: size * 1.15 }
    // Centered in the room above the shapes toolbar, not behind it.
    const h = host?.clientHeight || 1
    const w = host?.clientWidth || 1
    const tall = w / h < 1 ? to.view / (w / h) : to.view
    const BAR = 90
    target.addScaledVector(new three.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), -(BAR / 2) * (tall / h))
    const start = performance.now()
    const id = ++easing
    const step = (now: number) => {
      if (id !== easing || !camera) return
      const t = Math.min(1, (now - start) / 320)
      const e = 1 - (1 - t) ** 3
      controls.target.lerpVectors(from.target, target, e)
      camera.position.copy(controls.target).addScaledVector(dir, size * 4 + 20)
      camera.zoom = from.zoom + (to.zoom - from.zoom) * e
      viewSize = from.view + (to.view - from.view) * e
      resize()
      camera.updateProjectionMatrix()
      controls.update()
      placePluses()
      placeHandles()
      draw()
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  /** Fits the figure in view after it's replaced (a preset, or a fresh start). */
  export function fit() {
    if (!ready) return
    const [y, p] = cameraAngles()
    look(y, p)
  }
</script>

<svelte:window onkeydown={keydown} />

<div
  class="viewport" bind:this={host} role="application" aria-label="3D view: drag to turn, right-drag to move, scroll to zoom"
  onpointerdowncapture={down} onpointermove={moveOn} onpointerup={up}
  onwheelcapture={(e) => !fig.pieces.length && e.stopPropagation()}
  onpointerleave={() => !press && ((hovered = null), (hoverFace = null), ready && (tint(), glow(), (placePluses(), placeHandles())))}
  oncontextmenu={(e) => e.preventDefault()}
  class:placing={!!current || clickPlacing}
>
  {#if handles}
    {@const h = handles}
    <!-- The selected piece's footprint on its plane, its measures, and handles: corners to resize it across the plane, the top for its height. -->
    <svg class="handles">
      <polygon class="foot" points={h.foot.map((p) => p.join(',')).join(' ')} />
      <line class="rise" x1={h.base[0]} y1={h.base[1]} x2={h.top[0]} y2={h.top[1]} />
      {#each h.labels as l}<text x={l.x} y={l.y} dy="0.35em">{l.text}</text>{/each}
      {#each h.corners as c (`${c.i}${c.j}`)}
        <rect class="handle" role="button" tabindex="-1" aria-label="Drag to resize" x={c.x - 6} y={c.y - 6} width="12" height="12" rx="2" onpointerdown={(e) => grabHandle(e, { i: c.i, j: c.j })}><title>Drag to resize</title></rect>
      {/each}
      <!-- Turn arrows, drawn on the planes they turn the piece in: each click turns it a quarter. -->
      {#each h.turns as t (t.axis)}
        <polygon
          class="turn" class:on={turnHover === t.axis} role="button" tabindex="-1" aria-label="Turn the piece a quarter" points={t.shape.map((p) => p.join(',')).join(' ')}
          onpointerenter={() => hoverTurn(t.axis)} onpointerleave={() => hoverTurn(null)} onpointerdown={(e) => e.stopPropagation()} onclick={(e) => clickTurn(e, t.axis)}
          onkeydown={(e) => (e.key === "Enter" || e.key === " ") && clickTurn(e as unknown as MouseEvent, t.axis)}
        ><title>Click to turn it a quarter</title></polygon>
      {/each}
      <rect class="handle top" role="button" tabindex="-1" aria-label="Drag to change the height" x={h.top[0] - 6} y={h.top[1] - 6} width="12" height="12" rx="2" onpointerdown={(e) => grabHandle(e, 'top')}><title>Drag to change the height</title></rect>
    </svg>
  {/if}
  {#each pluses as p (p.key)}
    <button
      type="button" class="plus" class:hot={p.hot} style="left: {p.x}px; top: {p.y}px" aria-label="Add a shape onto this face" title="Add a shape onto this face"
      onclick={(e) => addAt(e, p.piece, p.face)}
      onpointerenter={() => {
        plusFace = { piece: p.piece, face: p.face }
        glow()
      }}
      onpointerleave={() => {
        plusFace = null
        glow()
      }}
    ><svg viewBox="-8 -8 16 16" width="20" height="20" aria-hidden="true"><path d="M-5,0 H5 M0,-5 V5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg></button>
  {/each}
  {#if hint}<p class="hint">{hint}</p>{/if}
</div>

<style>
  .viewport { position: absolute; inset: 0; overflow: hidden; touch-action: none; cursor: grab; }
  .viewport:active { cursor: grabbing; }
  .viewport.placing, .viewport.placing:active { cursor: copy; }
  .viewport :global(canvas) { display: block; width: 100%; height: 100%; }
  .handles { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 2; }
  .foot { fill: rgb(43 155 244 / 8%); stroke: #2b9bf4; stroke-width: 1.5; stroke-dasharray: 5 4; }
  .rise { stroke: #2b9bf4; stroke-width: 1.5; stroke-dasharray: 5 4; }
  .handles text {
    font: 600 12px system-ui, sans-serif; fill: #1f2937; text-anchor: middle; paint-order: stroke; stroke: #fff; stroke-width: 4px; stroke-linejoin: round;
  }
  .handle { fill: #fff; stroke: #1f2937; stroke-width: 1.5; pointer-events: auto; cursor: nwse-resize; }
  .handle:hover { fill: #2b9bf4; stroke: #2b9bf4; }
  .handle.top { cursor: ns-resize; }
  .turn { fill: #374151; stroke: #fff; stroke-width: 1.2; stroke-linejoin: round; pointer-events: auto; cursor: pointer; }
  .turn.on, .turn:hover { fill: #2b9bf4; }
  .plus {
    position: absolute; z-index: 2; display: grid; place-items: center; width: 2.5rem; height: 2.5rem; margin: -1.25rem 0 0 -1.25rem; padding: 0;
    border: 2.5px solid #fff; border-radius: 50%; background: #3b82f6; color: #fff; box-shadow: 0 2px 8px rgb(17 24 39 / 30%); cursor: pointer; opacity: 0.9;
  }
  .plus.hot, .plus:hover, .plus:focus-visible { background: #1d4ed8; opacity: 1; transform: scale(1.12); }
  .hint {
    position: absolute; z-index: 4; left: 50%; bottom: 6.6rem; transform: translateX(-50%); margin: 0; padding: 0.35rem 0.75rem; border-radius: 10px;
    background: rgb(17 24 39 / 82%); color: #fff; font-size: 0.82rem; pointer-events: none; white-space: nowrap;
  }
</style>
