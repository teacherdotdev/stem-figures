<script lang="ts">
  // How a part is labeled: None, Measure or Text, as a row of buttons. Without
  // `measure`, a part that has no measure to show is offered None and Text.
  import type { AngleLabel } from './options.js'

  let { id, value, measure = true, onpick }: { id: string; value: AngleLabel; measure?: boolean; onpick: (v: AngleLabel) => void } = $props()
  const CHOICES = [['none', 'None'], ['measure', 'Measure'], ['text', 'Text']] as const
</script>

<div class="segmented" role="radiogroup" aria-labelledby={id}>
  {#each CHOICES.filter(([v]) => measure || v !== 'measure') as [v, title]}
    <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => onpick(v)}>{title}</button>
  {/each}
</div>
