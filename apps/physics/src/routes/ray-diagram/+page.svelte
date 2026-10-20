<script lang="ts">
  // The Ray Diagram Generator's page: its search engine details, the
  // generator, and its About drawer.
  import { findGenerator } from '$lib/generators/index'
  import Generator from '$lib/generators/ray-diagram/Generator.svelte'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/ray-diagram')!
  const copy = copyFor(generator.id)
  const image = '/og/ray-diagram.png'
</script>

<Seo
  title={generator.name}
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<Generator />
<GeneratorAbout {generator} {copy} />
