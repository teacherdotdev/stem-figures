<script lang="ts">
  // A photosynthesis graph on the shared graph grid: the dark shaded under
  // the gridlines, the dashed lines to the axes, the curves (solid, dashed
  // and dotted, so they read apart in black and white) and the points
  // measured off them, the marked points, lettered points and their labels,
  // a key naming the curves under the graph, and the right-hand axis for O₂.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import { buildPhotosynthesis, type Curve, type Label } from './figure'
  import { GRAPH_NAMES, type PhotosynthesisSettings } from './settings'

  let { settings, svg = $bindable(), id = 'ps' }: { settings: PhotosynthesisSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildPhotosynthesis(settings))

  const label = $derived.by(() => {
    if (settings.titleMode === 'text' && settings.title.trim()) return settings.title.trim()
    const what = settings.graph === 'gases' && settings.view === 'against' ? 'CO₂ against O₂ in a closed chamber' : GRAPH_NAMES[settings.graph]
    return g.curves.length > 1 && settings.graph !== 'gases' ? `${what}: ${g.curves.map((c) => c.name).join(', ')}` : what
  })
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

<Grid layout={g} settings={g.gridSettings} {id} bind:svg {label} gridlines={g.gridlines}>
  {#snippet under()}
    {#if g.dark}<rect x={g.dark.x} y={g.dark.y} width={g.dark.w} height={g.dark.h} fill="#e5e7eb" />{/if}
  {/snippet}

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

  {#each g.dots as d}
    <circle cx={d.x} cy={d.y} r={g.r} fill="#fff" stroke={INK} stroke-width="2.5" />
  {/each}
  {#each g.letters as l}
    <circle cx={l.at.x} cy={l.at.y} r={g.letterR} fill={INK} stroke="#fff" stroke-width="1.2" />
  {/each}

  {#each g.keyEntries as k}
    {@const c = g.curves.find((c) => c.index === k.index)!}
    {#if c.paths.length || !c.points.length}
      <line x1={k.sample.x1} y1={k.sample.y1} x2={k.sample.x2} y2={k.sample.y2} stroke={c.color} stroke-width="3" stroke-dasharray={c.dash} />
    {/if}
    {#if c.points.length}{@render marker(c, (k.sample.x1 + k.sample.x2) / 2, k.sample.y1)}{/if}
  {/each}

  <g font-family={SANS} font-size={g.labelFs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each g.periods as l}{@render words(l)}{/each}
    {#each g.markLabels as l}{@render words(l)}{/each}
    {#each g.letters as l}{@render words(l.text)}{/each}
    {#each g.keyEntries as k}<text x={k.text.x} y={k.text.y}>{k.text.text}</text>{/each}
  </g>
  <g stroke={INK} stroke-width="1.5">
    {#each g.markLabels as l}
      {#if l.blank}<line x1={l.blank.x1} y1={l.blank.y1} x2={l.blank.x2} y2={l.blank.y2} />{/if}
    {/each}
  </g>

  {#if g.right}
    <line x1={g.right.line.x1} y1={g.right.line.y1} x2={g.right.line.x2} y2={g.right.line.y2} stroke={INK} stroke-width="2.4" />
    <g font-family={SANS} font-size={g.fs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
      {#each g.right.numbers as n}<text x={n.x} y={n.y} text-anchor={n.anchor}>{n.text}</text>{/each}
    </g>
    {#if g.right.title}
      <text
        x={g.right.title.x} y={g.right.title.y} text-anchor="middle" dominant-baseline="central"
        transform="rotate(-90 {g.right.title.x} {g.right.title.y})"
        font-family={SANS} font-size={g.fs * 1.2} font-weight="bold" fill={INK}
      >{g.right.title.text}</text>
    {/if}
    {#if g.right.blank}
      <line x1={g.right.blank.x1} y1={g.right.blank.y1} x2={g.right.blank.x2} y2={g.right.blank.y2} stroke={INK} stroke-width="1.5" />
    {/if}
  {/if}
</Grid>
