<script lang="ts">
  // The Table of Values Generator's picture on the directory: y = 2x + 1 from
  // −2 to 3 with two cells left blank for students, drawn by the same code the
  // generator uses.
  import TableOfValues from './TableOfValues.svelte'
  import { cleanSettings } from './settings.js'

  const settings = cleanSettings({ rule: 'y=2x+1', to: '3', blanks: ['y3', 'y5'], showRule: 'text' })
</script>

<TableOfValues {settings} />
