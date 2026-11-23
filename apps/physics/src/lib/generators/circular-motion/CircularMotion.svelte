<script lang="ts">
  // The Circular Motion figure, as a self-contained SVG that prints crisply
  // and exports cleanly (fonts and colors inline, no page CSS). Lines go
  // first, then a white outline under every arrow, then the arrows, then the
  // objects, so an arrow reads over a string or a path and comes out of the
  // edge of the object it starts in.
  import DimensionLine from '$lib/shared/DimensionLine.svelte'
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import ObjectShape from '$lib/shared/ObjectShape.svelte'
  import Support from '$lib/shared/Support.svelte'
  import VectorArrow from '$lib/shared/VectorArrow.svelte'
  import { palette } from '$lib/shared/figure'
  import { LABEL_SIZE } from '$lib/shared/layout'
  import { objectHeight } from '$lib/shared/objects'
  import { arrow, styleOf, VECTOR_WIDTH } from '$lib/shared/vector'
  import { OBJECT_SIZE, buildCircular, describe, type FigureVector, type Look } from './circular'
  import type { CircularSettings } from './settings'

  let { settings, id = 'o' }: { settings: CircularSettings; id?: string } = $props()

  const fig = $derived(buildCircular(settings))
  const p = $derived(palette(settings.color))
  const baseline = LABEL_SIZE * 0.35

  const isComponent = (v: FigureVector) => v.kind === 'x' || v.kind === 'y'
  const components = $derived(fig.vectors.filter(isComponent))
  const whole = $derived(fig.vectors.filter((v) => !isComponent(v)))
  /** A short arrow (a second object's, half as long) has a smaller head, so some shaft still shows. */
  const headOf = (v: FigureVector) => (isComponent(v) ? 10 : v.length < 40 ? 10 : undefined)

  /** How each kind of line is drawn. */
  const looks = $derived<Record<Look, { stroke: string; width: number; dash?: string; fill?: string }>>({
    path: { stroke: p.ink, width: 1.6, dash: '7 6' },
    back: { stroke: p.hidden, width: 1.6, dash: '7 6' },
    track: { stroke: p.ink, width: 3 },
    ground: { stroke: p.ink, width: 2.5 },
    disc: { stroke: p.ink, width: 2.5, fill: p.surface },
    road: { stroke: p.ink, width: 2, fill: p.surface },
    string: { stroke: p.ink, width: 1.8 },
    thin: { stroke: p.ink, width: 1.3 },
    ref: { stroke: p.ink, width: 1.3, dash: '6 4' },
    arc: { stroke: p.ink, width: 1.5 },
    curved: { stroke: p.vector, width: 2.5 },
  })
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {fig.width} {fig.height}"
  width={fig.width}
  height={fig.height}
  role="img"
  aria-label={describe(settings)}
  id="{id}-circular-motion"
>
  <rect class="paper" width={fig.width} height={fig.height} fill="#fff" />

  {#if fig.support}<Support support={fig.support} ink={p.ink} />{/if}

  {#each fig.pieces as piece}
    {@const look = looks[piece.look]}
    <path d={piece.d} fill={look.fill ?? 'none'} fill-rule="evenodd" stroke={look.stroke} stroke-width={look.width} stroke-dasharray={look.dash} stroke-linecap={look.dash ? 'butt' : 'round'} stroke-linejoin="round" />
  {/each}
  {#each fig.dimensions as m}<DimensionLine {m} color={p.ink} />{/each}
  {#each fig.dots as d}<circle cx={d.at.x} cy={d.at.y} r={d.r} fill={p.ink} />{/each}
  {#each fig.heads as head}<polygon points={head.map((c) => `${c.x},${c.y}`).join(' ')} fill={p.vector} />{/each}

  <!-- A white outline under each arrow, so it stands clear of the lines it lies on. -->
  {#each fig.vectors as v}
    {@const a = arrow(v.v, headOf(v))}
    <line x1={a.shaft.x1} y1={a.shaft.y1} x2={a.shaft.x2} y2={a.shaft.y2} stroke="#fff" stroke-width={VECTOR_WIDTH + 5} stroke-linecap="round" />
    <polygon points={a.head.map((c) => `${c.x},${c.y}`).join(' ')} fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round" />
  {/each}

  {#each fig.guides as g}<line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke={p.hidden} stroke-width="1.3" stroke-dasharray="2 4" stroke-linecap="round" />{/each}
  {#each components as v}<VectorArrow v={v.v} color={p.component} style="component" halo={false} />{/each}
  {#each whole as v}<VectorArrow v={v.v} color={p.vector} style={styleOf(v.kind)} halo={false} head={headOf(v)} />{/each}

  <!-- Objects go over the arrows that start at their middles, so each arrow comes out of its object's edge. -->
  {#each fig.objects as o}
    <g transform="translate({o.at.x} {o.at.y}) rotate({o.turn}) translate(0 {objectHeight(o.kind, OBJECT_SIZE) / 2})">
      <ObjectShape kind={o.kind} size={OBJECT_SIZE} fill={p.object} stroke={p.ink} />
    </g>
  {/each}

  <!-- A velocity along the line of sight: a dot for out of the page, a cross for into it. -->
  {#if fig.symbol}
    {@const w = fig.symbol}
    <circle cx={w.at.x} cy={w.at.y} r="10" fill="#fff" stroke={p.vector} stroke-width="2.2" />
    {#if w.way === 'out'}
      <circle cx={w.at.x} cy={w.at.y} r="3.5" fill={p.vector} />
    {:else}
      <g stroke={p.vector} stroke-width="2.2" stroke-linecap="round">
        <line x1={w.at.x - 5.5} y1={w.at.y - 5.5} x2={w.at.x + 5.5} y2={w.at.y + 5.5} />
        <line x1={w.at.x - 5.5} y1={w.at.y + 5.5} x2={w.at.x + 5.5} y2={w.at.y - 5.5} />
      </g>
    {/if}
  {/if}

  {#each fig.notes as n}
    <FigureLabel label={n.label} x={n.at.x} y={n.at.y + baseline} size={LABEL_SIZE} color={n.tone === 'vector' ? p.vector : p.ink} italic={n.italic} />
  {/each}
  {#each components as v}
    <FigureLabel label={v.label} x={v.labelAt.x} y={v.labelAt.y + baseline} size={LABEL_SIZE} color={p.component} />
  {/each}
  {#each whole as v}
    <FigureLabel label={v.label} x={v.labelAt.x} y={v.labelAt.y + baseline} size={LABEL_SIZE} color={p.vector} />
  {/each}
</svg>
