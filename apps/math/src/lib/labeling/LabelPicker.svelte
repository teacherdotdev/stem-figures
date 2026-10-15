<script lang="ts">
  // How a part is labeled: None, Measure or Text, as a row of buttons.
  import type { AngleLabel } from './options.js'

  let { id, value, onpick }: { id: string; value: AngleLabel; onpick: (v: AngleLabel) => void } = $props()
  const CHOICES = [['none', 'None'], ['measure', 'Measure'], ['text', 'Text']] as const
</script>

<div class="segmented" role="radiogroup" aria-labelledby={id}>
  {#each CHOICES as [v, title]}
    <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => onpick(v)}>{title}</button>
  {/each}
</div>
