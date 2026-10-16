<script lang="ts">
  import Seo from '$lib/site/Seo.svelte'
</script>

<Seo title="Privacy" description="What Econ Figures collects, what it doesn't, and why." path="/privacy" />

<div class="page">
  <a class="back" href="/">← All figures</a>
  <h1>Privacy</h1>
  <p class="sub">What we collect, what we don't, and why.</p>

  <section class="card">
    <p>
      Econ Figures does not collect personal information from visitors or students.
      We use Cloudflare Web Analytics to anonymously count the number of visits, which helps us
      understand how the generators are being used in classrooms. Cloudflare Web Analytics is cookieless,
      does not fingerprint visitors, and does not track users across other sites; see Cloudflare's
      <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">privacy policy</a>
      for details. We do not share, sell, or otherwise transfer any visitor data to third parties.
    </p>
    <p>
      A figure's settings live entirely in the page address, so a link opens the same figure. Saved
      presets stay in your browser. Nothing you type is stored on our servers.
    </p>
    <p>
      Questions or concerns? Email
      <a href="mailto:directors@teacher.dev?subject=Econ%20Figures%20privacy">directors@teacher.dev</a>.
    </p>
  </section>
</div>

<style>
  .page { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1.25rem 2rem; }
  .back { display: inline-block; margin-bottom: 1rem; color: var(--blue-dark); text-decoration: none; font-weight: 600; font-size: 0.95rem; }
  .back:hover { text-decoration: underline; }
  h1 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem; }
  .sub { margin: 0 0 1.5rem; color: var(--muted); }
  .card { padding: 1.25rem 1.5rem; }
  .card p { margin: 0 0 0.9rem; color: #374151; }
  .card p:last-child { margin-bottom: 0; }
  .card a { color: var(--blue-dark); font-weight: 600; text-decoration: none; }
  .card a:hover { text-decoration: underline; }
</style>
