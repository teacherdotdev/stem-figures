<script lang="ts">
  // The Two-Way Table Generator's picture on the directory: a real two-way
  // table with totals and cells left blank, drawn by the same code the
  // generator uses.
  import TwoWayTable from './TwoWayTable.svelte'
  import { cleanSettings } from './settings.js'

  const row = (name: string, ...values: string[]) => ({ name, cells: values.map((value) => ({ value })) })
  const settings = cleanSettings({
    columns: ['Walk', 'Bus', 'Car'],
    rows: [row('Year 7', '12', '', '8'), row('Year 8', '15', '8', ''), row('Year 9', '', '14', '5')],
    rowTotals: ['30', '29', ''],
    columnTotals: ['36', '32', ''],
    grand: '87',
  })
</script>

<TwoWayTable {settings} />
