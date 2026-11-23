<script lang="ts">
  // The Electric and Magnetic Field Generator's picture on the directory: its
  // default figure, opposite charges, drawn by the same code the generator uses.
  import Fields from './Fields.svelte'
  import { fieldSettings } from './settings'
</script>

<Fields settings={fieldSettings.defaults} id="preview-fields" />
