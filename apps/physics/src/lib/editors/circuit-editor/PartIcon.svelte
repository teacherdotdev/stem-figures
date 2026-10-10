<script lang="ts">
  // A part as the tray shows it: its symbol between two short leads, in the
  // drawing's symbol style, with a meter's letter in it.
  import { symbolSize } from '$lib/generators/circuit-diagram/layout'
  import PartSymbol from '$lib/generators/circuit-diagram/PartSymbol.svelte'
  import { SERIF } from '$lib/shared/figure'
  import { INK, symbolOf, type PartKind, type SymbolStyle } from './schematic'

  let { kind, style }: { kind: PartKind; style: SymbolStyle } = $props()
  const symbol = $derived(symbolOf({ kind, open: kind === 'switch' }))
  const half = $derived(symbolSize(symbol).half)
  const letter = $derived(kind === 'ammeter' ? 'A' : kind === 'voltmeter' ? 'V' : '')
</script>

<svg viewBox="-34 -22 68 44" aria-hidden="true">
  <g fill="none" stroke-linecap="round">
    <line x1="-32" x2={-half} y1="0" y2="0" stroke={INK} stroke-width="2.2" />
    <line x1={half} x2="32" y1="0" y2="0" stroke={INK} stroke-width="2.2" />
    <PartSymbol part={symbol} {style} ink={INK} />
  </g>
  {#if letter}<text y="6" text-anchor="middle" font-family={SERIF} font-size="18" fill={INK}>{letter}</text>{/if}
</svg>

<style>
  svg { display: block; width: 100%; height: 100%; overflow: visible; }
</style>
