<script lang="ts">
  // Photosynthesis Rate's picture on the directory: the classic three
  // limiting-factor curves against light intensity, in large labels to read
  // at the card's size.
  import PhotosynthesisFigure from './PhotosynthesisFigure.svelte'
  import { photosynthesisSettings } from './settings'

  const settings = photosynthesisSettings.tidy({ ...photosynthesisSettings.defaults, labelSize: 'large' })
</script>

<PhotosynthesisFigure {settings} id="preview-photosynthesis-rate" />
