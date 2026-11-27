<script lang="ts">
  // The Composite 3D Shape Editor's page: its search engine details and the editor.
  import Composite3DEditor from '$lib/editors/composite-3d/Composite3DEditor.svelte'
  import { findGenerator } from '$lib/generators/index.js'
  import Seo from '$lib/site/Seo.svelte'

  const editor = findGenerator('/composite-3d-shape')!
</script>

<Seo title={editor.name} description={editor.description} path={editor.path} />
<Composite3DEditor name={editor.name} />
