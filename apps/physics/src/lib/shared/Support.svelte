<script lang="ts">
  // A hatched ceiling or ground from support.ts: its line, then its hatches.
  // Put it inside the figure's <svg>, within the mirror transform.
  import type { Support } from './support'

  let { support, ink }: { support: Support; ink: string } = $props()
</script>

<line x1={support.line.x1} y1={support.line.y1} x2={support.line.x2} y2={support.line.y2} stroke={ink} stroke-width="2.5" />
{#each support.hatches as h}<line x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2} stroke={ink} stroke-width="1.3" />{/each}
