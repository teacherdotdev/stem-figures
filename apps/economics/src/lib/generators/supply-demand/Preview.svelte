<script lang="ts">
  // Supply and Demand's picture on the directory: an increase in demand,
  // with arrows and both equilibria marked, in large labels to read at the
  // card's size.
  import SupplyDemandFigure from './SupplyDemandFigure.svelte'
  import { supplyDemandSettings } from './settings'

  const settings = supplyDemandSettings.tidy({ ...supplyDemandSettings.defaults, shift: 'demand', labelSize: 'large' })
</script>

<SupplyDemandFigure {settings} id="preview-supply-demand" />
