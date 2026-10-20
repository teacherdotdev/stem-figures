<script lang="ts">
  // Length Reading's micrometer figure for a set of settings: the micrometer
  // holding its object, with a magnifier on its sleeve and thimble beside it.
  // With a zero error, the same micrometer closed can go above it, with its
  // own magnifier, showing what it reads with nothing between anvil and
  // spindle.
  import FigureFrame from '$lib/shared/FigureFrame.svelte'
  import Magnifier from '$lib/shared/Magnifier.svelte'
  import { magnifierLayout } from '$lib/shared/magnify'
  import Micrometer from './Micrometer.svelte'
  import type { JawObject } from './instrument'
  import { magnifierSource, micrometerLayout } from './micrometer'
  import { answerLine, figureLabel, type LengthSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: LengthSettings; svg?: SVGSVGElement } = $props()

  const GAP = 40
  const CAPTION = 30
  const twin = $derived(settings.micrometerZero !== 0 && settings.closed)

  interface Row {
    reading: number
    gap: number
    object: JawObject
    objectLabel: string
    caption: string
  }
  const rows = $derived.by(() => {
    const measuring: Row = {
      reading: settings.micrometer,
      gap: settings.micrometer - settings.micrometerZero,
      object: settings.jaws,
      objectLabel: settings.jawsLabel,
      caption: 'Measuring',
    }
    const closed: Row = { reading: settings.micrometerZero, gap: 0, object: 'none', objectLabel: '', caption: 'Closed' }
    return twin ? [closed, measuring] : [measuring]
  })

  /** Each row's micrometer and magnifier, stacked; with the magnifiers
   *  alone, side by side under their captions. */
  const layout = $derived.by(() => {
    const parts = rows.map((row) => {
      const at = micrometerLayout(row.reading, row.gap, row.object, !!row.objectLabel)
      const source = magnifierSource(at)
      return { row, source, l: magnifierLayout(settings.closeUp, at.width, at.height, source) }
    })
    if (settings.closeUp === 'magnifier') {
      const top = twin ? CAPTION : 0
      const placed = parts.map((p, i) => {
        const x = i * (p.l.width + GAP)
        return { ...p, y: 0, caption: twin ? { x: x + p.l.width / 2, y: 20, text: p.row.caption } : null, magnifier: p.l.magnifier && { ...p.l.magnifier, x: p.l.magnifier.x + x, y: p.l.magnifier.y + top }, origin: null }
      })
      return { width: parts.length * parts[0].l.width + (parts.length - 1) * GAP, height: top + parts[0].l.height, placed }
    }
    let y = 0
    const placed = parts.map((p, i) => {
      if (i) y += GAP
      const shift = (pt: { x: number; y: number } | null) => pt && { ...pt, y: pt.y + y }
      const out = { ...p, caption: null, origin: shift(p.l.origin), magnifier: p.l.magnifier && { ...p.l.magnifier, y: p.l.magnifier.y + y } }
      y += p.l.height
      return out
    })
    return { width: Math.max(...parts.map((p) => p.l.width)), height: y, placed }
  })
</script>

{#snippet micrometer(row: Row, zoom: number)}
  <Micrometer reading={row.reading} gap={row.gap} object={row.object} objectLabel={row.objectLabel} printed={settings.printed} {zoom} />
{/snippet}

<FigureFrame
  bind:svg
  width={layout.width}
  height={layout.height}
  label={figureLabel(settings)}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={settings.answerKey ? answerLine(settings) : ''}
>
  {#each layout.placed as p, i (i)}
    {#snippet scene(zoom: number)}{@render micrometer(p.row, zoom)}{/snippet}
    {#if p.caption}
      <text x={p.caption.x} y={p.caption.y} text-anchor="middle" font-size="17" font-weight="700" fill="#111">{p.caption.text}</text>
    {/if}
    {#if p.origin}
      <g transform="translate({p.origin.x} {p.origin.y})">{@render micrometer(p.row, 1)}</g>
    {/if}
    {#if p.magnifier}
      <Magnifier source={p.source} target={p.magnifier} marked={!!p.origin} origin={p.origin ?? undefined} {scene} />
    {/if}
  {/each}
</FigureFrame>
