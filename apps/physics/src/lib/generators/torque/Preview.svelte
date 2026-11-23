<script lang="ts">
  // The Torque Generator's picture on the directory: its default figure, a
  // balanced beam on a pivot, drawn by the same code the generator uses.
  import Torque from './Torque.svelte'
  import { torqueSettings } from './settings'
</script>

<Torque settings={torqueSettings.defaults} id="preview" />
