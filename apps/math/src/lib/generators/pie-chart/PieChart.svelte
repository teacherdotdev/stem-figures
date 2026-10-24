<script lang="ts">
  // The pie chart itself: its sectors, any part left empty, the arcs and dot
  // at the center, the labels with their leader lines, the key and the title,
  // as one self-contained SVG for printing and export.
  import { INK, SANS } from '$shared/graph/grid'
  import FillPatterns from '$lib/stats/FillPatterns.svelte'
  import { paint } from '$lib/stats/fills'
  import { R, TINT, buildPieChart, type Label } from './layout.js'
  import type { Settings } from './settings.js'

  // id: prefixes the patterns' ids, which have to be unique on the page.
  let { settings, svg = $bindable(), id = 'pie' }: { settings: Settings; svg?: SVGSVGElement; id?: string } = $props()

  const p = $derived(buildPieChart(settings))
  const label = $derived(settings.titleMode === 'text' && settings.title.trim() ? settings.title.trim() : 'Pie chart')
  // Color sectors are parted by thin white gaps; black-and-white ones by ink lines.
  const edge = $derived(settings.look === 'color' ? '#fff' : INK)
  const edgeWidth = $derived(settings.look === 'color' ? 2 : 1.5)
  const pts = (l: Label) => l.leader!.map((q) => q.join(',')).join(' ')
  /** The baseline of a label's line k. */
  const baseline = (l: Label, k: number) => l.y - l.h / 2 + p.fs * 0.78 + k * p.lineH
</script>

<svg
  bind:this={svg}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {p.width} {p.height}"
  width={p.width}
  height={p.height}
  role="img"
  aria-label={label}
>
  <defs><FillPatterns {id} fills={p.fills} /></defs>
  <rect width={p.width} height={p.height} fill="#fff" />

  <g transform="translate({p.cx} {p.cy})">
    <g stroke={edge} stroke-width={edgeWidth} stroke-linejoin="round">
      {#each p.sectors as t}
        {#if t.path}<path d={t.path} fill={paint(t.fill, id)} fill-opacity={t.tint ? TINT : undefined} />{:else}<circle r={R} fill={paint(t.fill, id)} />{/if}
      {/each}
    </g>

    <!-- What's left undrawn, or the whole circle when nothing is. -->
    <g stroke={INK} stroke-width="1.5" stroke-linejoin="round" fill="#fff">
      {#if p.empty?.path}<path d={p.empty.path} />{:else if p.blankCircle}<circle r={R} />{/if}
      {#if p.startRadius}<line x1="0" y1="0" x2="0" y2={-R} />{/if}
    </g>
    {#if settings.look !== 'color'}<circle r={R} fill="none" stroke={INK} stroke-width="1.5" />{/if}

    <g stroke={INK} stroke-width="1.5" fill="none">
      {#each p.arcs as d}<path {d} />{/each}
    </g>
    {#if p.centerDot}<circle r={p.dot} fill={INK} />{/if}

    <g stroke={INK} stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      {#each p.labels as l}{#if l.leader}<polyline points={pts(l)} />{/if}{/each}
    </g>

    <g font-family={SANS} font-size={p.fs} font-weight="bold" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">
      {#each [...p.measures, ...p.labels] as l}
        <!-- Each line centered: its text, then any blank line to write on. -->
        {#each l.lines as line, k}
          {@const start = l.x - l.widths[k] / 2}
          {#if line.text}
            <text x={start} y={baseline(l, k)} fill={l.white ? '#fff' : INK} stroke={l.halo ? '#fff' : 'none'}>{line.text}</text>
          {/if}
          {#if line.blank}
            <line x1={start + l.widths[k] - p.blankW} y1={baseline(l, k)} x2={start + l.widths[k]} y2={baseline(l, k)} stroke={l.white ? '#fff' : INK} stroke-width="1.5" />
          {/if}
        {/each}
      {/each}
    </g>

    {#if p.key}
      <g transform="translate({p.key.x} {p.key.y})" font-family={SANS} font-size={p.fs} font-weight="bold" fill={INK}>
        {#each p.key.items as k, j}
          <rect x={k.x} y={k.y} width={k.size} height={k.size} fill={paint(k.fill, id)} fill-opacity={p.key.tints[j] ? TINT : undefined} stroke={INK} stroke-width="1.3" />
          <text x={k.tx} y={k.ty}>{k.text}</text>
        {/each}
      </g>
    {/if}

    {#if p.title}
      <text x={p.title.x} y={p.title.y} text-anchor="middle" font-family={SANS} font-size={p.title.fs} font-weight="bold" fill={INK}>{p.title.text}</text>
    {:else if p.titleBlank}
      <line x1={p.titleBlank.x1} y1={p.titleBlank.y} x2={p.titleBlank.x2} y2={p.titleBlank.y} stroke={INK} stroke-width="1.5" />
    {/if}
  </g>
</svg>

<style>
  svg { display: block; width: 100%; height: auto; }
</style>
