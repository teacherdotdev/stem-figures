<script lang="ts">
  // The Venn Diagram Generator's picture on the directory: a real two-set
  // diagram with a number in each region and the overlap shaded, drawn by
  // the same code the generator uses.
  import { buildVenn } from './layout.js'
  import { cleanSettings } from './settings.js'
  import VennDiagram from './VennDiagram.svelte'

  const settings = cleanSettings({ values: { a: '12', ab: '5', b: '8', out: '3' }, shaded: ['ab'] })
</script>

<VennDiagram layout={buildVenn(settings)} id="preview-venn-diagram" />
