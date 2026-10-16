<script lang="ts">
  // On every page: the Econ Figures name (back to the directory) and the
  // current generator's name on the left, and links to the other STEM Figures
  // sites on the right.
  import { ArrowUpRight, ChevronRight } from '@lucide/svelte'
  import { page } from '$app/state'
  import { findGenerator } from '$lib/generators/index'
  import { FAMILY, SISTER_SITES, SITE_NAME } from './config'

  const current = $derived(findGenerator(page.url.pathname))
</script>

<header class="topbar no-print">
  <div class="left">
    <a class="home" href="/">
      <img src="/favicon.svg" alt="" width="28" height="28" />
      <span>{SITE_NAME}</span>
    </a>
    {#if current}
      <ChevronRight size={16} aria-hidden="true" class="sep" />
      <span class="current" aria-current="page">{current.name}</span>
    {/if}
  </div>
  <div class="right">
    <!-- No noreferrer on these, so the other sites can see the visit came from here. -->
    <nav class="family" aria-label="{FAMILY.name} family">
      {#each SISTER_SITES as site (site.url)}
        <a class="sister" href={site.url} rel="noopener">
          {site.name}<ArrowUpRight size={14} aria-hidden="true" />
        </a>
      {/each}
    </nav>
  </div>
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    height: var(--topbar-h);
    padding: 0 1.25rem;
    background: #fff;
    border-bottom: 1px solid var(--border);
  }
  .left { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
  .home { display: inline-flex; align-items: center; gap: 0.55rem; color: var(--ink); text-decoration: none; font-weight: 800; font-size: 1.1rem; white-space: nowrap; }
  .right { display: flex; align-items: center; gap: 0.75rem; flex: none; }
  .family { display: flex; align-items: center; gap: 0.75rem; flex: none; font-size: 0.85rem; white-space: nowrap; }
  .sister { display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.3rem 0.6rem; border: 1.5px solid var(--blue-border); border-radius: 8px; background: #fff; color: var(--blue-dark); font-weight: 600; text-decoration: none; }
  .sister:hover { background: var(--blue-soft); }
  .sister :global(svg) { color: var(--blue); }
  .left :global(.sep) { color: var(--muted); flex: none; margin-left: 0.5rem; }
  .current { color: var(--muted); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* The family links go before the generator's name gets squeezed. */
  @media (max-width: 760px) {
    .family { display: none; }
  }
  /* Phones keep the site name and drop the generator's name, which the page shows anyway. */
  @media (max-width: 640px) {
    .left :global(.sep), .current { display: none; }
  }
</style>
