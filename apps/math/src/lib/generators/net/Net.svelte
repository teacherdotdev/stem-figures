<script lang="ts">
  // A net, as a self-contained SVG that prints crisply and exports cleanly to
  // PNG/SVG (fonts and colors are inline, no page CSS): its faces, the fold
  // lines between them, the cut edges round the outside, glue tabs, and the 3D
  // shape beside it when asked. With `onmove`, its labels can be dragged; the
  // frame holds still while one is, so the figure doesn't rescale under the pointer.
  import FigureLabels from '$lib/shapes/FigureLabels.svelte'
  import type { NetLayout, Vec } from './layout.js'
  import { INK, type Offset } from './settings.js'

  let {
    figure, svg = $bindable(), label = 'Net', onmove = null,
  }: { figure: NetLayout; svg?: SVGSVGElement; label?: string; onmove?: ((part: string, offset: Offset) => void) | null } = $props()

  let frozen = $state<NetLayout['frame'] | null>(null)
  const f = $derived(frozen ?? figure.frame)
  const pts = (list: Vec[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const DASH = '7 5'
  const TAB = '#e5e7eb'
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

  {#each figure.tabs as t}<polygon points={pts(t)} fill={TAB} stroke={INK} stroke-width="1.6" stroke-linejoin="round" />{/each}
  {#each figure.faces as face}<path d={face.d} fill={face.fill} />{/each}

  <g fill="none" stroke={INK} stroke-width="1.6">
    {#each figure.extras as e}<line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke-dasharray={e.dashed ? '5 4' : undefined} />{/each}
    {#each figure.squares as sq}<polyline points={pts(sq)} />{/each}
    {#each figure.arcs as d}<path {d} />{/each}
  </g>
  <g fill="none" stroke={INK} stroke-width="1.6" stroke-dasharray={figure.dashedFolds ? DASH : undefined}>
    {#each figure.folds as e}<line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} />{/each}
  </g>
  <g fill="none" stroke={INK} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    {#each figure.cuts as e}<line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} />{/each}
    {#each figure.curves as d}<path {d} />{/each}
  </g>
  {#each figure.dots as [x, y]}<circle cx={x} cy={y} r="3" fill={INK} />{/each}

  {#if figure.solid}
    <g fill="none" stroke={INK} stroke-width="1.6" stroke-dasharray="6 5">
      {#each figure.solid.edges.filter((e) => e.hidden) as e}<line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} />{/each}
      {#each figure.solid.arcs.filter((a) => a.hidden) as a}<path d={a.d} />{/each}
    </g>
    <g fill="none" stroke={INK} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      {#each figure.solid.edges.filter((e) => !e.hidden) as e}<line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} />{/each}
      {#each figure.solid.arcs.filter((a) => !a.hidden) as a}<path d={a.d} />{/each}
    </g>
  {/if}

  <FigureLabels labels={figure.labels} ink={INK} {onmove} ondrag={(on) => (frozen = on ? figure.frame : null)} />
</svg>

<style>
  svg { display: block; width: 100%; height: auto; user-select: none; -webkit-user-select: none; }
</style>
