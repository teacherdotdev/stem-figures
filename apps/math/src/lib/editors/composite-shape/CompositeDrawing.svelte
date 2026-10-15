<script lang="ts">
  // A composite shape as SVG pieces, for the editor's page, its export and
  // its directory card. Colors and fonts are inline so it exports cleanly.
  // With `onmove`, labels can be dragged (see FigureLabels). `faint` draws
  // the outline light, so the extra lines stand out while they're drawn.
  import FigureLabels from '$lib/shapes/FigureLabels.svelte'
  import { INK } from '$lib/shapes/parts.js'
  import type { Offset } from '$lib/shapes/parts.js'
  import type { LineStyle, Vec } from './composite'
  import type { Drawn } from './figure'

  let {
    drawn, onmove = null, ondrag, faint = false,
  }: { drawn: Drawn; onmove?: ((part: string, offset: Offset) => void) | null; ondrag?: (dragging: boolean) => void; faint?: boolean } = $props()

  const FAINT = '#c3c8d2'
  const DASH: Record<LineStyle, string | undefined> = { solid: undefined, dashed: '7 5', dotted: '0.01 5' }
  const pts = (list: Vec[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
</script>

<!-- Everything but the labels lets pointers through to the editor's parts underneath. -->
<g pointer-events="none">
{#each drawn.fills as f}<path d={f.d} fill={f.fill} stroke="none" />{/each}
{#each drawn.wedges as w}<path d={w.d} fill={w.fill} stroke="none" />{/each}

{#each drawn.lines as l (l.id)}
  <!-- While faint, a ray's run-on is as pale as the outline, so the stretch between its ends stands out. -->
  <line
    x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} stroke={(faint && l.seg) || l.pale ? FAINT : INK} stroke-width={(l.style === 'dotted' ? 2.4 : 1.8) * (l.width ?? 1)}
    stroke-dasharray={DASH[l.style]} stroke-linecap={l.style === 'dotted' ? 'round' : 'butt'}
  />
  {#if faint && l.seg && !l.pale}
    <line
      x1={l.seg[0][0]} y1={l.seg[0][1]} x2={l.seg[1][0]} y2={l.seg[1][1]} stroke={INK} stroke-width={(l.style === 'dotted' ? 2.4 : 1.8) * (l.width ?? 1)}
      stroke-dasharray={DASH[l.style]} stroke-dashoffset={Math.hypot(l.seg[0][0] - l.from[0], l.seg[0][1] - l.from[1])}
      stroke-linecap={l.style === 'dotted' ? 'round' : 'butt'}
    />
  {/if}
{/each}

<g fill="none" stroke={INK} stroke-width="1.6">
  {#each drawn.squares as sq}<polyline points={pts(sq)} />{/each}
  {#each drawn.arcs as d}<path {d} />{/each}
  {#each drawn.ticks as [p, q]}<line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke-width="1.8" />{/each}
  {#each drawn.arrows as a}<polyline points={pts(a)} stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />{/each}
</g>

{#each drawn.heads as h}<polygon points={pts(h)} fill={INK} stroke={INK} stroke-width="1" stroke-linejoin="round" />{/each}
{#each drawn.openHeads as h}<polyline points={pts(h)} fill="none" stroke={INK} stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />{/each}

{#each drawn.paths as d}<path {d} fill="none" stroke={faint ? FAINT : INK} stroke-width="2.4" stroke-linejoin="round" />{/each}
<!-- Sides drawn their own way: a solid one with round ends, so it still meets its neighbors cleanly at the corners. -->
{#each drawn.edges as e}
  <path
    d={e.d} fill="none" stroke={faint ? FAINT : INK} stroke-width={(e.style === 'dotted' ? 3 : 2.4) * e.width} stroke-linejoin="round"
    stroke-dasharray={DASH[e.style]} stroke-linecap={e.style === 'dashed' ? 'butt' : 'round'}
  />
{/each}
{#each drawn.dots as [x, y]}<circle cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" fill={INK} />{/each}
</g>

<FigureLabels labels={drawn.labels} ink={INK} {onmove} {ondrag} />
