<script lang="ts">
  // Cladogram's picture on the directory: its default figure, the
  // vertebrates with their traits, drawn by the same code the generator uses.
  import CladogramFigure from './CladogramFigure.svelte'
  import { cladogramSettings } from './settings'
</script>

<CladogramFigure settings={cladogramSettings.defaults} />
