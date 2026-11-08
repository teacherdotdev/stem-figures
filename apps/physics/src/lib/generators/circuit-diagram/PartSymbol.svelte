<script lang="ts">
  // One part's schematic symbol, centered on (0, 0) with the current
  // travelling along +x; the figure turns it into place. Its wires stop where
  // the symbol starts (symbolSize gives how far that is). A battery's long
  // plate (+) faces forward unless it's flipped. Letters (the A in an ammeter)
  // are drawn by the figure, so they stay upright.
  import type { Part } from './tree'

  interface Props {
    part: Part
    style: 'us' | 'iec'
    ink: string
  }
  let { part, style, ink }: Props = $props()

  const PLATE = 17
  const ZIGZAG = [-22, -18.3, -11, -3.7, 3.7, 11, 18.3, 22].map((x, i, all) => `${x},${i === 0 || i === all.length - 1 ? 0 : i % 2 ? -8 : 8}`).join(' ')
  /** Evenly spaced short/long plate pairs, centered on the battery. */
  const plates = $derived(Array.from({ length: part.cells * 2 }, (_, i) => [i * 10 - (part.cells * 2 - 1) * 5, i % 2 === 1] as const))
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
{:else if part.kind === 'diode'}
  <g fill="none" stroke={ink} stroke-width="2.2" stroke-linejoin="round">
    <path d="M-30 0 H-12 M8 0 H30" />
    <path d="M-12 -10 L8 0 L-12 10 Z" fill="white" />
    <path d="M8 -10 V10" />
  </g>
{:else if part.kind === 'led'}
  <g fill="none" stroke={ink} stroke-width="2.2" stroke-linejoin="round">
    <path d="M-30 0 H-12 M8 0 H30" />
    <path d="M-12 -10 L8 0 L-12 10 Z" fill="white" />
    <path d="M8 -10 V10" />
    <path d="M-4 -11 L4 -19 M5 -11 L13 -19" stroke-width="1.5" />
    <path d="M0 -20 L5 -20 L5 -15 Z M9 -20 L14 -20 L14 -15 Z" fill={ink} stroke="none" />
  </g>
{:else if part.kind === 'battery'}
  <g transform={part.flip ? 'scale(-1 1)' : undefined}>
    {#each plates as [x, long]}
      <line x1={x} y1={long ? -PLATE : -PLATE / 2} x2={x} y2={long ? PLATE : PLATE / 2} stroke={ink} stroke-width={long ? 2.2 : 5} stroke-linecap="butt" />
    {/each}
    {#each Array.from({ length: part.cells - 1 }, (_, i) => i) as i}
      <line x1={(i * 2 + 1) * 10 - (part.cells * 2 - 1) * 5} y1="0" x2={(i * 2 + 2) * 10 - (part.cells * 2 - 1) * 5} y2="0" stroke={ink} stroke-width="2.2" />
    {/each}
  </g>
{:else if part.kind === 'switch'}
  {#if part.open}
    <line x1="-17" y1="0" x2="13" y2="-17" stroke={ink} stroke-width="2.2" />
  {:else}
    <line x1="-17" y1="0" x2="17" y2="0" stroke={ink} stroke-width="2.2" />
  {/if}
  <circle cx="-17" r="3.2" fill="#fff" stroke={ink} stroke-width="2" />
  <circle cx="17" r="3.2" fill="#fff" stroke={ink} stroke-width="2" />
{:else if part.kind === 'ammeter'}
  <circle r="15" fill="#fff" stroke={ink} stroke-width="2.2" />
{/if}
