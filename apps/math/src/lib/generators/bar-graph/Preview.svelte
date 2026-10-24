<script lang="ts">
  // The Bar Graph Generator's picture on the directory: a real double bar
  // graph, drawn by the same code the generator uses.
  import BarGraph from './BarGraph.svelte'
  import { cleanSettings } from './settings.js'

  const row = (name: string, a: string, b: string) => ({ name, cells: [{ value: a }, { value: b }] })
  const settings = cleanSettings({
    columns: ['Boys', 'Girls'],
    rows: [row('Soccer', '8', '6'), row('Swimming', '5', '7'), row('Tennis', '3', '4'), row('Running', '6', '5')],
  })
</script>

<BarGraph {settings} id="preview-bar-graph" />
