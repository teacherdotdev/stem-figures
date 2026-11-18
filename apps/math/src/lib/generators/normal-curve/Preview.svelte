<script lang="ts">
  // The Normal Curve Generator's picture on the directory: a standard normal
  // curve with the area right of z = 1 shaded, drawn by the same code the
  // generator uses.
  import NormalCurve from './NormalCurve.svelte'
  import { cleanSettings } from './settings.js'

  const settings = cleanSettings({
    regions: [{ kind: 'right', by: 'value', a: '1', area: 'none', bounds: 'none' }],
  })
</script>

<NormalCurve {settings} id="preview-normal-curve" />
