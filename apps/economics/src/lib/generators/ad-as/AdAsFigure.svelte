<script lang="ts">
  // An AD–AS graph, drawn by the econ graph library.
  import EconFigure from '$lib/graph/EconFigure.svelte'
  import { buildAdAs } from './figure'
  import type { AdAsSettings } from './settings'

  let { settings, svg = $bindable(), id = 'adas' }: { settings: AdAsSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildAdAs(settings))
</script>

<EconFigure figure={g.figure} label={g.label} {id} bind:svg />
