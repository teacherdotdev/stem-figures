<script lang="ts">
  // A supply and demand graph, drawn by the econ graph library.
  import EconFigure from '$lib/graph/EconFigure.svelte'
  import { buildSupplyDemand } from './figure'
  import type { SupplyDemandSettings } from './settings'

  let { settings, svg = $bindable(), id = 'sd' }: { settings: SupplyDemandSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildSupplyDemand(settings))
</script>

<EconFigure figure={g.figure} label={g.label} {id} bind:svg />
