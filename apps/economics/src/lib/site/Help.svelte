<script lang="ts">
  // A question mark in the corner that opens a short dialog, like the other
  // teacher.dev tools. It looks just like Request a generator.
  import { CircleQuestionMark } from '@lucide/svelte'
  import EmailDialog from '$shared/EmailDialog.svelte'

  let open = $state(false)
</script>

<button
  type="button"
  class="help-button no-print"
  aria-label="Help"
  aria-haspopup="dialog"
  onclick={() => (open = true)}
>
  <CircleQuestionMark aria-hidden="true" />
</button>

{#if open}
  <EmailDialog title="Need a hand?" subject="Econ Figures" onclose={() => (open = false)}>
    <p>If you’re running into trouble or have suggestions, email us and we’ll help.</p>
    <p>Want a figure we don’t make yet? Email us to request a generator, and we’ll build it.</p>
  </EmailDialog>
{/if}

<style>
  .help-button {
    position: fixed;
    left: 1rem;
    bottom: 1rem;
    z-index: 50;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--muted);
    /* Solid, so it reads as a button over whatever scrolls under it on a phone. */
    background: #fff;
    box-shadow: 0 2px 8px rgb(17 24 39 / 14%);
  }
  .help-button :global(svg) { width: 22px; height: 22px; }
  .help-button:hover, .help-button:focus-visible { color: var(--blue-dark); background: var(--blue-soft); }
</style>
