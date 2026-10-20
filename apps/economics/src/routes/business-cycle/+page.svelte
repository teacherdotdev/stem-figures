<script lang="ts">
  // The Business Cycle page: its search engine details and the generator.
  import { findGenerator } from '$lib/generators/index'
  import Generator from '$lib/generators/business-cycle/Generator.svelte'
  import Seo from '$lib/site/Seo.svelte'

  const generator = findGenerator('/business-cycle')!
</script>

<Seo title="{generator.name} Generator" description={generator.description} path={generator.path} />
<Generator />
