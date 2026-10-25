<script lang="ts">
  // The Circle Generator's picture on the directory: the figure it opens
  // with, drawn by the same code the generator uses.
  import CircleFigure from './CircleFigure.svelte'
  import { buildCircle } from './layout.js'
  import { DEFAULT_SETTINGS, cleanSettings } from './settings.js'

  const figure = buildCircle(cleanSettings(DEFAULT_SETTINGS))
</script>

<CircleFigure {figure} />
