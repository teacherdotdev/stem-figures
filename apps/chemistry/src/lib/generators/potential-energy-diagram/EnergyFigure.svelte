<script lang="ts">
  // A potential energy diagram on the shared graph grid: the dashed lines
  // carrying each level across to its arrow, the curve (and the catalysed
  // path, dashed) or a level diagram's lines, the Ea and ΔH arrows with
  // Grid.svelte's arrowheads, the labels on the levels and arrows, and a key
  // naming the two paths under the graph.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import type { Span } from '$shared/particles/key'
  import { buildDiagram, describe } from './figure'
  import type { EnergySettings } from './settings'

  let { settings, svg = $bindable(), id = 'pe' }: { settings: EnergySettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildDiagram(settings))
  const label = $derived(describe(settings))
  const head = $derived(`url(#${id}-triangle)`)
</script>

{#snippet pieces(spans: Span[])}{#each spans as span, i (i)}<tspan font-size={span.size} dy={span.dy || undefined}>{span.text}</tspan>{/each}{/snippet}

<Grid layout={g} settings={g.gridSettings} {id} bind:svg {label} gridlines={g.gridlines}>
  <!-- White under the dashes, so a line along a gridline still reads as dashed. -->
  <g stroke="#fff" stroke-width="4">
    {#each g.guides as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>
  <g stroke={INK} stroke-width="1.5" stroke-dasharray="6 4">
    {#each g.guides as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>

  {#each g.curves as c (c.index)}
    {#each c.paths as d}
      <path {d} fill="none" stroke={c.color} stroke-width="3" stroke-dasharray={c.dash} stroke-linecap={c.dash ? 'butt' : 'round'} stroke-linejoin="round" />
    {/each}
  {/each}
  <g stroke={g.barColor} stroke-width="4" stroke-linecap="round">
    {#each g.bars as b}<line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />{/each}
  </g>

  <g stroke={INK} stroke-width="2">
    {#each g.arrows as a}
      <line
        x1={a.line.x1} y1={a.line.y1} x2={a.line.x2} y2={a.line.y2}
        marker-start={a.heads.start ? head : undefined} marker-end={a.heads.end ? head : undefined}
      />
    {/each}
  </g>

  {#each g.keyEntries as k}
    {@const c = g.curves.find((c) => c.index === k.index)!}
    <line x1={k.sample.x1} y1={k.sample.y1} x2={k.sample.x2} y2={k.sample.y2} stroke={c.color} stroke-width="3" stroke-dasharray={c.dash} />
  {/each}

  <g font-family={SANS} font-size={g.lfs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each g.words as l}
      {#each l.rows as spans, r}<text x={l.x} y={l.y + r * g.row} text-anchor={l.anchor}>{@render pieces(spans)}</text>{/each}
    {/each}
    {#each g.keyEntries as k}<text x={k.text.x} y={k.text.y}>{k.text.text}</text>{/each}
  </g>
  <g stroke={INK} stroke-width="1.5">
    {#each g.words as l}
      {#if l.leader}<line x1={l.leader.x1} y1={l.leader.y1} x2={l.leader.x2} y2={l.leader.y2} stroke-width="1" />{/if}
      {#if l.blank}<line x1={l.blank.x1} y1={l.blank.y1} x2={l.blank.x2} y2={l.blank.y2} />{/if}
    {/each}
  </g>
</Grid>
