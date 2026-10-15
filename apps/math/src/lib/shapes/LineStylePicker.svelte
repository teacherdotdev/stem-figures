<script lang="ts">
  // Solid, dashed or dotted, for an extra line: a row of buttons, each
  // showing a short line drawn that way. With `hidden`, a last button hides
  // the line altogether.
  import { EyeOff } from '@lucide/svelte'
  import { LINE_STYLES, type LineStyle } from './parts.js'

  let {
    id, label = 'Line', value = $bindable(), hidden = false,
  }: { id: string; label?: string; value: LineStyle | 'hidden'; hidden?: boolean } = $props()
</script>

<div class="field">
  <span id="{id}-line">{label}</span>
  <div class="segmented" role="radiogroup" aria-labelledby="{id}-line">
    {#each (Object.entries(LINE_STYLES) as [LineStyle, string][]) as [style, title]}
      <button type="button" role="radio" aria-checked={value === style} aria-label={title} {title} class:on={value === style} onclick={() => (value = style)}>
        <svg viewBox="0 0 28 12" width="28" height="12" aria-hidden="true">
          <line
            x1="3" y1="6" x2="25" y2="6" stroke="currentColor" stroke-width="2.5"
            stroke-dasharray={style === 'dashed' ? '6 4' : style === 'dotted' ? '0.01 4.5' : undefined}
            stroke-linecap={style === 'dotted' ? 'round' : 'butt'}
          />
        </svg>
      </button>
    {/each}
    {#if hidden}
      <button type="button" role="radio" aria-checked={value === 'hidden'} aria-label="Hidden" title="Hidden" class:on={value === 'hidden'} onclick={() => (value = 'hidden')}>
        <EyeOff size={15} aria-hidden="true" />
      </button>
    {/if}
  </div>
</div>

<style>
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .segmented button { flex: 1; display: inline-grid; place-items: center; padding: 0.3rem 0.4rem; }
</style>
