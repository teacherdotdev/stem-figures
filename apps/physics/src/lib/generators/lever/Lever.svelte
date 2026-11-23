<script lang="ts">
  // A Lever figure, inside the shared frame that adds the chart title and the
  // answer key: the beam on its fulcrum, the load as a block or an arrow, the
  // effort arrow and the two arms' dimension lines (./lever). Shapes are drawn
  // inside the mirror transform; labels outside it, so they stay readable.
  import FigureFrame from '$shared/FigureFrame.svelte'
  import Beam from '$lib/shared/Beam.svelte'
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import ObjectShape from '$lib/shared/ObjectShape.svelte'
  import VectorArrow from '$lib/shared/VectorArrow.svelte'
  import { mirrorTransform, mirrorX, palette } from '$lib/shared/figure'
  import { buildLever, describe } from './lever'
  import { answerLines, type LeverSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: LeverSettings; svg?: SVGSVGElement } = $props()

  const fig = $derived(buildLever(settings))
  const p = $derived(palette(settings.color))
  const mx = (x: number) => mirrorX(settings.mirror, fig.width, x)
</script>

<FigureFrame
  bind:svg
  width={fig.width}
  height={fig.height}
  label={describe(settings)}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={settings.answerKey ? answerLines(settings).join('\n') : ''}
>
  <g transform={mirrorTransform(settings.mirror, fig.width)} stroke-linecap="round">
    <Beam beam={fig.beam} fulcrums={[fig.fulcrum]} marks={fig.marks} ink={p.ink} fill={p.surface} fulcrumFill={p.surface} />
    {#if fig.block}
      <g transform="translate({fig.block.at.x} {fig.block.at.y})">
        <ObjectShape kind="block" size={fig.block.size} fill={p.object} stroke={p.ink} />
      </g>
    {/if}
    {#each fig.forces as f (f.kind)}<VectorArrow v={f.v} color={p.vector} halo={false} />{/each}
  </g>

  {#each fig.labels as l (l.key)}
    <FigureLabel label={l.label} x={mx(l.at.x)} y={l.at.y + fig.labelSize * 0.35} size={fig.labelSize} color={l.onVector ? p.vector : p.ink} />
  {/each}
</FigureFrame>
