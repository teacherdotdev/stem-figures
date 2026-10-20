<script lang="ts">
  import HalfLifeGraph from '$lib/generators/half-life-graph/HalfLifeGraph.svelte'
  import { findGenerator } from '$lib/generators/index'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/half-life-graph')!
  const copy = copyFor(generator.id)
  const image = '/og/half-life-graph.png'
</script>

<Seo
  title="{generator.name} Generator"
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<HalfLifeGraph />
<GeneratorAbout {generator} {copy} />
