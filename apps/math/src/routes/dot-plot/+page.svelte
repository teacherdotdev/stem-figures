<script lang="ts">
  // The Dot Plot Generator's page: its search engine details, the generator
  // and its About drawer.
  import { ogImage } from '$lib/examples/examples'
  import { findGenerator } from '$lib/generators/index.js'
  import Generator from '$lib/generators/dot-plot/Generator.svelte'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/dot-plot')!
  const copy = copyFor(generator.id)
  const image = ogImage(generator.id)
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
