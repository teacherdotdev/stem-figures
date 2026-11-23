<script lang="ts">
  // A Rate Law Graphs figure: one graph, or [A], ln[A] and 1/[A] against
  // time side by side, each the shared graph grid drawn as an SVG inside this
  // one (as Physics' Motion Graphs stacks its three), with the model's curve,
  // the data points, and dashed guide lines at the half-lives on the [A]
  // graph; the chart title above and the data table below.
  import Grid from '$shared/graph/Grid.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import { buildRateLaw, labelOf } from './figure'
  import type { RateLawSettings } from './settings'

  let { settings, svg = $bindable(), id = 'rl' }: { settings: RateLawSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildRateLaw(settings))
  const label = $derived(labelOf(settings))
  const POINT = 4.5
</script>

<svg
  bind:this={svg}
  class="rate-law-graphs"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {g.width} {g.height}"
  width={g.width}
  height={g.height}
  role="img"
  aria-label={label}
>
  <rect width={g.width} height={g.height} fill="#fff" />

  {#each g.panels as p, i (p.plot)}
    <!-- The panel's size is set here too, so the page's CSS for a lone grid doesn't stretch it. -->
    <g class="panel" transform="translate({p.at.x} {p.at.y})" style:--w="{p.layout.width}px" style:--h="{p.layout.height}px">
      <Grid layout={p.layout} settings={p.grid} id="{id}-{i}" label={p.label} gridlines={p.gridlines}>
        <!-- White under the dashes, so a line along a gridline still reads as dashed. -->
        <g stroke="#fff" stroke-width="4">
          {#each p.guides as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
        </g>
        <g stroke={INK} stroke-width="1.5" stroke-dasharray="6 4">
          {#each p.guides as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
        </g>

        {#each p.paths as d}
          <path {d} fill="none" stroke={g.ink} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        {/each}
        {#each p.points as q}
          <circle cx={q.x} cy={q.y} r={POINT} fill={INK} stroke="#fff" stroke-width="1.2" />
        {/each}

        <g font-family={SANS} font-size={g.labelFs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
          {#each p.guideLabels as l}
            {#if l.text}<text x={l.x} y={l.y} text-anchor={l.anchor}>{l.text}</text>{/if}
          {/each}
        </g>
        <g stroke={INK} stroke-width="1.5">
          {#each p.guideLabels as l}
            {#if l.blank}<line x1={l.blank.x1} y1={l.blank.y1} x2={l.blank.x2} y2={l.blank.y2} />{/if}
          {/each}
        </g>
      </Grid>
    </g>
  {/each}

  {#if g.chartTitle}
    <text x={g.chartTitle.x} y={g.chartTitle.y} text-anchor="middle" font-family={SANS} font-size={g.fs * 1.6} font-weight="bold" fill={INK}>{g.chartTitle.text}</text>
  {/if}
  {#if g.chartBlank}
    <line x1={g.chartBlank.x1} y1={g.chartBlank.y1} x2={g.chartBlank.x2} y2={g.chartBlank.y2} stroke={INK} stroke-width="1.5" />
  {/if}

  {#if g.table}
    {@const t = g.table}
    <g font-family={SANS} font-size={g.fs} fill={INK}>
      <rect x={t.x} y={t.y} width={t.headW} height={t.h} fill="#e5e7eb" />
      <rect x={t.x} y={t.y} width={t.w} height={t.h} fill="none" stroke={INK} stroke-width="1.5" />
      <g stroke={INK} stroke-width="1">
        {#each t.rows as _, r}
          {#if r}<line x1={t.x} y1={t.y + r * t.rowH} x2={t.x + t.w} y2={t.y + r * t.rowH} />{/if}
        {/each}
        {#each t.rows[0].cells as _, c}
          <line x1={t.x + t.headW + c * t.cellW} y1={t.y} x2={t.x + t.headW + c * t.cellW} y2={t.y + t.h} />
        {/each}
      </g>
      {#each t.rows as row, r}
        {@const y = t.y + r * t.rowH + t.rowH / 2 + g.fs * 0.36}
        <text x={t.x + 11} {y} font-weight="bold">{row.head}</text>
        {#each row.cells as cell, c}
          <text x={t.x + t.headW + (c + 0.5) * t.cellW} {y} text-anchor="middle">{cell}</text>
        {/each}
      {/each}
    </g>
  {/if}
</svg>

<style>
  .rate-law-graphs { display: block; width: 100%; height: auto; }
  /* Grid.svelte fills the width it's shown in; inside this figure each
     panel is its own size instead, whatever the figure card says about SVGs
     (the exported SVG uses its width and height). */
  .rate-law-graphs .panel :global(svg) { width: var(--w); height: var(--h); max-width: none; max-height: none; }
</style>
