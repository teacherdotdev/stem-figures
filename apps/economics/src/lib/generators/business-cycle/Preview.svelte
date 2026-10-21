<script lang="ts">
  // Business Cycle's picture on the directory: the classic wave around its
  // trend with peaks, troughs and phases named, in large labels to read at
  // the card's size.
  import BusinessCycleFigure from './BusinessCycleFigure.svelte'
  import { businessCycleSettings } from './settings'

  const settings = businessCycleSettings.tidy({ ...businessCycleSettings.defaults, labelSize: 'large' })
</script>

<BusinessCycleFigure {settings} id="preview-business-cycle" />
