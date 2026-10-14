<!-- The footer on every page: the teacher.dev credit, how to reuse the
     figures, and each figure site. -->
<script lang="ts">
  import { SITES } from '$lib/sites'
</script>

<footer class="no-print">
  <a href="https://teacher.dev" target="_blank" rel="noopener noreferrer">
    <img src="/logo.svg" alt="" width="22" height="22" />
    <span>Built by teacher.dev</span>
  </a>
  <a href="/reuse"><span>Reuse</span></a>
  <!-- No noreferrer on these, so the sites can see the visit came from here. -->
  {#each SITES as site (site.id)}
    <a href={site.url} rel="noopener"><span>{site.name}</span></a>
  {/each}
</footer>

<style>
  footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.5rem 1.25rem;
    padding: 1.5rem 1.25rem 2rem;
    font-size: 0.9rem;
    text-align: center;
  }
  a { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--muted); text-decoration: none; }
  a:hover span { text-decoration: underline; text-underline-offset: 3px; }
</style>
