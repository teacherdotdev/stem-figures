<script lang="ts">
  // A small panel opened at a spot on the screen: a point on the figure, or
  // under a button. Fixed-position like PartLabel's popup, so the scrolling
  // settings column can't clip it. It closes on Escape, a press outside it
  // (except on `owner`, the button that toggles it), or the page scrolling.
  // It opens below the spot unless `side` says otherwise, flipping to the
  // other side when there's no room. Given `around`, a box on screen it must
  // not cover, it goes beside the box instead: on `side` if there's room,
  // else whichever side has.
  //
  // A `movable` panel is one the teacher works in for a while, like Google
  // Calendar's event popup: it has a header to drag it by and a close button,
  // and stays open through presses outside it, closing only on Escape, its
  // close button, or whatever its owner decides. Once dragged it stays where
  // it was put (`moved`) while its contents change.
  import { X } from '@lucide/svelte'
  import { tick, type Snippet } from 'svelte'

  type Spot = { left: number; top: number }
  let {
    at, label, owner = null, side = 'below', around = null, movable = false, title = '', moved = $bindable(null), onclose, children,
  }: {
    at: { x: number; y: number }; label: string; owner?: Element | null; side?: 'below' | 'above' | 'left' | 'right'
    around?: { x: number; y: number; w: number; h: number } | null
    movable?: boolean; title?: string; moved?: Spot | null
    onclose: () => void; children: Snippet
  } = $props()

  let panel = $state<HTMLElement>()
  let pos = $state<Spot>({ left: 0, top: 0 })
  const GAP = 10
  const EDGE = 8

  async function place() {
    await tick()
    if (!panel) return
    const [w, h] = [panel.offsetWidth, panel.offsetHeight]
    const clampX = (x: number) => Math.max(EDGE, Math.min(x, window.innerWidth - EDGE - w))
    const clampY = (y: number) => Math.max(EDGE, Math.min(y, window.innerHeight - EDGE - h))
    if (moved) {
      pos = { left: clampX(moved.left), top: clampY(moved.top) }
      return
    }
    if (around) {
      const r = around
      const spots = {
        right: { left: r.x + r.w + GAP, top: clampY(r.y + r.h / 2 - h / 2) },
        left: { left: r.x - GAP - w, top: clampY(r.y + r.h / 2 - h / 2) },
        below: { left: clampX(r.x + r.w / 2 - w / 2), top: r.y + r.h + GAP },
        above: { left: clampX(r.x + r.w / 2 - w / 2), top: r.y - GAP - h },
      }
      const fits = (p: Spot) => p.left >= EDGE && p.top >= EDGE && p.left + w <= window.innerWidth - EDGE && p.top + h <= window.innerHeight - EDGE
      const order = [side, 'right', 'left', 'below', 'above'] as const
      pos = order.map((k) => spots[k]).find(fits) ?? { left: clampX(spots[side].left), top: clampY(spots[side].top) }
      return
    }
    if (side === 'left' || side === 'right') {
      const right = side === 'right' ? at.x + GAP + w <= window.innerWidth - EDGE : at.x - GAP - w < EDGE
      pos = { top: clampY(at.y - h / 2), left: clampX(right ? at.x + GAP : at.x - GAP - w) }
      return
    }
    const below = side === 'below' ? at.y + GAP + h <= window.innerHeight - EDGE : at.y - GAP - h < EDGE
    pos = {
      top: Math.max(EDGE, below ? at.y + GAP : at.y - GAP - h),
      left: clampX(at.x - w / 2),
    }
  }
  $effect(() => {
    void at.x, at.y, around, moved
    place()
  })
  // A movable panel keeps its place as its contents change, so only a fresh one takes focus.
  $effect(() => {
    panel?.querySelector<HTMLElement>(movable ? '.body input, .body button, .body [tabindex]' : 'input, button, [tabindex]')?.focus({ preventScroll: true })
  })

  function onpointerdown(event: PointerEvent) {
    const t = event.target as Node
    if (!movable && !panel?.contains(t) && !owner?.contains(t)) onclose()
  }
  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onclose()
    }
  }

  // Dragging a movable panel by its header.
  let grab: { id: number; dx: number; dy: number } | null = null
  function down(event: PointerEvent) {
    if (event.button !== 0 || (event.target as Element).closest('button')) return
    event.preventDefault()
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    grab = { id: event.pointerId, dx: event.clientX - pos.left, dy: event.clientY - pos.top }
  }
  function move(event: PointerEvent) {
    if (!grab || event.pointerId !== grab.id) return
    moved = { left: event.clientX - grab.dx, top: event.clientY - grab.dy }
  }
  const up = (event: PointerEvent) => grab?.id === event.pointerId && (grab = null)
</script>

<!-- Escape is heard on the window: a choice inside can take focus with it when it closes. -->
<svelte:window
  {onkeydown} onpointerdowncapture={onpointerdown} onresize={() => (movable ? place() : onclose())}
  onscrollcapture={(e) => !movable && !panel?.contains(e.target as Node) && onclose()}
/>

<div bind:this={panel} class="panel" class:movable role="dialog" tabindex="-1" aria-label={label} style="left: {pos.left}px; top: {pos.top}px">
  {#if movable}
    <div class="grip" role="presentation" title="Drag to move" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
      <span class="title">{title}</span>
      <button type="button" class="close" aria-label="Close" onclick={onclose}><X size={16} /></button>
    </div>
    <div class="body">{@render children()}</div>
  {:else}
    {@render children()}
  {/if}
</div>

<style>
  .panel {
    position: fixed; z-index: 60; display: flex; flex-direction: column; gap: 0.7rem; width: 17rem;
    padding: 0.8rem; border: 1px solid var(--border); border-radius: 12px; background: #fff;
    box-shadow: 0 12px 32px -8px rgb(17 24 39 / 25%);
  }
  .panel.movable { padding: 0; gap: 0; }
  .grip {
    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.35rem 0.4rem 0.35rem 0.8rem;
    border-bottom: 1px solid var(--border); cursor: grab; touch-action: none; user-select: none;
  }
  .grip:active { cursor: grabbing; }
  .title { font-weight: 700; font-size: 0.88rem; }
  .close { display: grid; place-items: center; width: 1.9rem; height: 1.9rem; padding: 0; border: 0; border-radius: 8px; background: none; color: var(--muted); }
  .close:hover { background: var(--blue-soft); color: var(--blue-dark); }
  .body { display: flex; flex-direction: column; gap: 0.7rem; padding: 0.8rem; }

  /* What every popup body is built from. */
  .panel :global(.pop-head) { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; font-weight: 700; font-size: 0.88rem; }
  .panel :global(.pop-head .measure) { font-family: 'Times New Roman', Times, serif; font-weight: 400; font-size: 1.05rem; color: var(--muted); }
  .panel :global(.group) { display: flex; flex-direction: column; gap: 0.35rem; }
  .panel :global(.group .name) { font-size: 0.75rem; font-weight: 700; color: var(--muted); }
  .panel :global(.segmented button) { flex: 1; display: inline-grid; place-items: center; padding: 0.3rem 0.4rem; }
  .panel :global(.segmented button:disabled) { opacity: 0.4; cursor: default; }
  .panel :global(.hint) { margin: 0; font-size: 0.8rem; color: var(--muted); }
  .panel :global(.delete) { color: var(--red); font-size: 0.85rem; padding: 0.45rem 0.8rem; border-radius: 10px; align-self: flex-start; }
</style>
