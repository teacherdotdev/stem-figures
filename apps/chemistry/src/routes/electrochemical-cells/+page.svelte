<script lang="ts">
  import ElectrochemicalCells from '$lib/generators/electrochemical-cells/ElectrochemicalCells.svelte'
  import { findGenerator } from '$lib/generators/index'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/electrochemical-cells')!
  const copy = copyFor(generator.id)
  const image = '/og/electrochemical-cells.png'
</script>

<Seo
  title="{generator.name} Generator"
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<ElectrochemicalCells />
<GeneratorAbout {generator} {copy} />
