<script lang="ts">
  // The Spring Generator's picture on the directory: its default figure, a
  // hanging spring at its natural length and stretched by a block, drawn by
  // the same code the generator uses.
  import Spring from './Spring.svelte'
  import { springSettings } from './settings'
</script>

<Spring settings={springSettings.defaults} />
