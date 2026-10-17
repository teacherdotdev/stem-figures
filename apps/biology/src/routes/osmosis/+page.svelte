<script lang="ts">
  // The Osmosis and Tonicity page: its search engine details, the generator, and
  // its About drawer.
  import { findGenerator } from '$lib/generators/index'
  import Generator from '$lib/generators/osmosis/Generator.svelte'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/osmosis')!
  const copy = copyFor(generator.id)
  const image = '/og/osmosis.png'
</script>

<Seo
  title="{generator.name} Generator"
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<Generator />
<GeneratorAbout {generator} {copy} />
