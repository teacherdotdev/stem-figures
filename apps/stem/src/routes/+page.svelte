<script lang="ts">
  // The directory: every figure site in the family as a card linking out to it.
  import { ArrowUpRight } from '@lucide/svelte'
  import { SITES } from '$lib/sites'
  import Seo from '$lib/site/Seo.svelte'
</script>

<Seo
  description="Free generators for clean, printable math, physics, chemistry, biology, engineering and economics figures. Make one to fit your lesson, then copy it into a test, worksheet or slide."
  path="/"
/>

<div class="page">
  <header class="hero">
    <h1>STEM figures for your tests and worksheets</h1>
    <p>Pick your subject, make a figure to fit your lesson, then copy it straight into your document. Free, with no sign-up.</p>
  </header>

  <ul class="cards">
    {#each SITES as site (site.id)}
      <li>
        <!-- No noreferrer, so the site can see the visit came from here. -->
        <a class="card site" href={site.url} rel="noopener">
          <img src={site.icon} alt="" width="48" height="48" />
          <div class="text">
            <h2>{site.name}<ArrowUpRight size={16} aria-hidden="true" class="out" /></h2>
            <p>{site.blurb}</p>
            <span class="host">{new URL(site.url).host}</span>
          </div>
        </a>
      </li>
    {/each}
  </ul>
</div>

<style>
  .page { max-width: 58rem; margin: 0 auto; padding: 2.5rem 1.25rem 1rem; }
  h1 { font-size: 1.9rem; font-weight: 800; }
  .hero p { max-width: 42rem; margin: 0.55rem 0 0; color: var(--muted); font-size: 1.02rem; }

  .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin: 1.75rem 0 0; padding: 0; list-style: none; }
  @media (max-width: 600px) { .cards { grid-template-columns: minmax(0, 1fr); } }
  .cards li { display: flex; }

  .site { display: flex; align-items: flex-start; gap: 1rem; width: 100%; padding: 1.1rem 1.2rem; color: inherit; text-decoration: none; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; }
  .site:hover { border-color: var(--blue-border); transform: translateY(-2px); box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 28px -12px rgba(37, 99, 235, 0.35); }
  .site img { flex: none; }
  h2 { display: flex; align-items: center; gap: 0.3rem; font-size: 1.08rem; font-weight: 800; }
  .site :global(.out) { color: var(--muted); }
  .site:hover :global(.out) { color: var(--blue-dark); }
  .text p { margin: 0.3rem 0 0; color: var(--muted); font-size: 0.9rem; line-height: 1.4; }
  .host { display: inline-block; margin-top: 0.5rem; color: var(--blue-dark); font-size: 0.82rem; font-weight: 600; }
</style>
