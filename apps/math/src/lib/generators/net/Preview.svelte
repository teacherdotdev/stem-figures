<script lang="ts">
  // The Net Generator's picture on the directory: the net it opens with,
  // drawn by the same code the generator uses.
  import { buildNet } from './layout.js'
  import Net from './Net.svelte'
  import { DEFAULT_SETTINGS, cleanSettings } from './settings.js'
  import { readNet } from './solve.js'

  const settings = cleanSettings(DEFAULT_SETTINGS)
  const read = readNet(settings)
  const figure = buildNet(settings, { ...read, values: read.values! }) // the opening net always makes one
</script>

<Net {figure} />
