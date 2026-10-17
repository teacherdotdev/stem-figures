<script lang="ts">
  // Choosing an organism's picture: the bundled organisms by group, with a
  // search box, or the teacher's own pictures, uploaded into this browser
  // (see images.ts), or no picture, just the name in a box. Escape, the
  // close button or a click outside close it without changing anything.
  import { onMount } from 'svelte'
  import { ImagePlus, Search, Trash2, Type, X } from '@lucide/svelte'
  import { ACCEPTED, addImage, deleteImage, listImages, MAX_IMAGES, type StoredImage } from './images'
  import { GROUPS, ORGANISMS, type Group } from './organisms/manifest'
  import { loadDrawings } from './pictures.svelte'
  import Picture from './Picture.svelte'

  interface Props {
    title: string
    current?: string
    /** a picked picture, and the name an upload was stored under */
    onpick: (picture: string, name: string) => void
    onclose: () => void
    /** whether deleting this upload would take it from a saved preset or the figure, to ask first */
    inUse: (key: string) => string
  }
  let { title, current = '', onpick, onclose, inUse }: Props = $props()

  let dialog = $state<HTMLDialogElement>()
  // svelte-ignore state_referenced_locally
  let tab = $state<'bundled' | 'mine'>(current.startsWith('u-') ? 'mine' : 'bundled')
  let query = $state('')
  let mine = $state<StoredImage[]>([])
  let thumbs = $state<Record<string, string>>({})
  let error = $state('')
  let busy = $state(false)

  $effect(() => {
    dialog?.showModal()
    return () => dialog?.close()
  })

  onMount(() => {
    loadDrawings(ORGANISMS.map((o) => o.id))
    refresh()
    return () => Object.values(thumbs).forEach((u) => URL.revokeObjectURL(u))
  })

  async function refresh() {
    try {
      mine = await listImages()
      const next: Record<string, string> = {}
      for (const m of mine) next[m.key] = thumbs[m.key] ?? URL.createObjectURL(m.blob)
      thumbs = next
    } catch {
      error = 'This browser can’t store pictures (private browsing may block it).'
    }
  }

  const words = $derived(query.trim().toLowerCase())
  const groups = $derived(
    (Object.keys(GROUPS) as Group[])
      .map((g) => ({ g, items: ORGANISMS.filter((o) => o.group === g && (!words || `${o.name} ${o.id}`.toLowerCase().includes(words))) }))
      .filter((x) => x.items.length),
  )

  async function upload(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    error = ''
    busy = true
    try {
      const key = await addImage(file)
      await refresh()
      const stored = mine.find((m) => m.key === key)
      onpick(key, stored?.name ?? '')
    } catch (err) {
      error = err instanceof Error ? err.message : 'This picture could not be added.'
    } finally {
      busy = false
    }
  }

  async function remove(m: StoredImage) {
    const use = inUse(m.key)
    if (use && !confirm(`${use} Delete this picture anyway?`)) return
    await deleteImage(m.key)
    await refresh()
  }
</script>

<dialog
  bind:this={dialog}
  class="picker no-print"
  aria-labelledby="picker-title"
  onclose={onclose}
  onclick={(event) => { if (event.target === dialog) onclose() }}
>
  <header>
    <h2 id="picker-title">{title}</h2>
    <button type="button" class="close" aria-label="Close" onclick={onclose}><X aria-hidden="true" /></button>
  </header>
  <div class="tabs segmented" role="tablist">
    <button type="button" role="tab" aria-selected={tab === 'bundled'} class:on={tab === 'bundled'} onclick={() => (tab = 'bundled')}>Organisms</button>
    <button type="button" role="tab" aria-selected={tab === 'mine'} class:on={tab === 'mine'} onclick={() => (tab = 'mine')}>My pictures</button>
  </div>

  {#if tab === 'bundled'}
    <div class="search">
      <Search size={17} aria-hidden="true" />
      <!-- svelte-ignore a11y_autofocus -->
      <input type="search" placeholder="Search organisms" aria-label="Search organisms" bind:value={query} autofocus />
    </div>
    <div class="body">
      {#each groups as { g, items } (g)}
        <h3>{GROUPS[g]}</h3>
        <ul class="grid">
          {#each items as o (o.id)}
            <li>
              <button type="button" class="tile" class:on={current === o.id} onclick={() => onpick(o.id, '')}>
                <svg viewBox="0 0 52 52" width="52" height="52" aria-hidden="true"><Picture picture={o.id} x={0} y={0} size={52} /></svg>
                <span>{o.name}</span>
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="empty">No organism matches “{query}”. Try another word, or upload your own picture.</p>
      {/each}
      <h3>No picture</h3>
      <button type="button" class="tile wide" class:on={current === 'none'} onclick={() => onpick('none', '')}>
        <Type size={22} aria-hidden="true" /><span>Just the name, in a box</span>
      </button>
    </div>
  {:else}
    <div class="body">
      <div class="upload-row">
        <label class="btn-primary upload" class:busy>
          <ImagePlus size={18} aria-hidden="true" />{busy ? 'Adding…' : 'Upload a picture'}
          <input type="file" accept={ACCEPTED.join(',')} onchange={upload} disabled={busy} />
        </label>
        <p class="rights">Only upload pictures you have the right to use. They stay in this browser, on this computer.</p>
      </div>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      {#if mine.length}
        <ul class="grid">
          {#each mine as m (m.key)}
            <li class="mine">
              <button type="button" class="tile" class:on={current === m.key} onclick={() => onpick(m.key, m.name)}>
                <img src={thumbs[m.key]} alt="" width="52" height="52" />
                <span>{m.name}</span>
              </button>
              <button type="button" class="delete" aria-label="Delete {m.name}" onclick={() => remove(m)}><Trash2 size={15} aria-hidden="true" /></button>
            </li>
          {/each}
        </ul>
        <p class="count">{mine.length} of {MAX_IMAGES} pictures</p>
      {:else if !error}
        <p class="empty">No pictures yet. Upload a PNG, JPEG, WebP, GIF or SVG.</p>
      {/if}
    </div>
  {/if}
</dialog>

<style>
  .picker {
    width: min(46rem, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    padding: 0;
    border: 0;
    border-radius: 14px;
    background: #fff;
    color: var(--ink);
    box-shadow: 0 18px 60px rgb(17 24 39 / 24%);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .picker:not([open]) { display: none; }
  .picker::backdrop { background: rgb(17 24 39 / 42%); backdrop-filter: blur(2px); }
  header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.25rem 0.6rem; }
  h2 { margin: 0; font-size: 1.2rem; font-weight: 800; }
  .close {
    display: inline-flex; align-items: center; justify-content: center; flex: none; width: 2.25rem; height: 2.25rem; padding: 0;
    border: 1px solid transparent; border-radius: 8px; color: var(--muted); background: transparent;
  }
  .close:hover, .close:focus-visible { border-color: var(--border); background: var(--blue-soft); color: var(--blue-dark); }
  .tabs { margin: 0 1.25rem 0.75rem; }
  .search { display: flex; align-items: center; gap: 0.5rem; margin: 0 1.25rem 0.5rem; padding: 0 0.7rem; border: 1px solid var(--border); border-radius: 8px; color: var(--muted); }
  .search input { flex: 1; border: 0; padding: 0.55rem 0; outline: none; font-size: 0.95rem; }
  .body { overflow-y: auto; padding: 0 1.25rem 1.25rem; overscroll-behavior: contain; }
  h3 { margin: 0.9rem 0 0.45rem; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(6.2rem, 1fr)); gap: 0.45rem; margin: 0; padding: 0; list-style: none; }
  .tile {
    display: flex; flex-direction: column; align-items: center; gap: 0.3rem; width: 100%; padding: 0.5rem 0.3rem 0.45rem;
    border: 1.5px solid var(--border); border-radius: 10px; background: #fff; font-size: 0.82rem; font-weight: 600; line-height: 1.2; text-align: center; cursor: pointer;
  }
  .tile:hover { border-color: var(--blue-border); background: var(--blue-soft); }
  .tile.on { border-color: var(--blue); background: var(--blue-soft); }
  .tile.wide { flex-direction: row; justify-content: center; width: auto; padding: 0.6rem 1rem; }
  .tile img { object-fit: contain; }
  .mine { position: relative; }
  .delete {
    position: absolute; top: 0.25rem; right: 0.25rem; display: inline-grid; place-items: center; width: 1.6rem; height: 1.6rem; padding: 0;
    border: 1px solid var(--border); border-radius: 6px; background: #fff; color: var(--muted); cursor: pointer;
  }
  .delete:hover, .delete:focus-visible { color: #b91c1c; border-color: #fca5a5; }
  .upload-row { display: flex; flex-direction: column; gap: 0.5rem; margin: 0.25rem 0 1rem; }
  .upload { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; align-self: flex-start; cursor: pointer; }
  .upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .upload.busy { opacity: 0.7; }
  .rights { margin: 0; font-size: 0.86rem; color: var(--ink); }
  .error { margin: 0 0 0.8rem; color: #b91c1c; font-size: 0.88rem; font-weight: 600; }
  .empty, .count { margin: 0.6rem 0; color: var(--muted); font-size: 0.88rem; }
</style>
