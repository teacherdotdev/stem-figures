<script lang="ts">
  // The histogram itself: the shared graph grid with the touching bars, the
  // frequency polygon and the frequencies drawn over it, the horizontal axis's
  // numbers under it and its zig-zag break, as one self-contained SVG for
  // printing and export.
  import Grid from '$shared/graph/Grid.svelte'
  import { GRIDLINE_STYLES, INK, SANS } from '$shared/graph/grid'
  import FillPatterns from '$lib/stats/FillPatterns.svelte'
  import { paint } from '$lib/stats/fills'
  import { buildHistogram } from './layout.js'
  import type { Settings } from './settings.js'

  // id: prefixes the patterns' ids, which have to be unique on the page.
  let { settings, svg = $bindable(), id = 'histogram' }: { settings: Settings; svg?: SVGSVGElement; id?: string } = $props()

  const h = $derived(buildHistogram(settings))
  const label = $derived(settings.titleMode === 'text' && settings.title.trim() ? settings.title.trim() : 'Histogram')
  const axisWidth = $derived(GRIDLINE_STYLES[settings.gridlines].axisWidth)
</script>

<Grid layout={h.layout} settings={h.grid} {label} bind:svg id="{id}-grid" gridlines={settings.gridlines}>
  <defs><FillPatterns {id} fills={[settings.fill]} /></defs>

  <g stroke={INK} stroke-width="1.5" stroke-linejoin="miter">
    {#each h.bars as r}<rect x={r.x} y={r.y} width={r.w} height={r.h} fill={paint(settings.fill, id)} />{/each}
  </g>

  <!-- The axes again, over the bars that stand on them. -->
  <g stroke={INK} stroke-width={axisWidth}>
    <line x1={h.layout.xAxis.x1} y1={h.layout.xAxis.y} x2={h.layout.xAxis.x2} y2={h.layout.xAxis.y} />
    <line x1={h.layout.yAxis.x} y1={h.layout.yAxis.y1} x2={h.layout.yAxis.x} y2={h.layout.yAxis.y2} />
  </g>

  {#if h.zig}
    <rect x={h.zig.cover.x} y={h.zig.cover.y} width={h.zig.cover.w} height={h.zig.cover.h} fill="#fff" />
    <path d={h.zig.path} fill="none" stroke={INK} stroke-width={axisWidth} stroke-linejoin="miter" />
  {/if}

  {#if h.lines.length}
    <g fill="none" stroke={INK} stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
      {#each h.lines as d}<path {d} />{/each}
    </g>
    <g fill={INK}>
      {#each h.dots as p}<circle cx={p.x} cy={p.y} r="3.6" />{/each}
    </g>
  {/if}

  <g font-family={SANS} font-size={h.fs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each h.xNumbers as n}<text x={n.x} y={n.y} text-anchor={n.anchor}>{n.text}</text>{/each}
    {#each h.values as v}<text x={v.x} y={v.y} text-anchor={v.anchor}>{v.text}</text>{/each}
  </g>
</Grid>
