<script lang="ts">
  import PotentialEnergyDiagram from '$lib/generators/potential-energy-diagram/PotentialEnergyDiagram.svelte'
  import { findGenerator } from '$lib/generators/index'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/potential-energy-diagram')!
  const copy = copyFor(generator.id)
  const image = '/og/potential-energy-diagram.png'
</script>

<Seo
  title="{generator.name} Generator"
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<PotentialEnergyDiagram />
<GeneratorAbout {generator} {copy} />
