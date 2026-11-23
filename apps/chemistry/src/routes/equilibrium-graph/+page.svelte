<script lang="ts">
  import EquilibriumGraph from '$lib/generators/equilibrium-graph/EquilibriumGraph.svelte'
  import { findGenerator } from '$lib/generators/index'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/equilibrium-graph')!
  const copy = copyFor(generator.id)
  const image = '/og/equilibrium-graph.png'
</script>

<Seo
  title="{generator.name} Generator"
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<EquilibriumGraph />
<GeneratorAbout {generator} {copy} />
