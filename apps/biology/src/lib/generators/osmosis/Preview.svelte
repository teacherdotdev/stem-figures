<script lang="ts">
  // Osmosis and Tonicity's picture on the directory: a red blood cell in a
  // hypotonic, an isotonic and a hypertonic solution, with only their
  // tonicity over them, to read at the card's size.
  import OsmosisFigure from './OsmosisFigure.svelte'
  import { osmosisSettings } from './settings'

  const settings = osmosisSettings.tidy({
    ...osmosisSettings.defaults, concMode: 'none', membraneMode: 'none', stateMode: 'none', key: false,
  })
</script>

<OsmosisFigure {settings} />
