<script lang="ts">
  // A phase diagram on the shared graph grid: the dashed lines (from the
  // triple and critical points to the axes, the 1 atm line and the lines
  // down from where it crosses a boundary, the supercritical region's
  // edges), the three boundaries, the dots, the values at the axes, and the
  // labels: the regions and points, and the boundaries' names turned to run
  // along them.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import { buildDiagram, describe } from './figure'
  import type { PhaseSettings } from './settings'

  let { settings, svg = $bindable(), id = 'ph' }: { settings: PhaseSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildDiagram(settings))
  const label = $derived(describe(settings))
</script>

<Grid layout={g} settings={g.gridSettings} {id} bind:svg {label} gridlines={g.gridlines}>
  <!-- White under the dashes, so a line along a gridline still reads as dashed. -->
  <g stroke="#fff" stroke-width="4">
    {#each g.dashed as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>
  <g stroke={INK} stroke-width="1.5" stroke-dasharray="6 4">
    {#each g.dashed as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>

  {#each g.curves as d}
    <path {d} fill="none" stroke={g.color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  {/each}
  {#each g.dots as p}<circle cx={p.x} cy={p.y} r={p.r} fill={INK} stroke="#fff" stroke-width="1.5" />{/each}

  <g font-family={SANS} font-size={g.lfs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
    {#each g.along as l}
      {#each l.rows as row, r}
        <text x={l.x} y={l.y + g.lfs * 0.35 + (r - (l.rows.length - 1) / 2) * g.row} text-anchor="middle" transform="rotate({l.angle} {l.x} {l.y})">{row}</text>
      {/each}
    {/each}
    {#each g.words as l}
      {#each l.rows as row, r}<text x={l.x} y={l.y + r * g.row} text-anchor={l.anchor}>{row}</text>{/each}
    {/each}
  </g>
  <g font-family={SANS} font-size={g.mfs} font-weight="bold" fill={INK}>
    {#each g.marks as m}{#if m.text}<text x={m.x} y={m.y} text-anchor={m.anchor}>{m.text}</text>{/if}{/each}
  </g>
  <g stroke={INK} stroke-width="1.5">
    {#each g.along as l}
      {#if l.blank}<line x1={l.blank.x1} y1={l.blank.y1} x2={l.blank.x2} y2={l.blank.y2} transform="rotate({l.angle} {l.x} {l.y})" />{/if}
    {/each}
    {#each g.words as l}
      {#if l.blank}<line x1={l.blank.x1} y1={l.blank.y1} x2={l.blank.x2} y2={l.blank.y2} />{/if}
      {#if l.leader}<line x1={l.leader.x1} y1={l.leader.y1} x2={l.leader.x2} y2={l.leader.y2} stroke-width="1.2" />{/if}
    {/each}
    {#each g.marks as m}
      {#if m.blank}<line x1={m.blank.x1} y1={m.blank.y1} x2={m.blank.x2} y2={m.blank.y2} />{/if}
    {/each}
  </g>
</Grid>
