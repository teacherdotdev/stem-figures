<script lang="ts">
  // A cost and revenue graph, drawn by the econ graph library.
  import EconFigure from '$lib/graph/EconFigure.svelte'
  import { buildCostRevenue } from './figure'
  import type { CostRevenueSettings } from './settings'

  let { settings, svg = $bindable(), id = 'crc' }: { settings: CostRevenueSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildCostRevenue(settings))
</script>

<EconFigure figure={g.figure} label={g.label} {id} bind:svg />
