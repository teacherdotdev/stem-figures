<script lang="ts">
  // The Circuit Editor's page: its search engine details, the editor, and its
  // About drawer. Its social card is a picture of its directory preview.
  import CircuitEditor from '$lib/editors/circuit-editor/CircuitEditor.svelte'
  import { findGenerator } from '$lib/generators/index'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const editor = findGenerator('/circuit-editor')!
  const copy = copyFor(editor.id)
  const image = '/og/circuit-editor.png'
</script>

<Seo
  title={editor.name}
  description={editor.description}
  path={editor.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(editor, copy, image)}
/>
<CircuitEditor name={editor.name} />
<GeneratorAbout generator={editor} {copy} />
