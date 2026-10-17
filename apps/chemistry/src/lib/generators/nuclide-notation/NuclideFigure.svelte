<script lang="ts">
  // The Nuclide Notation figure: the symbol with its mass number, atomic
  // number and charge, hyphen notation under it or alone, and any blanks as
  // empty boxes or lines, inside the chart title and answer key.
  import FigureFrame from '$lib/shared/FigureFrame.svelte'
  import { buildFigure } from './figure'
  import { CHARGE_GAP, type Placed } from './layout'
  import { SYMBOL_SIZE, type NuclideSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: NuclideSettings; svg?: SVGSVGElement } = $props()

  const fig = $derived(buildFigure(settings))
  const size = $derived(SYMBOL_SIZE[settings.size])
  const stroke = $derived(Math.max(1.5, size * 0.022))
</script>

{#snippet placed(p: Placed | undefined)}
  {#if p?.kind === 'text'}
    <text x={p.x} y={p.y} font-size={p.size} text-anchor={p.anchor}>{p.text}</text>
  {:else if p && settings.blank === 'box'}
    <rect x={p.x} y={p.y} width={p.width} height={p.height} fill="none" stroke="#222" stroke-width={stroke} />
  {:else if p}
    <line x1={p.x} x2={p.x + p.width} y1={p.y + p.height} y2={p.y + p.height} stroke="#222" stroke-width={stroke} />
  {/if}
{/snippet}

<FigureFrame
  bind:svg
  width={fig.width}
  height={fig.height}
  label={fig.label}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={fig.answerKey.join('\n')}
>
  <g font-family={fig.fontFamily} fill="#111">
    {#if fig.nuclide}
      {@const n = fig.nuclide.layout}
      <g transform="translate({fig.nuclide.x} {fig.nuclide.y})">
        {@render placed(n.mass)}
        {@render placed(n.z)}
        {#if n.symbol?.kind === 'text' && n.charge?.kind === 'text'}
          <!-- The charge right after the symbol, wherever the font ends it. -->
          <text x={n.symbol.x} y={n.symbol.y} font-size={n.symbol.size}
            >{n.symbol.text}<tspan dx={CHARGE_GAP * size} dy={n.charge.y - n.symbol.y} font-size={n.charge.size}>{n.charge.text}</tspan></text
          >
        {:else}
          {@render placed(n.symbol)}
          {@render placed(n.charge)}
        {/if}
      </g>
    {/if}
    {#if fig.hyphen}
      <g transform="translate({fig.hyphen.x} {fig.hyphen.y})">
        {#each fig.hyphen.layout.pieces as piece, i (i)}
          {@render placed(piece)}
        {/each}
      </g>
    {/if}
  </g>
</FigureFrame>
