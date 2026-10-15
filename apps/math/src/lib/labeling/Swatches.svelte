<script lang="ts">
  // A shading color, from SHADES: the first is none.
  import { X } from '@lucide/svelte'
  import { SHADES } from './options.js'

  let { id, value, onpick }: { id: string; value: number; onpick: (i: number) => void } = $props()
</script>

<div class="swatches" role="radiogroup" aria-labelledby={id}>
  {#each SHADES as shade, i}
    <button
      type="button" role="radio" aria-checked={value === i} aria-label={shade.name} title={shade.name} class="swatch" class:on={value === i}
      style="background: {shade.fill || '#fff'}" onclick={() => onpick(i)}
    >{#if !shade.fill}<X size={14} />{/if}</button>
  {/each}
</div>

<style>
  .swatches { display: flex; gap: 0.4rem; }
  .swatch { width: 2rem; height: 2rem; display: grid; place-items: center; border: 1.5px solid var(--border); border-radius: 8px; color: var(--muted); padding: 0; }
  .swatch.on { border-color: var(--blue); box-shadow: 0 0 0 2px var(--blue-soft); }
</style>
