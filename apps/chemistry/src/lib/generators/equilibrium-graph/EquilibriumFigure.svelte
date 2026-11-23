<script lang="ts">
  // An equilibrium graph on the shared graph grid: each stress's dashed
  // line with its words above the grid, the species' lines (solid, dashed
  // and dotted, so they read apart in black and white) and each one's
  // formula beside it.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import type { Span } from '$shared/particles/key'
  import { buildEquilibrium, labelOf } from './figure'
  import type { EquilibriumSettings } from './settings'

  let { settings, svg = $bindable(), id = 'eq' }: { settings: EquilibriumSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildEquilibrium(settings))
  const label = $derived(labelOf(settings))
</script>

{#snippet pieces(spans: Span[])}{#each spans as span, i (i)}<tspan font-size={span.size} dy={span.dy || undefined}>{span.text}</tspan>{/each}{/snippet}

<Grid layout={g} {settings} {id} bind:svg {label}>
  <!-- White under the dashes, so a line along a gridline still reads as dashed. -->
  <g stroke="#fff" stroke-width="4">
    {#each g.marks as m (m.slot)}<line x1={m.line.x1} y1={m.line.y1} x2={m.line.x2} y2={m.line.y2} />{/each}
  </g>
  <g stroke={INK} stroke-width="1.5" stroke-dasharray="6 4">
    {#each g.marks as m (m.slot)}<line x1={m.line.x1} y1={m.line.y1} x2={m.line.x2} y2={m.line.y2} />{/each}
  </g>

  {#each g.curves as c (c.index)}
    {#each c.paths as d}
      <path {d} fill="none" stroke={c.color} stroke-width="3" stroke-dasharray={c.dash} stroke-linecap={c.dash ? 'butt' : 'round'} stroke-linejoin="round" />
    {/each}
  {/each}

  <g font-family={SANS} font-size={g.labelFs} font-weight="bold" stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each g.formulas as l (l.index)}
      <text x={l.x} y={l.y} text-anchor={l.anchor} fill={l.color}>{@render pieces(l.spans)}</text>
    {/each}
    {#each g.marks as m (m.slot)}
      {#if m.spans.length}<text x={m.x} y={m.y} text-anchor={m.anchor} fill={INK}>{@render pieces(m.spans)}</text>{/if}
    {/each}
  </g>
</Grid>
