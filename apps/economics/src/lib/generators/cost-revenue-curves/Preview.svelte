<script lang="ts">
  // Cost and Revenue Curves' picture on the directory: a perfectly
  // competitive firm making a profit, in large labels to read at the card's
  // size.
  import CostRevenueFigure from './CostRevenueFigure.svelte'
  import { costRevenueSettings } from './settings'

  const settings = costRevenueSettings.tidy({ ...costRevenueSettings.defaults, graph: 'perfect', minimums: false, labelSize: 'large' })
</script>

<CostRevenueFigure {settings} id="preview-cost-revenue-curves" />
