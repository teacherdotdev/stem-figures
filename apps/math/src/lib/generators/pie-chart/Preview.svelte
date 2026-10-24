<script lang="ts">
  // The Pie Chart Generator's picture on the directory: a real pie chart,
  // drawn by the same code the generator uses.
  import PieChart from './PieChart.svelte'
  import { cleanSettings } from './settings.js'

  const row = (name: string, value: string) => ({ name, cells: [{ value }] })
  const settings = cleanSettings({
    rows: [row('Apples', '12'), row('Bananas', '8'), row('Cherries', '6'), row('Grapes', '4')],
    labels: 'none',
  })
</script>

<PieChart {settings} id="preview-pie-chart" />
