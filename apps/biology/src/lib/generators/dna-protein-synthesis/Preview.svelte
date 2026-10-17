<script lang="ts">
  // DNA and Protein Synthesis's picture on the directory: a template strand
  // starting TAC with its coding strand, mRNA and tRNA anticodons worked out
  // and the amino acids as a chain of beads, its bases colored and its
  // labels large to read at the card's size.
  import DnaFigure from './DnaFigure.svelte'
  import { dnaSettings } from './settings'

  const settings = dnaSettings.tidy({ ...dnaSettings.defaults, seq: 'TACGGATTCAAG', rowNames: 'off', color: true, labelSize: 'large' })
</script>

<DnaFigure {settings} />
