<script lang="ts">
  // The Circle Generator: a card of points and lines on the left, and the
  // figure on the right, edited where it's drawn. A point on the circle is
  // dragged round it (5° steps, 1° with Ctrl or Cmd held); clicking a point,
  // a line, an angle, an arc or where lines cross opens its popup, and a
  // point's popup is where lines are drawn from it. Settings are mirrored into
  // the page address so a bookmark or shared link brings back exactly this
  // figure, and the server renders that same figure on first load.
  import { EyeOff, Plus, Shapes, X } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import Section from '$shared/Section.svelte'
  import MathInput from '$lib/shared/MathInput.svelte'
  import LineStylePicker from '$lib/shapes/LineStylePicker.svelte'
  import { ROUND_NAMES, UNITS, roundTo } from '$lib/shapes/parts.js'
  import AngleOptions from '$lib/labeling/AngleOptions.svelte'
  import CountPicker from '$lib/labeling/CountPicker.svelte'
  import Swatches from '$lib/labeling/Swatches.svelte'
  import LabelPicker from '$lib/labeling/LabelPicker.svelte'
  import PickLayer from '$lib/labeling/PickLayer.svelte'
  import PointOptions from '$lib/labeling/PointOptions.svelte'
  import Popover from '$lib/labeling/Popover.svelte'
  import ScrubAngle from '$lib/labeling/ScrubAngle.svelte'
  import type { Part } from '$lib/labeling/pick.js'
  import CapPicker from '../parallel-lines/CapPicker.svelte'
  import LineButton from '../parallel-lines/LineButton.svelte'
  import CircleFigure from './CircleFigure.svelte'
  import type { Face } from './faces.js'
  import { circleMeasures } from './measures.js'
  import { KIND_NAMES, meetAt, touchPoint } from './geometry.js'
  import { R, WHOLE, angleStyle, autoStyle, buildCircle, lineName, nodeName, type CircleLayout } from './layout.js'
  import {
    ARC_DEFAULTS, ARC_DRAWS, CENTER, MAX_LINES, MAX_POINTS,
    MAX_DIST, MIN_DIST, SIDES,
    cleanSettings, freeDir, freshNames, idsIn, isMid, midKey, newJoin, newTangent, newTangentFrom, nextId, onCircle, readRadius, settingsFromParams, settingsToQuery, touchKey,
    type AngleStyle, type ArcDraw, type ArcLabel, type ArcStyle, type Line, type RawSettings, type Side,
  } from './settings.js'

  const gen = generatorState(
    { tidy: (s) => cleanSettings(s as RawSettings), fromParams: settingsFromParams, toQuery: settingsToQuery, keyOf: settingsToQuery },
    'circle',
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const drawing = $derived(buildCircle(clean))
  const geo = $derived(drawing.geo)
  const radius = $derived(readRadius(clean.radius))
  const unitText = $derived(clean.unit.trim() ? ` ${clean.unit.trim()}` : '')
  const rounded = (v: number) => roundTo(v, clean.round)
  /** An area named by the named places round it, in order: OAB. */
  const areaName = (f: Face) =>
    f.corners.map((k) => (k === CENTER ? clean.centerName : clean.points.find((p) => p.id === k)?.name ?? clean.marks[k] ?? '').trim()).join('')
  const measures = $derived(circleMeasures(clean, drawing.areas.map((a) => a.face), areaName))
  function setFace(key: string, fill: number) {
    if (fill) s.faces[key] = fill
    else delete s.faces[key]
  }

  // While a point is dragged the view holds still, so the circle doesn't move under the pointer.
  let frozen = $state<CircleLayout['frame'] | null>(null)
  const shown = $derived(frozen ? { ...drawing, frame: frozen } : drawing)

  /** A place with a point's popup: the center, a point, where a tangent from a point touches the circle, or the middle of a line. */
  const isPoint = (key: string) => key === CENTER || /^p\d+$/.test(key) || /^l\d+:(t|mid)$/.test(key)
  const pointOf = (id: string) => s.points.find((p) => p.id === id)
  const lineOf = (id: string) => s.lines.find((l) => l.id === id)
  const geoLine = (id: string) => geo.lines.find((g) => g.id === id)
  const named = (key: string) => nodeName(clean, key)
  const join = (a: string, b: string) => s.lines.find((l) => l.kind === 'join' && ((l.a === a && l.b === b) || (l.a === b && l.b === a)))
  const tangentAt = (id: string) => s.lines.find((l) => l.kind === 'tangent' && l.a === id)

  // The popup open, for one part of the figure, and where.
  let popup = $state<{ part: Part; at: { x: number; y: number }; owner: Element | null } | null>(null)
  const close = () => (popup = null)
  const open = (part: Part, at: { x: number; y: number }, owner: Element | null = null) => (popup = { part, at, owner })
  function openFrom(part: Part, button: HTMLElement | undefined) {
    if (popup?.part.kind === part.kind && popup.part.key === part.key) return close()
    const r = button!.getBoundingClientRect()
    open(part, { x: r.left + r.width / 2, y: r.bottom }, button)
  }
  const buttons: Record<string, HTMLButtonElement> = $state({})

  const popupAngle = $derived(popup?.part.kind === 'angle' ? drawing.angles.find((a) => a.key === popup!.part.key) : null)
  const popupArc = $derived(popup?.part.kind === 'curve' ? geo.arcs.find((a) => a.key === popup!.part.key) : null)
  const popupArea = $derived(popup?.part.kind === 'area' ? drawing.areas.find((a) => a.key === popup!.part.key) : null)
  // A part that's gone (its point deleted, its crossing moved away) closes its popup.
  $effect(() => {
    if (!popup) return
    const { kind, key } = popup.part
    const there =
      kind === 'line' ? !!lineOf(key)
      : kind === 'angle' ? !!popupAngle
      : kind === 'curve' ? !!popupArc || (key === WHOLE && drawing.curves.some((c) => c.key === WHOLE))
      : kind === 'area' ? !!popupArea
      : isPoint(key) ? drawing.handles.some((h) => h.key === key)
      : drawing.spots.some((p) => p.key === key)
    if (!there) close()
  })

  /** Takes off what was set on parts made from these ids, so a new point or line can't inherit them. */
  function forget(ids: string[]) {
    const gone = (key: string) => idsIn(key).some((id) => ids.includes(id))
    for (const key of Object.keys(s.angles)) if (gone(key)) delete s.angles[key]
    for (const key of Object.keys(s.arcs)) if (gone(key)) delete s.arcs[key]
    for (const key of Object.keys(s.marks)) if (gone(key)) delete s.marks[key]
  }
  /** Takes away lines ending at these places, and the lines ending where those touch the circle, and so on. */
  function removeFrom(places: string[], lines: string[] = []) {
    const gone = new Set(lines)
    for (let more = true; more; ) {
      more = false
      for (const l of s.lines) {
        if (gone.has(l.id) || ![l.a, l.b].some((k) => places.includes(k) || gone.has(k.split(':')[0]))) continue
        gone.add(l.id)
        more = true
      }
    }
    s.lines = s.lines.filter((l) => !gone.has(l.id))
    for (const l of s.lines) {
      if (gone.has(l.toA)) l.toA = ''
      if (gone.has(l.toB)) l.toB = ''
    }
    forget([...places, ...gone])
    if (popup && [...places, ...gone].some((k) => popup!.part.key === k || popup!.part.key.startsWith(`${k}:`))) close()
  }
  const removeLine = (id: string) => removeFrom([], [id])
  function removePoint(id: string) {
    s.points = s.points.filter((p) => p.id !== id)
    removeFrom([id])
  }
  function addPoint() {
    s.points.push({ id: nextId(s.points, 'p'), name: freshNames(s, 1)[0] ?? '', dir: String(freeDir(s.points)), dist: '1' })
  }
  /** A point in the middle of an arc, whose popup takes the arc's place. */
  function addPointAt(deg: number) {
    if (s.points.length >= MAX_POINTS) return
    const id = nextId(s.points, 'p')
    s.points.push({ id, name: freshNames(s, 1)[0] ?? '', dir: String(Math.round((deg % 360) * 10) / 10), dist: '1' })
    if (popup) popup = { ...popup, part: { kind: 'point', key: id } }
  }
  function toggleJoin(a: string, b: string) {
    const l = join(a, b)
    if (l) removeLine(l.id)
    else if (s.lines.length < MAX_LINES) s.lines.push(newJoin(nextId(s.lines, 'l'), a, b))
  }
  function toggleTangent(id: string) {
    const l = tangentAt(id)
    if (l) removeLine(l.id)
    else if (s.lines.length < MAX_LINES) s.lines.push(newTangent(nextId(s.lines, 'l'), id))
  }
  /** The tangents from a point outside the circle, on whichever sides are asked for. */
  function setTangentsFrom(id: string, sides: Side[]) {
    for (const l of s.lines.filter((x) => x.kind === 'from' && x.a === id && !sides.includes(x.side))) removeLine(l.id)
    for (const side of sides) {
      if (!tangentFrom(id, side) && s.lines.length < MAX_LINES) s.lines.push(newTangentFrom(nextId(s.lines, 'l'), id, side))
    }
  }
  const tangentFrom = (id: string, side: Side) => s.lines.find((l) => l.kind === 'from' && l.a === id && l.side === side)
  /** What the two tangents from a point are called on the page: by where they touch, left and right, or top and bottom. */
  function sideNames(id: string): Record<Side, string> {
    const P = geo.where.get(id)
    const [L, Rt] = SIDES.map((side) => (P ? touchPoint(P, side) : null))
    if (!L || !Rt) return { left: 'One side', right: 'Other side' }
    const across = Math.abs(L[0] - Rt[0]) > Math.abs(L[1] - Rt[1])
    return across ? (L[0] < Rt[0] ? { left: 'Left', right: 'Right' } : { left: 'Right', right: 'Left' }) : L[1] > Rt[1] ? { left: 'Top', right: 'Bottom' } : { left: 'Bottom', right: 'Top' }
  }
  const outside = (id: string) => {
    const P = geo.where.get(id)
    return !!P && Math.hypot(P[0], P[1]) > 1 + 1e-6
  }

  // A new line joins the first two places not yet joined; a new tangent goes at the first point on the circle without one,
  // else from the first point outside it without both.
  // The places a line's ends can be picked from: the center, the points and the touch points. Midpoints aren't among
  // them: a line from a midpoint is drawn from the midpoint's own popup, and has its own row.
  const places = $derived([CENTER, ...s.points.map((p) => p.id), ...drawing.handles.filter((h) => h.key.endsWith(':t')).map((h) => h.key)])
  /** The middles of the lines between two places, by those places' names (AB), for a line from a midpoint to start at. */
  const midpoints = $derived(
    s.lines.filter((l) => l.kind === 'join' && !isMid(l.a) && !isMid(l.b)).map((l) => ({ key: midKey(l.id), name: `${named(l.a)}${named(l.b)}` })),
  )
  /** A new line from a midpoint: the first one not yet joined to the center, to the center. */
  function addMidpointLine() {
    const m = midpoints.find((x) => !join(x.key, CENTER)) ?? midpoints[0]
    if (m && s.lines.length < MAX_LINES) s.lines.push(newJoin(nextId(s.lines, 'l'), m.key, CENTER))
  }
  /** The places a popup offers to join to: the center, the points, and touch points once they're named. */
  const joinable = $derived(places.filter((k) => !k.endsWith(':t') || !!clean.marks[k]?.trim()))
  const freePair = $derived.by(() => {
    for (const a of places) for (const b of places) if (a < b && !join(a, b)) return [a, b] as const
    return null
  })
  const freeTangent = $derived.by((): (() => void) | null => {
    const at = s.points.find((p) => onCircle(p) && !tangentAt(p.id))
    if (at) return () => s.lines.push(newTangent(nextId(s.lines, 'l'), at.id))
    for (const p of s.points) {
      const side = outside(p.id) && SIDES.find((x) => !tangentFrom(p.id, x))
      if (side) return () => s.lines.push(newTangentFrom(nextId(s.lines, 'l'), p.id, side))
    }
    return null
  })

  // An inscribed polygon: its corners evenly round the circle, a side along the bottom, joined in order.
  let polygonSides = $state(4)
  function addPolygon() {
    const n = polygonSides
    const names = freshNames(s, n)
    const ids: string[] = []
    for (let i = 0; i < n; i++) {
      const id = nextId(s.points, 'p')
      ids.push(id)
      s.points.push({ id, name: names[i] ?? '', dir: String(Math.round(((270 - 180 / n + (360 * i) / n) % 360) * 100) / 100), dist: '1' })
    }
    for (let i = 0; i < n; i++) s.lines.push(newJoin(nextId(s.lines, 'l'), ids[i], ids[(i + 1) % n]))
  }

  function setAngle(key: string, auto: boolean, patch: Partial<AngleStyle>) {
    const next = { ...angleStyle(clean, key, auto), ...patch }
    if (JSON.stringify(next) === JSON.stringify(autoStyle(auto))) delete s.angles[key]
    else s.angles[key] = next
  }
  function setArc(key: string, patch: Partial<ArcStyle>) {
    const next = { ...(s.arcs[key] ?? ARC_DEFAULTS), ...patch }
    if (JSON.stringify(next) === JSON.stringify(ARC_DEFAULTS)) delete s.arcs[key]
    else s.arcs[key] = next
  }
  /**
   * Runs one end of a line on until it meets another line, or back to a set
   * length (`to` empty). The other line runs on to meet it too, from
   * whichever end faces it, so two tangents reach where they cross.
   */
  function setMeet(l: Line, end: 'a' | 'b', to: string) {
    const before = lineOf(end === 'a' ? l.toA : l.toB)
    if (before?.toA === l.id) before.toA = ''
    if (before?.toB === l.id) before.toB = ''
    if (end === 'a') l.toA = to
    else l.toB = to
    const [o, g, go] = [lineOf(to), geoLine(l.id), geoLine(to)]
    if (!o || !g || !go) return
    const back = (['a', 'b'] as const).find((e) => meetAt(go, g, e) !== null)
    if (back === 'a' && !o.toA) Object.assign(o, { runA: true, toA: l.id })
    if (back === 'b' && !o.toB) Object.assign(o, { runB: true, toB: l.id })
  }
  function setMark(key: string, name: string | undefined) {
    if (name === undefined) delete s.marks[key]
    else s.marks[key] = name
  }

  /** What a line's ends are called: past its points, or which way a tangent runs on the page. */
  function endNames(l: Line) {
    if (l.kind === 'join') return { a: `Past ${named(l.a)}`, b: `Past ${named(l.b)}` }
    if (l.kind === 'from') return { a: `Past ${named(l.a)}`, b: `Past ${named(touchKey(l.id))}` }
    const d = geoLine(l.id)?.d ?? [1, 0]
    const [b, a] = Math.abs(d[0]) > 0.3 ? (d[0] > 0 ? ['Right', 'Left'] : ['Left', 'Right']) : d[1] > 0 ? ['Top', 'Bottom'] : ['Bottom', 'Top']
    return { a: `${a} end`, b: `${b} end` }
  }
  /** The button before a line's row: how it's drawn, with a run-on end's cap. */
  const looks = (l: Line) => ({ ...l, name: '', startCap: l.runA ? l.capA : 'none', endCap: l.runB ? l.capB : 'none' }) as Line & { name: string; startCap: Line['capA']; endCap: Line['capB'] }

  // Dragging a point round the circle, or off it and back; a press that doesn't move opens its popup. A point on the
  // circle leaves it once pulled a third of a radius away, and one off it lands on it within a tenth.
  const PULL_OFF = 1 / 3
  const SNAP_ON = 0.1
  let drag: { key: string; id: number; x: number; y: number; moved: boolean } | null = null
  let hovered = $state<string | null>(null)
  function screenOf(el: SVGGraphicsElement, [x, y]: [number, number]) {
    const m = el.ownerSVGElement!.getScreenCTM()!
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }
  }
  function down(event: PointerEvent, h: CircleLayout['handles'][number]) {
    if (event.button !== 0) return
    event.preventDefault()
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    drag = { key: h.key, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
  }
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return
    const p = pointOf(drag.key)
    if (!p) return
    if (!drag.moved) frozen = drawing.frame
    drag.moved = true
    const m = (event.currentTarget as SVGGraphicsElement).ownerSVGElement!.getScreenCTM()!.inverse()
    const at = new DOMPoint(event.clientX, event.clientY).matrixTransform(m)
    const fine = event.ctrlKey || event.metaKey
    const step = fine ? 1 : 5
    const deg = (Math.atan2(-at.y, at.x) * 180) / Math.PI
    p.dir = String((((Math.round(deg / step) * step) % 360) + 360) % 360)
    // A point on the circle slides round it until it's pulled well off; one off it moves anywhere, its distance in
    // quarter radii (twentieths with Ctrl or Cmd), and snaps onto the circle when it comes near.
    const r = Math.hypot(at.x, at.y) / R
    const by = fine ? 0.05 : 0.25
    if (onCircle(p) ? Math.abs(r - 1) < PULL_OFF : Math.abs(r - 1) < SNAP_ON) p.dist = '1'
    else p.dist = String(Number(Math.min(MAX_DIST, Math.max(by, Math.round(r / by) * by)).toFixed(2)))
  }
  function up(event: PointerEvent, h: CircleLayout['handles'][number]) {
    if (!drag || event.pointerId !== drag.id) return
    const moved = drag.moved
    drag = null
    frozen = null
    if (!moved) open({ kind: 'point', key: h.key }, screenOf(event.currentTarget as SVGGraphicsElement, h.at))
  }
  // Dragging a line's label across the line puts it on the other side; a press that doesn't move opens the line's popup.
  let labelDrag: { id: string; pointer: number; x: number; y: number; moved: boolean } | null = null
  function labelDown(event: PointerEvent, id: string) {
    if (event.button !== 0) return
    event.preventDefault()
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    labelDrag = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
  }
  function labelMove(event: PointerEvent) {
    if (!labelDrag || event.pointerId !== labelDrag.pointer) return
    if (!labelDrag.moved && Math.hypot(event.clientX - labelDrag.x, event.clientY - labelDrag.y) < 4) return
    if (!labelDrag.moved) frozen = drawing.frame
    labelDrag.moved = true
    const l = lineOf(labelDrag.id)
    const g = drawing.segments.find((x) => x.id === labelDrag!.id)
    const label = drawing.labels.find((x) => x.part === `line:${labelDrag!.id}`)
    if (!l || !g || !label) return
    const m = (event.currentTarget as SVGGraphicsElement).ownerSVGElement!.getScreenCTM()!.inverse()
    const at = new DOMPoint(event.clientX, event.clientY).matrixTransform(m)
    const along = [g.to[0] - g.from[0], g.to[1] - g.from[1]]
    const sideOf = (x: number, y: number) => Math.sign(along[0] * (y - g.from[1]) - along[1] * (x - g.from[0]))
    const pointer = sideOf(at.x, at.y)
    if (pointer && pointer !== sideOf(label.cx, label.cy)) l.flip = !l.flip
  }
  function labelUp(event: PointerEvent, label: CircleLayout['labels'][number]) {
    if (!labelDrag || event.pointerId !== labelDrag.pointer) return
    const { id, moved } = labelDrag
    labelDrag = null
    frozen = null
    if (!moved) open({ kind: 'line', key: id }, screenOf(event.currentTarget as SVGGraphicsElement, [label.cx, label.cy]))
  }

  function handleKey(event: KeyboardEvent, h: CircleLayout['handles'][number]) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open({ kind: 'point', key: h.key }, screenOf(event.currentTarget as SVGGraphicsElement, h.at))
      return
    }
    // Left and right turn it round the center; up and down move it out and in, off the circle and back on.
    const p = pointOf(h.key)
    const fine = event.ctrlKey || event.metaKey
    const outward = { ArrowUp: 1, ArrowDown: -1 }[event.key as 'ArrowUp' | 'ArrowDown']
    const by = { ArrowRight: -1, ArrowLeft: 1 }[event.key as 'ArrowRight' | 'ArrowLeft']
    if (!p || h.dir === null || h.dist === null || !(by || outward)) return
    event.preventDefault()
    if (outward) {
      const step = fine ? 0.05 : 0.25
      p.dist = String(Number(Math.min(MAX_DIST, Math.max(step, Math.round(h.dist / step) * step + outward * step)).toFixed(2)))
      return
    }
    const step = fine ? 1 : 5
    p.dir = String((((Math.round(h.dir / step) * step + by! * step) % 360) + 360) % 360)
  }

  const figureSummary = $derived(
    [radius !== null ? `radius ${rounded(radius)}${unitText}` : 'no radius', `measures to ${ROUND_NAMES[clean.round]}`].join(' · '),
  )
  let svg = $state<SVGSVGElement>()
</script>

{#snippet pointRow(id: string)}
  {@const p = pointOf(id)}
  <div class="row" role="group" aria-label={p ? 'Point' : 'The center'}>
    {#if p}
      <input class="pname" type="text" maxlength="4" aria-label="Name of the point" placeholder="name" bind:value={p.name} />
      <div class="dir">
        <ScrubAngle
          id="dir-{p.id}" label="{named(p.id)}'s direction from the center, in degrees counterclockwise from the right" symbol="↻" min={0} max={360}
          invalid={!!geo.problems[p.id]} bind:value={p.dir}
        />
      </div>
      <div class="dist">
        <ScrubAngle
          id="dist-{p.id}" label="how far {named(p.id)} is from the center, in radii: 1 is on the circle" symbol="↔" suffix="r" step={0.05}
          min={MIN_DIST} max={MAX_DIST} invalid={!!geo.problems[p.id]} bind:value={p.dist}
        />
      </div>
      <button type="button" class="remove" aria-label="Remove this point" data-tip="Remove" onclick={() => removePoint(p.id)}><X size={16} /></button>
    {:else}
      <input class="pname" type="text" maxlength="4" aria-label="Name of the center" placeholder="name" bind:value={s.centerName} />
      <span class="where">the center</span>
    {/if}
  </div>
  {#if p && geo.problems[p.id]}<p class="help problem">{geo.problems[p.id]}</p>{/if}
{/snippet}

{#snippet placeSelect(value: string, label: string, onpick: (v: string) => void, among: string[])}
  <select class="place" aria-label={label} {value} onchange={(e) => onpick(e.currentTarget.value)}>
    {#each among.includes(value) ? among : [value, ...among] as key}<option value={key}>{named(key)}</option>{/each}
  </select>
{/snippet}

{#snippet lineRow(l: Line)}
  {@const g = geoLine(l.id)}
  {@const mid = [l.a, l.b].find(isMid)}
  <div class="row" role="group" aria-label="Line">
    <LineButton
      line={looks(l)} name={g ? lineName(clean, g) : 'line'} expanded={popup?.part.kind === 'line' && popup.part.key === l.id}
      bind:button={buttons[l.id]} onclick={() => openFrom({ kind: 'line', key: l.id }, buttons[l.id])}
    />
    {#if mid}
      <!-- From the midpoint of a line, picked by its line, to a place. -->
      <span class="kind">Midpoint of</span>
      <select
        class="place" aria-label="Which line's midpoint it starts from" value={mid}
        onchange={(e) => (mid === l.a ? (l.a = e.currentTarget.value) : (l.b = e.currentTarget.value))}
      >
        {#each midpoints as m}<option value={m.key}>{m.name}</option>{/each}
      </select>
      <span class="at">to</span>
      {@render placeSelect(mid === l.a ? l.b : l.a, 'The other end of the line', (v) => (mid === l.a ? (l.b = v) : (l.a = v)), places)}
    {:else}
      <span class="kind">{l.kind === 'from' ? 'Tangent from' : g ? KIND_NAMES[g.kind] : 'Line'}</span>
    {/if}
    {#if mid}{:else if l.kind === 'tangent'}
      <span class="at">at</span>
      {@render placeSelect(l.a, 'Where the tangent touches', (v) => (l.a = v), s.points.filter(onCircle).map((p) => p.id))}
    {:else if l.kind === 'from'}
      {@const names = sideNames(l.a)}
      {@render placeSelect(l.a, 'The point the tangent comes from', (v) => (l.a = v), s.points.filter((p) => !onCircle(p)).map((p) => p.id))}
      <select class="place side" aria-label="Which of the two tangents" value={l.side} onchange={(e) => (l.side = e.currentTarget.value as Side)}>
        {#each SIDES as side}<option value={side}>{names[side]}</option>{/each}
      </select>
    {:else}
      {@render placeSelect(l.a, 'One end of the line', (v) => (l.a = v), places)}
      {@render placeSelect(l.b, 'The other end of the line', (v) => (l.b = v), places)}
    {/if}
    <button type="button" class="remove" aria-label="Remove this line" data-tip="Remove" onclick={() => removeLine(l.id)}><X size={16} /></button>
  </div>
{/snippet}

<GeneratorPage name="Circle Generator" filename="circle" {gen} {svg} settingsWidth={27} bind:labelSize={s.labelSize} printWidth={5}>
  {#snippet inputs()}
    <section class="card-body">
      <div class="head-row">
        <h2 class="card-head">Points</h2>
        <HelpTip id="circle-tip" label="How the figure works">
          Each point is placed by its direction from the center (0° to the right, counting counterclockwise) and how
          many radii it is from the center: 1 is on the circle. Drag a point round the circle in 5° steps, or 1° with
          Ctrl (Cmd on a Mac) held; pull it well away to take it off the circle, and bring it near to put it back on. Click part of the circle and choose Add point here to put a point in its middle. Click a point to join it to another or draw a
          tangent there (or, from a point outside the circle, the tangents from it). Click the middle of a chord to name its
          midpoint or join it to the center, and click any line, angle or arc to label or style it, or inside an enclosed area to shade it.
          Drag a line's label across the line to put it on the other side. Click where lines cross, or where a line meets the circle, to name a point there.
        </HelpTip>
      </div>
      {@render pointRow(CENTER)}
      {#if s.points.length}
        <div class="row heads" aria-hidden="true"><span class="pname-head">Point</span><span class="dir">Direction</span><span class="dist">From O</span></div>
      {/if}
      {#each s.points as p (p.id)}{@render pointRow(p.id)}{/each}
      <div class="adds">
        <button type="button" class="btn-ghost add" disabled={s.points.length >= MAX_POINTS} onclick={() => addPoint()}><Plus size={16} /> Add point</button>
        <div class="polygon">
          <button type="button" class="btn-ghost add" disabled={s.points.length + polygonSides > MAX_POINTS || s.lines.length + polygonSides > MAX_LINES} onclick={addPolygon}>
            <Plus size={16} /> Add inscribed polygon
          </button>
          <select aria-label="Sides of the inscribed polygon" bind:value={polygonSides}>
            {#each [3, 4, 5, 6, 7, 8] as n}<option value={n}>{n} sides</option>{/each}
          </select>
        </div>
      </div>
    </section>
    <section class="card-body second">
      <h2 class="card-head">Lines</h2>
      {#each s.lines as l (l.id)}{@render lineRow(l)}{/each}
      <div class="adds">
        <button
          type="button" class="btn-ghost add" disabled={!freePair || s.lines.length >= MAX_LINES}
          onclick={() => freePair && s.lines.push(newJoin(nextId(s.lines, 'l'), freePair[0], freePair[1]))}
        ><Plus size={16} /> Add line</button>
        <button type="button" class="btn-ghost add" disabled={!freeTangent || s.lines.length >= MAX_LINES} onclick={() => freeTangent?.()}><Plus size={16} /> Add tangent</button>
        <button type="button" class="btn-ghost add" disabled={!midpoints.length || s.lines.length >= MAX_LINES} onclick={addMidpointLine}><Plus size={16} /> Add midpoint line</button>
      </div>
    </section>
    {#if measures.length}
      <section class="card-body second">
        <h2 class="card-head">Measures</h2>
        <ul class="readout">
          {#each measures as m}
            <li><span class="what">{m.name}</span>{#each m.values as v}<span class="value">{v}</span>{/each}</li>
          {/each}
        </ul>
      </section>
    {/if}
  {/snippet}

  {#snippet settings()}
    <Section title="Figure" icon={Shapes} summary={figureSummary}>
      <div class="two">
        <label class="field">
          Radius
          <input type="text" inputmode="decimal" aria-invalid={radius === null} bind:value={s.radius} />
        </label>
        <label class="field">
          Unit
          <select bind:value={s.unit}>
            <option value="">None</option>
            {#each UNITS.slice(1) as u}<option value={u}>{u}</option>{/each}
          </select>
        </label>
      </div>
      {#if radius === null}<p class="help problem">Give the radius as a number above 0, for lengths.</p>{/if}
      <label class="field">
        Round measures to
        <select bind:value={s.round}>
          <option value={0}>Whole numbers</option>
          <option value={1}>Tenths</option>
          <option value={2}>Hundredths</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" bind:checked={s.centerDot} /><span>Dot at the center</span></label>
      <label class="check"><input type="checkbox" bind:checked={s.dots} /><span>Dots at the points</span></label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <div class="stage">
      <CircleFigure figure={drawing} frame={frozen} bind:svg />
      <PickLayer figure={shown} selected={popup?.part ?? null} onpick={(part, at) => open(part, at)}>
        {#each shown.hidden as d}<path {d} fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4" pointer-events="none" />{/each}
        {#each shown.labels.filter((l) => l.part.startsWith('line:')) as l (l.part)}
          {@const id = l.part.slice(5)}
          <rect
            x={l.x - 3} y={l.y - l.box.asc - 3} width={l.box.w + 6} height={l.box.asc + l.box.desc + 6} fill="transparent" class="label-handle"
            role="button" tabindex="-1" aria-label="Drag across the line to move this label to its other side"
            onpointerdown={(e) => labelDown(e, id)} onpointermove={labelMove} onpointerup={(e) => labelUp(e, l)} onpointercancel={(e) => labelUp(e, l)}
          />
        {/each}
        {#each shown.handles as h (h.key)}
          {@const lit = hovered === h.key || (popup?.part.kind === 'point' && popup.part.key === h.key)}
          {#if lit}
            <circle cx={h.at[0]} cy={h.at[1]} r="9" fill="#2563eb" fill-opacity="0.25" pointer-events="none" />
            <circle cx={h.at[0]} cy={h.at[1]} r="3.5" fill="#2563eb" pointer-events="none" />
          {/if}
          <circle
            cx={h.at[0]} cy={h.at[1]} r={h.key.endsWith(':mid') ? 8 : 11} fill="transparent" class="handle" class:fixed={h.dir === null} role="button" tabindex="0"
            aria-label={h.key === CENTER ? `The center, ${named(h.key)}`
              : h.key.endsWith(':mid') ? `The ${named(h.key)}`
              : h.dir === null ? `Where a tangent touches the circle, ${named(h.key)}`
              : `Point ${named(h.key)} at ${rounded(h.dir)}°, ${h.on ? 'on the circle' : `${rounded(h.dist ?? 0)} radii from the center`}. Drag it, or use the arrow keys: left and right turn it round the center, up and down move it out and in`}
            onpointerdown={(e) => down(e, h)} onpointermove={move} onpointerup={(e) => up(e, h)} onpointercancel={(e) => up(e, h)}
            onpointerenter={(e) => e.pointerType === 'mouse' && (hovered = h.key)} onpointerleave={() => hovered === h.key && (hovered = null)}
            onkeydown={(e) => handleKey(e, h)}
          />
        {/each}
      </PickLayer>
    </div>
  {/snippet}
</GeneratorPage>

{#if popup}
  {@const key = popup.part.key}
  <Popover at={popup.at} owner={popup.owner} onclose={close} label="Settings for this part of the figure">
    {#if popup.part.kind === 'point' && isPoint(key)}
      {@const p = pointOf(key)}
      {@const touch = key.endsWith(':t') || key.endsWith(':mid')}
      {@const others = joinable.filter((k) => k !== key)}
      {@const h = drawing.handles.find((x) => x.key === key)}
      <div class="pop-head">
        <span>
          {key.endsWith(':mid') ? `Midpoint of ${named(lineOf(key.split(':')[0])?.a ?? '')}${named(lineOf(key.split(':')[0])?.b ?? '')}`
          : touch ? `Where the tangent from ${named(lineOf(key.split(':')[0])?.a ?? '')} touches`
          : p ? `Point ${named(key)}` : `Center ${named(key)}`}
        </span>
        {#if p && h?.dir != null}<span class="measure">{rounded(h.dir)}°{h.on ? '' : `, ${rounded(h.dist ?? 0)} r`}</span>{/if}
      </div>
      {#if touch}
        <PointOptions name={s.marks[key]} onchange={(name) => setMark(key, name)} />
      {:else}
        <label class="group">
          <span class="name">Name</span>
          {#if p}<input type="text" maxlength="4" placeholder="A" bind:value={p.name} />
          {:else}<input type="text" maxlength="4" placeholder="O" bind:value={s.centerName} />{/if}
        </label>
      {/if}
      {#if others.length}
        <div class="group">
          <span class="name" id="pop-join">Join to</span>
          <div class="chips" role="group" aria-labelledby="pop-join">
            {#each others as other (other)}
              {@const on = !!join(key, other)}
              <button type="button" class="chip" class:on aria-pressed={on} disabled={!on && s.lines.length >= MAX_LINES} onclick={() => toggleJoin(key, other)}>
                {named(other)}
              </button>
            {/each}
          </div>
        </div>
      {/if}
      {#if p && onCircle(p)}
        {@const on = !!tangentAt(key)}
        <div class="group">
          <span class="name" id="pop-tangent">Tangent here</span>
          <div class="segmented" role="radiogroup" aria-labelledby="pop-tangent">
            <button type="button" role="radio" aria-checked={!on} class:on={!on} onclick={() => on && toggleTangent(key)}>None</button>
            <button type="button" role="radio" aria-checked={on} class:on disabled={!on && s.lines.length >= MAX_LINES} onclick={() => !on && toggleTangent(key)}>Tangent</button>
          </div>
        </div>
      {:else if p && outside(key)}
        {@const names = sideNames(key)}
        {@const have = SIDES.filter((x) => !!tangentFrom(key, x))}
        <div class="group">
          <span class="name" id="pop-tangents">Tangents from here</span>
          <div class="segmented" role="radiogroup" aria-labelledby="pop-tangents">
            {#each [[], ['left'], ['right'], ['left', 'right']] as Side[][] as choice}
              {@const on = choice.length === have.length && choice.every((x) => have.includes(x))}
              <button type="button" role="radio" aria-checked={on} class:on onclick={() => setTangentsFrom(key, choice)}>
                {choice.length === 0 ? 'None' : choice.length === 2 ? 'Both' : names[choice[0]]}
              </button>
            {/each}
          </div>
        </div>
      {/if}
      {#if p}
        <button type="button" class="btn-ghost delete" onclick={() => removePoint(key)}>Delete this point</button>
      {:else if !touch}
        <div class="group">
          <span class="name" id="pop-dot">Dot</span>
          <div class="segmented" role="radiogroup" aria-labelledby="pop-dot">
            <button type="button" role="radio" aria-checked={!s.centerDot} class:on={!s.centerDot} onclick={() => (s.centerDot = false)}>Hide</button>
            <button type="button" role="radio" aria-checked={s.centerDot} class:on={s.centerDot} onclick={() => (s.centerDot = true)}>Show</button>
          </div>
        </div>
      {/if}
    {:else if popup.part.kind === 'point'}
      <div class="pop-head"><span>{key.includes('.') ? 'Where lines cross' : 'Where a line meets the circle'}</span></div>
      <PointOptions name={s.marks[key]} onchange={(name) => setMark(key, name)} />
    {:else if popup.part.kind === 'angle' && popupAngle}
      {@const a = popupAngle}
      <div class="pop-head"><span>Angle at {named(a.node)}</span><span class="measure">{a.ghost.text}</span></div>
      <AngleOptions value={angleStyle(clean, key, a.auto)} right={a.right} shading={false} onchange={(patch) => setAngle(key, a.auto, patch)} />
    {:else if popup.part.kind === 'area' && popupArea}
      {@const f = popupArea.face}
      <div class="pop-head">
        <span>Area {areaName(f)}</span>
        {#if radius !== null}<span class="measure">{rounded(f.area * radius * radius)}{clean.unit.trim() ? ` ${clean.unit.trim()}²` : ''}</span>{/if}
      </div>
      <div class="group">
        <span class="name" id="pop-area-shade">Shading</span>
        <Swatches id="pop-area-shade" value={s.faces[key] ?? 0} onpick={(i) => setFace(key, i)} />
      </div>
    {:else if popup.part.kind === 'curve' && key === WHOLE}
      <div class="pop-head"><span>Circle</span></div>
      <button type="button" class="btn-ghost add-here" onclick={() => addPointAt(90)}><Plus size={16} /> Add point here</button>
    {:else if popup.part.kind === 'curve' && popupArc}
      {@const arc = popupArc}
      {@const style = s.arcs[key] ?? ARC_DEFAULTS}
      <div class="pop-head">
        <span>Arc {named(arc.from)}{arc.to !== arc.from ? named(arc.to) : ''}</span>
        <span class="measure">{rounded(arc.sweep)}°{radius !== null ? ` · ${rounded((arc.sweep * Math.PI * radius) / 180)}${unitText}` : ''}</span>
      </div>
      <button type="button" class="btn-ghost add-here" disabled={s.points.length >= MAX_POINTS} onclick={() => addPointAt(arc.start + arc.sweep / 2)}>
        <Plus size={16} /> Add point here
      </button>
      <div class="group">
        <span class="name" id="pop-arc-label">Label</span>
        <div class="segmented" role="radiogroup" aria-labelledby="pop-arc-label">
          {#each [['none', 'None'], ['degrees', 'Degrees'], ['length', 'Length'], ['text', 'Text']] as [v, title] (v)}
            <button type="button" role="radio" aria-checked={style.label === v} class:on={style.label === v} onclick={() => setArc(key, { label: v as ArcLabel })}>{title}</button>
          {/each}
        </div>
        {#if style.label === 'text'}<MathInput id="pop-arc-text" aria-label="Label text" placeholder="x" bind:value={() => style.text, (v) => setArc(key, { text: v })} />{/if}
      </div>
      <div class="group">
        <span class="name" id="pop-arc-ticks">Congruence ticks</span>
        <CountPicker id="pop-arc-ticks" value={style.ticks} glyph="|" onpick={(n) => setArc(key, { ticks: n })} />
      </div>
      <div class="group">
        <span class="name" id="pop-arc-draw">Drawn</span>
        <div class="segmented" role="radiogroup" aria-labelledby="pop-arc-draw">
          {#each Object.entries(ARC_DRAWS) as [v, d] (v)}
            <button type="button" role="radio" aria-checked={style.draw === v} class:on={style.draw === v} aria-label="{d.name} arc" title="{d.name} arc" onclick={() => setArc(key, { draw: v as ArcDraw })}>
              {#if v === 'hidden'}<EyeOff size={15} aria-hidden="true" />
              {:else}
                <svg viewBox="0 0 26 14" width="26" height="14" aria-hidden="true">
                  <path d="M3,12 Q13,0 23,12" fill="none" stroke={d.color || 'currentColor'} stroke-width={d.color ? 3.5 : 1.6} stroke-linecap="round" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {:else if popup.part.kind === 'line' && lineOf(key)}
      {@const l = lineOf(key)!}
      {@const g = geoLine(key)}
      {@const ends = endNames(l)}
      {@const tangent = l.kind === 'tangent'}
      <div class="pop-head">
        <span>{g ? lineName(clean, g) : 'Line'}</span>
        {#if g && !tangent && radius !== null}<span class="measure">{rounded(g.length * radius)}{unitText}</span>{/if}
      </div>
      <div class="group">
        <span class="name" id="pop-label">Label</span>
        <LabelPicker id="pop-label" value={l.label} measure={!tangent} onpick={(v) => (l.label = v)} />
        {#if l.label === 'text'}<MathInput id="pop-text" aria-label="Label text" placeholder="x" bind:value={l.text} />{/if}
      </div>
      <div class="group">
        <span class="name" id="pop-ticks">Congruence ticks</span>
        <CountPicker id="pop-ticks" value={l.ticks} glyph="|" onpick={(n) => (l.ticks = n)} />
      </div>
      <div class="group">
        <span class="name" id="pop-arrows">Parallel arrows</span>
        <CountPicker id="pop-arrows" value={l.arrows} glyph="›" onpick={(n) => (l.arrows = n)} />
      </div>
      {#each [['a', 'runA', 'capA'], ['b', 'runB', 'capB']] as const as [end, run, cap] (end)}
        {@const other = end === 'a' ? l.runB : l.runA}
        <div class="group">
          <span class="name" id="pop-run-{end}">{ends[end]}</span>
          <div class="ends">
            <div class="segmented" role="radiogroup" aria-labelledby="pop-run-{end}">
              <button
                type="button" role="radio" aria-checked={!l[run]} class:on={!l[run]} disabled={tangent && !other}
                onclick={() => (l[run] = false)}
              >{tangent ? 'Stops' : `At ${named(end === 'a' ? l.a : l.b)}`}</button>
              <button type="button" role="radio" aria-checked={l[run]} class:on={l[run]} onclick={() => (l[run] = true)}>Runs on</button>
            </div>
            {#if l[run]}
              {@const meets = g ? geo.lines.filter((o) => o.id !== l.id && meetAt(g, o, end) !== null) : []}
              {@const to = end === 'a' ? l.toA : l.toB}
              {#if meets.length || to}
                <select aria-label="{ends[end]}: how far it runs" value={to} onchange={(e) => setMeet(l, end, e.currentTarget.value)}>
                  <option value="">A set length</option>
                  {#each meets as o (o.id)}<option value={o.id}>Until it meets {lineName(clean, o).replace(/^\w/, (c) => c.toLowerCase())}</option>{/each}
                </select>
              {/if}
              <CapPicker side={end === 'a' ? 'start' : 'end'} label="{ends[end]}: cap" bind:value={l[cap]} />
            {/if}
          </div>
        </div>
      {/each}
      <LineStylePicker id="pop-style" bind:value={l.style} />
      <button type="button" class="btn-ghost delete" onclick={() => removeLine(l.id)}>Delete this line</button>
    {/if}
  </Popover>
{/if}

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .card-body { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.45rem; }
  .card-body.second { border-top: 1px solid var(--border); }
  .head-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .row { display: flex; align-items: center; gap: 0.35rem; }
  .pname { width: 3.6rem; flex: none; height: 2.6rem; box-sizing: border-box; font-family: 'Times New Roman', Times, serif; font-style: italic; font-size: 1.05rem; }
  .dir { width: 5.9rem; flex: none; }
  .dist { width: 5.2rem; flex: none; }
  .heads { font-size: 0.75rem; font-weight: 700; color: var(--muted); margin-bottom: -0.2rem; }
  .heads span { padding-left: 0.2rem; }
  .pname-head { width: 3.6rem; flex: none; }
  .place.side { flex: 1.5 1 0; min-width: 6rem; font-family: inherit; font-style: normal; font-size: 0.85rem; }
  /* The degrees right after the number, not at the far end of the box. */
  .dir :global(input[type='text']), .dist :global(input[type='text']) { flex: 0 1 auto; width: auto; min-width: 1.5ch; field-sizing: content; }
  .where { color: var(--muted); font-size: 0.88rem; padding-left: 0.2rem; white-space: nowrap; }
  .kind { width: 5.6rem; flex: none; font-size: 0.85rem; font-weight: 600; line-height: 1.15; }
  .at { flex: none; color: var(--muted); font-size: 0.85rem; }
  .place { flex: 1 1 3rem; min-width: 3rem; height: 2.6rem; font-family: 'Times New Roman', Times, serif; font-style: italic; font-size: 1.05rem; }
  .remove { display: inline-grid; place-items: center; width: 2rem; height: 2.6rem; flex: none; border: 0; background: none; color: var(--muted); border-radius: 8px; margin-left: auto; }
  .remove:hover:not(:disabled) { color: var(--red); background: #fef2f2; }
  .adds { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
  .add { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.8rem; font-size: 0.85rem; border-radius: 10px; white-space: nowrap; }
  .polygon { display: inline-flex; align-items: center; gap: 0.3rem; }
  .polygon select { width: auto; height: 2.2rem; font-size: 0.85rem; }

  .help { margin: 0; font-size: 0.84rem; color: var(--muted); }
  .help.problem { color: var(--red); font-weight: 600; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .check { display: flex; align-items: flex-start; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0.08rem 0 0; accent-color: var(--blue); flex: none; }

  .stage { position: relative; }
  .handle { cursor: grab; outline: none; touch-action: none; }
  .handle.fixed { cursor: pointer; }
  .label-handle { cursor: grab; touch-action: none; outline: none; }
  .handle:focus-visible { stroke: #2563eb; stroke-opacity: 0.5; stroke-width: 3; }

  .chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .chip {
    min-width: 2.2rem; padding: 0.25rem 0.55rem; border: 1.5px solid var(--border); border-radius: 999px; background: #fff; color: var(--ink);
    font-family: 'Times New Roman', Times, serif; font-style: italic; font-size: 1rem;
  }
  .chip:hover:not(:disabled) { border-color: var(--blue-border); }
  .chip.on { border-color: var(--blue); background: var(--blue-soft); color: var(--blue-dark); }
  .chip:disabled { opacity: 0.4; }
  .ends { display: flex; flex-direction: column; gap: 0.35rem; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; }
  .readout li { display: flex; flex-wrap: wrap; column-gap: 0.6rem; }
  .readout li + li { margin-top: 0.3rem; }
  .readout .what { font-weight: 700; }
  .add-here { display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem; padding: 0.45rem 0.8rem; font-size: 0.85rem; border-radius: 10px; }
</style>
