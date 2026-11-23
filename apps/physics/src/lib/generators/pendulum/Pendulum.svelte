<script lang="ts">
  // A Pendulum figure, inside the shared frame that adds the chart title: the
  // hatched ceiling, the dashed path and marks, the strings, a white outline
  // under every arrow, the arrows, then the bobs, so an arrow comes out of the
  // edge of the bob it starts in. The Swing's bottom and far-side bobs are
  // lighter copies, with dashed strings.
  import FigureFrame from '$shared/FigureFrame.svelte'
  import DimensionLine from '$lib/shared/DimensionLine.svelte'
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import ObjectShape from '$lib/shared/ObjectShape.svelte'
  import Support from '$lib/shared/Support.svelte'
  import VectorArrow from '$lib/shared/VectorArrow.svelte'
  import { palette } from '$lib/shared/figure'
  import { LABEL_SIZE } from '$lib/shared/layout'
  import { arrow, styleOf, VECTOR_WIDTH } from '$lib/shared/vector'
  import { BOB_R, BOB_SIZE, buildPendulum, describe, type FigureVector, type Look } from './pendulum'
  import type { PendulumSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: PendulumSettings; svg?: SVGSVGElement } = $props()

  const fig = $derived(buildPendulum(settings))
  const p = $derived(palette(settings.color))
  const baseline = LABEL_SIZE * 0.35
  /** How strong a ghost bob and its string are. */
  const GHOST = 0.4

  const isComponent = (v: FigureVector) => v.kind === 'along' || v.kind === 'across'
  const components = $derived(fig.vectors.filter(isComponent))
  const whole = $derived(fig.vectors.filter((v) => !isComponent(v)))
  /** A short arrow (the tension at a wide angle) has a smaller head, so some shaft still shows. */
  const headOf = (v: FigureVector) => (isComponent(v) || v.length < 40 ? 10 : undefined)

  const looks = $derived<Record<Look, { stroke: string; width: number; dash?: string; opacity?: number }>>({
    string: { stroke: p.ink, width: 1.8 },
    ghostString: { stroke: p.ink, width: 1.8, dash: '6 5', opacity: GHOST },
    path: { stroke: p.ink, width: 1.6, dash: '7 6' },
    ref: { stroke: p.ink, width: 1.3, dash: '6 4' },
    arc: { stroke: p.ink, width: 1.5 },
  })

  /** The outside heads of a short height mark, pointing in at its two lines. */
  const HEAD = 9
  const headAt = (x: number, y: number, down: boolean) => {
    const back = down ? y - HEAD : y + HEAD
    return `${x},${y} ${x - HEAD * 0.38},${back} ${x + HEAD * 0.38},${back}`
  }
</script>

<FigureFrame bind:svg width={fig.width} height={fig.height} label={describe(settings)} title={settings.titleMode === 'text' ? settings.title : ''}>
  <Support support={fig.support} ink={p.ink} />

  {#each fig.pieces as piece}
    {@const look = looks[piece.look]}
    <path
      d={piece.d}
      fill="none"
      stroke={look.stroke}
      stroke-width={look.width}
      stroke-dasharray={look.dash}
      stroke-linecap={look.dash ? 'butt' : 'round'}
      opacity={look.opacity}
    />
  {/each}

  {#if fig.heightMark}
    {@const m = fig.heightMark}
    {#if m.outside}
      <line x1={m.x} y1={m.top - 18} x2={m.x} y2={m.bottom + 18} stroke={p.ink} stroke-width="1.5" />
      <polygon points={headAt(m.x, m.top, true)} fill={p.ink} />
      <polygon points={headAt(m.x, m.bottom, false)} fill={p.ink} />
    {:else}
      <DimensionLine m={{ x1: m.x, y1: m.top, x2: m.x, y2: m.bottom }} color={p.ink} />
    {/if}
  {/if}

  <circle cx={fig.pivot.x} cy={fig.pivot.y} r="3" fill={p.ink} />

  <!-- A white outline under each arrow, so it stands clear of the dashed lines it crosses. The tension lies on
       the string itself, so it has none: an outline would cut the string where the arrowhead ends. -->
  {#each fig.vectors.filter((v) => v.kind !== 'tension') as v}
    {@const a = arrow(v.v, headOf(v))}
    <line x1={a.shaft.x1} y1={a.shaft.y1} x2={a.shaft.x2} y2={a.shaft.y2} stroke="#fff" stroke-width={VECTOR_WIDTH + 5} stroke-linecap="round" />
    <polygon points={a.head.map((c) => `${c.x},${c.y}`).join(' ')} fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round" />
  {/each}

  {#each fig.guides as g}<line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke={p.hidden} stroke-width="1.3" stroke-dasharray="2 4" stroke-linecap="round" />{/each}
  {#each components as v}<VectorArrow v={v.v} color={p.component} style="component" halo={false} />{/each}
  {#each whole as v}<VectorArrow v={v.v} color={p.vector} style={styleOf(v.kind)} halo={false} head={headOf(v)} />{/each}

  <!-- The bobs go over the arrows that start at their middles. A ghost has white under it, so lines behind it don't show through. -->
  {#each fig.bobs as b}
    <g transform="translate({b.at.x} {b.at.y + BOB_R})">
      {#if b.ghost}
        <circle cx="0" cy={-BOB_R} r={BOB_R} fill="#fff" />
        <g opacity={GHOST}><ObjectShape kind="ball" size={BOB_SIZE} fill={p.object} stroke={p.ink} /></g>
      {:else}
        <ObjectShape kind="ball" size={BOB_SIZE} fill={p.object} stroke={p.ink} />
      {/if}
    </g>
  {/each}

  {#each fig.notes as n}
    <FigureLabel label={n.label} x={n.at.x} y={n.at.y + baseline} size={LABEL_SIZE} color={p.ink} italic={n.italic} />
  {/each}
  {#each components as v}
    <FigureLabel label={v.label} x={v.labelAt.x} y={v.labelAt.y + baseline} size={LABEL_SIZE} color={p.component} />
  {/each}
  {#each whole as v}
    <FigureLabel label={v.label} x={v.labelAt.x} y={v.labelAt.y + baseline} size={LABEL_SIZE} color={p.vector} />
  {/each}
</FigureFrame>
