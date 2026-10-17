<script lang="ts">
  // The codon chart, drawn from its layout (chart.ts): the 4 × 4 grid of
  // cells, each codon's line with the start and stop codons in bold on a
  // gray band, and the bases and titles along its edges.
  import type { ChartLayout } from './chart'

  let { chart }: { chart: ChartLayout } = $props()

  const INK = '#111'
  const g = $derived(chart.grid)
</script>

<g>
  <g fill="#e5e7eb">
    {#each chart.bands as b, i (i)}<rect x={b.x} y={b.y} width={b.w} height={b.h} />{/each}
  </g>
  <g stroke={INK} fill="none">
    {#each [1, 2, 3] as i (i)}
      <line x1={g.x + i * g.cellW} y1={g.y} x2={g.x + i * g.cellW} y2={g.y + g.h} stroke-width="1.5" />
      <line x1={g.x} y1={g.y + i * g.cellH} x2={g.x + g.w} y2={g.y + i * g.cellH} stroke-width="1.5" />
    {/each}
    <rect x={g.x} y={g.y} width={g.w} height={g.h} stroke-width="2.5" />
  </g>
  <g font-size={chart.fs} fill={INK}>
    {#each chart.lines as l, i (i)}
      <text x={l.x} y={l.y} dominant-baseline="central" font-weight={l.marked ? 700 : undefined}>{l.text}</text>
    {/each}
  </g>
  <g font-weight="700" fill={INK} text-anchor="middle">
    {#each chart.letters as l, i (i)}
      <text x={l.x} y={l.y} dominant-baseline="central" font-size={l.size}>{l.text}</text>
    {/each}
    {#each chart.titles as t (t.text)}
      <text x={t.x} y={t.y} dominant-baseline="central" font-size={chart.titleFs} transform={t.rotate ? `rotate(${t.rotate} ${t.x} ${t.y})` : undefined}>{t.text}</text>
    {/each}
  </g>
</g>
