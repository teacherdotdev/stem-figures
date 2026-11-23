<script module lang="ts">
  /**
   * Keyboard for a radiogroup of buttons, as WAI-ARIA radios work: only the
   * chosen one is a tab stop (`radioTabIndex`), and the arrow keys, Home and
   * End choose another and move focus to it, wrapping round at the ends.
   */
  export function radioKeys<V>(e: KeyboardEvent, values: readonly V[], value: V, choose: (v: V) => void) {
    const n = values.length
    const i = values.indexOf(value)
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (i + 1) % n
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? (i - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : -1
    if (next < 0 || n === 0) return
    e.preventDefault()
    choose(values[next])
    const group = (e.currentTarget as HTMLElement | null)?.closest('[role="radiogroup"]')
    group?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }

  /** The chosen radio is the group's one tab stop; with none chosen, the first is. */
  export const radioTabIndex = <V,>(values: readonly V[], value: V, v: V) => (v === value || (!values.includes(value) && v === values[0]) ? 0 : -1)
</script>

<script lang="ts" generics="T extends string">
  // A short choice shown as segmented buttons, like Toward / Away / None.
  let { name, options, value = $bindable() }: { name: string; options: readonly (readonly [T, string])[]; value: T } = $props()

  const values = $derived(options.map(([v]) => v))
</script>

<div class="segmented" role="radiogroup" aria-label={name}>
  {#each options as [v, text]}
    <button
      type="button"
      role="radio"
      aria-checked={value === v}
      tabindex={radioTabIndex(values, value, v)}
      class:on={value === v}
      onclick={() => (value = v)}
      onkeydown={(e) => radioKeys(e, values, value, (next) => (value = next))}>{text}</button
    >
  {/each}
</div>
