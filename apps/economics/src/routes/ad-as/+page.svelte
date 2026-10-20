<script lang="ts">
  // The AD–AS Model page: its search engine details and the generator.
  import { findGenerator } from '$lib/generators/index'
  import Generator from '$lib/generators/ad-as/Generator.svelte'
  import Seo from '$lib/site/Seo.svelte'

  const generator = findGenerator('/ad-as')!
</script>

<Seo title="{generator.name} Generator" description={generator.description} path={generator.path} />
<Generator />
