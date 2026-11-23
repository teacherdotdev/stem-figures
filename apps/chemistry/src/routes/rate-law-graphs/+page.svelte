<script lang="ts">
  import RateLawGraphs from '$lib/generators/rate-law-graphs/RateLawGraphs.svelte'
  import { findGenerator } from '$lib/generators/index'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/rate-law-graphs')!
  const copy = copyFor(generator.id)
  const image = '/og/rate-law-graphs.png'
</script>

<Seo
  title="{generator.name} Generator"
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<RateLawGraphs />
<GeneratorAbout {generator} {copy} />
