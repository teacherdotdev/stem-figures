<script lang="ts">
  // A measure typed into a popup. Each change is tried at once with
  // `onvalue`, which says whether it took; while the field has focus it keeps
  // the teacher's own text, and shows red when that isn't a size it can use.
  //
  // A measure that can fill the base has a sizing button inside the field, as
  // Figma's width and height do: its icon shows the mode (fixed, or filling
  // the base), and it opens a menu to pick one. Hovering a mode previews it
  // (`onpreview`). Typing a measure makes it fixed again.
  import { untrack } from 'svelte'
  import { parseNumber } from '$lib/shared/math.js'

  type Mode = 'fixed' | 'fill'
  let {
    id, label, value, unit = '', onvalue, mode = null, onmode, onpreview,
  }: {
    id: string; label: string; value: number; unit?: string; onvalue: (v: number) => boolean
    /** Fixed or filling the base, for a measure that can fill it; null when it can't. */
    mode?: Mode | null
    onmode?: (m: Mode) => void
    onpreview?: (m: Mode | null) => void
  } = $props()

  const fmt = (v: number) => String(Number(v.toFixed(2)))
  let text = $state(untrack(() => fmt(value)))
  let active = $state(false)
  let invalid = $state(false)
  let open = $state(false)
  let menu = $state<HTMLElement>()
  $effect(() => {
    const t = fmt(value)
    untrack(() => !active && ((text = t), (invalid = false)))
  })

  function set(v: string) {
    text = v
    const n = parseNumber(v)
    invalid = n === null || !onvalue(n)
  }
  function pick(m: Mode) {
    open = false
    onpreview?.(null)
    if (m !== mode) onmode?.(m)
  }
  function closeOutside(e: PointerEvent) {
    if (open && menu && !menu.contains(e.target as Node)) {
      open = false
      onpreview?.(null)
    }
  }
</script>

<svelte:window onpointerdowncapture={closeOutside} />

{#snippet icon(m: Mode)}
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    {#if m === 'fixed'}<path d="M2.5,4 V12 M13.5,4 V12 M2.5,8 H13.5" />
    {:else}<path d="M1.5,8 H14.5 M4.5,5 L1.5,8 L4.5,11 M11.5,5 L14.5,8 L11.5,11" />{/if}
  </svg>
{/snippet}

<div class="field">
  <label for={id}>{label}</label>
  <span class="box" class:invalid class:filled={mode === 'fill'}>
    <input
      {id} type="text" inputmode="decimal" autocomplete="off" value={text}
      oninput={(e) => set(e.currentTarget.value)}
      onfocus={() => (active = true)}
      onblur={() => ((active = false), (text = fmt(value)), (invalid = false))}
    />
    {#if unit}<span class="unit">{unit}</span>{/if}
    {#if mode}
      <span class="sizing" bind:this={menu}>
        <button
          type="button" class="mode" aria-haspopup="menu" aria-expanded={open} aria-label="{label} sizing: {mode === 'fill' ? 'fills the base' : 'fixed'}"
          title={mode === 'fill' ? 'Fills the base' : 'Fixed'} onclick={() => (open = !open)}
        >{#if mode === 'fill'}{@render icon(mode)}{/if}<svg class="chev" viewBox="0 0 10 10" width="11" height="11" aria-hidden="true"><path d="M2,3.5 L5,6.5 L8,3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
        {#if open}
          <span class="menu" role="menu">
            {#each [['fixed', `Fixed (${fmt(value)}${unit ? ` ${unit}` : ''})`], ['fill', 'Fill base']] as const as [m, name]}
              <button
                type="button" role="menuitemradio" aria-checked={mode === m} onclick={() => pick(m)}
                onpointerenter={() => onpreview?.(m === mode ? null : m)} onpointerleave={() => onpreview?.(null)}
              ><span class="tick">{mode === m ? '✓' : ''}</span>{@render icon(m)}<span>{name}</span></button>
            {/each}
          </span>
        {/if}
      </span>
    {/if}
  </span>
</div>

<style>
  .field { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; font-size: 0.86rem; font-weight: 600; }
  .field > label { flex: 1; white-space: nowrap; }
  /* Every box the same width, with a sizing dropdown or without, so a card's fields line up. */
  .box { position: relative; box-sizing: border-box; width: 9rem; display: flex; align-items: center; gap: 0.3rem; border: 1.5px solid var(--border); border-radius: 9px; padding: 0 0.5rem; background: #fff; }
  .box:focus-within { border-color: var(--blue); }
  .box.invalid { border-color: var(--red); background: var(--red-soft); }
  /* The site's own text-input look (a border, padding, a width) would draw a second box inside this one. */
  .box input { flex: 1; width: 0; min-width: 0; margin: 0; border: 0; border-radius: 0; padding: 0.35rem 0; background: none; box-shadow: none; font: inherit; font-weight: 500; text-align: right; outline: none; }
  .unit { color: var(--muted); font-weight: 500; }
  .sizing { display: flex; margin-right: -0.3rem; }
  .mode { display: flex; align-items: center; gap: 1px; height: 1.6rem; padding: 0 0.25rem; border: 0; border-radius: 6px; background: none; color: var(--muted); }
  .mode:hover, .mode:focus-visible, .mode[aria-expanded='true'] { background: var(--blue-soft); color: var(--blue-dark); }
  .filled .mode { color: var(--blue-dark); }
  .menu {
    position: absolute; z-index: 5; top: calc(100% + 4px); right: 0; display: flex; flex-direction: column; min-width: 11rem; padding: 0.3rem;
    border-radius: 10px; background: #1f2937; box-shadow: 0 10px 28px -8px rgb(17 24 39 / 45%);
  }
  .menu button {
    display: flex; align-items: center; gap: 0.45rem; padding: 0.4rem 0.55rem; border: 0; border-radius: 7px; background: none;
    color: #f9fafb; font-size: 0.82rem; font-weight: 500; text-align: left; white-space: nowrap;
  }
  .menu button:hover, .menu button:focus-visible { background: #2563eb; }
  .chev { opacity: 0.8; }
  .tick { width: 0.8rem; font-size: 0.8rem; }
</style>
