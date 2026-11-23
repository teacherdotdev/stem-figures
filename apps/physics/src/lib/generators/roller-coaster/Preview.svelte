<script lang="ts">
  // The Roller Coaster Generator's picture on the directory: its default
  // figure, drawn by the same code the generator uses.
  import Track from './Track.svelte'
  import { coasterSettings } from './settings'
</script>

<Track settings={coasterSettings.defaults} id="preview" />
