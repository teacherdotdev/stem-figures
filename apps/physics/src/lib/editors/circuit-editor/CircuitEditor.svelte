<script lang="ts">
  // The Circuit Editor: unlike the generators, there are no settings to turn
  // into a figure. The teacher drags parts from the tray on the left onto the
  // grid on the right and joins their terminals with wires, in one of three
  // modes:
  //   Move:   drag a part, or a box around several, then drag one to move them
  //           all; tap a part to label or turn it, or a wire to drag its bends
  //   Wire:   tap one terminal, then another, to join them
  //   Delete: tap a part or wire, or drag a box around parts, to remove them
  // The drawing is kept in this browser (nothing goes in the address), with
  // undo and redo, and exports cropped to just the circuit. The Circuit
  // Diagram Generator's Edit by hand leaves its circuit in storage for the
  // editor to open (see ./handoff). Its scaffolding (grid, tray, modes, undo,
  // storage and export) is copied from Chemistry's Organic Structure Editor.
  import { Cable, Copy, Eraser, FileDown, ImageDown, MousePointer2, Redo2, RotateCw, Trash2, Undo2 } from '@lucide/svelte'
  import { onMount, untrack } from 'svelte'
  import { copyPng, downloadPng, downloadSvg } from '$shared/exporting'
  import Choice from '$lib/shared/Choice.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import type { Label } from '$lib/shared/label'
  import CircuitDrawing from './CircuitDrawing.svelte'
  import { HANDOFF_KEY } from './handoff'
  import { commit as record, redo as redoIn, replace, settle, startHistory, undo as undoIn } from './history'
  import PartIcon from './PartIcon.svelte'
  import {
    addWire, bendsOf, cantJoin, cropBox, describe, emptySchematic, freeSpot, GRID, groupShift, HEIGHT, moveBend,
    moveParts, newPart, PART_KINDS, PART_NAMES, partsIn, rotateParts, snap, snapPoint, terminal, tidySchematic,
    updatePart, WIDTH, withoutParts, withoutWire,
    type End, type Part, type PartKind, type Schematic, type Wire,
  } from './schematic'

  interface Props {
    name: string
  }
  let { name }: Props = $props()

  type Mode = 'move' | 'wire' | 'delete'
  const MODES: { mode: Mode; label: string; hint: string }[] = [
    { mode: 'move', label: 'Move', hint: 'Drag parts to move them, or a box around several. Tap a part to label or turn it, or a wire to drag its bends.' },
    { mode: 'wire', label: 'Wire', hint: 'Tap one terminal, then another, to join them with a wire.' },
    { mode: 'delete', label: 'Delete', hint: 'Tap a part or wire to delete it, or drag a box around parts.' },
  ]
  const STORAGE_KEY = 'physicsfigures.circuit-editor.drawing'

  let history = $state.raw(startHistory<Schematic>(emptySchematic()))
  const schematic = $derived(history.present)
  let mode = $state<Mode>('move')
  let selected = $state.raw<string[]>([])
  let selectedWire = $state<string | null>(null)
  let wireStart = $state<End | null>(null)
  let message = $state('Drag a part from the tray onto the grid to begin.')
  let svg = $state<SVGSVGElement>()

  // The drag in progress: a box being drawn, parts being moved, a bend being
  // moved, or a part on its way from the tray.
  let box = $state<{ x1: number; y1: number; x2: number; y2: number; pointerId: number; keep: string[] } | null>(null)
  let moving = $state.raw<{ pointerId: number; x: number; y: number; ids: string[]; before: Schematic; moved: boolean } | null>(null)
  let bending = $state.raw<{ pointerId: number; wire: string; index: number; before: Schematic; moved: boolean } | null>(null)
  let carrying = $state<{ kind: PartKind; pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null)
  let loaded = false

  onMount(() => {
    try {
      history = startHistory(tidySchematic(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')))
      if (history.present.parts.length) message = 'Your last circuit is back. Keep drawing, or clear the page for a new one.'
      // A circuit the generator handed over replaces the drawing, as one step Undo takes back.
      const handed = localStorage.getItem(HANDOFF_KEY)
      if (handed) {
        localStorage.removeItem(HANDOFF_KEY)
        const had = history.present.parts.length
        history = record(history, tidySchematic(JSON.parse(handed)))
        message = had
          ? 'Here’s the circuit from the generator. Undo brings back what you had drawn before.'
          : 'Here’s the circuit from the generator. Add parts, move them, or join them with more wires.'
      }
    } catch {
      /* nothing saved, or storage blocked */
    }
    loaded = true
  })

  $effect(() => {
    const data = JSON.stringify(schematic)
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, data)
    } catch {
      /* storage blocked or full: the drawing lasts until the page closes */
    }
  })

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

  /** What the last change was, so typing a label is one step to undo, not one per key. */
  let lastChange = ''

  function commit(next: Schematic, change = '') {
    history = change && change === lastChange ? replace(history, next) : record(history, next)
    lastChange = change
  }
  function undo() {
    history = undoIn(history)
    lastChange = ''
    letGo()
  }
  function redo() {
    history = redoIn(history)
    lastChange = ''
    letGo()
  }
  /** Drop what's selected or half done, keeping only what still exists. */
  function letGo() {
    wireStart = null
    selected = selected.filter((id) => schematic.parts.some((p) => p.id === id))
    if (!schematic.wires.some((w) => w.id === selectedWire)) selectedWire = null
  }

  function setMode(next: Mode) {
    mode = next
    wireStart = null
    if (next !== 'move') selectedWire = null
    if (next === 'wire') selected = []
    message = MODES.find((m) => m.mode === next)!.hint
  }

  /** A point on the page from a pointer's place on screen. */
  function pagePoint(clientX: number, clientY: number) {
    const p = new DOMPoint(clientX, clientY).matrixTransform(svg!.getScreenCTM()!.inverse())
    return { x: Math.max(0, Math.min(WIDTH, p.x)), y: Math.max(0, Math.min(HEIGHT, p.y)) }
  }

  function addPart(kind: PartKind, at: { x: number; y: number }) {
    const part = newPart(schematic, kind, at)
    commit({ ...schematic, parts: [...schematic.parts, part] })
    selectedWire = null
    if (mode === 'move') selected = [part.id]
    message =
      mode === 'wire'
        ? `${PART_NAMES[kind]} placed. Tap one of its terminals, then another part’s, to join them.`
        : `${PART_NAMES[kind]} placed. Drag it to move it, or switch to Wire to join it to another part.`
  }

  function deleteParts(ids: string[]) {
    commit(withoutParts(schematic, ids))
    selected = selected.filter((id) => !ids.includes(id))
    wireStart = null
    message = `${plural(ids.length, 'part')} deleted, with their wires.`
  }

  function deleteWire(id: string) {
    commit(withoutWire(schematic, id))
    if (selectedWire === id) selectedWire = null
    message = 'Wire deleted.'
  }

  // ----- The tray: drag a part out, or tap one (or press Enter) to drop it in the middle

  function pickUp(event: PointerEvent, kind: PartKind) {
    if (event.button !== 0) return
    event.preventDefault()
    carrying = { kind, pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY }
  }
  function carry(event: PointerEvent) {
    if (!carrying || event.pointerId !== carrying.pointerId) return
    event.preventDefault()
    carrying = { ...carrying, x: event.clientX, y: event.clientY }
  }
  function drop(event: PointerEvent) {
    if (!carrying || event.pointerId !== carrying.pointerId) return
    const { kind, startX, startY } = carrying
    carrying = null
    if (event.type === 'pointercancel' || !svg) return
    const r = svg.getBoundingClientRect()
    const over = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom
    const tapped = Math.hypot(event.clientX - startX, event.clientY - startY) < 6
    if (over) {
      const p = pagePoint(event.clientX, event.clientY)
      addPart(kind, snap(p.x, p.y))
    } else if (tapped) addPart(kind, freeSpot(schematic))
  }
  /** A keyboard press on a tray button (a pointer's is handled by pickUp and drop). */
  function trayKey(event: MouseEvent, kind: PartKind) {
    if (event.detail !== 0) return
    addPart(kind, freeSpot(schematic))
  }

  // ----- The page

  function pressPart(event: PointerEvent, part: Part) {
    event.stopPropagation()
    if (event.button !== 0) return
    if (mode === 'delete') return deleteParts([part.id])
    if (mode === 'wire') {
      // A tap on the part itself picks its nearer terminal.
      const p = pagePoint(event.clientX, event.clientY)
      const [a, b] = [terminal(part, 0), terminal(part, 1)]
      const t = Math.hypot(p.x - a.x, p.y - a.y) <= Math.hypot(p.x - b.x, p.y - b.y) ? 0 : 1
      return wireTo({ part: part.id, t })
    }
    selectedWire = null
    if (event.shiftKey) {
      selected = selected.includes(part.id) ? selected.filter((id) => id !== part.id) : [...selected, part.id]
      return
    }
    const ids = selected.includes(part.id) ? selected : [part.id]
    const p = pagePoint(event.clientX, event.clientY)
    moving = { pointerId: event.pointerId, ...p, ids, before: schematic, moved: false }
    selected = ids
    svg!.setPointerCapture(event.pointerId)
  }

  function pressTerminal(event: PointerEvent, end: End) {
    event.stopPropagation()
    if (event.button !== 0) return
    wireTo(end)
  }

  function wireTo(end: End) {
    const named = (e: End) => PART_NAMES[schematic.parts.find((p) => p.id === e.part)!.kind].toLowerCase()
    if (!wireStart) {
      wireStart = end
      message = `Now tap the terminal to join this ${named(end)} to.`
      return
    }
    const why = cantJoin(schematic, wireStart, end)
    if (why) {
      message = why === 'That’s the same terminal.' ? 'Wire cancelled.' : why
    } else {
      commit(addWire(schematic, wireStart, end))
      message = 'Joined. Tap another terminal to start the next wire.'
    }
    wireStart = null
  }

  function pressWire(event: PointerEvent, wire: Wire) {
    if (mode === 'wire' || event.button !== 0) return
    event.stopPropagation()
    if (mode === 'delete') return deleteWire(wire.id)
    selected = []
    selectedWire = wire.id
    message = bendsOf(schematic, wire).length
      ? 'Drag a square to move that bend. Delete removes the wire.'
      : 'A straight wire has no bends to drag. Delete removes it.'
  }

  function pressBend(event: PointerEvent, wire: Wire, index: number) {
    event.stopPropagation()
    if (event.button !== 0) return
    bending = { pointerId: event.pointerId, wire: wire.id, index, before: schematic, moved: false }
    svg!.setPointerCapture(event.pointerId)
  }

  function pressPage(event: PointerEvent) {
    if (mode === 'wire') {
      if (wireStart) message = 'Wire cancelled.'
      wireStart = null
      return
    }
    if (event.button !== 0) return
    selectedWire = null
    const p = pagePoint(event.clientX, event.clientY)
    box = { x1: p.x, y1: p.y, x2: p.x, y2: p.y, pointerId: event.pointerId, keep: event.shiftKey ? selected : [] }
    if (!event.shiftKey) selected = []
    svg!.setPointerCapture(event.pointerId)
  }

  const boxed = (b: NonNullable<typeof box>) => [...new Set([...b.keep, ...partsIn(schematic, b)])]

  function movePointer(event: PointerEvent) {
    if (moving && event.pointerId === moving.pointerId) {
      const p = pagePoint(event.clientX, event.clientY)
      const origins = moving.before.parts.filter((q) => moving!.ids.includes(q.id))
      const { dx, dy } = groupShift(origins, p.x - moving.x, p.y - moving.y)
      moving.moved ||= dx !== 0 || dy !== 0
      history = replace(history, moveParts(moving.before, moving.ids, dx, dy))
    } else if (bending && event.pointerId === bending.pointerId) {
      const p = pagePoint(event.clientX, event.clientY)
      const to = snapPoint(p.x, p.y)
      const from = bendsOf(bending.before, bending.before.wires.find((w) => w.id === bending!.wire)!)[bending.index]
      bending.moved ||= to.x !== from.x || to.y !== from.y
      history = replace(history, moveBend(bending.before, bending.wire, bending.index, to))
    } else if (box && event.pointerId === box.pointerId) {
      const p = pagePoint(event.clientX, event.clientY)
      box = { ...box, x2: p.x, y2: p.y }
      selected = boxed(box)
    }
  }

  function endPointer(event: PointerEvent) {
    const cancelled = event.type === 'pointercancel'
    for (const drag of [moving, bending]) {
      if (!drag || event.pointerId !== drag.pointerId) continue
      if (cancelled) history = replace(history, drag.before)
      else if (drag.moved) {
        history = settle(history, drag.before)
        lastChange = ''
        message = drag === moving ? `${plural(moving.ids.length, 'part')} moved.` : 'Bend moved.'
      }
    }
    if (moving?.pointerId === event.pointerId) moving = null
    if (bending?.pointerId === event.pointerId) bending = null
    if (!box || event.pointerId !== box.pointerId) return
    const ids = boxed(box)
    const dragged = Math.abs(box.x2 - box.x1) > 3 || Math.abs(box.y2 - box.y1) > 3
    if (cancelled) selected = box.keep
    else if (mode === 'delete' && dragged && ids.length) deleteParts(ids)
    else if (mode === 'move' && ids.length > 1)
      message = `${plural(ids.length, 'part')} selected. Drag one to move them together, press R to turn them, or Delete to remove them.`
    box = null
  }

  function rotate() {
    if (!selected.length) return
    commit(rotateParts(schematic, selected))
    message = `${plural(selected.length, 'part')} turned a quarter turn.`
  }

  function keydown(event: KeyboardEvent) {
    const target = event.target as Element | null
    if (target?.matches?.('input, textarea, select, [contenteditable], [contenteditable] *')) return
    if (target?.closest?.('.label-field')) return
    const key = event.key.toLowerCase()
    if ((event.metaKey || event.ctrlKey) && !event.altKey && (key === 'z' || key === 'y')) {
      event.preventDefault()
      if (key === 'y' || event.shiftKey) redo()
      else undo()
    } else if (event.key === 'Escape') {
      wireStart = null
      selected = []
      selectedWire = null
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && mode !== 'wire') {
      if (selected.length) {
        event.preventDefault()
        deleteParts(selected)
      } else if (selectedWire) {
        event.preventDefault()
        deleteWire(selectedWire)
      }
    } else if (key === 'r' && !event.metaKey && !event.ctrlKey && mode === 'move') rotate()
  }

  function clearPage() {
    if (!confirm('Clear the whole circuit? You can undo this.')) return
    commit({ ...emptySchematic(), symbols: schematic.symbols, polarity: schematic.polarity })
    selected = []
    selectedWire = null
    wireStart = null
    message = 'A fresh page. Drag a part from the tray to begin.'
  }

  // ----- The selected part's labels and options

  const part = $derived(mode === 'move' && selected.length === 1 ? schematic.parts.find((p) => p.id === selected[0]) : undefined)
  /** The selected part's labels, for the label fields to edit in place; each edit goes into the drawing. */
  let labels = $state<{ id: string; name: Label; value: Label } | null>(null)
  $effect(() => {
    const now = part ? { id: part.id, name: part.name, value: part.value } : null
    untrack(() => {
      if (JSON.stringify(now) !== JSON.stringify($state.snapshot(labels))) labels = now && structuredClone(now)
    })
  })
  $effect(() => {
    if (!labels) return
    const { id, name: n, value } = $state.snapshot(labels)
    untrack(() => {
      const current = schematic.parts.find((p) => p.id === id)
      if (!current || JSON.stringify([current.name, current.value]) === JSON.stringify([n, value])) return
      commit(updatePart(schematic, id, { name: n, value }), `labels ${id}`)
    })
  })

  // ----- Getting the circuit out, cropped to just the parts and wires

  /** The page as a picture of the circuit alone. The grid, targets and
   *  highlights are marked data-no-export, and exporting leaves them out. */
  function picture() {
    const crop = cropBox(schematic)
    if (!svg || !crop) {
      message = 'Add a part before copying or downloading.'
      return null
    }
    const copy = svg.cloneNode(true) as SVGSVGElement
    copy.setAttribute('viewBox', `${crop.x} ${crop.y} ${crop.width} ${crop.height}`)
    copy.setAttribute('width', String(Math.ceil(crop.width)))
    copy.setAttribute('height', String(Math.ceil(crop.height)))
    copy.removeAttribute('class')
    copy.setAttribute('role', 'img')
    copy.setAttribute('aria-label', describe(schematic))
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
    if (kind === 'png') downloadPng(p, 'circuit.png')
    else downloadSvg(p, 'circuit.svg')
    message = `Downloaded as ${kind.toUpperCase()}.`
  }
</script>

<svelte:window onkeydown={keydown} onpointermove={carry} onpointerup={drop} onpointercancel={drop} />

<div class="editor">
  <aside class="tools card no-print" aria-label="Drawing tools">
    <h1 class="visually-hidden">{name}</h1>
    <section>
      <h2>Parts</h2>
      <p class="note">Drag one onto the grid, or tap it to add it in the middle.</p>
      <div class="tray">
        {#each PART_KINDS as kind (kind)}
          <button
            type="button"
            class="tray-part"
            aria-label="Add a {PART_NAMES[kind].toLowerCase()}"
            onpointerdown={(event) => pickUp(event, kind)}
            onclick={(event) => trayKey(event, kind)}
          >
            <span class="icon"><PartIcon {kind} style={schematic.symbols} /></span>
            <span class="name">{PART_NAMES[kind]}</span>
          </button>
        {/each}
      </div>
    </section>

    <section>
      <h2>Mode</h2>
      <div class="segmented modes" role="radiogroup" aria-label="Mode">
        {#each MODES as m (m.mode)}
          <button type="button" role="radio" aria-checked={mode === m.mode} class:on={mode === m.mode} class:delete={m.mode === 'delete'} onclick={() => setMode(m.mode)}>
            {#if m.mode === 'move'}<MousePointer2 size={16} aria-hidden="true" />{:else if m.mode === 'wire'}<Cable size={16} aria-hidden="true" />{:else}<Eraser size={16} aria-hidden="true" />{/if}
            {m.label}
          </button>
        {/each}
      </div>
      <p class="note">{MODES.find((m) => m.mode === mode)!.hint}</p>
    </section>

    {#if part && labels}
      <section class="selected">
        <h2>{PART_NAMES[part.kind]}</h2>
        <div class="row">
          <button type="button" class="btn-ghost small" onclick={rotate}><RotateCw size={15} aria-hidden="true" /> Turn</button>
          <label class="check"><input type="checkbox" checked={part.flip} onchange={(e) => commit(updatePart(schematic, part.id, { flip: e.currentTarget.checked }))} /> Swap label sides</label>
        </div>
        {#if part.kind === 'switch'}
          <div class="field">
            Switch
            <Choice
              name="Switch"
              options={[['closed', 'Closed'], ['open', 'Open']]}
              bind:value={() => (part.open ? 'open' : 'closed'), (v) => commit(updatePart(schematic, part.id, { open: v === 'open' }))}
            />
          </div>
        {/if}
        <div class="field">Name <LabelField name="Name" placeholder="R_1" bind:label={labels.name} /></div>
        <div class="field">Value <LabelField name="Value" placeholder="4 ohm" bind:label={labels.value} /></div>
      </section>
    {/if}

    <section>
      <h2>Symbols</h2>
      <div class="field">
        <Choice
          name="Symbol style"
          options={[['us', 'US'], ['iec', 'IEC (UK GCSE)']]}
          bind:value={() => schematic.symbols, (v) => commit({ ...schematic, symbols: v })}
        />
      </div>
      <label class="check">
        <input type="checkbox" checked={schematic.polarity} onchange={(e) => commit({ ...schematic, polarity: e.currentTarget.checked })} />
        + and − beside cells and batteries
      </label>
    </section>

    <section class="keys">
      <h2>Shortcuts</h2>
      <p class="note">Shift-click to add parts to a selection. R turns the selected parts. Delete removes them, or the selected wire. Esc lets go. Ctrl+Z undoes.</p>
    </section>
  </aside>

  <div class="figure-side">
    <div class="card canvas">
      <div class="toolbar no-print" role="toolbar" aria-label="Circuit actions">
        <button class="icon-btn" aria-label="Copy image" data-tip="Copy image" onclick={copyImage}><Copy size={19} /></button>
        <button class="icon-btn" aria-label="Download PNG" data-tip="Download PNG" onclick={() => download('png')}><ImageDown size={19} /></button>
        <button class="icon-btn" aria-label="Download SVG" data-tip="Download SVG" onclick={() => download('svg')}><FileDown size={19} /></button>
        <span class="divider"></span>
        <button class="icon-btn" aria-label="Undo" data-tip="Undo" disabled={!history.past.length} onclick={undo}><Undo2 size={19} /></button>
        <button class="icon-btn" aria-label="Redo" data-tip="Redo" disabled={!history.future.length} onclick={redo}><Redo2 size={19} /></button>
        <button class="icon-btn" aria-label="Clear the page" data-tip="Clear the page" disabled={!schematic.parts.length} onclick={clearPage}><Trash2 size={19} /></button>
        <p class="message" aria-live="polite">{message}</p>
      </div>
      <div class="sheet">
        <svg
          bind:this={svg}
          class="page {mode}"
          class:moving={!!moving || !!bending}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 {WIDTH} {HEIGHT}"
          role="application"
          aria-label="Drawing page. {describe(schematic)}."
          onpointerdown={pressPage}
          onpointermove={movePointer}
          onpointerup={endPointer}
          onpointercancel={endPointer}
        >
          <defs data-no-export>
            <pattern id="circuit-grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
              <path d="M {GRID} 0 L 0 0 0 {GRID}" fill="none" stroke="#eceef3" stroke-width="1" />
            </pattern>
          </defs>
          <rect data-no-export width={WIDTH} height={HEIGHT} fill="#fff" />
          <rect data-no-export width={WIDTH} height={HEIGHT} fill="url(#circuit-grid)" />
          <CircuitDrawing
            {schematic}
            {mode}
            selected={mode === 'wire' ? [] : selected}
            {selectedWire}
            {wireStart}
            onpartdown={pressPart}
            onwiredown={pressWire}
            onterminaldown={pressTerminal}
            onbenddown={pressBend}
          />
          {#if box}
            <rect
              data-no-export
              class="box"
              class:delete={mode === 'delete'}
              x={Math.min(box.x1, box.x2)}
              y={Math.min(box.y1, box.y2)}
              width={Math.abs(box.x2 - box.x1)}
              height={Math.abs(box.y2 - box.y1)}
            />
          {/if}
          {#if !schematic.parts.length}
            <g data-no-export class="empty" pointer-events="none" font-family="Arial, Helvetica, sans-serif">
              <text x={WIDTH / 2} y={HEIGHT / 2 - 8} text-anchor="middle" font-size="22" font-weight="700">Your circuit will appear here</text>
              <text x={WIDTH / 2} y={HEIGHT / 2 + 24} text-anchor="middle" font-size="16">Drag a cell and a resistor from the tray, then join them in Wire mode.</text>
            </g>
          {/if}
        </svg>
      </div>
    </div>
  </div>
</div>

{#if carrying}
  <div class="carried" style:left="{carrying.x}px" style:top="{carrying.y}px" aria-hidden="true">
    <PartIcon kind={carrying.kind} style={schematic.symbols} />
  </div>
{/if}

<style>
  .editor { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; }
  .tools { display: flex; flex-direction: column; gap: 1.1rem; padding: 1rem 1.1rem 1.2rem; }
  h2 { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
  .note { margin: 0.35rem 0 0; color: var(--muted); font-size: 0.84rem; }

  .tray { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.45rem; margin-top: 0.7rem; }
  .tray-part {
    display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
    padding: 0.4rem 0.25rem 0.4rem;
    border: 1.5px solid var(--border); border-radius: 12px; background: #fff; color: var(--ink);
    touch-action: none; user-select: none; -webkit-user-select: none; cursor: grab;
    transition: border-color 0.15s, background 0.15s, transform 0.15s;
  }
  .tray-part:hover { border-color: var(--blue-border); background: var(--blue-soft); transform: translateY(-1px); }
  .tray-part .icon { width: 3.4rem; height: 2.2rem; }
  .tray-part .name { color: var(--muted); font-size: 0.74rem; font-weight: 600; }

  .modes { margin-top: 0.6rem; }
  .modes button.on.delete { color: var(--red); }
  .selected { display: flex; flex-direction: column; gap: 0.6rem; padding-top: 0.9rem; border-top: 1px solid var(--border); }
  .selected .row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
  .small { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem; font-size: 0.85rem; border-radius: 9px; }

  .canvas { display: flex; flex-direction: column; }
  .toolbar { display: flex; align-items: center; gap: 0.3rem; padding: 0.45rem; border-bottom: 1px solid var(--border); }
  .divider { width: 1px; height: 1.6rem; background: var(--border); margin: 0 0.3rem; flex: none; }
  .message { flex: 1; min-width: 0; margin: 0 0.5rem 0 0.6rem; color: var(--muted); font-size: 0.86rem; text-align: right; }
  .sheet { padding: 0.75rem; display: flex; justify-content: center; }
  .page { display: block; width: 100%; height: auto; border-radius: 10px; touch-action: none; user-select: none; -webkit-user-select: none; }
  .page.move { cursor: crosshair; }
  .page.move :global(.part) { cursor: grab; }
  .page.move :global(.wire) { cursor: pointer; }
  .page.move :global(.bend) { cursor: move; }
  .page.moving, .page.moving :global(.part) { cursor: grabbing; }
  .page.wire :global(.part), .page.wire :global(.terminal) { cursor: pointer; }
  .page.delete, .page.delete :global(.part), .page.delete :global(.wire) { cursor: crosshair; }
  .box { fill: rgba(37, 99, 235, 0.08); stroke: var(--blue); stroke-width: 1.5; stroke-dasharray: 6 5; pointer-events: none; }
  .box.delete { fill: rgba(220, 38, 38, 0.08); stroke: var(--red); }
  .empty text { fill: #9aa0aa; }

  .carried {
    position: fixed; z-index: 100; width: 4.5rem; height: 3rem; padding: 0.3rem;
    transform: translate(-50%, -50%); border: 2px solid var(--blue); border-radius: 12px; background: #fff;
    box-shadow: 0 8px 20px rgba(16, 24, 40, 0.2); pointer-events: none; user-select: none;
  }

  /* Phones: the message goes under the buttons. */
  @media (max-width: 640px) {
    .toolbar { flex-wrap: wrap; }
    .message { flex-basis: 100%; margin: 0.2rem 0.3rem 0.1rem; text-align: left; }
    .keys { display: none; }
  }

  /* Wide screens: the tools on the left and the page filling the window beside them. */
  @media (min-width: 861px) and (min-height: 560px) {
    .editor {
      display: grid;
      grid-template-columns: 19rem minmax(0, 1fr);
      height: calc(100vh - var(--topbar-h));
      padding: 1.25rem;
      gap: 1.25rem;
    }
    .tools { min-height: 0; overflow-y: auto; }
    .figure-side { display: flex; min-height: 0; }
    .canvas { flex: 1; min-height: 0; }
    .sheet { flex: 1; min-height: 0; }
    .page { height: 100%; }
  }
</style>
