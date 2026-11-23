<script lang="ts">
  // Electrochemical Cells' figure on its directory card: the zinc–copper cell
  // with its digital voltmeter.
  import CellFigure from './CellFigure.svelte'
  import { cellSettings } from './settings'
</script>

<CellFigure settings={cellSettings.defaults} />
