<script lang="ts">
  // Phillips Curve's picture on the directory: a movement up the short-run
  // curve from A to B, with both points marked, in large labels to read at
  // the card's size.
  import PhillipsFigure from './PhillipsFigure.svelte'
  import { phillipsSettings } from './settings'

  const settings = phillipsSettings.tidy({ ...phillipsSettings.defaults, movement: 'along', labelSize: 'large' })
</script>

<PhillipsFigure {settings} id="preview-phillips-curve" />
