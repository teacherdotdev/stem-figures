<script lang="ts">
  // The Phillips Curve page: its search engine details and the generator.
  import { findGenerator } from '$lib/generators/index'
  import Generator from '$lib/generators/phillips-curve/Generator.svelte'
  import Seo from '$lib/site/Seo.svelte'

  const generator = findGenerator('/phillips-curve')!
</script>

<Seo title="{generator.name} Generator" description={generator.description} path={generator.path} />
<Generator />
