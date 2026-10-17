<script lang="ts">
  // Half-Life Graph's picture on the directory: carbon-14's decay curve with
  // guide lines at its first three half-lives, in large labels to read at the
  // card's size.
  import HalfLifeFigure from './HalfLifeFigure.svelte'
  import { halfLifeSettings } from './settings'

  const settings = halfLifeSettings.tidy({ ...halfLifeSettings.defaults, guides: 3, guideLabels: 'halves', labelSize: 'large' })
</script>

<HalfLifeFigure {settings} id="preview-half-life-graph" />
