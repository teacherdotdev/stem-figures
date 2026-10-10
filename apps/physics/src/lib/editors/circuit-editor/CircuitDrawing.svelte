<script lang="ts">
  // A drawn circuit's wires, junction dots, parts and labels, in page
  // coordinates. Symbols are turned with their part; labels and letters stay
  // upright. While editing, each part and wire gets a wider invisible target
  // to press, selected ones a highlight, and Wire mode a ring on every
  // terminal; those are marked data-no-export so they stay out of copied and
  // downloaded pictures.
  import { LABEL_SIZE, symbolSize } from '$lib/generators/circuit-diagram/layout'
  import PartSymbol from '$lib/generators/circuit-diagram/PartSymbol.svelte'
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import { SERIF } from '$lib/shared/figure'
  import {
    bendsOf, INK, junctions, LEAD, partMarks, sameEnd, symbolOf, terminal, wirePath,
    type End, type Part, type Schematic, type Wire,
  } from './schematic'

  interface Props {
    schematic: Schematic
    mode?: 'move' | 'wire' | 'delete'
    /** parts and the wire to highlight, as selected or about to be deleted */
    selected?: string[]
    selectedWire?: string | null
    /** the terminal a wire is being drawn from */
    wireStart?: End | null
    onpartdown?: (event: PointerEvent, part: Part) => void
    onwiredown?: (event: PointerEvent, wire: Wire) => void
    onterminaldown?: (event: PointerEvent, end: End) => void
    onbenddown?: (event: PointerEvent, wire: Wire, index: number) => void
  }
  let { schematic, mode, selected = [], selectedWire = null, wireStart = null, onpartdown, onwiredown, onterminaldown, onbenddown }: Props = $props()

  const editing = $derived(!!onpartdown)
  const deleting = $derived(mode === 'delete')
  const paths = $derived(new Map(schematic.wires.map((w) => [w.id, wirePath(schematic, w)])))
  const dots = $derived(junctions(schematic))
  const points = (path: { x: number; y: number }[]) => path.map((q) => `${q.x},${q.y}`).join(' ')
  const highlight = $derived(deleting ? 'var(--red-soft)' : '#dbeafe')
  const outline = $derived(deleting ? 'var(--red)' : 'var(--blue)')
</script>

<g fill="none" stroke-linecap="round">
  {#each schematic.wires as wire (wire.id)}
    <g class="wire" role="presentation" onpointerdown={(e) => onwiredown?.(e, wire)}>
      {#if editing}
        <polyline
          data-no-export
          points={points(paths.get(wire.id)!)}
          stroke={selectedWire === wire.id ? highlight : 'transparent'}
          stroke-width="14"
          stroke-linejoin="round"
        />
      {/if}
      <polyline points={points(paths.get(wire.id)!)} stroke={INK} stroke-width="2.2" stroke-linejoin="round" />
    </g>
  {/each}

  {#each schematic.parts as part (part.id)}
    {@const half = symbolSize(symbolOf(part)).half}
    <g class="part" role="presentation" transform="translate({part.x} {part.y}) rotate({part.rotation})" onpointerdown={(e) => onpartdown?.(e, part)}>
      {#if editing}
        <rect
          data-no-export
          x={-LEAD}
          y="-22"
          width={2 * LEAD}
          height="44"
          rx="8"
          fill={selected.includes(part.id) ? highlight : 'transparent'}
          stroke={selected.includes(part.id) ? outline : 'none'}
          stroke-width="1.5"
        />
      {/if}
      <line x1={-LEAD} x2={-half} y1="0" y2="0" stroke={INK} stroke-width="2.2" />
      <line x1={half} x2={LEAD} y1="0" y2="0" stroke={INK} stroke-width="2.2" />
      <PartSymbol part={symbolOf(part)} style={schematic.symbols} ink={INK} />
    </g>
  {/each}
</g>

{#each dots as dot (`${dot.x},${dot.y}`)}<circle cx={dot.x} cy={dot.y} r="3.8" fill={INK} />{/each}

<g pointer-events="none">
  {#each schematic.parts as part (part.id)}
    {@const marks = partMarks(part, schematic.polarity)}
    {#each marks.letters as l, i (i)}
      <text x={l.x} y={l.y + l.size * 0.34} text-anchor="middle" font-family={SERIF} font-size={l.size} fill={INK}>{l.text}</text>
    {/each}
    {#each marks.labels as l, i (i)}
      <FigureLabel label={l.label} x={l.x} y={l.y} anchor={l.anchor} size={LABEL_SIZE} color={INK} />
    {/each}
  {/each}
</g>

{#if mode === 'wire'}
  {#each schematic.parts as part (part.id)}
    {#each [0, 1] as const as t (t)}
      {@const at = terminal(part, t)}
      {@const start = !!wireStart && sameEnd(wireStart, { part: part.id, t })}
      <circle
        data-no-export
        class="terminal"
        role="presentation"
        cx={at.x}
        cy={at.y}
        r={start ? 8 : 6.5}
        fill={start ? 'var(--amber)' : '#fff'}
        stroke={start ? 'var(--amber)' : 'var(--blue)'}
        stroke-width="2"
        onpointerdown={(e) => onterminaldown?.(e, { part: part.id, t })}
      />
    {/each}
  {/each}
{/if}

{#if mode === 'move' && selectedWire}
  {@const wire = schematic.wires.find((w) => w.id === selectedWire)}
  {#if wire}
    {#each bendsOf(schematic, wire) as bend, i (i)}
      <rect
        data-no-export
        class="bend"
        role="presentation"
        x={bend.x - 6}
        y={bend.y - 6}
        width="12"
        height="12"
        rx="2"
        fill="#fff"
        stroke="var(--blue)"
        stroke-width="2"
        onpointerdown={(e) => onbenddown?.(e, wire, i)}
      />
    {/each}
  {/if}
{/if}

<style>
  text { user-select: none; }
</style>
