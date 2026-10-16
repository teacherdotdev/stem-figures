<script lang="ts">
  import Seo from '$lib/site/Seo.svelte'
</script>

<Seo title="About" description="Econ Figures is a free set of generators for printable economics figures, from teacher.dev." path="/about" />

<div class="page">
  <a class="back" href="/">← All figures</a>
  <h1>About</h1>
  <p class="sub">Clean economics figures, made to fit your lesson.</p>

  <section class="card">
    <div class="titlerow">
      <img src="/logo.svg" alt="" width="40" height="40" />
      <h2>From teacher.dev</h2>
    </div>
    <p>
      Econ Figures is a set of generators for the figures teachers put in tests and worksheets.
      It's a project from
      <a href="https://teacher.dev" target="_blank" rel="noopener noreferrer">teacher.dev</a>,
      a team building apps for teachers that solve real problems. Learn more about who we are
      and what else we're building at
      <a href="https://teacher.dev" target="_blank" rel="noopener noreferrer">teacher.dev</a>.
    </p>
    <figure class="photo">
      <img src="/2026participants.jpg" alt="Participants of the 2026 EdTech-a-thon" />
      <figcaption>EdTech-a-thon 2026</figcaption>
    </figure>
  </section>

  <section class="card">
    <h2>Our promise</h2>
    <ul>
      <li><b>Zero paywalls.</b></li>
      <li><b>Zero ads.</b></li>
      <li><b>Zero tracking of personal data.</b></li>
    </ul>
  </section>

  <section class="card">
    <h2>Feedback &amp; ideas</h2>
    <p>
      We'd love to hear from you. Tell us what's working, what's not, or which figure you wish we
      made. We're here to help.
    </p>
    <a class="btn-dark" href="mailto:directors@teacher.dev?subject=Econ%20Figures%20feedback">Email directors@teacher.dev</a>
  </section>
</div>

<style>
  .page { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1.25rem 2rem; }
  .back { display: inline-block; margin-bottom: 1rem; color: var(--blue-dark); text-decoration: none; font-weight: 600; font-size: 0.95rem; }
  .back:hover { text-decoration: underline; }
  h1 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem; }
  .sub { margin: 0 0 1.5rem; color: var(--muted); }
  .card { padding: 1.25rem 1.5rem; margin-bottom: 1.25rem; }
  .card h2 { font-size: 1.15rem; font-weight: 800; margin-bottom: 0.5rem; }
  .titlerow { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  .titlerow h2 { margin: 0; }
  .card p { margin: 0 0 0.75rem; color: #374151; }
  .card p:last-child { margin-bottom: 0; }
  .card a { color: var(--blue-dark); font-weight: 600; text-decoration: none; }
  .card a:hover { text-decoration: underline; }
  ul { margin: 0; padding-left: 1.25rem; color: #374151; }
  li + li { margin-top: 0.4rem; }

  /* A snapshot pinned to the page, like on the other teacher.dev tools. */
  .photo {
    max-width: 32rem;
    margin: 1.5rem auto 0.5rem;
    padding: 0.75rem 0.75rem 1.25rem;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 4px;
    box-shadow: 0 10px 30px -12px rgba(16, 24, 40, 0.35);
    transform: rotate(-1deg);
  }
  .photo img { display: block; width: 100%; background: var(--bg); }
  figcaption {
    padding-top: 1rem;
    text-align: center;
    font-size: 1.15rem;
    color: #374151;
    font-family: 'Segoe Script', 'Bradley Hand', 'Snell Roundhand', 'Comic Sans MS', cursive;
  }
  .btn-dark {
    display: inline-block;
    margin-top: 0.25rem;
    padding: 0.6rem 1rem;
    border-radius: 10px;
    background: var(--ink);
    color: #fff !important;
    font-size: 0.95rem;
    font-weight: 600;
    text-decoration: none !important;
  }
  .btn-dark:hover { background: #374151; }
</style>
