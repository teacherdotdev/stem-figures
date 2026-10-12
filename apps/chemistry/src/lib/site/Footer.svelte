<!-- The footer on the directory and the site's other pages; generators go
     without one so the figure gets the whole window. -->
<footer class="no-print">
  <a href="https://teacher.dev" target="_blank" rel="noopener noreferrer">
    <img src="/logo.svg" alt="" width="22" height="22" />
    <span>Built by teacher.dev</span>
  </a>
  <a href="/about"><span>About</span></a>
  <a href="/privacy"><span>Privacy</span></a>
  <a href="/reuse"><span>Reuse</span></a>
  <a href="/linking"><span>Link to a figure</span></a>
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
