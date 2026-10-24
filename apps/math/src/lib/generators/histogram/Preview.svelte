<script lang="ts">
  // The Histogram Generator's picture on the directory: a real histogram of
  // heights, drawn by the same code the generator uses.
  import Histogram from './Histogram.svelte'
  import { cleanSettings } from './settings.js'

  const row = (name: string, f: string) => ({ name, cells: [{ value: f }] })
  const settings = cleanSettings({
    source: 'table',
    rows: [row('150–155', '2'), row('155–160', '5'), row('160–165', '9'), row('165–170', '7'), row('170–175', '4'), row('175–180', '2')],
    yTitleMode: 'none',
  })
</script>

<Histogram {settings} id="preview-histogram" />
