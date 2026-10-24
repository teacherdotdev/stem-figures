<script lang="ts">
  // A circle figure, as a self-contained SVG that prints crisply and exports
  // cleanly to PNG/SVG (fonts and colors are inline, no page CSS). Only the
  // figure: highlights, handles and what the teacher can point at are drawn
  // over it by the generator, so they never reach an export. `frame`, while
  // a point is dragged, holds the view still.
  import FigureLabels from '$lib/shapes/FigureLabels.svelte'
  import { INK } from '$lib/shapes/parts.js'
  import { DOT, R, type CircleLayout, type Vec } from './layout.js'

  let {
    figure, frame = null, svg = $bindable(), label = 'A circle',
  }: { figure: CircleLayout; frame?: CircleLayout['frame'] | null; svg?: SVGSVGElement; label?: string } = $props()

  const f = $derived(frame ?? figure.frame)
  const pts = (list: Vec[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const DASH = { solid: undefined, dashed: '9 6', dotted: '0.01 6' }
</script>

<svg
  bind:this={svg}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="{f.x} {f.y} {f.w} {f.h}"
  width={f.w}
  height={f.h}
  role="img"
  aria-label={label}
>
  <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#fff" />

  {#each figure.shades as sh}<path d={sh.d} fill={sh.fill} />{/each}

  <circle cx="0" cy="0" r={R} fill="none" stroke={INK} stroke-width="2.2" />
  {#each figure.arcStrokes as a}<path d={a.d} fill="none" stroke={a.color} stroke-width="4.5" stroke-linecap="round" />{/each}

  <g fill="none" stroke={INK} stroke-width="1.6">
    {#each figure.arcs as d}<path {d} />{/each}
    {#each figure.squares as sq}<polyline points={pts(sq)} />{/each}
    {#each figure.ticks as [a, b]}<line x1={a[0].toFixed(1)} y1={a[1].toFixed(1)} x2={b[0].toFixed(1)} y2={b[1].toFixed(1)} stroke-width="1.8" stroke-linecap="round" />{/each}
    {#each figure.arrows as a}<polyline points={pts(a)} stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />{/each}
  </g>

  <g stroke={INK}>
    {#each figure.segments as g}
      {@const [a, b] = g.drawn}
      <line
        x1={a[0].toFixed(1)} y1={a[1].toFixed(1)} x2={b[0].toFixed(1)} y2={b[1].toFixed(1)}
        stroke-width={g.style === 'dotted' ? 3 : 2.2} stroke-dasharray={DASH[g.style]} stroke-linecap="round"
      />
    {/each}
  </g>
  {#each figure.heads as h}<polygon points={pts(h)} fill={INK} stroke={INK} stroke-width="1" stroke-linejoin="round" />{/each}
  {#each figure.openHeads as h}<polyline points={pts(h)} fill="none" stroke={INK} stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />{/each}
  {#each figure.dots as [x, y]}<circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={DOT} fill={INK} />{/each}

  <FigureLabels labels={figure.labels} ink={INK} />
</svg>

<style>
  svg { display: block; width: 100%; height: auto; user-select: none; -webkit-user-select: none; }
</style>
