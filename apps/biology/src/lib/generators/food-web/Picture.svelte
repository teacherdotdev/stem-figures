<script lang="ts">
  // One organism's picture, in a square at (x, y): a bundled drawing as its
  // file draws it (in color, or in black and white), standing on the
  // square's bottom edge at its size from the manifest, or an uploaded
  // picture fitted in. An upload this browser doesn't have (or the server,
  // which never has them) draws nothing here; the figure gives it a dashed
  // box instead.
  import { ORGANISM_BY_ID, PICTURE_BOX } from './organisms/manifest'
  import { blackAndWhite, drawings } from './pictures.svelte'
  import { uploads } from './images'
  import { UPLOAD } from './web'

  interface Props {
    picture: string
    x: number
    y: number
    size: number
    color?: boolean
  }
  let { picture, x, y, size, color = true }: Props = $props()

  const known = $derived(ORGANISM_BY_ID.get(picture))
  const drawing = $derived(known ? drawings.get(picture) : undefined)
  const uri = $derived(UPLOAD.test(picture) ? uploads.get(picture) : undefined)
  const k = $derived(known?.scale ?? 1)
  const r = (n: number) => Math.round(n * 100) / 100
</script>

{#if drawing}
  <svg x={r(x)} y={r(y)} width={size} height={size} viewBox="0 0 {PICTURE_BOX} {PICTURE_BOX}" overflow="visible">
    <g transform="translate({r((PICTURE_BOX * (1 - k)) / 2)} {r(PICTURE_BOX * (1 - k))}) scale({k})">
      {@html color ? drawing : blackAndWhite(drawing)}
    </g>
  </svg>
{:else if uri}
  <image href={uri} x={r(x)} y={r(y)} width={size} height={size} preserveAspectRatio="xMidYMid meet" />
{/if}
