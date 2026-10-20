<script lang="ts">
  // A Vector's arrow on a figure's SVG. Its label is drawn separately (with
  // FigureLabel at labelPoint) so it stays readable when the figure is mirrored.
  // A thin white outline keeps it clear of field lines or anything behind it;
  // `halo` turns it off where the only thing behind is what the vector acts on.
  //
  // Forces are solid. Motion (velocity, acceleration) has a dashed shaft at
  // full weight, so it's never read as a force, even photocopied. A force's
  // components are thinner and dashed, drawn in the palette's lighter color.
  // `head` makes the head smaller, for a figure of short arrows (a Motion Map).
  import { arrow, VECTOR_HEAD, VECTOR_WIDTH, type Segment, type VectorStyle } from './vector'

  let { v, color, style = 'force', halo = true, head: headSize }: { v: Segment; color: string; style?: VectorStyle; halo?: boolean; head?: number } = $props()

  const width = $derived(style === 'component' ? 2 : VECTOR_WIDTH)
  const head = $derived(headSize ?? (style === 'component' ? 10 : VECTOR_HEAD))
  const a = $derived(arrow(v, head))
  // Dashes stretched a little so the shaft starts and ends on a whole dash.
  const dash = $derived.by(() => {
    if (style === 'force') return undefined
    const [on, off] = style === 'motion' ? [8, 5] : [5, 4]
    const length = Math.hypot(a.shaft.x2 - a.shaft.x1, a.shaft.y2 - a.shaft.y1)
    const k = (length + off) / (Math.max(1, Math.round((length + off) / (on + off))) * (on + off))
    return `${Math.round(on * k * 100) / 100} ${Math.round(off * k * 100) / 100}`
  })
  const points = $derived(a.head.map((p) => `${p.x},${p.y}`).join(' '))
</script>

{#if halo}
  <line x1={a.shaft.x1} y1={a.shaft.y1} x2={a.shaft.x2} y2={a.shaft.y2} stroke="#fff" stroke-width={width + 5} stroke-linecap="round" />
  <polygon {points} fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round" />
{/if}

<!-- A dashed shaft is drawn from the head back, so a dash always meets the head.
     Its ends are square, so a force drawn from an object's edge doesn't poke inside. -->
<line
  x1={a.shaft.x2}
  y1={a.shaft.y2}
  x2={a.shaft.x1}
  y2={a.shaft.y1}
  stroke={color}
  stroke-width={width}
  stroke-dasharray={dash}
  stroke-linecap="butt"
/>
<polygon {points} fill={color} />
