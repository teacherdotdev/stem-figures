<script lang="ts">
  // Osmosis and Tonicity's picture on the directory: a red blood cell in a
  // hypotonic, an isotonic and a hypertonic solution, without the words
  // under them, to read at the card's size.
  import OsmosisFigure from './OsmosisFigure.svelte'
  import { osmosisSettings } from './settings'

  const settings = osmosisSettings.tidy({ ...osmosisSettings.defaults, concMode: 'none', key: false })
</script>

<OsmosisFigure {settings} />
