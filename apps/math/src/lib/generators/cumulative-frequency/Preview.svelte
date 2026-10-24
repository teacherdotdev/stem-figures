<script lang="ts">
  // The Cumulative Frequency Graph Generator's picture on the directory: a real
  // cumulative frequency curve with its median read off, drawn by the same
  // code the generator uses.
  import CumulativeFrequency from './CumulativeFrequency.svelte'
  import { cleanSettings } from './settings.js'

  const row = (name: string, value: string) => ({ name, cells: [{ value }] })
  const settings = cleanSettings({
    rows: [row('0–10', '4'), row('10–20', '10'), row('20–30', '18'), row('30–40', '12'), row('40–50', '6')],
    median: 'lines',
    yTitleMode: 'none',
  })
</script>

<CumulativeFrequency {settings} id="preview-cumulative-frequency" />
