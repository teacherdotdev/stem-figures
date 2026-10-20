<script lang="ts">
  // The Motion Map Generator's picture on the directory: its default
  // figure, drawn by the same code the generator uses.
  import MotionMap from './MotionMap.svelte'
  import { mapSettings } from './settings'
</script>

<MotionMap settings={mapSettings.defaults} />
