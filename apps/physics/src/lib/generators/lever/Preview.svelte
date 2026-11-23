<script lang="ts">
  // The Lever Generator's picture on the directory: its default figure, a
  // class 1 lever, drawn by the same code the generator uses.
  import Lever from './Lever.svelte'
  import { leverSettings } from './settings'
</script>

<Lever settings={leverSettings.defaults} />
