<script lang="ts">
  // Schematic (no numbers, as AP graphs are drawn) or numbered axes, for the
  // first card of a generator that offers both: it changes what the teacher
  // types next, so it sits with the setups rather than in Look.
  import { LOOKS, LOOK_NAMES, type Look } from './settings'

  let { look = $bindable() }: { look: Look } = $props()
</script>

<div class="field">
  <span>Axes</span>
  <div class="segmented" role="radiogroup" aria-label="Axes">
    {#each LOOKS as v}
      <button type="button" role="radio" aria-checked={look === v} class:on={look === v} onclick={() => (look = v)}>{LOOK_NAMES[v]}</button>
    {/each}
  </div>
</div>
