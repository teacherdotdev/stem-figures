<script lang="ts">
  import BondEnergyCurve from '$lib/generators/bond-energy-curve/BondEnergyCurve.svelte'
  import { findGenerator } from '$lib/generators/index'
  import GeneratorAbout from '$lib/site/GeneratorAbout.svelte'
  import Seo from '$lib/site/Seo.svelte'
  import { copyFor } from '$lib/site/generatorCopy'
  import { generatorJsonLd } from '$lib/site/structuredData'

  const generator = findGenerator('/bond-energy-curve')!
  const copy = copyFor(generator.id)
  const image = '/og/bond-energy-curve.png'
</script>

<Seo
  title="{generator.name} Generator"
  description={generator.description}
  path={generator.path}
  {image}
  imageAlt={copy.imageAlt}
  jsonLd={generatorJsonLd(generator, copy, image)}
/>
<BondEnergyCurve />
<GeneratorAbout {generator} {copy} />
