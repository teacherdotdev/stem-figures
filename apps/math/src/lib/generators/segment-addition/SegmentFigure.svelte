<script lang="ts">
  // The segment addition figure itself, as a self-contained SVG that prints
  // crisply and exports cleanly to PNG/SVG (fonts and colors are inline, no
  // page CSS).
  import FigureLabels from '$lib/shapes/FigureLabels.svelte'
  import type { Vec } from '$lib/shapes/vec.js'
  import { buildSegments } from './layout.js'
  import type { Settings } from './settings.js'

  let { settings, svg = $bindable(), id = 'seg' }: { settings: Settings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildSegments(settings))
  const INK = '#111827'
  const pts = (list: Vec[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
</script>

<svg
  bind:this={svg}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="{g.frame.x} {g.frame.y} {g.frame.w} {g.frame.h}"
  width={g.frame.w}
  height={g.frame.h}
  role="img"
  aria-labelledby="{id}-title {id}-desc"
>
  <title id="{id}-title">Segment addition figure</title>
  <desc id="{id}-desc">{g.description}</desc>
  <rect x={g.frame.x} y={g.frame.y} width={g.frame.w} height={g.frame.h} fill="#fff" />

  <g stroke={INK} stroke-width="2.4" stroke-linecap="round" fill="none">
    {#each g.lines as [a, b]}<line x1={a[0].toFixed(1)} y1={a[1].toFixed(1)} x2={b[0].toFixed(1)} y2={b[1].toFixed(1)} />{/each}
  </g>
  <g stroke={INK} stroke-width="1.8" fill="none" stroke-linecap="round">
    {#each g.tickLines as [a, b]}<line x1={a[0].toFixed(1)} y1={a[1].toFixed(1)} x2={b[0].toFixed(1)} y2={b[1].toFixed(1)} />{/each}
    {#each g.squares as sq}<polyline points={pts(sq)} stroke-width="1.6" stroke-linecap="butt" />{/each}
    {#each g.braces as d}<path {d} stroke-width="1.6" stroke-linejoin="round" />{/each}
    {#each g.openHeads as h}<polyline points={pts(h)} stroke-width="2.2" stroke-linejoin="round" />{/each}
    {#each g.blanks as b}<line x1={b.x1.toFixed(1)} y1={b.y.toFixed(1)} x2={b.x2.toFixed(1)} y2={b.y.toFixed(1)} stroke-width="1.5" />{/each}
  </g>
  <g fill={INK}>
    {#each g.heads as h}<polygon points={pts(h)} />{/each}
    {#each g.dots as [x, y]}<circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={g.dotR} />{/each}
  </g>
  <FigureLabels labels={g.labels} ink={INK} />
</svg>

<style>
  svg { display: block; width: 100%; height: auto; }
</style>
