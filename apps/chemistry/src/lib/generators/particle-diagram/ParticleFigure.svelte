<script lang="ts">
  // The Particle Diagram figure: the box with its particles or its lattice,
  // or a before box and an after box with an arrow between them, its key to
  // the right, or both, as Show says. `box` is what the box holds for these
  // settings, worked out by whoever shows the figure, since the page also
  // reports what didn't fit.
  import FigureFrame from '$lib/shared/FigureFrame.svelte'
  import Discs from '$shared/particles/Discs.svelte'
  import KeyDrawing from '$shared/particles/KeyDrawing.svelte'
  import { keyLabel, keyLayout } from '$shared/particles/key'
  import { plainText } from '$shared/particles/keyText'
  import type { State } from '$shared/particles/layout'
  import { describeKind, describeParticle, type Disc, type ParticleKind } from '$shared/particles/particles'
  import { ARROW_PAD, arrowLayout, boxesSize, figureLayout } from './figureLayout'
  import { DOUBLE_INSET, keyKinds, type BoxContents, type ParticleSettings } from './settings'

  let { settings, box, svg = $bindable() }: { settings: ParticleSettings; box: BoxContents; svg?: SVGSVGElement } = $props()

  const listed = $derived(keyKinds(settings, box))
  const key = $derived(keyLayout(listed, settings.keyNote))
  const arrowed = $derived(arrowLayout(settings.arrowLabel))
  const layout = $derived(figureLayout(settings.show, key, boxesSize(box, arrowed.gap)))

  /** How a box's state reads after what's in it; a gas reads as boxes always did. */
  const STATE_WORDS: Record<State, string> = { gas: '', liquid: ', close together at the bottom as a liquid', solid: ', packed in rows as a solid' }
  const contents = (kinds: ParticleKind[], state: State) =>
    `${
      kinds
        .filter((k) => k.count)
        .map(describeKind)
        .join(', ') || 'an empty box'
    }${STATE_WORDS[state]}`

  const boxLabel = $derived(
    settings.layout === 'lattice'
      ? `A particle diagram: a lattice of ${box.kinds.map((k) => `${describeParticle(k)}s`).join(' and ')}`
      : box.after
        ? `A particle diagram before and after${settings.arrowLabel.trim() ? ` (${plainText(settings.arrowLabel.trim())})` : ''}: before, ${contents(box.kinds, settings.state)}; after, ${contents(box.after.kinds, settings.afterState)}`
        : `A particle diagram: ${contents(box.kinds, settings.state)}`,
  )
  const label = $derived(
    settings.show === 'box'
      ? boxLabel
      : settings.show === 'both'
        ? `${boxLabel}. ${keyLabel(listed, settings.keyNote)}`
        : keyLabel(listed, settings.keyNote, 'A particle diagram key'),
  )

  /** The arrow from the before box to the after box, across the gap between,
   *  with its label centered over it. */
  const arrow = $derived({ from: box.width + ARROW_PAD, to: box.width + arrowed.gap - ARROW_PAD, y: box.height / 2 })
</script>

{#snippet boxDrawing(discs: Disc[], x: number)}
  <g transform="translate({x} 0)">
    {#if box.border !== 'none'}
      <rect x="0.75" y="0.75" width={box.width - 1.5} height={box.height - 1.5} fill="none" stroke="#222" stroke-width="1.5" />
    {/if}
    {#if box.border === 'double'}
      <rect
        x={DOUBLE_INSET}
        y={DOUBLE_INSET}
        width={box.width - 2 * DOUBLE_INSET}
        height={box.height - 2 * DOUBLE_INSET}
        fill="none"
        stroke="#222"
        stroke-width="1.5"
      />
    {/if}
    <Discs {discs} />
  </g>
{/snippet}

<FigureFrame bind:svg width={layout.width} height={layout.height} {label} title={settings.titleMode === 'text' ? settings.title : ''}>
  {#if layout.box}
    <g transform="translate({layout.box.x} {layout.box.y})">
      {@render boxDrawing(box.discs, 0)}
      {#if box.after}
        <line x1={arrow.from} y1={arrow.y} x2={arrow.to - 10} y2={arrow.y} stroke="#222" stroke-width="2.5" />
        <path d="M {arrow.to} {arrow.y} l -14 -7 v 14 z" fill="#222" />
        {#if arrowed.spans.length}
          <text x={(arrow.from + arrow.to) / 2} y={arrow.y - 12} text-anchor="middle" font-size={arrowed.labelSize} fill="#111"
            >{#each arrowed.spans as span, i (i)}<tspan font-size={span.size} dy={span.dy || undefined}>{span.text}</tspan>{/each}</text
          >
        {/if}
        {@render boxDrawing(box.after.discs, box.width + arrowed.gap)}
      {/if}
    </g>
  {/if}
  {#if layout.key}
    <g transform="translate({layout.key.x} {layout.key.y})">
      <KeyDrawing {key} />
    </g>
  {/if}
</FigureFrame>
