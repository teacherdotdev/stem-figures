<script lang="ts">
  // Chromatography's figure on its directory card: the default inks after
  // the solvent has run, set up in their beaker.
  import ChromatographyFigure from './ChromatographyFigure.svelte'
  import { chromatographySettings } from './settings'
</script>

<ChromatographyFigure settings={chromatographySettings.defaults} />
