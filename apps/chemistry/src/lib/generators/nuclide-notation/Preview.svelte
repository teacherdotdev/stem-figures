<script lang="ts">
  // Nuclide Notation's figure on its directory card: the chlorine-37 ion,
  // with all four positions filled.
  import NuclideFigure from './NuclideFigure.svelte'
  import { nuclideSettings } from './settings'

  const settings = nuclideSettings.tidy({ ...nuclideSettings.defaults, z: 17, mass: 37, charge: -1 })
</script>

<NuclideFigure {settings} />
