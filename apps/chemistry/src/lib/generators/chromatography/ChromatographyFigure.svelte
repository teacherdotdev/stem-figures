<script lang="ts">
  // The Chromatography figure for a set of settings: the paper after the
  // solvent has run (and before it, beside it, if asked), hanging from a
  // glass rod in a beaker of solvent or alone, with measurements from the
  // origin line and labels naming its parts.
  import FigureFrame from '$lib/shared/FigureFrame.svelte'
  import { INK_HEX, cmText, edgeHex, mixedHex } from './inks'
  import { captionY, chromatogramLayout, type Panel } from './layout'
  import { answerLines, sampleName, type ChromatographySettings } from './settings'

  let { settings, svg = $bindable() }: { settings: ChromatographySettings; svg?: SVGSVGElement } = $props()

  const l = $derived(chromatogramLayout(settings))

  const label = $derived.by(() => {
    const inks = settings.samples
      .map((sample, i) => `${sampleName(sample, i)} separating into ${sample.spots.map((p) => `${p.color} at ${cmText(p.distance)}`).join(', ')}`)
      .join('; ')
    const where = settings.setup ? `hanging in a beaker of ${settings.solvent.trim().toLowerCase() || 'solvent'}` : 'on its own'
    const before = settings.show === 'both' ? 'Before: ink spots on the pencil origin line. After: ' : ''
    return `A paper chromatogram ${where}. ${before}the solvent front is ${cmText(settings.front)} above the origin line, with ${inks}.`
  })

  /** A measurement arrow from the origin line up to `top`, with heads at both ends. */
  const HEAD = 5
  /** Shorter than this, a measurement's arrows point in from outside its two lines. */
  const SHORT = 2 * HEAD + 6
  const TAIL = 12
  const arrowHead = (x: number, y: number, dir: 1 | -1) => `M ${x} ${y} L ${x - 3.2} ${y + dir * HEAD} L ${x + 3.2} ${y + dir * HEAD} Z`
</script>

{#snippet dimension(x: number, top: number, text: string)}
  {#if l.originY - top >= SHORT}
    <line x1={x} x2={x} y1={top + HEAD} y2={l.originY - HEAD} stroke="#111" stroke-width="1.2" />
    <path d={arrowHead(x, top, 1)} fill="#111" />
    <path d={arrowHead(x, l.originY, -1)} fill="#111" />
  {:else}
    <!-- too short for arrows between the lines: they point in from outside, the label above -->
    <line x1={x} x2={x} y1={top - TAIL} y2={l.originY + HEAD} stroke="#111" stroke-width="1.2" />
    <path d={arrowHead(x, top, -1)} fill="#111" />
    <path d={arrowHead(x, l.originY, 1)} fill="#111" />
  {/if}
  <text
    x={x + 5}
    y={l.originY - top >= SHORT ? (top + l.originY) / 2 + 4 : top - TAIL + 4}
    font-size="12"
    fill="#111"
    stroke="#fff"
    stroke-width="3"
    paint-order="stroke"
    stroke-linejoin="round">{text}</text
  >
{/snippet}

{#snippet paper(p: Panel)}
  <g transform="translate({p.paperX} {p.paperY})">
    <rect width={l.paperW} height={l.paperH} fill="#fff" />
    {#if p.stage === 'after'}
      <!-- the paper the solvent has wet, up to the front -->
      <rect y={l.frontY} width={l.paperW} height={l.paperH - l.frontY} fill="#e9f1fa" />
    {/if}
    <rect width={l.paperW} height={l.paperH} fill="none" stroke="#111" stroke-width="1.6" />

    <!-- the origin line and the samples' names, in pencil -->
    <line x1="6" x2={l.paperW - 6} y1={l.originY} y2={l.originY} stroke="#6b6b6b" stroke-width="1.3" />
    {#each l.lanes as lane, i (i)}
      <text x={lane.x} y={l.originY + 18} text-anchor="middle" font-size="13" fill="#555">{lane.name}</text>
    {/each}

    {#if p.stage === 'before'}
      {#each l.lanes as lane, i (i)}
        {@const hex = mixedHex(settings.samples[i].spots)}
        <circle cx={lane.x} cy={l.originY} r="6" fill={hex} stroke={edgeHex(hex)} stroke-width="1" />
      {/each}
    {:else}
      <line x1="0" x2={l.paperW} y1={l.frontY} y2={l.frontY} stroke="#444" stroke-width="1.3" stroke-dasharray="6 4" />
      {#each l.lanes as lane, i (i)}
        {#each lane.spots as spot, j (j)}
          <ellipse cx={lane.x} cy={spot.y} rx="9" ry="7" fill={INK_HEX[spot.color]} fill-opacity="0.9" stroke={edgeHex(INK_HEX[spot.color])} stroke-width="1" />
        {/each}
      {/each}
      {#if l.frontArrowX !== null}
        {#each l.lanes as lane, i (i)}
          {#each lane.spots as spot, j (j)}
            {#if spot.arrowX !== null}
              <line x1={lane.x + 10} x2={spot.arrowX + 3} y1={spot.y} y2={spot.y} stroke="#111" stroke-width="0.9" stroke-dasharray="2 2" />
              {@render dimension(spot.arrowX, spot.y, cmText(spot.distance))}
            {/if}
          {/each}
        {/each}
        {@render dimension(l.frontArrowX, l.frontY, cmText(settings.front))}
      {/if}
    {/if}
  </g>
{/snippet}

{#snippet setup(p: Panel)}
  {@const b = p.beaker!}
  {@const r = 10}
  <!-- the solvent, over the paper's bottom edge so the paper shows through it -->
  <path
    d="M {b.left} {p.waterY} V {b.bottom - r} Q {b.left} {b.bottom} {b.left + r} {b.bottom} H {b.right - r} Q {b.right} {b.bottom} {b.right} {b.bottom - r} V {p.waterY} Z"
    fill="#bcd7f0"
    fill-opacity="0.55"
  />
  <line x1={b.left} x2={b.right} y1={p.waterY} y2={p.waterY} stroke="#4a7fb5" stroke-width="1.4" />
  <!-- the beaker, with a lip at its rim -->
  <path
    d="M {b.left - 6} {b.rim} H {b.left} V {b.bottom - r} Q {b.left} {b.bottom} {b.left + r} {b.bottom} H {b.right - r} Q {b.right} {b.bottom} {b.right} {b.bottom - r} V {b.rim} H {b.right + 6}"
    fill="none"
    stroke="#111"
    stroke-width="2"
    stroke-linejoin="round"
    stroke-linecap="round"
  />
  <!-- the glass rod across the rim, and the clip holding the paper to it -->
  <rect x={p.left} y={p.rodY - 5} width={p.right - p.left} height="10" rx="5" fill="#eef2f5" stroke="#111" stroke-width="1.5" />
  <rect x={p.paperX + l.paperW / 2 - 7} y={p.rodY - 7} width="14" height="17" rx="2" fill="#9aa0a6" stroke="#111" stroke-width="1.4" />
{/snippet}

<FigureFrame
  bind:svg
  width={l.width}
  height={l.height}
  {label}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={settings.answerKey ? answerLines(settings).join('\n') : ''}
>
  {#each l.panels as p (p.stage)}
    {@render paper(p)}
    {#if p.beaker}{@render setup(p)}{/if}
    {#if l.captions}
      <text x={(p.left + p.right) / 2} y={captionY(l)} text-anchor="middle" font-size="16" font-weight="700" fill="#111">
        {p.stage === 'before' ? 'Before' : 'After'}
      </text>
    {/if}
  {/each}
  {#each l.labels as part (part.text)}
    <circle cx={part.x} cy={part.y} r="2" fill="#111" />
    <polyline points="{part.x},{part.y} {l.labelX - 14},{part.textY - 4} {l.labelX - 6},{part.textY - 4}" fill="none" stroke="#111" stroke-width="1" />
    <text x={l.labelX} y={part.textY} font-size="13" fill="#111">{part.text}</text>
  {/each}
</FigureFrame>
