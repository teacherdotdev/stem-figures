<script lang="ts">
  // The Production Possibilities Curve page: its search engine details and the generator.
  import { findGenerator } from '$lib/generators/index'
  import Generator from '$lib/generators/production-possibilities/Generator.svelte'
  import Seo from '$lib/site/Seo.svelte'

  const generator = findGenerator('/production-possibilities')!
</script>

<Seo title="{generator.name} Generator" description={generator.description} path={generator.path} />
<Generator />
