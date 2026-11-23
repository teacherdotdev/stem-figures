<script lang="ts">
  // Bond Energy Curve's picture on the directory: Bond X and Bond Y, the
  // shorter one the deeper well, with a key, in large labels to read at the
  // card's size.
  import BondEnergyFigure from './BondEnergyFigure.svelte'
  import { fittedAxes } from './figure'
  import { bondSettings } from './settings'

  const two = { ...bondSettings.defaults, count: 2, labelSize: 'large' as const }
  const settings = bondSettings.tidy({ ...two, ...fittedAxes(two) })
</script>

<BondEnergyFigure {settings} id="preview-bond-energy-curve" />
