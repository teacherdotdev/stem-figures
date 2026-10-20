<script lang="ts">
  // A Phillips curve graph, drawn by the econ graph library.
  import EconFigure from '$lib/graph/EconFigure.svelte'
  import { buildPhillips } from './figure'
  import type { PhillipsSettings } from './settings'

  let { settings, svg = $bindable(), id = 'pc' }: { settings: PhillipsSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildPhillips(settings))
</script>

<EconFigure figure={g.figure} label={g.label} {id} bind:svg />
