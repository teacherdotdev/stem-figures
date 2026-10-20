<script lang="ts">
  // The Look settings group every economics graph has: schematic (no
  // numbers, as AP graphs are drawn) or numbered axes, color or black and
  // white (regions hatched instead of tinted), and how the axes end.
  import { Palette } from '@lucide/svelte'
  import Section from '$shared/Section.svelte'
  import CapPicker from '$shared/graph/CapPicker.svelte'
  import { CAPS, type Cap } from '$shared/graph/caps'
  import { LOOKS, LOOK_NAMES, type Ink, type Look } from './settings'

  interface Props {
    look: Look
    ink: Ink
    xEndCap: Cap
    yEndCap: Cap
    /** whether this generator offers numbered axes */
    numeric?: boolean
    /** what changing the look does besides set it (a generator may fit its axes) */
    onlook?: (look: Look) => void
  }
  let { look = $bindable(), ink = $bindable(), xEndCap = $bindable(), yEndCap = $bindable(), numeric = true, onlook }: Props = $props()

  const ends = $derived(xEndCap === 'none' && yEndCap === 'none' ? 'plain axes' : `${CAPS[xEndCap]} / ${CAPS[yEndCap]}`.toLowerCase())
  const summary = $derived([numeric ? LOOK_NAMES[look] : '', ink === 'color' ? 'Color' : 'Black and white', ends].filter(Boolean).join(' · '))
  const choose = (v: Look) => (onlook ? onlook(v) : (look = v))
</script>

<Section title="Look" icon={Palette} {summary}>
  {#if numeric}
    <div class="field">
      <span>Axes</span>
      <div class="segmented" role="radiogroup" aria-label="Axes">
        {#each LOOKS as v}
          <button type="button" role="radio" aria-checked={look === v} class:on={look === v} onclick={() => choose(v)}>{LOOK_NAMES[v]}</button>
        {/each}
      </div>
    </div>
  {/if}
  <div class="field">
    <span>Ink</span>
    <div class="segmented" role="radiogroup" aria-label="Ink">
      <button type="button" role="radio" aria-checked={ink === 'color'} class:on={ink === 'color'} onclick={() => (ink = 'color')}>Color</button>
      <button type="button" role="radio" aria-checked={ink === 'bw'} class:on={ink === 'bw'} onclick={() => (ink = 'bw')}>Black and white</button>
    </div>
  </div>
  <div class="field-row">
    <div class="field">
      <span>x-axis end</span>
      <CapPicker options={CAPS} label="x-axis end" direction="right" bind:value={xEndCap} />
    </div>
    <div class="field">
      <span>y-axis end</span>
      <CapPicker options={CAPS} label="y-axis end" direction="up" bind:value={yEndCap} />
    </div>
  </div>
</Section>
