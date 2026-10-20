<script lang="ts">
  // The Ray Diagram Generator's picture on the directory: its default figure,
  // drawn by the same code the generator uses.
  import RayDiagram from './RayDiagram.svelte'
  import { raySettings } from './settings'
</script>

<RayDiagram settings={raySettings.defaults} id="preview" />
