<script lang="ts">
  // A small centered dialog. The parent shows it with {#if}; Escape, the close
  // button or a click on the backdrop call onclose. Focus stays inside while
  // it is open, starts on [data-autofocus] (or the first control) and goes
  // back where it was when it closes. A `wide` one is for reading, like news,
  // and scrolls when it's taller than the window.
  import type { Snippet } from 'svelte'
  import { X } from '@lucide/svelte'

  let { title, onclose, wide = false, children }: { title: string; onclose: () => void; wide?: boolean; children: Snippet } = $props()
  const titleId = $props.id()

  let dialog = $state<HTMLDivElement>()
  const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input') ?? [])

  $effect(() => {
    const previous = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => (dialog?.querySelector<HTMLElement>('[data-autofocus]') ?? focusable()[0])?.focus())
    return () => requestAnimationFrame(() => previous?.isConnected && previous.focus())
  })

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onclose()
      return
    }
    if (event.key !== 'Tab') return
    const controls = focusable()
    if (!controls.length) return
    const first = controls[0]
    const last = controls.at(-1)!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
</script>

<svelte:window {onkeydown} />

<div
  class="backdrop no-print"
  role="presentation"
  onmousedown={(event) => { if (event.target === event.currentTarget) onclose() }}
>
  <div bind:this={dialog} class="dialog" class:wide role="dialog" aria-modal="true" aria-labelledby={titleId}>
    <header>
      <h2 id={titleId}>{title}</h2>
      <button type="button" class="close" aria-label="Close" onclick={onclose}><X aria-hidden="true" /></button>
    </header>
    {@render children()}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    padding: 28px;
    display: grid;
    place-items: center;
    background: rgb(17 24 39 / 42%);
    backdrop-filter: blur(2px);
  }
  .dialog {
    width: min(440px, calc(100vw - 32px));
    padding: 20px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 18px 60px rgb(17 24 39 / 24%);
  }
  .dialog.wide { width: min(760px, calc(100vw - 32px)); max-height: calc(100dvh - 56px); overflow-y: auto; padding: 24px; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
  h2 { margin: 0; font-size: 20px; }
  .close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--muted);
    background: transparent;
  }
  .close:hover { border-color: var(--border); background: var(--blue-soft); }
  .close :global(svg) { width: 16px; height: 16px; stroke-width: 2; }
  .dialog :global(p) { margin: 0; font-size: 15px; line-height: 1.6; }
</style>
