<script lang="ts">
  // The box where the teacher types an instrument's reading. The figure
  // follows as they type; the box itself is tidied to the instrument's range
  // and decimal places once they leave it or press Enter.
  import { tick } from 'svelte'
  import { Dices } from '@lucide/svelte'

  interface Props {
    label: string
    value: number
    decimals: number
    /** how far the arrows (and the mouse wheel) move it: an instrument's
     *  least count; one in the last decimal place if not given */
    step?: number
    min: number
    max: number
    /** what the reading is in, e.g. "mL"; a pH has none */
    unit?: string
    onchange: (value: number) => void
    /** picks a random valid reading; without it there's no Random button */
    onrandom?: () => void
  }
  let { label, value, decimals, step, min, max, unit = '', onchange, onrandom }: Props = $props()

  const id = $props.id()
  let input: HTMLInputElement

  // Show the reading, except while it's being typed: rewriting the box then
  // would turn "4" into "4.0" under the cursor.
  $effect(() => {
    const text = value.toFixed(decimals)
    if (document.activeElement !== input) input.value = text
  })

  function update() {
    if (Number.isFinite(input.valueAsNumber)) onchange(input.valueAsNumber)
  }

  async function commit(event: Event & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget
    if (Number.isFinite(input.valueAsNumber)) onchange(input.valueAsNumber)
    // Show the kept value, even when it's the one already shown (the box was
    // cleared, or rounding landed on the previous reading).
    await tick()
    input.value = value.toFixed(decimals)
  }
</script>

<div class="reading">
  <label for={id}>{label}</label>
  <div class="row">
    <input
      {id}
      type="number"
      inputmode="decimal"
      step={step ?? 10 ** -decimals}
      {min}
      {max}
      defaultValue={value.toFixed(decimals)}
      bind:this={input}
      oninput={update}
      onchange={commit}
    />
    {#if unit}<span class="unit">{unit}</span>{/if}
    {#if onrandom}
      <button type="button" class="btn-ghost random" onclick={onrandom}><Dices size={17} aria-hidden="true" /> Random</button>
    {/if}
  </div>
  <p class="hint">From {min} to {max}{unit ? ` ${unit}` : ''}, {decimals === 0 ? 'in whole numbers' : decimals === 1 ? 'to one decimal place' : `to ${decimals} decimal places`}.</p>
</div>

<style>
  label { display: block; margin-bottom: 0.35rem; font-weight: 700; font-size: 0.9rem; }
  .row { display: flex; align-items: center; gap: 0.5rem; }
  .row input { max-width: 9rem; font-variant-numeric: tabular-nums; }
  .unit { color: var(--muted); font-weight: 600; }
  .random { margin-left: auto; padding: 0.5rem 0.8rem; font-size: 0.9rem; }
  .hint { margin: 0.35rem 0 0; color: var(--muted); font-size: 0.8rem; }
</style>
