<script lang="ts">
  // A settings group that starts collapsed and shows a one-line summary of its
  // current values, so the whole setup can be read at a glance.
  import type { Snippet } from 'svelte'
  import { ChevronDown, type LucideIcon } from '@lucide/svelte'

  interface Props {
    open?: boolean
    title: string
    summary: string
    icon: LucideIcon
    children: Snippet
  }
  let { open = $bindable(false), title, summary, icon: Icon, children }: Props = $props()
</script>

<details class="section" bind:open>
  <summary>
    <span class="icon"><Icon size={18} aria-hidden="true" /></span>
    <span class="text">
      <span class="title">{title}</span>
      <span class="summary">{summary}</span>
    </span>
    <span class="chevron"><ChevronDown size={18} aria-hidden="true" /></span>
  </summary>
  <div class="body">{@render children()}</div>
</details>

<style>
  .section + :global(.section) { border-top: 1px solid var(--border); }
  summary {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.1rem;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }
  summary::-webkit-details-marker { display: none; }
  summary:hover { background: var(--blue-soft); }
  summary:focus-visible { outline: 2px solid var(--blue); outline-offset: -2px; }
  .icon {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    flex: none;
    border-radius: 9px;
    background: var(--blue-soft);
    color: var(--blue-dark);
  }
  .text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .title { font-weight: 800; font-size: 0.98rem; }
  .summary { color: var(--muted); font-size: 0.86rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chevron { color: var(--muted); display: grid; transition: transform 0.15s; }
  details[open] .chevron { transform: rotate(180deg); }
  .body { padding: 0.25rem 1.1rem 1.1rem; }
</style>
