<script lang="ts">
  // A money market, loanable funds or reserves market graph, drawn by the econ graph library.
  import EconFigure from '$lib/graph/EconFigure.svelte'
  import { buildMoneyMarkets } from './figure'
  import type { MoneyMarketsSettings } from './settings'

  let { settings, svg = $bindable(), id = 'mm' }: { settings: MoneyMarketsSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildMoneyMarkets(settings))
</script>

<EconFigure figure={g.figure} label={g.label} {id} bind:svg />
