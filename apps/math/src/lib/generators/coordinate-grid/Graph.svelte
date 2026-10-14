<script lang="ts">
  // The coordinate grid itself: the grid and axes from $shared/graph, with
  // the teacher's equations drawn on it.
  import Grid from '$shared/graph/Grid.svelte'
  import { SANS, SERIF } from '$shared/graph/grid'
  import { buildGraph } from './graph.js'
  import type { Settings } from './settings.js'

  // id: prefixes the arrowheads' ids, which have to be unique on the page.
  let { settings, svg = $bindable(), id = 'g' }: { settings: Settings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildGraph(settings))
</script>

<Grid layout={g} {settings} {id} bind:svg label={settings.title || 'Coordinate grid'}>
  <!-- Inequalities' shaded regions, under the gridlines so the grid reads through them. -->
  {#snippet under()}
    {#each g.regions as r, k}
      {#if r.hatch === null}
        <path d={r.d} fill={r.color} fill-opacity={g.tint} />
      {:else}
        <pattern id="{id}-hatch-{k}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate({r.hatch})">
          <line x1="4.5" y1="0" x2="4.5" y2="9" stroke={r.color} stroke-width="1.5" />
        </pattern>
        <path d={r.d} fill="url(#{id}-hatch-{k})" />
      {/if}
    {/each}
  {/snippet}

  <!-- Asymptotes: dots on a white band, so one lying along a gridline doesn't disappear into it. -->
  {#each g.asymptotes as a}
    <path d={a.d} fill="none" stroke="#fff" stroke-width="3.2" />
    <path d={a.d} fill="none" stroke={a.color} stroke-width="2.8" stroke-dasharray="0.01 7" stroke-linecap="round" />
  {/each}
  {#each g.lines as l}
    <path d={l.d} fill="none" stroke={l.color} stroke-width={l.width} stroke-dasharray={l.dash} stroke-linecap={l.cap} stroke-linejoin="round" />
    {#each l.heads as d}<path {d} fill={l.color} />{/each}
  {/each}
  {#each g.circles as c}
    <circle cx={c.x} cy={c.y} r={g.r} fill={c.closed ? c.color : '#fff'} stroke={c.color} stroke-width="2.5" />
  {/each}
  {#each g.dots as d}
    {#if d.cross}
      <path d="M{d.x - 5.5},{d.y - 5.5} L{d.x + 5.5},{d.y + 5.5} M{d.x - 5.5},{d.y + 5.5} L{d.x + 5.5},{d.y - 5.5}" stroke={d.color} stroke-width="2.4" stroke-linecap="round" />
    {:else}
      <circle cx={d.x} cy={d.y} r="4.5" fill={d.color} />
    {/if}
  {/each}

  <!-- Point names: the letter in italic serif, like the axis labels; coordinates upright. -->
  <g font-size={g.fs * 1.2} font-weight="bold" stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each g.pointNames as p}
      <text x={p.x} y={p.y} fill={p.color}
        ><tspan font-family={SERIF} font-style="italic">{p.name}</tspan
        >{#if p.coords}<tspan font-family={SANS} font-size={g.fs}>{p.coords}</tspan>{/if}</text
      >
    {/each}
  </g>
</Grid>
