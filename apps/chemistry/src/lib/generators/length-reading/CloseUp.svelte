<script lang="ts">
  // A rectangular close-up: `scene` drawn again, enlarged so the `source`
  // rectangle of it fills the `target` rectangle, as exam papers show a
  // caliper's scales; a circle crops a long, short sliding scale badly. With
  // `from`, where the source shows on the figure (on the caliper, or on
  // another close-up) is outlined and joined to the close-up below it by two
  // dashed lines. `scene(zoom)` draws the instrument in its own units at that
  // zoom, as for $shared/Magnifier.
  import type { Snippet } from 'svelte'
  import type { Rect } from './caliper'

  interface Props {
    source: Rect
    target: Rect
    from?: Rect | null
    scene: Snippet<[number]>
  }
  let { source, target, from = null, scene }: Props = $props()
  const clipId = $props.id()

  const zoom = $derived(target.width / source.width)
  const R = 6
</script>

{#if from}
  <rect x={from.x} y={from.y} width={from.width} height={from.height} rx={2} fill="none" stroke="#111" stroke-width="1.5" />
  <line x1={from.x} y1={from.y + from.height} x2={target.x} y2={target.y} stroke="#111" stroke-width="1.2" stroke-dasharray="5 4" />
  <line x1={from.x + from.width} y1={from.y + from.height} x2={target.x + target.width} y2={target.y} stroke="#111" stroke-width="1.2" stroke-dasharray="5 4" />
{/if}
<clipPath id={clipId}><rect x={target.x} y={target.y} width={target.width} height={target.height} rx={R} /></clipPath>
<g clip-path="url(#{clipId})">
  <rect x={target.x} y={target.y} width={target.width} height={target.height} fill="#fff" />
  <g transform="translate({target.x} {target.y}) scale({zoom}) translate({-source.x} {-source.y})">
    {@render scene(zoom)}
  </g>
</g>
<rect x={target.x} y={target.y} width={target.width} height={target.height} rx={R} fill="none" stroke="#111" stroke-width="3" />
