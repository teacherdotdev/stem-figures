<script lang="ts">
  // The Torque figure, as a self-contained SVG that prints crisply and exports
  // cleanly: the beam and what holds it up, its loads, the force arrows and
  // the distance marks (./torque). Shapes are drawn inside the mirror
  // transform; labels outside it, so they stay readable.
  import Beam from '$lib/shared/Beam.svelte'
  import DimensionLine from '$lib/shared/DimensionLine.svelte'
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import ObjectShape from '$lib/shared/ObjectShape.svelte'
  import VectorArrow from '$lib/shared/VectorArrow.svelte'
  import { VECTOR_WIDTH } from '$lib/shared/vector'
  import { mirrorTransform, mirrorX, palette } from '$lib/shared/figure'
  import { baselineBelowMiddle } from '$lib/shared/label'
  import { LABEL_SIZE } from '$lib/shared/layout'
  import type { TorqueSettings } from './settings'
  import { buildTorque, describe } from './torque'

  let { settings, id = 't' }: { settings: TorqueSettings; id?: string } = $props()

  const fig = $derived(buildTorque(settings))
  const p = $derived(palette(settings.color))
  const mx = (x: number) => mirrorX(settings.mirror, fig.width, x)
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {fig.width} {fig.height}"
  width={fig.width}
  height={fig.height}
  role="img"
  aria-label={describe(settings)}
  id="{id}-torque"
>
  <defs>
    <clipPath id="{id}-clip"><rect width={fig.width} height={fig.height} /></clipPath>
  </defs>
  <rect class="paper" width={fig.width} height={fig.height} fill="#fff" />
  <!-- Clipped, for a steep cable that meets the wall above the figure. -->
  <g clip-path="url(#{id}-clip)">
  <g transform={mirrorTransform(settings.mirror, fig.width)} fill="none" stroke-linecap="round">
    <Beam
      beam={fig.beam}
      fulcrums={fig.fulcrums}
      marks={fig.marks}
      ink={p.ink}
      fill={p.surface}
      fulcrumFill={p.surface}
      wall={fig.wall}
      hinge={fig.hinge}
      cable={fig.cable?.line ?? null}
      strings={fig.strings}
    />
    {#if fig.cable}
      {@const a = fig.cable.arc}
      <path d="M{a.from.x},{a.from.y} A{a.r},{a.r} 0 0 {a.sweep} {a.to.x},{a.to.y}" stroke={p.ink} stroke-width="1.5" />
    {/if}
    {#if fig.lengthMark}
      <g stroke={p.ink} stroke-width="1" stroke-dasharray="4 3" stroke-linecap="butt">
        {#each fig.lengthMark.witnesses as w}<line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} />{/each}
      </g>
      <DimensionLine m={fig.lengthMark.line} color={p.ink} />
    {/if}
    {#each fig.objects as o (o.of)}
      <g transform="translate({o.at.x} {o.at.y})">
        <ObjectShape kind={o.kind} size={o.size} fill={p.object} stroke={p.ink} />
      </g>
    {/each}
    {#each fig.arrows as a (a.key)}<VectorArrow v={a.v} color={p.vector} halo={false} />{/each}
    {#if fig.moment}
      <path d={fig.moment.d} stroke={p.vector} stroke-width={VECTOR_WIDTH} />
      <polygon points={fig.moment.head.map((c) => `${c.x},${c.y}`).join(' ')} fill={p.vector} stroke="none" />
    {/if}
  </g>
  </g>

  {#each fig.labels as l (l.key)}
    {#if l.inside}
      <FigureLabel label={l.label} x={mx(l.at.x)} y={l.at.y + baselineBelowMiddle(l.label, LABEL_SIZE)} size={LABEL_SIZE} color={p.ink} halo={false} blank={30} />
    {:else}
      <FigureLabel label={l.label} x={mx(l.at.x)} y={l.at.y + LABEL_SIZE * 0.35} size={LABEL_SIZE} color={l.onVector ? p.vector : p.ink} />
    {/if}
  {/each}
</svg>
