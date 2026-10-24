<script lang="ts">
  // The bar graph itself: the shared graph grid with the bars, their error
  // bars and values drawn over it, and the category names, key and note
  // around it, as one self-contained SVG for printing and export.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import FillPatterns from '$lib/stats/FillPatterns.svelte'
  import { paint } from '$lib/stats/fills'
  import { buildBarGraph } from './layout.js'
  import type { Settings } from './settings.js'

  // id: prefixes the patterns' ids, which have to be unique on the page.
  let { settings, svg = $bindable(), id = 'bars' }: { settings: Settings; svg?: SVGSVGElement; id?: string } = $props()

  const b = $derived(buildBarGraph(settings))
  const label = $derived(settings.titleMode === 'text' && settings.title.trim() ? settings.title.trim() : 'Bar graph')
</script>

<Grid layout={b.layout} settings={b.grid} {label} bind:svg id="{id}-grid" gridlines={settings.gridlines} lines={b.lines}>
  <defs><FillPatterns {id} fills={b.fills} /></defs>

  <g stroke={INK} stroke-width="1.5" stroke-linejoin="miter">
    {#each b.bars as r}<rect x={r.x} y={r.y} width={r.w} height={r.h} fill={paint(r.fill, id)} />{/each}
  </g>

  <g stroke={INK} stroke-width="1.6" stroke-linecap="butt">
    {#each b.errorBars as e}
      <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
      {#each e.caps as c}<line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} />{/each}
    {/each}
  </g>

  <g font-family={SANS} font-size={b.fs} font-weight="bold" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">
    {#each b.values as v}
      <text x={v.x} y={v.y} text-anchor={v.anchor} fill={v.white ? '#fff' : INK} stroke={v.halo ? '#fff' : 'none'}>{v.text}</text>
    {/each}
  </g>

  <g font-family={SANS} font-size={b.fs} font-weight="bold" fill={INK}>
    {#each b.categories as c}
      {#if c.slant}
        <text x={c.x} y={c.y} text-anchor="end" transform="rotate(-45 {c.x} {c.y})">{c.lines[0]}</text>
      {:else}
        <text x={c.x} y={c.y} text-anchor={c.anchor}>
          {#each c.lines as line, i}<tspan x={c.x} dy={i ? b.lineH : 0}>{line}</tspan>{/each}
        </text>
      {/if}
    {/each}
  </g>
  <g stroke={INK} stroke-width="1.5">
    {#each b.blanks as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>

  {#if b.key}
    <g transform="translate({b.key.x} {b.key.y})" font-family={SANS} font-size={b.fs} font-weight="bold" fill={INK}>
      {#each b.key.items as k}
        <rect x={k.x} y={k.y} width={k.size} height={k.size} fill={paint(k.fill, id)} stroke={INK} stroke-width="1.3" />
        <text x={k.tx} y={k.ty}>{k.text}</text>
      {/each}
    </g>
  {/if}

  {#if b.note}
    <text x={b.note.x} y={b.note.y} text-anchor="middle" font-family={SANS} font-size={b.fs * 0.95} fill={INK}>{b.note.text}</text>
  {/if}
</Grid>
