<script lang="ts">
  // The Dot-and-Cross Diagram figure: every ring and outer circle, the
  // element symbols in their middles, the electrons as marks, each ion's
  // brackets and charge, the numbers in front of ions, and the chart title
  // and answer key around it.
  import FigureFrame from '$lib/shared/FigureFrame.svelte'
  import Marks from './Marks.svelte'
  import { BLANK_CHARGE, COUNT_FONT, buildFigure } from './figure'
  import { INK } from './marks'
  import { BRACKET_ARM, CHARGE_FONT, SYMBOL_FONT } from './shells'
  import type { DotCrossSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: DotCrossSettings; svg?: SVGSVGElement } = $props()

  const figure = $derived(buildFigure(settings))
</script>

<FigureFrame
  bind:svg
  width={figure.width}
  height={figure.height}
  label={figure.label}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={figure.answer.join('\n')}
>
  {#if figure.read.ok}
    {#each figure.circles as c, i (i)}
      <circle cx={c.x} cy={c.y} r={c.r} fill="none" stroke="#222" stroke-width="1.5" />
    {/each}
    {#each figure.symbols as t, i (i)}
      <text x={t.x} y={t.y} dy="0.35em" text-anchor="middle" font-size={SYMBOL_FONT} fill={INK}>{t.text}</text>
    {/each}
    <Marks marks={figure.marks} swap={settings.swap} color={settings.color} />
    {#each figure.brackets as b, i (i)}
      <path
        d="M {b.x - b.half + BRACKET_ARM} {b.y - b.half} H {b.x - b.half} V {b.y + b.half} H {b.x - b.half + BRACKET_ARM} M {b.x + b.half - BRACKET_ARM} {b.y - b.half} H {b.x + b.half} V {b.y + b.half} H {b.x + b.half - BRACKET_ARM}"
        fill="none"
        stroke="#222"
        stroke-width="1.8"
      />
      {#if b.charge?.blank}
        <rect x={b.charge.x} y={b.charge.y - 16} width={BLANK_CHARGE} height="20" fill="none" stroke={INK} stroke-width="1.3" />
      {:else if b.charge}
        <text x={b.charge.x} y={b.charge.y} font-size={CHARGE_FONT} fill={INK}>{b.charge.text}</text>
      {/if}
    {/each}
    {#each figure.counts as t, i (i)}
      <text x={t.x} y={t.y} dy="0.35em" text-anchor="end" font-size={COUNT_FONT} fill={INK}>{t.text}</text>
    {/each}
  {:else}
    <text x={figure.width / 2} y={figure.height / 2} dy="0.35em" text-anchor="middle" font-size="16" fill="#666">Nothing to draw</text>
  {/if}
</FigureFrame>
