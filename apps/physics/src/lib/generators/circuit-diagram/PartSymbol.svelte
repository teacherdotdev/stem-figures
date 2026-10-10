<script lang="ts">
  // One part's schematic symbol, centered on (0, 0) with the current
  // travelling along +x; the figure turns it into place. Its wires stop where
  // the symbol starts (symbolSize gives how far that is). A battery's long
  // plate (+) faces forward unless it's flipped. Letters (the A in an ammeter)
  // are drawn by the figure, so they stay upright. The Circuit Editor draws its
  // parts with it too.
  import type { SymbolPart } from './layout'

  interface Props {
    part: SymbolPart
    style: 'us' | 'iec'
    ink: string
  }
  let { part, style, ink }: Props = $props()

  const PLATE = 17
  const ZIGZAG = [-22, -18.3, -11, -3.7, 3.7, 11, 18.3, 22].map((x, i, all) => `${x},${i === 0 || i === all.length - 1 ? 0 : i % 2 ? -8 : 8}`).join(' ')
  /** The plates of a cell, or of two cells, as [x, long] pairs from back to front. */
  const plates = $derived(
    part.cells === 2
      ? ([[-15, false], [-5, true], [5, false], [15, true]] as const)
      : ([[-5, false], [5, true]] as const),
  )
</script>

{#if part.kind === 'resistor'}
  {#if style === 'us'}
    <polyline points={ZIGZAG} stroke={ink} stroke-width="2.2" stroke-linejoin="round" fill="none" />
  {:else}
    <rect x="-20" y="-8" width="40" height="16" fill="#fff" stroke={ink} stroke-width="2.2" />
  {/if}
{:else if part.kind === 'bulb'}
  <circle r="15" fill="#fff" stroke={ink} stroke-width="2.2" />
  {#if style === 'us'}
    <path d="M-15,0 H-6 C-6,-13 6,-13 6,0 H15" stroke={ink} stroke-width="1.8" fill="none" />
  {:else}
    <path d="M-10.6,-10.6 L10.6,10.6 M-10.6,10.6 L10.6,-10.6" stroke={ink} stroke-width="1.8" />
  {/if}
{:else if part.kind === 'battery'}
  <g transform={part.flip ? 'scale(-1 1)' : undefined}>
    {#each plates as [x, long]}
      <line x1={x} y1={long ? -PLATE : -PLATE / 2} x2={x} y2={long ? PLATE : PLATE / 2} stroke={ink} stroke-width={long ? 2.2 : 5} stroke-linecap="butt" />
    {/each}
    {#if part.cells === 2}
      <!-- The wire joining the two cells. -->
      <line x1="-5" y1="0" x2="5" y2="0" stroke={ink} stroke-width="2.2" />
    {/if}
  </g>
{:else if part.kind === 'switch'}
  {#if part.open}
    <line x1="-17" y1="0" x2="13" y2="-17" stroke={ink} stroke-width="2.2" />
  {:else}
    <line x1="-17" y1="0" x2="17" y2="0" stroke={ink} stroke-width="2.2" />
  {/if}
  <circle cx="-17" r="3.2" fill="#fff" stroke={ink} stroke-width="2" />
  <circle cx="17" r="3.2" fill="#fff" stroke={ink} stroke-width="2" />
{:else if part.kind === 'ammeter' || part.kind === 'voltmeter'}
  <circle r="15" fill="#fff" stroke={ink} stroke-width="2.2" />
{/if}
