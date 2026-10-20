<script lang="ts">
  // Length Reading's figure on its directory card: the ruler whole, with no
  // magnifier, so it stays big enough to recognize.
  import LengthFigure from './LengthFigure.svelte'
  import { lengthSettings } from './settings'

  const whole = lengthSettings.tidy({ ...lengthSettings.defaults, view: 'whole' })
</script>

<LengthFigure settings={whole} />
