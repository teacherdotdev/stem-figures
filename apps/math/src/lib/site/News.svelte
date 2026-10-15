<script lang="ts">
  // "What's new on Math Figures" (see news.ts): shown once, to teachers who
  // were here before, with every piece of news they haven't seen, newest
  // first. Closing it any way counts as seen. `?news` shows it all again.
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { page } from '$app/state'
  import Modal from '$shared/Modal.svelte'
  import { PREVIEWS } from '$lib/generators/index.js'
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

  function close() {
    markSeen(shown.map((each) => each.id))
    shown = []
  }
</script>

{#if shown.length}
  <Modal title="What’s new on Math Figures" onclose={close} wide>
    <p class="lead">Thank you for all your requests. Here’s what we’ve added.</p>
    {#each shown as update (update.id)}
      <section class="update">
        {#if shown.length > 1}<p class="eyebrow">{update.title}</p>{/if}
        <ol class="changes">
          {#each update.items as item (item.title)}
            {@const Art = item.art ? PREVIEWS[item.art] : undefined}
            <li class:compact={!Art}>
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.text}
                  {#if item.link}<a class="go" href={item.link.href} onclick={close}>{item.link.label} →</a>{/if}
                </p>
              </div>
              {#if Art}<div class="art" aria-hidden="true"><Art /></div>{/if}
            </li>
          {/each}
        </ol>
        {#if update.also}<p class="also"><strong>Also:</strong> {update.also}</p>{/if}
      </section>
    {/each}
    <div class="actions"><button type="button" class="btn-primary" onclick={close} data-autofocus>Got it</button></div>
  </Modal>
{/if}

<style>
  .lead { color: var(--muted); }
  .update + .update { margin-top: 1.2rem; padding-top: 1.2rem; border-top: 2px solid var(--border); }
  .eyebrow { margin: 0.6rem 0 0 !important; color: var(--blue-dark); font-size: 0.78rem !important; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
  .changes { display: grid; gap: 0.9rem; margin: 0.9rem 0 0; padding: 0; list-style: none; }
  .changes li { display: grid; grid-template-columns: 1fr minmax(0, 220px); align-items: center; gap: 1.5rem; padding-top: 0.9rem; border-top: 1px solid var(--border); }
  /* A change without a picture: a short row, so a long list still fits. */
  .changes li.compact { grid-template-columns: 1fr; padding-top: 0.7rem; }
  h3 { margin: 0 0 0.25rem; font-size: 1.05rem; }
  .compact h3 { font-size: 0.98rem; }
  .art { display: flex; justify-content: center; align-items: center; height: 9rem; padding: 0.6rem; border: 1px solid var(--border); border-radius: 10px; background: #fff; }
  .art :global(svg) { max-width: 100%; max-height: 100%; }
  .go { margin-left: 0.25rem; color: var(--blue-dark); font-weight: 700; text-decoration: none; white-space: nowrap; }
  .go:hover { text-decoration: underline; }
  .also { margin-top: 0.8rem !important; color: var(--muted); font-size: 0.9rem !important; }
  .actions { display: flex; justify-content: flex-end; margin-top: 1.2rem; }
  @media (max-width: 640px) {
    .changes li { grid-template-columns: 1fr; gap: 0.75rem; }
  }
</style>
