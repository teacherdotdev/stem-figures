<script lang="ts">
  // Potential Energy Diagram's picture on the directory: an exothermic
  // reaction with and without a catalyst, its Ea and ΔH arrows labeled.
  import EnergyFigure from './EnergyFigure.svelte'
  import { energySettings } from './settings'
  import { SETUPS, settingsFor } from './setups'

  const settings = settingsFor(SETUPS.find((x) => x.id === 'catalyst')!, energySettings.defaults, energySettings.defaults)
</script>

<EnergyFigure {settings} id="preview-potential-energy-diagram" />
