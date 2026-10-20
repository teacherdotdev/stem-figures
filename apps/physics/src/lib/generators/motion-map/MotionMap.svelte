<script lang="ts">
  // A Motion Map figure, on the shared figure frame with its chart title and
  // answer key: the number line with its ticks and numbers, the dots in their
  // runs, a dashed velocity arrow above each moving dot, acceleration arrows
  // above each segment, times or letters under the dots, and the total
  // displacement under the line. Numbers, times and letters are in the
  // graphs' bold sans serif; a, Δx and the object's name are physics labels.
  import FigureFrame from '$shared/FigureFrame.svelte'
  import { INK, SANS } from '$shared/graph/grid'
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import VectorArrow from '$lib/shared/VectorArrow.svelte'
  import { palette } from '$lib/shared/figure'
  import { labelRuns } from '$lib/shared/label'
  import { buildMap, HEAD, mapAnswer } from './map'
  import type { MapSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: MapSettings; svg?: SVGSVGElement } = $props()

  const f = $derived(buildMap(settings))
  const p = $derived(palette(settings.color))
  const plainText = (text: string) => labelRuns(text).map((r) => r.text).join('')
  const title = $derived(settings.title.mode === 'text' ? plainText(settings.title.text).trim() : '')
  const baseline = $derived(f.labelSize * 0.35)

  const label = $derived.by(() => {
    const moving = f.dots.filter((d) => d.v !== 0).length
    const runs = new Set(f.dots.map((d) => d.run)).size
    return (
      title ||
      `A motion map: ${f.dots.length} dot${f.dots.length === 1 ? '' : 's'} ${settings.dt} s apart along a number line` +
        `${runs > 1 ? `, on ${runs} lines as it turns back` : ''}` +
        `${settings.dotsOnly || !moving ? '' : ', each moving dot with its velocity arrow'}`
    )
  })
</script>

<FigureFrame bind:svg width={f.width} height={f.height} {title} answerKey={settings.answerKey ? mapAnswer(settings).join('\n') : ''} {label}>
  <!-- The number line. -->
  <g stroke={INK} stroke-linecap="butt">
    <line x1={f.line.x1} y1={f.line.y1} x2={f.line.x2} y2={f.line.y2} stroke-width="2" />
    {#each f.ticks as t}<line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke-width={t.y2 - t.y1 > 8 ? 1.5 : 1} />{/each}
    {#if f.origin}<line x1={f.origin.x1} y1={f.origin.y1} x2={f.origin.x2} y2={f.origin.y2} stroke-width="3" />{/if}
  </g>
  <polygon points={f.lineHead.map((q) => `${q.x},${q.y}`).join(' ')} fill={INK} />
  <g font-family={SANS} font-size={f.fs} font-weight="bold" fill={INK} text-anchor="middle">
    {#each f.numbers as n}<text x={n.x} y={n.y}>{n.text}</text>{/each}
    <text x={f.lineTitle.x} y={f.lineTitle.y} text-anchor="start">{f.lineTitle.text}</text>
  </g>

  {#if f.displacement}
    <VectorArrow v={f.displacement.v} color={INK} head={HEAD} halo={false} />
    <FigureLabel label={settings.displacementLabel} x={f.displacement.labelAt.x} y={f.displacement.labelAt.y + baseline} size={f.labelSize} color={INK} />
  {/if}

  <!-- Leaders from a dot down to a label below the first level. -->
  <g stroke={INK} stroke-width="0.8">
    {#each f.labels as l}
      {#if l.leader}<line x1={l.leader.x1} y1={l.leader.y1} x2={l.leader.x2} y2={l.leader.y2} />{/if}
    {/each}
  </g>

  {#each f.dots as d}<circle cx={d.x} cy={d.y} r={f.r} fill={INK} />{/each}

  <!-- Velocity and acceleration are motion, not forces, so both are dashed. -->
  {#each f.arrows as a}<VectorArrow v={a.v} color={p.vector} style="motion" head={HEAD} halo={false} />{/each}
  {#each f.accMarks as a}
    {#if a.arrow}<VectorArrow v={a.arrow} color={p.vector} style="motion" head={HEAD} halo={false} />{/if}
    <FigureLabel label={a.label} x={a.labelAt.x} y={a.labelAt.y + baseline} size={f.labelSize} color={p.vector} />
  {/each}

  <g
    font-family={SANS}
    font-size={settings.labels === 'times' ? f.fs : f.letterFs}
    font-weight="bold"
    fill={INK}
    stroke="#fff"
    stroke-width="4"
    paint-order="stroke"
    stroke-linejoin="round"
    text-anchor="middle"
  >
    {#each f.labels as l}<text x={l.x} y={l.y}>{l.text}</text>{/each}
  </g>

  {#if f.object}
    <FigureLabel label={settings.object} x={f.object.at.x} y={f.object.at.y + baseline} anchor={f.object.anchor} size={f.labelSize} color={INK} />
  {/if}
</FigureFrame>
