<script lang="ts">
  // A business cycle graph, drawn by the econ graph library.
  import EconFigure from '$lib/graph/EconFigure.svelte'
  import { buildBusinessCycle } from './figure'
  import type { BusinessCycleSettings } from './settings'

  let { settings, svg = $bindable(), id = 'bc' }: { settings: BusinessCycleSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildBusinessCycle(settings))
</script>

<EconFigure figure={g.figure} label={g.label} {id} bind:svg />
