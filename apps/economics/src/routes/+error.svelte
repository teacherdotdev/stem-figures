<script lang="ts">
  // Shown for a missing page or an error, with a way back to the directory.
  import { page } from '$app/state'
  import { SITE_NAME } from '$lib/site/config'

  const heading = $derived(page.status === 404 ? 'We couldn’t find that page' : 'Something went wrong')
</script>

<svelte:head><title>{page.status === 404 ? 'Not found' : 'Error'} | {SITE_NAME}</title></svelte:head>

<div class="page">
  <h1>{heading}</h1>
  <p>Try the search box above, or <a href="/">see every figure</a>.</p>
</div>

<style>
  .page { max-width: 46rem; margin: 0 auto; padding: 3rem 1.25rem; }
  h1 { font-size: 1.6rem; font-weight: 800; }
  p { color: var(--muted); }
  a { color: var(--blue-dark); font-weight: 600; }
</style>
