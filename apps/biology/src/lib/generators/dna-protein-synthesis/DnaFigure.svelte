<script lang="ts">
  // The DNA and Protein Synthesis figure: the strands as rows of base boxes
  // lined up base under base, their names and 5′ and 3′ ends, the hydrogen
  // bonds and codon brackets, the amino acids as beads or words, and the
  // codon chart, in black and white unless the bases are colored.
  import FigureFrame from '$shared/FigureFrame.svelte'
  import CodonChart from './CodonChart.svelte'
  import { buildDna, describeFigure } from './figure'
  import type { DnaSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: DnaSettings; svg?: SVGSVGElement } = $props()

  const INK = '#111'
  const d = $derived(buildDna(settings))
</script>

<FigureFrame bind:svg width={d.width} height={d.height} label={describeFigure(settings, d)} title={d.title} answerKey={d.answer.join('\n')}>
  <g transform="translate({d.dx + d.strandsX} {d.strandsY})">
    <!-- Behind the boxes, the strands' backbones join their codons across the gaps. -->
    <g stroke={INK} stroke-width="2">
      {#each d.rows as r (r.id)}
        {#if r.backbone}<line x1={r.backbone.x1} y1={r.backbone.y1} x2={r.backbone.x2} y2={r.backbone.y2} />{/if}
        {#each r.links as l, i (i)}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
      {/each}
    </g>
    <g stroke={INK} stroke-width="1.5" stroke-dasharray="3 2.5">
      {#each d.bonds as b, i (i)}<line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />{/each}
    </g>
    {#each d.brackets as p, i (i)}<path d={p} fill="none" stroke={INK} stroke-width="1.5" />{/each}

    {#each d.rows as r (r.id)}
      {#each r.boxes as b, i (i)}
        <rect x={b.x} y={b.y} width={d.box} height={d.box} fill={b.fill} stroke={INK} stroke-width="1.5" />
      {/each}
      <g font-size={d.fs} font-weight="700" fill={INK} text-anchor="middle">
        {#each r.boxes as b, i (i)}
          {#if !b.blank}<text x={b.x + d.box / 2} y={b.y + d.box / 2} dominant-baseline="central">{b.base}</text>{/if}
        {/each}
      </g>

      {#each r.beads as b, i (i)}
        {#if b.w}
          <rect x={b.x - b.w / 2} y={b.y - b.h / 2} width={b.w} height={b.h} rx={b.h / 2} fill="#fff" stroke={INK} stroke-width="2" />
        {/if}
        {#if b.text}
          <text x={b.x} y={b.y} text-anchor="middle" dominant-baseline="central" font-size={b.fs} font-weight={b.stop ? 700 : 600} fill={INK}>{b.text}</text>
        {/if}
      {/each}

      <g font-size={d.nameFs} font-weight="700" fill={INK}>
        {#each r.name as t, i (i)}<text x={t.x} y={t.y} dominant-baseline="central">{t.text}</text>{/each}
      </g>
      <g font-size={d.endFs} fill={INK}>
        {#each r.ends as t, i (i)}<text x={t.x} y={t.y} text-anchor={t.anchor} dominant-baseline="central">{t.text}</text>{/each}
      </g>
      <g stroke={INK} stroke-width="1.3">
        {#each [...(r.nameBlank ? [r.nameBlank] : []), ...r.endBlanks, ...r.blanks] as l, i (i)}
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        {/each}
      </g>
    {/each}
    {#if d.empty}
      <text x={d.empty.x} y={d.empty.y} text-anchor="middle" dominant-baseline="central" font-size="16" fill="#6b7280">{d.empty.text}</text>
    {/if}
  </g>
  {#if d.chart}
    <g transform="translate({d.dx + d.chart.x} {d.chart.y})"><CodonChart chart={d.chart} /></g>
  {/if}
</FigureFrame>
