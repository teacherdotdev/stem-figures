<script lang="ts">
  // The scatter plot itself: the grid and axes from $shared/graph, with any
  // zig-zag breaks, the points, the line, and its equation and r written below.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import { buildScatter } from './scatter.js'
  import type { Settings } from './settings.js'

  // id: prefixes the grid's marker ids, which have to be unique on the page.
  let { settings, svg = $bindable(), id = 's' }: { settings: Settings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildScatter(settings))
  const label = $derived(settings.titleMode === 'text' && settings.title.trim() ? `${settings.title.trim()}: ${g.description}` : g.description)
</script>

<Grid layout={g.layout} settings={g.grid} {id} bind:svg {label} gridlines={settings.gridlines}>
  <!-- The breaks: a white cover over the axis, and the zig-zag on it. -->
  {#each g.zigs as z}
    <rect x={z.cover.x} y={z.cover.y} width={z.cover.w} height={z.cover.h} fill="#fff" />
    <path d={z.d} fill="none" stroke={INK} stroke-width={z.width} stroke-linejoin="round" />
  {/each}

  {#if g.fit}
    <path d={g.fit} fill="none" stroke={INK} stroke-width="2.6" stroke-linecap="round" />
  {/if}

  {#if settings.mark === 'cross'}
    <g stroke={INK} stroke-width="2.4" stroke-linecap="round">
      {#each g.points as p}
        <path d="M{p.x - g.arm},{p.y - g.arm} L{p.x + g.arm},{p.y + g.arm} M{p.x - g.arm},{p.y + g.arm} L{p.x + g.arm},{p.y - g.arm}" />
      {/each}
    </g>
  {:else}
    <g fill={INK} stroke="#fff" stroke-width="1.2">
      {#each g.points as p}<circle cx={p.x} cy={p.y} r={g.dot} />{/each}
    </g>
  {/if}

  <g font-family={SANS} font-size={g.fs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each g.labels as l}<text x={l.x} y={l.y} text-anchor={l.anchor}>{l.text}</text>{/each}
  </g>
  <g stroke={INK} stroke-width="1.5">
    {#each g.blanks as b}<line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />{/each}
  </g>
</Grid>
