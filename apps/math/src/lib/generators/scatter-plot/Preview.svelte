<script lang="ts">
  // The Scatter Plot Generator's picture on the directory: a real scatter
  // plot with its line of best fit, drawn by the same code the generator uses.
  import ScatterPlot from './ScatterPlot.svelte'
  import { cleanSettings } from './settings.js'

  const settings = cleanSettings({
    input: 'list',
    data: '1, 3\n2, 4\n2, 6\n3, 5\n4, 7\n5, 6\n5, 9\n6, 8\n7, 10\n8, 9\n9, 12',
    fit: 'best',
    equation: 'none',
  })
</script>

<ScatterPlot {settings} id="preview-scatter-plot" />
