<script lang="ts">
  import NuclideNotation from '$lib/generators/nuclide-notation/NuclideNotation.svelte'
  import { findGenerator } from '$lib/generators/index'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/nuclide-notation')!
  const copy = copyFor(generator.id)
  const image = '/og/nuclide-notation.png'
</script>

<Seo
  title="{generator.name} Generator"
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<NuclideNotation />
<GeneratorAbout {generator} {copy} />
