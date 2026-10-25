<script lang="ts">
  // The stem-and-leaf plot itself: stems, lines, leaves (in boxes or not),
  // headings, title and key, as one self-contained SVG for printing and export.
  import { INK, SANS } from '$shared/graph/grid'
  import { buildStemAndLeaf } from './layout.js'
  import type { Settings } from './settings.js'

  let { settings, svg = $bindable() }: { settings: Settings; svg?: SVGSVGElement } = $props()

  const p = $derived(buildStemAndLeaf(settings))
  const label = $derived(settings.titleMode === 'text' && settings.title.trim() ? settings.title.trim() : 'Stem-and-leaf plot')
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
  <rect width={p.width} height={p.height} fill="#fff" />

  {#if p.title}
    <text x={p.title.x} y={p.title.y} text-anchor="middle" font-family={SANS} font-size={p.titleFs} font-weight="bold" fill={INK}>{p.title.text}</text>
  {/if}

  <g fill="none" stroke={INK} stroke-width="1.5">
    {#each p.boxes as b}<rect x={b.x} y={b.y} width={b.size} height={b.size} />{/each}
  </g>

  <g stroke={INK} stroke-width="2" stroke-linecap="square">
    {#each p.lines as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>

  <g font-family={SANS} font-size={p.headFs} font-weight="bold" fill={INK}>
    {#each p.headings as h}<text x={h.x} y={h.y} text-anchor={h.anchor}>{h.text}</text>{/each}
  </g>

  <g font-family={SANS} font-size={p.fs} fill={INK}>
    {#each p.stems as t}<text x={t.x} y={t.y} text-anchor={t.anchor} font-weight="bold">{t.text}</text>{/each}
    {#each p.leaves as t}<text x={t.x} y={t.y} text-anchor={t.anchor}>{t.text}</text>{/each}
  </g>

  {#if p.key}
    <text x={p.key.x} y={p.key.y} font-family={SANS} font-size={p.keyFs} fill={INK} xml:space="preserve"><tspan font-weight="bold">Key:</tspan> {p.key.text}</text>
  {/if}

  <g stroke={INK} stroke-width="1.5">
    {#each p.blanks as b}<line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />{/each}
  </g>
</svg>

<style>
  svg { display: block; width: 100%; height: auto; }
</style>
