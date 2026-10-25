<script lang="ts">
  // The Stem-and-Leaf Plot Generator's picture on the directory: a real plot,
  // drawn by the same code the generator uses.
  import StemAndLeaf from './StemAndLeaf.svelte'
  import { cleanSettings } from './settings.js'

  const settings = cleanSettings({ data: '12, 15, 18, 21, 23, 23, 27, 30, 34, 36, 36, 39, 41, 45' })
</script>

<StemAndLeaf {settings} />
