<script lang="ts">
  // A half-life graph on the shared graph grid: the dashed guide lines, the
  // decay curves (solid, dashed and dotted, so they read apart in black and
  // white) and their dots, the guide lines' labels, and a key naming the
  // curves under the graph.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import { buildHalfLife, labelOf, type Curve, type Label } from './figure'
  import type { HalfLifeSettings } from './settings'

  let { settings, svg = $bindable(), id = 'hl' }: { settings: HalfLifeSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildHalfLife(settings))
  const label = $derived(labelOf(settings))
  const POINT = 4.5
</script>

{#snippet marker(c: Curve, x: number, y: number)}
  {#if c.marker === 'circle'}
    <circle cx={x} cy={y} r={POINT} fill={c.color} stroke="#fff" stroke-width="1.2" />
  {:else if c.marker === 'square'}
    <rect x={x - POINT} y={y - POINT} width={POINT * 2} height={POINT * 2} fill="#fff" stroke={c.color} stroke-width="2" />
  {:else}
    <path d="M{x},{y - POINT * 1.25}L{x + POINT * 1.15},{y + POINT * 0.85}L{x - POINT * 1.15},{y + POINT * 0.85}z" fill={c.color} stroke="#fff" stroke-width="1" stroke-linejoin="round" />
  {/if}
{/snippet}

{#snippet words(l: Label)}
  {#if l.text}<text x={l.x} y={l.y} text-anchor={l.anchor}>{l.text}</text>{/if}
{/snippet}

<Grid layout={g} {settings} {id} bind:svg {label}>
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
  {#each g.curves as c (c.index)}
    {#each c.points as p}{@render marker(c, p.x, p.y)}{/each}
  {/each}

  {#each g.keyEntries as k}
    {@const c = g.curves.find((c) => c.index === k.index)!}
    {#if c.paths.length || !c.points.length}
      <line x1={k.sample.x1} y1={k.sample.y1} x2={k.sample.x2} y2={k.sample.y2} stroke={c.color} stroke-width="3" stroke-dasharray={c.dash} />
    {/if}
    {#if c.points.length}{@render marker(c, (k.sample.x1 + k.sample.x2) / 2, k.sample.y1)}{/if}
  {/each}

  <g font-family={SANS} font-size={g.labelFs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each g.guideLabels as l}{@render words(l)}{/each}
    {#each g.keyEntries as k}<text x={k.text.x} y={k.text.y}>{k.text.text}</text>{/each}
  </g>
  <g stroke={INK} stroke-width="1.5">
    {#each g.guideLabels as l}
      {#if l.blank}<line x1={l.blank.x1} y1={l.blank.y1} x2={l.blank.x2} y2={l.blank.y2} />{/if}
    {/each}
  </g>
</Grid>
