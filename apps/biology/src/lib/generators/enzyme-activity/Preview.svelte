<script lang="ts">
  // Enzyme Activity's picture on the directory: pepsin, salivary amylase and
  // trypsin against pH, each optimum marked, in large labels to read at the
  // card's size.
  import EnzymeFigure from './EnzymeFigure.svelte'
  import { enzymeSettings } from './settings'

  const settings = enzymeSettings.tidy({
    ...enzymeSettings.defaults,
    graph: 'ph', xTitle: 'pH', enzyme1: 'pepsin', show2: true, enzyme2: 'amylase', show3: true, enzyme3: 'trypsin',
    optLabelMode: 'none', labelSize: 'large',
  })
</script>

<EnzymeFigure {settings} id="preview-enzyme-activity" />
