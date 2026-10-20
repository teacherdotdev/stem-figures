<script lang="ts">
  // The box where the teacher types a length on the ruler: a decimal in
  // centimeters, or in inches a fraction or mixed number too ("3 3/8"). The
  // figure follows as they type; the box is tidied to what the ruler reads
  // once they leave it or press Enter.
  import { tick } from 'svelte'
  import { Dices } from '@lucide/svelte'
  import { UNITS, formatLength, parseLength, type RulerScale } from './ruler'

  interface Props {
    label: string
    value: number
    scale: RulerScale
    min: number
    max: number
    onchange: (value: number) => void
    /** picks a random length; without it there's no Random button */
    onrandom?: () => void
  }
  let { label, value, scale, min, max, onchange, onrandom }: Props = $props()

  const id = $props.id()
  let input: HTMLInputElement
  const unit = $derived(UNITS[scale.system])
  const shown = $derived(formatLength(scale, value))

  // Show the length, except while it's being typed.
  $effect(() => {
    const text = shown
    if (document.activeElement !== input) input.value = text
  })

  function update() {
    const v = parseLength(input.value)
    if (v !== undefined) onchange(v)
  }

  async function commit() {
    update()
    await tick()
    input.value = formatLength(scale, value)
  }

  const precision = $derived(
    scale.system === 'imperial'
      ? `to the nearest ${formatLength(scale, scale.step)} in; type 3 3/8 or 3.375`
      : scale.step > 1
        ? `to the nearest ${scale.step} cm`
        : scale.decimals === 0
          ? 'in whole centimeters'
          : scale.decimals === 1
            ? 'to one decimal place'
            : `to ${scale.decimals} decimal places`,
  )
</script>

<div class="reading">
  <label for={id}>{label}</label>
  <div class="row">
    <input
      {id}
      type="text"
      inputmode={scale.system === 'imperial' ? 'text' : 'decimal'}
      autocomplete="off"
      spellcheck="false"
      defaultValue={shown}
      bind:this={input}
      oninput={update}
      onchange={commit}
    />
    <span class="unit">{unit}</span>
    {#if onrandom}
      <button type="button" class="btn-ghost random" onclick={onrandom}><Dices size={17} aria-hidden="true" /> Random</button>
    {/if}
  </div>
  <p class="hint">From {formatLength(scale, min)} to {formatLength(scale, max)} {unit}, {precision}.</p>
</div>

<style>
  label { display: block; margin-bottom: 0.35rem; font-weight: 700; font-size: 0.9rem; }
  .row { display: flex; align-items: center; gap: 0.5rem; }
  .row input { max-width: 9rem; font-variant-numeric: tabular-nums; }
  .unit { color: var(--muted); font-weight: 600; }
  .random { margin-left: auto; padding: 0.5rem 0.8rem; font-size: 0.9rem; }
  .hint { margin: 0.35rem 0 0; color: var(--muted); font-size: 0.8rem; }
</style>
