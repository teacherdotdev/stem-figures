<script lang="ts">
  // The CaliperScale Caliper figure for a set of settings: the caliper holding its
  // object, with a close-up strip of its scales below it. With a zero error,
  // the same caliper closed can go above it, with its own close-up, showing
  // what it reads with nothing between the jaws.
  import FigureFrame from '$lib/shared/FigureFrame.svelte'
  import Caliper from './Caliper.svelte'
  import CloseUp from './CloseUp.svelte'
  import { PX, caliperLayout, caliperScale, stripSource, type Rect } from './caliper'
  import type { JawObject } from './instrument'
  import { answerLine, figureLabel, type LengthSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: LengthSettings; svg?: SVGSVGElement } = $props()

  const v = $derived(caliperScale(settings.leastCount))
  const twin = $derived(settings.caliperZero !== 0 && settings.closed)
  const GAP = 44
  const CAPTION = 30

  interface Row {
    reading: number
    gap: number
    object: JawObject
    objectLabel: string
    caption: string
  }
  const rows = $derived.by(() => {
    const measuring: Row = {
      reading: settings.caliper,
      gap: settings.caliper - settings.caliperZero,
      object: settings.jaws,
      objectLabel: settings.jawsLabel,
      caption: 'Measuring',
    }
    const closed: Row = { reading: settings.caliperZero, gap: 0, object: 'none', objectLabel: '', caption: 'Jaws closed' }
    return twin ? [closed, measuring] : [measuring]
  })

  /** Each row's caliper and its close-up strip, where they go,
   *  and the figure's size. Each close-up sits under what it enlarges, as
   *  far as the figure's width allows. */
  const layout = $derived.by(() => {
    const showCaliper = settings.closeUp !== 'magnifier'
    const showClose = settings.closeUp !== 'whole'
    const parts = rows.map((row) => {
      const at = caliperLayout(v, row.reading, row.gap, row.object, !!row.objectLabel)
      const strip = stripSource(v, at, row.reading, settings.printed)
      return { row, at, strip }
    })
    const scaled = (r: Rect, perMm: number) => ({ width: (r.width * perMm) / PX, height: (r.height * perMm) / PX })
    const widths = parts.flatMap((p) => [
      showCaliper ? p.at.width : 0,
      showClose ? scaled(p.strip, v.strip).width : 0,
    ])
    const width = Math.max(...widths)
    /** a close-up of `source` under the middle of `over`, kept on the figure */
    const below = (source: Rect, perMm: number, over: number, y: number): Rect => {
      const size = scaled(source, perMm)
      const x = Math.min(Math.max(0, over - size.width / 2), Math.max(0, width - size.width))
      return { x, y, ...size }
    }
    let y = 0
    const placed = parts.map((p, i) => {
      if (i) y += GAP
      // Captions only on close-ups alone, where nothing else says which is closed.
      const caption = twin && !showCaliper ? { y: y + 20, text: p.row.caption } : null
      if (caption) y += CAPTION
      const origin = showCaliper ? { x: 0, y } : null
      if (origin) y += p.at.height
      const closeUps: { source: Rect; target: Rect; from: Rect | null }[] = []
      if (showClose) {
        if (origin) y += GAP
        const from = origin ? { ...p.strip, x: p.strip.x + origin.x, y: p.strip.y + origin.y } : null
        const strip = below(p.strip, v.strip, from ? from.x + from.width / 2 : width / 2, y)
        closeUps.push({ source: p.strip, target: strip, from })
        y += strip.height
      }
      return { ...p, origin, closeUps, caption }
    })
    return { width, height: y, placed }
  })

</script>

{#snippet caliper(row: Row, zoom: number)}
  <Caliper {v} reading={row.reading} gap={row.gap} object={row.object} objectLabel={row.objectLabel} printed={settings.printed} {zoom} />
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
    {#if p.caption}
      <text x={0} y={p.caption.y} font-size="17" font-weight="700" fill="#111">{p.caption.text}</text>
    {/if}
    {#if p.origin}
      <g transform="translate({p.origin.x} {p.origin.y})">{@render caliper(p.row, 1)}</g>
    {/if}
    {#snippet scene(zoom: number)}{@render caliper(p.row, zoom)}{/snippet}
    {#each p.closeUps as c, j (j)}
      <CloseUp source={c.source} target={c.target} from={c.from} {scene} />
    {/each}
  {/each}
</FigureFrame>
