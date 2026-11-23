<script lang="ts">
  // A bond energy curve on the shared graph grid: the zero line, the dashed
  // guide lines, the curves (solid, dashed and dotted, so they read apart in
  // black and white), a dot on each minimum, the labels, and a key naming
  // the curves under the graph.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import { buildCurve, describe } from './figure'
  import type { BondSettings } from './settings'

  let { settings, svg = $bindable(), id = 'bec' }: { settings: BondSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildCurve(settings))
  const label = $derived(describe(settings))
  const POINT = 4.5
</script>

<Grid layout={g} settings={g.gridSettings} {id} bind:svg {label} gridlines={g.gridlines}>
  {#if g.zero}
    <line x1={g.zero.x1} y1={g.zero.y1} x2={g.zero.x2} y2={g.zero.y2} stroke={INK} stroke-width="1.5" />
  {/if}

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
  {#each g.dots as p}<circle cx={p.x} cy={p.y} r={POINT} fill={p.color} stroke="#fff" stroke-width="1.2" />{/each}

  <!-- A label written on its own guide line sits on a white patch. -->
  {#each g.words as l}
    {#if l.back}<rect x={l.back.x0} y={l.back.y0} width={l.back.x1 - l.back.x0} height={l.back.y1 - l.back.y0} fill="#fff" />{/if}
  {/each}

  {#each g.keyEntries as k}
    {@const c = g.curves[k.index]}
    <line x1={k.sample.x1} y1={k.sample.y1} x2={k.sample.x2} y2={k.sample.y2} stroke={c.color} stroke-width="3" stroke-dasharray={c.dash} />
  {/each}

  <g font-family={SANS} font-size={g.labelFs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each g.words as l}
      {#if l.text}<text x={l.x} y={l.y} text-anchor={l.anchor} fill={l.color}>{l.text}</text>{/if}
    {/each}
    {#each g.keyEntries as k}<text x={k.text.x} y={k.text.y}>{k.text.text}</text>{/each}
  </g>
  <g stroke={INK} stroke-width="1.5">
    {#each g.words as l}
      {#if l.blank}<line x1={l.blank.x1} y1={l.blank.y1} x2={l.blank.x2} y2={l.blank.y2} stroke={l.color} />{/if}
    {/each}
  </g>
</Grid>
