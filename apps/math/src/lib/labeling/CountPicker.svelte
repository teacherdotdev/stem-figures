<script lang="ts">
  // None to three of a mark: congruence ticks (|) or parallel arrows (›).
  let { id, value, glyph, onpick }: { id: string; value: number; glyph: string; onpick: (n: number) => void } = $props()
</script>

<div class="segmented" role="radiogroup" aria-labelledby={id}>
  {#each [0, 1, 2, 3] as n}
    <button type="button" role="radio" aria-checked={value === n} class:on={value === n} onclick={() => onpick(n)}>{n ? glyph.repeat(n) : 'None'}</button>
  {/each}
</div>
