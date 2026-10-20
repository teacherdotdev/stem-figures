<script lang="ts">
  // An enzyme activity graph on the shared graph grid: the dashed lines to
  // the axes, the curves (solid, dashed and dotted, so they read apart in
  // black and white), the marked points and their labels, Vmax, ½Vmax and Km
  // written at shape-only axes, and a key naming the curves under the graph.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import { buildEnzyme, type Label } from './figure'
  import { GRAPH_NAMES, type EnzymeSettings } from './settings'

  let { settings, svg = $bindable(), id = 'ea' }: { settings: EnzymeSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildEnzyme(settings))

  const label = $derived.by(() => {
    if (settings.titleMode === 'text' && settings.title.trim()) return settings.title.trim()
    const against = `Rate of reaction against ${GRAPH_NAMES[settings.graph].toLowerCase()}`
    return g.curves.length ? `${against}: ${g.curves.map((c) => c.name).join(', ')}` : against
  })
</script>

{#snippet words(l: Label)}
  {#if l.runs}<text x={l.x} y={l.y} text-anchor={l.anchor}>{#each l.runs as r}<tspan dy={r.dy || undefined} font-size={r.sub ? g.labelFs * 0.7 : undefined}>{r.text}</tspan>{/each}</text>{/if}
{/snippet}

<Grid layout={g} settings={g.gridSettings} {id} bind:svg {label} gridlines={g.gridlines}>
  <!-- White under the dashes, so a line along a gridline still reads as dashed. -->
  <g stroke="#fff" stroke-width="4">
    {#each [...g.lines, ...g.guides] as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>
  <g stroke={INK} stroke-width="1.5" stroke-dasharray="6 4">
    {#each [...g.lines, ...g.guides] as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>

  {#each g.curves as c (c.index)}
    {#each c.paths as d}
      <path {d} fill="none" stroke={c.color} stroke-width="3" stroke-dasharray={c.dash} stroke-linecap={c.dash ? 'butt' : 'round'} stroke-linejoin="round" />
    {/each}
  {/each}

  {#each g.dots as d}
    <circle cx={d.x} cy={d.y} r={g.r} fill="#fff" stroke={INK} stroke-width="2.5" />
  {/each}

  {#each g.keyEntries as k}
    {@const c = g.curves.find((c) => c.index === k.index)!}
    <line x1={k.sample.x1} y1={k.sample.y1} x2={k.sample.x2} y2={k.sample.y2} stroke={c.color} stroke-width="3" stroke-dasharray={c.dash} />
  {/each}

  <g font-family={SANS} font-size={g.labelFs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each g.markLabels as l}{@render words(l)}{/each}
    {#each g.sideLabels as l}{@render words(l)}{/each}
    {#each g.keyEntries as k}<text x={k.text.x} y={k.text.y}>{k.text.text}</text>{/each}
  </g>
  <g stroke={INK} stroke-width="1.5">
    {#each [...g.markLabels, ...g.sideLabels] as l}
      {#if l.blank}<line x1={l.blank.x1} y1={l.blank.y1} x2={l.blank.x2} y2={l.blank.y2} />{/if}
    {/each}
  </g>
</Grid>
