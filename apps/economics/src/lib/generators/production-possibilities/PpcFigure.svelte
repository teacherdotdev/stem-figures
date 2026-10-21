<script lang="ts">
  // A production possibilities graph (or two countries' side by side), drawn by the econ graph library.
  import EconFigure from '$lib/graph/EconFigure.svelte'
  import { buildPpc } from './figure'
  import type { PpcSettings } from './settings'

  let { settings, svg = $bindable(), id = 'ppc' }: { settings: PpcSettings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildPpc(settings))
</script>

<EconFigure figure={g.figure} label={g.label} {id} bind:svg />
