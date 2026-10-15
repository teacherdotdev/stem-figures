<script lang="ts">
  // "What's new on Math Figures" (see news.ts): shown once, to teachers who
  // were here before, with every piece of news they haven't seen, newest
  // first. Closing it any way counts as seen. `?news` shows it all again.
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { page } from '$app/state'
  import Modal from '$shared/Modal.svelte'
  import { NEWS, SEEN_KEY, unseenNews, type News } from './news'

  let shown = $state<News[]>([])
  // Whether this browser had anything of the site's saved before the page could save something itself: read as the
  // layout starts, before any page's own saving runs.
  const returning = (() => {
    try {
      return browser && localStorage.length > 0
    } catch {
      return false
    }
  })()

  function readSeen(): Record<string, string> | null {
    try {
      const raw = localStorage.getItem(SEEN_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  function markSeen(ids: string[]) {
    try {
      const at = new Date().toISOString()
      localStorage.setItem(SEEN_KEY, JSON.stringify({ ...(readSeen() ?? {}), ...Object.fromEntries(ids.map((id) => [id, at])) }))
    } catch {
      /* private window: it shows again next time */
    }
  }

  onMount(() => {
    if (page.url.searchParams.has('news')) return void (shown = [...NEWS].reverse())
    let seen = readSeen()
    if (!seen) {
      // A first visit: nothing has changed for them, so all the news so far counts as seen. Anyone with the site's
      // settings or shapes already saved was here before, and gets the news.
      if (!returning) return markSeen(NEWS.map((each) => each.id))
      seen = {}
    }
    const unseen = unseenNews(seen)
    if (unseen.length) setTimeout(() => (shown = [...unseen].reverse()), 600)
  })

  /** "2026-10-15" as "October 15, 2026", the same wherever the teacher is. */
  const longDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

  function close() {
    markSeen(shown.map((each) => each.id))
    shown = []
  }
</script>

{#if shown.length}
  <Modal title="What’s new on Math Figures" onclose={close} wide>
    <p class="thanks">
      Thanks to everyone that’s emailed us over the past couple of weeks! Here’s what we added based on what everyone said! As always, feel
      free to reach out if you have more suggestions. All the best, Elliot &amp; Duncan from
      <a href="https://teacher.dev" target="_blank" rel="noopener noreferrer"><img src="/logo.svg" alt="" width="16" height="16" /><span>teacher.dev</span></a>
    </p>
    {#each shown as update (update.id)}
      <section class="update">
        <p class="eyebrow"><time datetime={update.date}>{longDate(update.date)}</time>{#if shown.length > 1} · {update.title}{/if}</p>
        <ul class="cards">
          {#each update.items as item (item.title)}
            <li>
              <a class="card" href={item.href} onclick={close}>
                <span class="shot"><img src={item.image} alt="" loading="lazy" /></span>
                <span class="words">
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </Modal>
{/if}

<style>
  .thanks { margin: -0.4rem 0 1rem !important; color: var(--muted); }
  .thanks a { display: inline-flex; align-items: center; gap: 0.25rem; color: var(--ink); font-weight: 700; text-decoration: none; vertical-align: bottom; }
  .thanks a:hover span { text-decoration: underline; text-underline-offset: 3px; }
  .update + .update { margin-top: 1.2rem; padding-top: 1.2rem; border-top: 1px solid var(--border); }
  .eyebrow { margin: 0 0 0.6rem !important; color: var(--blue-dark); font-size: 0.75rem !important; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
  .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem; margin: 0; padding: 0; list-style: none; }
  .card {
    display: flex; flex-direction: column; height: 100%; overflow: hidden; border: 1px solid var(--border); border-radius: 12px;
    color: inherit; text-decoration: none; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  }
  .card:hover, .card:focus-visible { border-color: var(--blue-border); transform: translateY(-2px); box-shadow: 0 12px 28px -14px rgb(37 99 235 / 45%); }
  .shot { flex: none; height: 11rem; padding: 0.75rem; border-bottom: 1px solid var(--border); background: #fff; }
  .shot img { display: block; width: 100%; height: 100%; object-fit: contain; }
  .words { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.7rem 0.85rem 0.8rem; font-size: 0.9rem; line-height: 1.4; }
  .words strong { font-size: 0.98rem; }
  .words span { color: var(--muted); }
  @media (max-width: 560px) {
    .cards { grid-template-columns: 1fr; }
    .shot { height: 9rem; }
  }
</style>
