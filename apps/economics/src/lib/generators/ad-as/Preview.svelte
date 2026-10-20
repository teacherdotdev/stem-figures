<script lang="ts">
  // AD–AS Model's picture on the directory: a recessionary gap closed by an
  // increase in aggregate demand, the gap braced under the axis, in large
  // labels to read at the card's size.
  import AdAsFigure from './AdAsFigure.svelte'
  import { adAsSettings } from './settings'

  const settings = adAsSettings.tidy({ ...adAsSettings.defaults, start: 'recession', adShift: 'full', labelSize: 'large' })
</script>

<AdAsFigure {settings} id="preview-ad-as" />
