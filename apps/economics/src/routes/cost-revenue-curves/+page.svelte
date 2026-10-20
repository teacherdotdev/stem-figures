<script lang="ts">
  // The Cost and Revenue Curves page: its search engine details and the generator.
  import { findGenerator } from '$lib/generators/index'
  import Generator from '$lib/generators/cost-revenue-curves/Generator.svelte'
  import Seo from '$lib/site/Seo.svelte'

  const generator = findGenerator('/cost-revenue-curves')!
</script>

<Seo title="{generator.name} Generator" description={generator.description} path={generator.path} />
<Generator />
