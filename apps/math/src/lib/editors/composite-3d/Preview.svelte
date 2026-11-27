<script lang="ts">
  // The Composite 3D Shape Editor's directory card: the L-shaped block it
  // opens on, its edges measured, drawn the way the editor draws it.
  import Drawing3D from './Drawing3D.svelte'
  import { drawFigure, measureEdges } from './draw'
  import { starterFigure } from './model'

  const f = starterFigure()
  const drawn = drawFigure({ ...f, labels: measureEdges(f) }, 'medium')
  const fr = drawn.frame
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fr.x} {fr.y} {fr.w} {fr.h}">
  <Drawing3D {drawn} />
</svg>
