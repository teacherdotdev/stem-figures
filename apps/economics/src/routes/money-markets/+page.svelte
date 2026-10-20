<script lang="ts">
  // The Money Markets page: its search engine details and the generator.
  import { findGenerator } from '$lib/generators/index'
  import Generator from '$lib/generators/money-markets/Generator.svelte'
  import Seo from '$lib/site/Seo.svelte'

  const generator = findGenerator('/money-markets')!
</script>

<Seo title="{generator.name} Generator" description={generator.description} path={generator.path} />
<Generator />
