<script lang="ts">
  // A point's popup body: whether it's shown, and its name. `name` is
  // undefined while it's hidden; onchange(undefined) hides it.
  import { X } from '@lucide/svelte'

  let { name, onchange }: { name: string | undefined; onchange: (name: string | undefined, merge?: string) => void } = $props()
  const shown = $derived(name !== undefined)
</script>

<div class="group">
  <span class="name" id="pop-point">Point</span>
  <div class="segmented" role="radiogroup" aria-labelledby="pop-point">
    <button type="button" role="radio" aria-checked={!shown} class:on={!shown} aria-label="No point" title="No point" onclick={() => onchange(undefined)}><X size={15} /></button>
    <button type="button" role="radio" aria-checked={shown} class:on={shown} onclick={() => onchange(name ?? '')}>Show</button>
  </div>
</div>
{#if shown}
  <label class="group"><span class="name">Label</span><input type="text" maxlength="4" placeholder="A" value={name} oninput={(e) => onchange(e.currentTarget.value, 'name')} /></label>
{/if}
