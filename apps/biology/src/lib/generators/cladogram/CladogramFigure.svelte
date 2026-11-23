<script lang="ts">
  // The Cladogram figure for a set of settings: the branches, a tick across
  // each branch where a trait is gained with the trait beside it, the taxon
  // names at the tips and the node numbers.
  import FigureFrame from '$shared/FigureFrame.svelte'
  import {
    NAME_LINE,
    NAME_SIZE,
    NUMBER_R,
    NUMBER_SIZE,
    TRAIT_SIZE,
    answerLines,
    blankLabel,
    describe,
    layoutCladogram,
    textWidth,
  } from './layout'
  import type { CladogramSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: CladogramSettings; svg?: SVGSVGElement } = $props()

  const INK = '#111'

  const at = $derived(layoutCladogram(settings))
  const answers = $derived(answerLines(settings))
  const title = $derived(settings.titleMode === 'text' ? settings.title : '')
  // Wide enough for the title and answer key, with the drawing in the middle.
  const width = $derived(
    Math.max(at.width, textWidth(title, 22) * 1.05, ...(settings.answerKey ? answers.map((l) => textWidth(l, 18)) : [])),
  )
  const dx = $derived((width - at.width) / 2)
  const points = (line: { x: number; y: number }[]) => line.map((p) => `${p.x},${p.y}`).join(' ')
</script>

<FigureFrame bind:svg {width} height={at.height} label={describe(settings)} {title} answerKey={settings.answerKey ? answers.join('\n') : ''}>
  <g transform="translate({dx} 0)">
    {#each at.branches as line, i (i)}
      <polyline points={points(line)} fill="none" stroke={INK} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    {/each}

    {#each at.traits as trait, i (i)}
      <line x1={trait.tick[0].x} y1={trait.tick[0].y} x2={trait.tick[1].x} y2={trait.tick[1].y} stroke={INK} stroke-width="2.5" />
      {#if trait.box && trait.text}
        <text x={trait.box.x} y={trait.box.y + TRAIT_SIZE * 0.82} font-size={TRAIT_SIZE} fill={INK}>{trait.text}</text>
      {:else if trait.box}
        {@const label = blankLabel(trait.number ?? 0)}
        {@const lineX = trait.box.x + textWidth(label, TRAIT_SIZE) + 4}
        <text x={trait.box.x} y={trait.box.y + TRAIT_SIZE * 0.82} font-size={TRAIT_SIZE} fill={INK}>{label}</text>
        <line x1={lineX} x2={trait.box.x + trait.box.w} y1={trait.box.y + trait.box.h} y2={trait.box.y + trait.box.h} stroke={INK} stroke-width="1.2" />
      {/if}
    {/each}

    {#each at.names as name, i (i)}
      {#if name.lines.length}
        {#each name.lines as line, j (j)}
          <text
            x={name.x} y={name.y + NAME_SIZE * 0.82 + j * NAME_LINE}
            text-anchor={name.anchor} font-size={NAME_SIZE} font-weight="700" fill={INK}
          >{line}</text>
        {/each}
      {:else}
        <line x1={name.box.x} x2={name.box.x + name.box.w} y1={name.box.y + name.box.h} y2={name.box.y + name.box.h} stroke={INK} stroke-width="1.2" />
      {/if}
    {/each}

    {#each at.nodes as node (node.n)}
      <circle cx={node.x} cy={node.y} r={NUMBER_R} fill="#fff" stroke={INK} stroke-width="1.5" />
      <text x={node.x} y={node.y + NUMBER_SIZE * 0.36} text-anchor="middle" font-size={NUMBER_SIZE} font-weight="700" fill={INK}>{node.n}</text>
    {/each}
  </g>
</FigureFrame>
