<script lang="ts">
  // The Composite Shape Editor's directory card: an L-shape with its sides
  // measured, drawn the way the editor draws it.
  import CompositeDrawing from './CompositeDrawing.svelte'
  import { emptyComposite, outline, starter } from './composite'
  import { drawComposite } from './figure'

  const shape = { ...emptyComposite(), pieces: starter('l-shape'), unit: 'm' }
  for (const e of outline(shape.pieces).loops[0]) shape.sides[e.key] = { label: 'measure', text: '', ticks: 0, arrows: 0 }
  const drawn = drawComposite(shape, 'medium')
  const crop = drawn.crop!
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="{crop.x} {crop.y} {crop.w} {crop.h}">
  <CompositeDrawing {drawn} />
</svg>
