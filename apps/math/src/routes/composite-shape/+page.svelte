<script lang="ts">
  // The Composite Shape Editor's page: its search engine details and the editor.
  import CompositeEditor from '$lib/editors/composite-shape/CompositeEditor.svelte'
  import { findGenerator } from '$lib/generators/index.js'
  import Seo from '$lib/site/Seo.svelte'

  const editor = findGenerator('/composite-shape')!
</script>

<Seo title={editor.name} description={editor.description} path={editor.path} />
<CompositeEditor name={editor.name} />
