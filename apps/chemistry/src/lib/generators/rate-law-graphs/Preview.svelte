<script lang="ts">
  // Rate Law Graphs' picture on the directory: a first-order reaction's three
  // graphs side by side, ln[A] the straight one, in large labels to read at
  // the card's size.
  import RateLawFigure from './RateLawFigure.svelte'
  import { rateLawSettings } from './settings'

  const settings = rateLawSettings.tidy({ ...rateLawSettings.defaults, labelSize: 'large' })
</script>

<RateLawFigure {settings} id="preview-rate-law-graphs" />
