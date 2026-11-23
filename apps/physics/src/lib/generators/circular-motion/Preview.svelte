<script lang="ts">
  // The Circular Motion Generator's picture on the directory: the Top view
  // with the object at four positions, so the card shows the velocity turning
  // and the acceleration always pointing to the centre. Drawn by the same code
  // the generator uses.
  import CircularMotion from './CircularMotion.svelte'
  import { circularSettings } from './settings'

  const sample = { ...circularSettings.defaults, positions: 4 }
</script>

<CircularMotion settings={sample} id="preview" />
