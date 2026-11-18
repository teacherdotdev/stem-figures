<script lang="ts">
  // The Dot Plot Generator's picture on the directory: a real dot plot,
  // drawn by the same code the generator uses.
  import DotPlot from './DotPlot.svelte'
  import { cleanSettings } from './settings.js'

  const settings = cleanSettings({ data: '2, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 6, 7, 9' })
</script>

<DotPlot {settings} id="preview-dot-plot" />
