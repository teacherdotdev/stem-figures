<script lang="ts">
  // Phase Diagram's picture on the directory: water's, its regions and its
  // triple and critical points named, with the values at the axes.
  import PhaseFigure from './PhaseFigure.svelte'
  import { phaseSettings } from './settings'
</script>

<PhaseFigure settings={phaseSettings.defaults} id="preview-phase-diagram" />
