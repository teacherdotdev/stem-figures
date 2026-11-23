<script lang="ts">
  import VseprShapes from '$lib/generators/vsepr-shapes/VseprShapes.svelte'
  import { findGenerator } from '$lib/generators/index'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/vsepr-shapes')!
  const copy = copyFor(generator.id)
  const image = '/og/vsepr-shapes.png'
</script>

<Seo
  title="{generator.name} Generator"
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<VseprShapes />
<GeneratorAbout {generator} {copy} />
