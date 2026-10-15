<script lang="ts">
  // An angle's popup body: its label, its mark (congruence arcs, or a square
  // when it's 90°) and its shading. Every change goes through `onchange`, with
  // a `merge` key while typing so the figure's history can take it as one.
  import MathInput from '$lib/shared/MathInput.svelte'
  import Swatches from './Swatches.svelte'
  import LabelPicker from './LabelPicker.svelte'
  import { labelPatch, MARK_NAMES, type AngleStyle, type Mark } from './options.js'

  let {
    value, right, onchange,
  }: { value: AngleStyle; right: boolean; onchange: (patch: Partial<AngleStyle>, merge?: string) => void } = $props()
</script>

{#snippet markIcon(m: Mark)}
  <!-- An angle with its mark as the figure draws it: nested arcs, or a square at a right angle. -->
  <svg viewBox="0 0 26 18" width="26" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    {#if m === 'right'}
      <path d="M5,16 L24,16 M5,16 L5,1" stroke-width="1.3" />
      <path d="M5,9 L12,9 L12,16" />
    {:else}
      <path d="M3,16 L25,16 M3,16 L20,2" stroke-width="1.3" />
      {#each Array(m === 'none' ? 0 : Number(m)) as _, i}
        {@const r = 8 + i * 3.4}
        <path d="M{3 + r},16 A{r},{r} 0 0 0 {3 + r * 0.772},{16 - r * 0.636}" />
      {/each}
      {#if m === 'none'}<line x1="9" y1="5" x2="17" y2="13" stroke-width="1.3" opacity="0.5" />{/if}
    {/if}
  </svg>
{/snippet}

<div class="group">
  <span class="name" id="pop-label">Label</span>
  <LabelPicker id="pop-label" value={value.label} onpick={(v) => onchange(labelPatch(value, v, right))} />
  {#if value.label === 'text'}<MathInput id="pop-text" aria-label="Label text" placeholder="x" bind:value={() => value.text, (v) => onchange({ text: v }, 'text')} />{/if}
</div>
<div class="group">
  <span class="name" id="pop-mark">{right ? 'Right-angle mark' : 'Congruence arcs'}</span>
  <div class="segmented" role="radiogroup" aria-labelledby="pop-mark">
    {#each (right ? ['none', 'right'] : ['none', '1', '2', '3']) as Mark[] as m}
      {@const on = value.mark === m || (!right && value.mark === 'right' && m === '1')}
      <button type="button" role="radio" aria-checked={on} class:on aria-label={MARK_NAMES[m]} title={MARK_NAMES[m]} onclick={() => onchange({ mark: m })}>
        {@render markIcon(m)}
      </button>
    {/each}
  </div>
</div>
<div class="group">
  <span class="name" id="pop-shade">Shading</span>
  <Swatches id="pop-shade" value={value.shade} onpick={(i) => onchange({ shade: i })} />
</div>
