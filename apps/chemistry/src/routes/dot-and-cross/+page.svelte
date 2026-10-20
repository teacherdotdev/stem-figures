<script lang="ts">
  import DotAndCross from '$lib/generators/dot-and-cross/DotAndCross.svelte'
  import { findGenerator } from '$lib/generators/index'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/dot-and-cross')!
  const copy = copyFor(generator.id)
  const image = '/og/dot-and-cross.png'
</script>

<Seo
  title="{generator.name} Generator"
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<DotAndCross />
<GeneratorAbout {generator} {copy} />
