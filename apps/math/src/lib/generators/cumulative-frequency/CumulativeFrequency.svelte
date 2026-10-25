<script lang="ts">
  // The cumulative frequency graph itself: the shared graph grid with the
  // reading lines, the join and the plotted points drawn over it, and the
  // readings' values written past the axis numbers, as one self-contained SVG
  // for printing and export.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import { buildCumulative } from './layout.js'
  import type { Settings } from './settings.js'

  // id: prefixes the grid's ids, which have to be unique on the page.
  let { settings, svg = $bindable(), id = 'cumulative' }: { settings: Settings; svg?: SVGSVGElement; id?: string } = $props()

  const c = $derived(buildCumulative(settings))
  const label = $derived(settings.titleMode === 'text' && settings.title.trim() ? settings.title.trim() : 'Cumulative frequency graph')
  const R = 5 // half a cross, or a dot's radius less a little
</script>

<Grid layout={c.layout} settings={c.grid} {label} bind:svg id="{id}-grid" gridlines={settings.gridlines}>
  <g stroke={c.colors.reading} stroke-width="1.6" stroke-dasharray="6 4" fill="none">
    {#each c.guides as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>

  <g stroke={c.colors.curve} stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" fill="none">
    {#each c.paths as d}<path {d} />{/each}
  </g>

  {#if c.mark === 'cross'}
    <g stroke={INK} stroke-width="2" stroke-linecap="round">
      {#each c.points as p}
        <line x1={p.x - R} y1={p.y - R} x2={p.x + R} y2={p.y + R} />
        <line x1={p.x - R} y1={p.y + R} x2={p.x + R} y2={p.y - R} />
      {/each}
    </g>
  {:else}
    <g fill={INK}>
      {#each c.points as p}<circle cx={p.x} cy={p.y} r={R - 0.8} />{/each}
    </g>
  {/if}

  <g font-family={SANS} font-size={c.fs} font-weight="bold" fill={c.colors.reading} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each c.labels as l}<text x={l.x} y={l.y} text-anchor={l.anchor}>{l.text}</text>{/each}
  </g>

  <g stroke={INK} stroke-width="1.5">
    {#each c.blanks as b}<line x1={b.x1} y1={b.y} x2={b.x2} y2={b.y} />{/each}
  </g>
</Grid>
