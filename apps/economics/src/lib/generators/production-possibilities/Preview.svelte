<script lang="ts">
  // Production Possibilities Curve's picture on the directory: economic
  // growth, the curve shifting out with arrows and a point on each curve, in
  // large labels to read at the card's size.
  import PpcFigure from './PpcFigure.svelte'
  import { ppcSettings } from './settings'

  const settings = ppcSettings.tidy({ ...ppcSettings.defaults, shift: 'both', points: 'A,on,0.55;B,on2,0.55', labelSize: 'large' })
</script>

<PpcFigure {settings} id="preview-production-possibilities" />
