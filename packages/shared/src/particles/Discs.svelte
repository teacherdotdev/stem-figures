<script lang="ts">
  // Particles as drawn: gray-scale discs with a dark outline, each in the
  // order given (a joined particle's center last, on top), and an ion's
  // charge centered on it, always upright even when its particle is turned.
  import { DARK_SHADES, SHADE_FILL, chargeText, type Disc } from './particles'

  let { discs }: { discs: Disc[] } = $props()

  /** Longer charges ("2−") are set smaller so they fit the disc. */
  const fontSize = (d: Disc) => d.r * (d.charge.length > 1 ? 0.85 : 1.3)
</script>

{#each discs as d, i (i)}
  <circle cx={d.x} cy={d.y} r={d.r} fill={SHADE_FILL[d.shade]} stroke="#222" stroke-width="1.5" />
  {#if d.charge}
    <text
      x={d.x}
      y={d.y}
      text-anchor="middle"
      dominant-baseline="central"
      font-size={fontSize(d)}
      font-weight="700"
      fill={DARK_SHADES.includes(d.shade) ? '#fff' : '#111'}>{chargeText(d.charge)}</text
    >
  {/if}
{/each}
