<script lang="ts">
  // None to three of a mark: congruence ticks (|) or parallel arrows (›), the
  // arrows drawn as the figure draws them, big enough to tell apart.
  let { id, value, glyph, onpick }: { id: string; value: number; glyph: string; onpick: (n: number) => void } = $props()
</script>

<div class="segmented" role="radiogroup" aria-labelledby={id}>
  {#each [0, 1, 2, 3] as n}
    <button type="button" role="radio" aria-checked={value === n} class:on={value === n} aria-label={n ? `${n} ${glyph === '›' ? 'arrow' : 'tick'}${n > 1 ? 's' : ''}` : 'None'} onclick={() => onpick(n)}>
      {#if !n}None
      {:else if glyph === '›'}
        <svg viewBox="0 0 {6 + 7 * n} 16" width={6 + 7 * n} height="16" aria-hidden="true">
          {#each Array(n) as _, i}
            <polyline points="{2 + 7 * i},2 {8 + 7 * i},8 {2 + 7 * i},14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          {/each}
        </svg>
      {:else}{glyph.repeat(n)}{/if}
    </button>
  {/each}
</div>
