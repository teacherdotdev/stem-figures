<script lang="ts">
  // How teachers may reuse the figures; the terms themselves are in
  // $shared/license.ts, the same on every STEM Figures site.
  import { FIGURE_LICENSE } from '$shared/license'
  import Seo from '$lib/site/Seo.svelte'
</script>

<Seo title="Reusing our figures" description="Figures you make on Engineering Figures are free to use in tests, worksheets, slides or anything else: our part is in the public domain (CC0), and anything you add is yours." path={FIGURE_LICENSE.page} />

<div class="page">
  <a class="back" href="/">← All figures</a>
  <h1>Reusing our figures</h1>
  <p class="sub">Use them for anything, no need to ask.</p>

  <section class="card">
    <p>
      Every figure you make on Engineering Figures, and every picture of a figure on this site, is free to use in your tests, worksheets,
      slides, lesson materials or anything else. Copy, print, change, share and even sell them however you like. You
      don’t need to ask, and you don’t need to credit us.
    </p>
    <p>
      Everything we contribute to a figure (the drawing, its layout and its style) is dedicated to the public domain
      under the <a href={FIGURE_LICENSE.url} rel="license">{FIGURE_LICENSE.fullName}</a>. The pictures of figures
      on this site are entirely ours, so they’re public domain too. Downloaded SVG and PNG files say so in their metadata.
    </p>
    <p>
      Anything original you add yourself, such as your own text or a structure you draw, is yours. The worksheet, test
      or slides you put a figure in are yours as well. What nobody can own is the figure itself: anyone can make the
      same one and use it.
    </p>
    <p>No rights reserved. Dedicated to the public domain by Engineering Figures (engineeringfigures.com), a teacher.dev project.</p>
  </section>
</div>

<style>
  .page { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1.25rem 2rem; }
  .back { display: inline-block; margin-bottom: 1rem; color: var(--blue-dark); text-decoration: none; font-weight: 600; font-size: 0.95rem; }
  .back:hover { text-decoration: underline; }
  h1 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem; }
  .sub { margin: 0 0 1.5rem; color: var(--muted); }
  .card { padding: 1.25rem 1.5rem; }
  .card p { margin: 0 0 0.75rem; color: #374151; }
  .card p:last-child { margin-bottom: 0; }
  .card a { color: var(--blue-dark); font-weight: 600; text-decoration: none; }
  .card a:hover { text-decoration: underline; }
</style>
