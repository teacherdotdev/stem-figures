<script lang="ts">
  // The Pendulum Generator's picture on the directory: its default figure,
  // the Swing with its path, angle, length and height, drawn by the same code
  // the generator uses, cropped to the drawing so it fills the card.
  import { bounds } from '$lib/shared/layout'
  import Pendulum from './Pendulum.svelte'
  import { HEIGHT, WIDTH, buildPendulum } from './pendulum'
  import { pendulumSettings } from './settings'

  const s = pendulumSettings.defaults
  /** FigureFrame's padding round the drawing, and the white kept round it here. */
  const FRAME = 16
  const PAD = 6
  const b = bounds(buildPendulum(s).extent)
  const box = { x: b.left + FRAME - PAD, y: b.top + FRAME - PAD, w: b.right - b.left + 2 * PAD, h: b.bottom - b.top + 2 * PAD }
</script>

<svg
  class="crop"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="{box.x} {box.y} {box.w} {box.h}"
  width={box.w}
  height={box.h}
  style:--frame-w="{WIDTH + 2 * FRAME}px"
  style:--frame-h="{HEIGHT + 2 * FRAME}px"
>
  <Pendulum settings={s} />
</svg>

<style>
  /* The directory sizes every preview's svg to its card; the whole figure inside keeps its own size, and the outer svg crops it. */
  .crop :global(svg) { width: var(--frame-w); height: var(--frame-h); max-width: none; }
</style>
