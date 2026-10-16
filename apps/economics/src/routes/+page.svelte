<script lang="ts">
  // The directory: the site's generators, and those it lists from other
  // sites, searchable across every STEM Figures site. Until the site has
  // generators of its own, it says the first ones are on the way.
  import { GENERATORS, PREVIEWS } from '$lib/generators/index'
  import { SITE_ID } from '$lib/site/config'
  import Seo from '$lib/site/Seo.svelte'
  import { homeJsonLd } from '$lib/site/structuredData'
  import GeneratorDirectory from '$shared/GeneratorDirectory.svelte'

  const description =
    'Free generators for clean, printable economics figures. Make one to fit your lesson, then copy it straight into a test, worksheet or slide.'
</script>

<Seo {description} path="/" jsonLd={homeJsonLd(description)} />

<div class="page">
  <header class="hero">
    <h1>Economics figures for your tests and worksheets</h1>
    <p>Make one to fit your lesson, then copy it straight into your document. Free, with no sign-up.</p>
    {#if !GENERATORS.length}
      <p class="soon">Our first generators are on the way. Tell us the economics figure you need, and we’ll build it.</p>
    {/if}
  </header>

  <GeneratorDirectory site={SITE_ID} previews={PREVIEWS} placeholder="Search figures, like “supply and demand”" />
</div>

<style>
  .page { max-width: 58rem; margin: 0 auto; padding: 2.5rem 1.25rem 1rem; }
  h1 { font-size: 1.9rem; font-weight: 800; }
  .hero p { max-width: 42rem; margin: 0.55rem 0 0; color: var(--muted); font-size: 1.02rem; }
  .hero .soon {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.5rem 0.85rem;
    border: 1px solid var(--blue-border);
    border-radius: 10px;
    background: var(--blue-soft);
    color: var(--blue-dark);
    font-size: 0.95rem;
    font-weight: 600;
  }
</style>
