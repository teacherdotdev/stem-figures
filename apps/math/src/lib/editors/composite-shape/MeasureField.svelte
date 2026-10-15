<script lang="ts">
  // One measure of a piece in its popup, an angle or a length: typed, or
  // dragged on its symbol (see ScrubAngle). Each change is tried at once with
  // `onvalue`, which says whether it took; while it's being typed or dragged
  // the field keeps the teacher's own text. `locked`, when given, adds a lock
  // beside it. `onhint` hears when it's hovered or being changed, so the
  // figure can show which part it is.
  import { Lock, LockOpen } from '@lucide/svelte'
  import { untrack } from 'svelte'
  import ScrubAngle from '$lib/labeling/ScrubAngle.svelte'
  import { parseNumber } from '$lib/shared/math.js'

  let {
    id, label, value, angle = false, symbol, unit = '', locked = null, onvalue, onlock, onhint,
  }: {
    id: string; label: string; value: number; angle?: boolean; symbol: string; unit?: string; locked?: boolean | null
    onvalue: (v: number) => boolean; onlock?: () => void; onhint?: (on: boolean) => void
  } = $props()

  const fmt = (v: number) => String(Number(v.toFixed(angle ? 1 : 2)))
  let text = $state(untrack(() => fmt(value)))
  let active = $state(false)
  let invalid = $state(false)
  let hovered = false
  $effect(() => {
    const t = fmt(value)
    untrack(() => !active && ((text = t), (invalid = false)))
  })

  function set(v: string) {
    text = v
    const n = parseNumber(v)
    invalid = n === null || !onvalue(n)
  }
  function activate(on: boolean) {
    active = on
    if (!on) {
      text = fmt(value)
      invalid = false
    }
    onhint?.(on || hovered)
  }
</script>

<div class="measure" role="group" onpointerenter={() => ((hovered = true), onhint?.(true))} onpointerleave={() => ((hovered = false), onhint?.(active))}>
  <div class="scrub">
    <ScrubAngle
      {id} {label} {symbol} {invalid} suffix={angle ? '°' : unit} step={angle ? 1 : 0.1} min={angle ? 1 : 0.1} max={angle ? 179 : 999}
      bind:value={() => text, set} onactive={activate}
    />
  </div>
  {#if locked !== null}
    <button
      type="button" class="lock" class:on={locked} aria-pressed={locked} aria-label="Lock {label}" data-tip={locked ? 'Locked: kept as others change' : 'Lock'}
      onclick={onlock}
    >{#if locked}<Lock size={15} />{:else}<LockOpen size={15} />{/if}</button>
  {/if}
</div>

<style>
  .measure { display: flex; align-items: center; gap: 0.25rem; min-width: 0; }
  .scrub { flex: 1; min-width: 0; }
  .lock { display: grid; place-items: center; width: 1.9rem; height: 2.6rem; flex: none; padding: 0; border: 0; border-radius: 8px; background: none; color: #9aa0aa; }
  .lock:hover { background: var(--blue-soft); color: var(--blue-dark); }
  .lock.on { color: var(--blue-dark); }
</style>
