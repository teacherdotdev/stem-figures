<script lang="ts">
  // The Supply and Demand page: its search engine details and the generator.
  import { findGenerator } from '$lib/generators/index'
  import Generator from '$lib/generators/supply-demand/Generator.svelte'
  import Seo from '$lib/site/Seo.svelte'

  const generator = findGenerator('/supply-demand')!
</script>

<Seo title="{generator.name} Generator" description={generator.description} path={generator.path} />
<Generator />
