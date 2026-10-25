<script lang="ts" generics="S extends object">
  // The layout every generator shares: saved presets and the settings groups
  // under them down the left, and the figure card filling the rest of the
  // window. Phones stack them, figure first. `settingsWidth` is the settings
  // column's width in rem on wide screens, so a generator with long settings
  // can take more room from the figure, or give it back; or a CSS width, like
  // "minmax(26rem, 1fr)" for half the window. `inputs`, when given,
  // is a card of its own between the presets and the settings groups, for
  // what the teacher types first (Math's equations). A site can put a card of
  // its own at the top and move presets to the bottom (see generatorLead).
  // What prints is just the figure, `printWidth` inches wide, or fitted into
  // `printWidth` by `printHeight` inches when a height is given.
  import type { Snippet } from 'svelte'
  import FigureCanvas from './FigureCanvas.svelte'
  import Presets from './Presets.svelte'
  import { getGeneratorLead } from './generatorLead'
  import type { generatorState } from './generatorState.svelte'
  import type { LabelSize } from './labelSize'

  interface Props {
    name: string
    filename: string
    gen: ReturnType<typeof generatorState<S>>
    /** the figure to export, when it isn't the first <svg> in the figure card */
    svg?: SVGSVGElement
    settingsWidth?: number | string
    printWidth?: number
    printHeight?: number
    /** bound to the generator's label size setting, for the picker in the figure card */
    labelSize?: LabelSize
    inputs?: Snippet
    settings: Snippet
    figure: Snippet
  }
  let {
    name, filename, gen, svg, settingsWidth = 24, printWidth = 7.5, printHeight, labelSize = $bindable(), inputs, settings, figure,
  }: Props = $props()

  const Lead = getGeneratorLead()
</script>

{#snippet presets()}
  <div class="card">
    <Presets store={gen.presets} same={gen.same} settings={gen.snapshot()} onapply={gen.apply} />
  </div>
{/snippet}

<div
  class="generator"
  style:--settings-width={typeof settingsWidth === 'number' ? `${settingsWidth}rem` : settingsWidth}
  style:--print-width="{printWidth}in"
  style:--print-height={printHeight ? `${printHeight}in` : 'auto'}
>
  <div class="figure-side">
    <FigureCanvas {svg} {filename} history={gen.history} bind:labelSize>{@render figure()}</FigureCanvas>
  </div>
  <aside class="settings-side no-print">
    <!-- The top bar shows the name; this keeps the page's heading for screen readers. -->
    <h1 class="visually-hidden">{name}</h1>
    {#if Lead}
      <div class="card"><Lead apply={(next) => gen.apply(next as S)} /></div>
    {:else}
      {@render presets()}
    {/if}
    {#if inputs}<div class="card">{@render inputs()}</div>{/if}
    <div class="card">{@render settings()}</div>
    {#if Lead}{@render presets()}{/if}
  </aside>
</div>

<style>
  .generator { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; }
  .settings-side { display: flex; flex-direction: column; gap: 1rem; }

  /* Wide screens: settings on the left, scrolling on their own, and the
     figure card filling the window beside them. */
  @media (min-width: 861px) and (min-height: 560px) {
    .generator {
      display: grid;
      grid-template-columns: var(--settings-width) minmax(0, 1fr);
      height: calc(100vh - var(--topbar-h));
      padding: 1.25rem;
      gap: 1.25rem;
    }
    .settings-side { grid-column: 1; grid-row: 1; min-height: 0; overflow-y: auto; padding: 0.15rem 0.25rem 0.5rem 0.15rem; }
    .figure-side { grid-column: 2; grid-row: 1; display: flex; min-height: 0; }
    .figure-side > :global(.canvas) { width: 100%; }
  }
  @media print { .generator { padding: 0; } }
</style>
