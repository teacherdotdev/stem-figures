<script lang="ts">
  // Equilibrium Graph's picture on the directory: ammonia settling to
  // equilibrium, then shifting when nitrogen is added, in large labels to
  // read at the card's size, the concentration axis in wider steps so the
  // graph is wide, as the card is.
  import EquilibriumFigure from './EquilibriumFigure.svelte'
  import { fittedAxes } from './figure'
  import { equilibriumSettings } from './settings'

  const stressed = equilibriumSettings.tidy({ ...equilibriumSettings.defaults, count: 1, labelSize: 'large' })
  const settings = equilibriumSettings.tidy({ ...stressed, ...fittedAxes(stressed), yStep: '0.4', yEvery: 1 })
</script>

<EquilibriumFigure {settings} id="preview-equilibrium-graph" />
