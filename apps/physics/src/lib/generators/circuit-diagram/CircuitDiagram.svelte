<script lang="ts">
  // The Circuit Diagram figure, as a self-contained SVG that prints crisply
  // and exports cleanly. Wires and symbols are drawn inside the mirror
  // transform; labels and letters outside it, so they stay readable.
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import { mirrorAnchor, mirrorTransform, mirrorX, palette, SERIF } from '$lib/shared/figure'
  import { arrow } from '$lib/shared/vector'
  import { circuitOf } from './circuit'
  import { ARROW_HEAD, buildCircuit, LABEL_SIZE, METER_R, POINT_R } from './layout'
  import PartSymbol from './PartSymbol.svelte'
  import type { CircuitSettings } from './settings'
  import { describeCircuit } from './tree'

  let { settings, id = 'c', customCircuit }: { settings: CircuitSettings; id?: string; customCircuit?: import('./tree').Circuit } = $props()

  const hasTitle = $derived(settings.title.mode !== 'none' && (settings.title.mode === 'blank' || settings.title.text.trim() !== ''))
  const circuit = $derived(customCircuit ?? circuitOf(settings))
  const fig = $derived(buildCircuit(circuit, { title: hasTitle, polarity: settings.polarity, topology: settings.editor === 'custom' ? 'open' : 'loop' }))
  const p = $derived(palette(settings.color))
  /** Symbols stand out in blue on slides; wires stay black. */
  const partInk = $derived(settings.color ? '#1d4ed8' : p.ink)
  const mx = (x: number) => mirrorX(settings.mirror, fig.width, x)
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {fig.width} {fig.height}"
  width={fig.width}
  height={fig.height}
  role="img"
  aria-label={describeCircuit(circuit)}
  id="{id}-circuit"
>
  <rect class="paper" width={fig.width} height={fig.height} fill="#fff" />
  <g transform={mirrorTransform(settings.mirror, fig.width)} fill="none" stroke-linecap="round">
    {#each fig.wires as wire}
      <polyline points={wire.map((q) => `${q.x},${q.y}`).join(' ')} stroke={p.ink} stroke-width="2.2" stroke-linejoin="round" />
    {/each}
    {#each fig.parts as part}
      <g transform="translate({part.x} {part.y}) rotate({part.angle})">
        <PartSymbol part={part.part} style={settings.symbols} ink={partInk} />
      </g>
    {/each}
    {#each fig.meters as m}<circle cx={m.x} cy={m.y} r={METER_R} fill="#fff" stroke={partInk} stroke-width="2.2" />{/each}
    {#each fig.dots as dot}<circle cx={dot.x} cy={dot.y} r="3.8" fill={p.ink} />{/each}
    {#each fig.points as pt}<circle cx={pt.x} cy={pt.y} r={POINT_R} fill={p.ink} />{/each}
    <!-- Current arrows are small and solid: a current isn't a Vector, so it doesn't take a Vector's style. -->
    {#each fig.arrows as a}
      {@const shape = arrow(a, ARROW_HEAD)}
      <line x1={shape.shaft.x1} y1={shape.shaft.y1} x2={shape.shaft.x2} y2={shape.shaft.y2} stroke={p.vector} stroke-width="2.2" />
      <polygon points={shape.head.map((q) => `${q.x},${q.y}`).join(' ')} fill={p.vector} />
    {/each}
  </g>

  {#each fig.letters as l}
    <text x={mx(l.x)} y={l.y + l.size * 0.34} text-anchor="middle" font-family={SERIF} font-size={l.size} fill={partInk}>{l.text}</text>
  {/each}
  {#each fig.labels as l}
    <FigureLabel label={l.label} x={mx(l.x)} y={l.y} anchor={mirrorAnchor(settings.mirror, l.anchor)} size={LABEL_SIZE} color={p.ink} />
  {/each}
  {#if fig.title}
    <FigureLabel label={settings.title} x={fig.title.x} y={fig.title.y} size={24} color={p.ink} italic={false} halo={false} blank={160} />
  {/if}
</svg>
