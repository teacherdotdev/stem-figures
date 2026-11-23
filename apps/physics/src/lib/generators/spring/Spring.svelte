<script lang="ts">
  // A Spring figure, inside the shared frame that adds the chart title: the
  // support, the dashed lines, the coils (each drawn for its own length, see
  // $lib/shared/spring), what hangs on them, then the marks, vectors and
  // labels on top (./spring).
  import FigureFrame from '$shared/FigureFrame.svelte'
  import DimensionLine from '$lib/shared/DimensionLine.svelte'
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import ObjectShape from '$lib/shared/ObjectShape.svelte'
  import Support from '$lib/shared/Support.svelte'
  import VectorArrow from '$lib/shared/VectorArrow.svelte'
  import { palette } from '$lib/shared/figure'
  import { LABEL_SIZE } from '$lib/shared/layout'
  import { OBJECT_SIZE, buildSpring, describe } from './spring'
  import type { SpringSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: SpringSettings; svg?: SVGSVGElement } = $props()

  const fig = $derived(buildSpring(settings))
  const p = $derived(palette(settings.color))
  const baseline = LABEL_SIZE * 0.35
</script>

<FigureFrame bind:svg width={fig.width} height={fig.height} label={describe(settings)} title={settings.titleMode === 'text' ? settings.title : ''}>
  {#each fig.supports as support}<Support {support} ink={p.ink} />{/each}
  {#each fig.dashed as d}<line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={p.ink} stroke-width="1.3" stroke-dasharray="6 4" />{/each}

  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    {#each fig.coils as d}<path {d} stroke={p.wire} stroke-width="2" />{/each}
    {#each fig.wires as w}<line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke={p.wire} stroke-width="2" />{/each}
    {#each fig.bars as b}<line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={p.ink} stroke-width="4" />{/each}
    {#each fig.rings as r}<circle cx={r.x} cy={r.y} r="4" stroke={p.wire} stroke-width="2" />{/each}
  </g>
  {#each fig.joins as j}<circle cx={j.x} cy={j.y} r="3.5" fill={p.ink} />{/each}

  {#each fig.objects as o}
    <g transform="translate({o.at.x} {o.at.y})"><ObjectShape kind={o.kind} size={OBJECT_SIZE} fill={p.object} stroke={p.ink} /></g>
  {/each}
  {#each fig.masses as m}
    <line x1={m.rod.x1} y1={m.rod.y1} x2={m.rod.x2} y2={m.rod.y2} stroke={p.ink} stroke-width="2" />
    {#each m.discs as d}<rect {...d} rx="2" fill={p.object} stroke={p.ink} stroke-width="1.4" />{/each}
    <rect {...m.base} rx="1.5" fill={p.ink} stroke={p.ink} stroke-width="1.4" />
  {/each}

  {#each fig.dimensions as m}<DimensionLine {m} color={p.ink} />{/each}
  {#each fig.vectors as v}<VectorArrow v={v.v} color={p.vector} style={v.kind === 'force' ? 'force' : 'motion'} />{/each}
  {#each fig.labels as l}
    <FigureLabel label={l.label} x={l.at.x} y={l.at.y + baseline} anchor={l.anchor} size={LABEL_SIZE} color={l.tone === 'vector' ? p.vector : p.ink} blank={l.blank} />
  {/each}
</FigureFrame>
