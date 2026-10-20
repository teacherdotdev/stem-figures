<script lang="ts">
  // The Length Reading figure for a set of settings: the ruler, the caliper
  // or the micrometer the length is read from. With `onmove`, the object on
  // the ruler can be dragged along it.
  import CaliperFigure from './CaliperFigure.svelte'
  import MicrometerFigure from './MicrometerFigure.svelte'
  import RulerFigure from './RulerFigure.svelte'
  import type { LengthSettings } from './settings'

  interface Props {
    settings: LengthSettings
    svg?: SVGSVGElement
    onmove?: ((start: number) => void) | null
  }
  let { settings, svg = $bindable(), onmove = null }: Props = $props()
</script>

{#if settings.instrument === 'caliper'}
  <CaliperFigure {settings} bind:svg />
{:else if settings.instrument === 'micrometer'}
  <MicrometerFigure {settings} bind:svg />
{:else}
  <RulerFigure {settings} bind:svg {onmove} />
{/if}
