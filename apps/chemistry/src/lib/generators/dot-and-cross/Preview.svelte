<script lang="ts">
  // Dot-and-Cross Diagram's figures on its directory card: water over sodium
  // chloride, a molecule and an ionic compound, each in its own row (both are
  // wide), divided by a line as SplitPreview divides columns.
  import FigureCorner from '$lib/shared/FigureCorner.svelte'
  import DotCrossFigure from './DotCrossFigure.svelte'
  import { dotCrossSettings } from './settings'

  const water = dotCrossSettings.defaults
  const salt = dotCrossSettings.tidy({ ...dotCrossSettings.defaults, formula: 'NaCl' })
</script>

<div class="rows">
  <div class="row"><FigureCorner align="xMidYMid"><DotCrossFigure settings={water} /></FigureCorner></div>
  <div class="row ruled"><FigureCorner align="xMidYMid"><DotCrossFigure settings={salt} /></FigureCorner></div>
</div>

<style>
  /* Fills the card's preview edge to edge, over its padding, so the line
     runs from edge to edge. */
  .rows { align-self: stretch; flex: 1; display: grid; grid-template-rows: repeat(2, minmax(0, 1fr)); margin: -0.75rem; }
  .row { min-height: 0; padding: 0.4rem 0.55rem; overflow: hidden; }
  .ruled { border-top: 1.5px solid var(--border); }
  .rows .row :global(svg) { display: block; width: 100%; height: 100%; max-width: none; }
</style>
