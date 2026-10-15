<script lang="ts">
  // A number of degrees the teacher can type, or change by dragging left and
  // right on the ∠ before it, as in Figma: 1° for every 2 pixels, 10° steps
  // with Shift. The up and down arrow keys nudge it by 1° (10° with Shift).
  // With another `symbol`, `suffix` and `step` it's any measure, like a
  // length in tenths: a step every 2 pixels, ten steps at a time with Shift.
  // `onactive` hears when it's being changed (dragged or focused), so the
  // figure can show which angle it sets.
  import { parseNumber } from '$lib/shared/math.js'

  let {
    value = $bindable(), id, label, min, max, symbol = '∠', suffix = '°', step = 1, invalid = false, onactive,
  }: {
    value: string; id: string; label: string; min: number; max: number; symbol?: string; suffix?: string; step?: number; invalid?: boolean
    onactive?: (on: boolean) => void
  } = $props()

  let dragging = $state(false)
  let focused = $state(false)
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  /** Rounded to a whole number of steps (of ten steps with Shift), without float noise. */
  const snap = (v: number, big: boolean) => {
    const by = big ? step * 10 : step
    return Number((Math.round(v / by) * by).toFixed(6))
  }
  const current = () => parseNumber(value) ?? clamp((min + max) / 2)
  const tell = () => onactive?.(dragging || focused)

  let start: { x: number; v: number; id: number } | null = null
  function down(event: PointerEvent) {
    if (event.button !== 0) return
    event.preventDefault()
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    start = { x: event.clientX, v: current(), id: event.pointerId }
    dragging = true
    tell()
  }
  function move(event: PointerEvent) {
    if (!start || event.pointerId !== start.id) return
    const raw = start.v + ((event.clientX - start.x) / 2) * step
    value = String(clamp(snap(raw, event.shiftKey)))
  }
  function up(event: PointerEvent) {
    if (!start || event.pointerId !== start.id) return
    start = null
    dragging = false
    tell()
  }
  function key(event: KeyboardEvent) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const by = (event.shiftKey ? 10 : 1) * step * (event.key === 'ArrowUp' ? 1 : -1)
    value = String(clamp(Number((snap(current(), false) + by).toFixed(6))))
  }
</script>

<div class="scrub" class:invalid class:active={dragging}>
  <span
    class="handle" role="slider" tabindex="-1" aria-label="Drag to change {label}" aria-valuemin={min} aria-valuemax={max} aria-valuenow={parseNumber(value) ?? undefined}
    title="Drag left or right" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}
  >{symbol}</span>
  <input
    {id} type="text" inputmode="decimal" aria-label={label} aria-invalid={invalid} bind:value onkeydown={key}
    onfocus={() => ((focused = true), tell())} onblur={() => ((focused = false), tell())}
  />
  {#if suffix}<span class="deg" aria-hidden="true">{suffix}</span>{/if}
</div>

<style>
  .scrub {
    display: flex; align-items: center; min-width: 0; height: 2.6rem; box-sizing: border-box;
    border: 1.5px solid var(--border); border-radius: 10px; background: #fff;
  }
  .scrub:focus-within, .scrub.active { border-color: var(--blue-border); box-shadow: 0 0 0 3px var(--blue-soft); }
  .scrub.invalid { border-color: var(--red); }
  .handle {
    display: grid; place-items: center; align-self: stretch; padding: 0 0.45rem; cursor: ew-resize; touch-action: none;
    font-family: 'Times New Roman', Times, serif; font-size: 1.05rem; color: var(--muted); border-radius: 8px 0 0 8px;
  }
  .handle:hover, .active .handle { color: var(--blue); background: var(--blue-soft); }
  /* Over the site's own text-box style: the frame around the whole field is the box. */
  .scrub input[type='text'] {
    flex: 1; min-width: 0; width: 100%; height: 100%; border: 0; border-radius: 0; box-shadow: none; outline: none; background: transparent; padding: 0 0.1rem;
    font-family: 'Times New Roman', Times, serif; font-size: 1.05rem; color: var(--ink);
  }
  .deg { padding-right: 0.55rem; font-family: 'Times New Roman', Times, serif; color: var(--muted); }
</style>
