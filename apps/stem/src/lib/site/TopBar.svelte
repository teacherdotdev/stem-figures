<script lang="ts">
  // On every page: the STEM Figures name (back to the directory) on the left;
  // links to the figure sites on the right.
  import { ArrowUpRight } from '@lucide/svelte'
  import { SITES } from '$lib/sites'
  import { SITE_NAME } from './config'

  // Biology, Engineering and Econ are just getting started, so only the directory
  // links to them for now.
  const LINKED = SITES.filter((site) => ['math', 'physics', 'chemistry'].includes(site.id))
</script>

<header class="topbar no-print">
  <a class="home" href="/">
    <img src="/favicon.svg" alt="" width="28" height="28" />
    <span>{SITE_NAME}</span>
  </a>
  <!-- No noreferrer on these, so the sites can see the visit came from here. -->
  <nav class="family" aria-label="Figure sites">
    {#each LINKED as site (site.id)}
      <a class="sister" href={site.url} rel="noopener">
        {site.name}<ArrowUpRight size={14} aria-hidden="true" />
      </a>
    {/each}
  </nav>
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
  .home { display: inline-flex; align-items: center; gap: 0.55rem; color: var(--ink); text-decoration: none; font-weight: 800; font-size: 1.1rem; white-space: nowrap; }
  .family { display: flex; align-items: center; gap: 0.75rem; flex: none; font-size: 0.85rem; white-space: nowrap; }
  .sister { display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.3rem 0.6rem; border: 1.5px solid var(--blue-border); border-radius: 8px; background: #fff; color: var(--blue-dark); font-weight: 600; text-decoration: none; }
  .sister:hover { background: var(--blue-soft); }
  .sister :global(svg) { color: var(--blue); }
  /* Phones have the directory's cards and the footer for these. */
  @media (max-width: 640px) {
    .family { display: none; }
  }
</style>
