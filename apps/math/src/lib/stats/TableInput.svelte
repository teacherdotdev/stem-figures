<script lang="ts">
  // A table typed in like a spreadsheet, or pasted from one: a name on each
  // row, then a value per column under the column's heading, with a narrow ±
  // column beside each one when `errors` is on.
  //
  // There are no add or remove buttons. An empty column and an empty row wait
  // at the end, and typing in either adds a column or a row. A row or column
  // that's been emptied is gone once the table loses focus (one column always
  // stays). Enter moves down a row. Pasting a block with tabs (or several
  // lines with commas) anywhere in it replaces the whole table, headings
  // included. See table.ts for how it's kept.
  //
  // With `fixed`, the generator sets the columns (a frequency table's one
  // column of frequencies): their headings are written, not typed, and
  // there's no + column; a pasted table keeps only that many value columns.
  //
  // Given `rowTotals` and `columnTotals`, it can also take totals, as a
  // two-way table needs: a Total column after the + column (each row's
  // total), a Total row after the empty row (each column's), and the grand
  // total where they meet, each shown while `totalColumn` or `totalRow` is
  // on. Pasting a block whose last column is headed Total, or whose last row
  // is named Total, fills them and turns them on.
  import { tick } from 'svelte'
  import { MAX_COLUMNS, MAX_ROWS, blankCell, blankRow, parsePasted, parsePastedTotals, type TableRow } from './table'

  interface Props {
    id: string
    columns: string[]
    rows: TableRow[]
    errors?: boolean
    /** what a row is, for its heading and labels: "Category" */
    rowName: string
    /** what a column is: "Series" */
    columnName: string
    /** an example heading for the first column, shown while it's empty */
    placeholders?: { column?: string }
    /** called with a column's index when it's removed, for settings kept per column */
    onremovecolumn?: (j: number) => void
    /** the columns are the generator's: headings written as given, none added or removed */
    fixed?: boolean
    /** the most value columns the table takes, for a table with one column of values (a frequency table) */
    maxColumns?: number
    /** each row's total, one per row, for a table that takes totals */
    rowTotals?: string[]
    /** each column's total, one per column */
    columnTotals?: string[]
    grand?: string
    /** whether the Total column, and the Total row, are shown */
    totalColumn?: boolean
    totalRow?: boolean
    /** "text" when a value can be a letter as well as a number */
    inputmode?: 'decimal' | 'text'
  }
  let {
    id, columns = $bindable(), rows = $bindable(), errors = $bindable(false),
    rowName, columnName, placeholders = {}, onremovecolumn, fixed = false, maxColumns = MAX_COLUMNS,
    rowTotals = $bindable(), columnTotals = $bindable(), grand = $bindable(''),
    totalColumn = $bindable(false), totalRow = $bindable(false), inputmode = 'decimal',
  }: Props = $props()

  let table = $state<HTMLElement>()
  const canAddColumn = $derived(!fixed && columns.length < maxColumns)
  const canAddRow = $derived(rows.length < MAX_ROWS)
  const takesTotals = $derived(!!rowTotals && !!columnTotals)
  const showTotalColumn = $derived(takesTotals && totalColumn)
  const showTotalRow = $derived(takesTotals && totalRow)
  /** Empty totals added to the end of a list, up to n. */
  const padTo = (list: string[] | undefined, n: number) => {
    while (list && list.length < n) list.push('')
  }

  // Each box's id: the heading of column j, or row i's name, value j or ± j
  // (row rows.length is the empty row at the end).
  const headId = (j: number) => `${id}-h${j}`
  const cellId = (i: number, col: string) => `${id}-r${i}-${col}`
  // A box in the Total row; "t" is the Total column (and the grand total).
  const totalId = (col: string) => `${id}-total-${col}`

  /** Focus a box as soon as it's drawn (before the next key arrives), with
   *  the caret at the end of what's in it. */
  async function focusLater(el: string) {
    await tick()
    const input = document.getElementById(el) as HTMLInputElement | null
    input?.focus()
    input?.setSelectionRange(input.value.length, input.value.length)
  }

  // Typing in the empty column or row adds it, with what was typed.
  function newColumn(e: Event & { currentTarget: HTMLInputElement }) {
    const typed = e.currentTarget.value
    e.currentTarget.value = ''
    padTo(columnTotals, columns.length)
    columns.push(typed)
    for (const r of rows) r.cells.push(blankCell())
    padTo(columnTotals, columns.length)
    focusLater(headId(columns.length - 1))
  }
  function newRow(e: Event & { currentTarget: HTMLInputElement }, col: string) {
    const typed = e.currentTarget.value
    e.currentTarget.value = ''
    const row = blankRow(columns.length)
    if (col === 'name') row.name = typed
    else if (col !== 't') row.cells[Number(col.slice(1))][col[0] === 'v' ? 'value' : 'error'] = typed
    padTo(rowTotals, rows.length)
    rows.push(row)
    padTo(rowTotals, rows.length)
    if (col === 't' && rowTotals) rowTotals[rows.length - 1] = typed
    focusLater(cellId(rows.length - 1, col))
  }

  // Leaving the table drops the rows and columns that were emptied.
  // A total counts toward keeping its row or column (only while it's shown).
  const typed = (list: string[] | undefined, k: number, shown: boolean) => shown && !!list?.[k]?.trim()
  const blankColumn = (j: number) =>
    !columns[j].trim() && !typed(columnTotals, j, showTotalRow) && rows.every((r) => !r.cells[j].value.trim() && !r.cells[j].error.trim())
  const blankRowAt = (r: TableRow, i: number) =>
    !r.name.trim() && !typed(rowTotals, i, showTotalColumn) && r.cells.every((c) => !c.value.trim() && !c.error.trim())
  function tidy(e: FocusEvent) {
    if (table?.contains(e.relatedTarget as Node | null)) return
    for (let j = columns.length - 1; j >= 0 && columns.length > 1 && !fixed; j--) {
      if (!blankColumn(j)) continue
      columns.splice(j, 1)
      for (const r of rows) r.cells.splice(j, 1)
      columnTotals?.splice(j, 1)
      onremovecolumn?.(j)
    }
    const keep = rows.map((r, i) => !blankRowAt(r, i))
    if (keep.includes(false)) {
      if (rowTotals) rowTotals = rows.flatMap((_, i) => (keep[i] ? [rowTotals![i] ?? ''] : []))
      rows = rows.filter((_, i) => keep[i])
    }
  }

  // Enter moves down a row, as in a spreadsheet: from the headings to the
  // first row, and from the last row (or the empty one) to the Total row.
  function down(e: KeyboardEvent, i: number, col: string) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const next = i + 1 < rows.length || (i + 1 === rows.length && canAddRow) ? cellId(i + 1, col) : totalId(col)
    document.getElementById(next)?.focus()
  }

  function onpaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text/plain') ?? ''
    const totals = takesTotals ? parsePastedTotals(text) : null
    const pasted = totals ?? parsePasted(text)
    if (!pasted || !pasted.rows.length) return
    e.preventDefault()
    const n = fixed ? columns.length : Math.min(maxColumns, pasted.columns?.length ?? Math.max(1, ...pasted.rows.map((r) => r.cells.length)))
    if (!fixed) columns = pasted.columns?.slice(0, n) ?? Array.from({ length: n }, (_, j) => columns[j] ?? '')
    rows = pasted.rows.map((r) => ({ ...r, cells: Array.from({ length: n }, (_, j) => r.cells[j] ?? blankCell()) }))
    if (rows.some((r) => r.cells.some((c) => c.error))) errors = true
    if (totals) {
      // Pasting replaces the whole table, its totals too.
      rowTotals = rows.map((_, i) => totals.rowTotals?.[i] ?? '')
      columnTotals = columns.map((_, j) => totals.columnTotals?.[j] ?? '')
      grand = totals.grand
      if (totals.rowTotals) totalColumn = true
      if (totals.columnTotals) totalRow = true
    }
  }

  const columnLabel = (j: number) => columns[j]?.trim() || `${columnName} ${j + 1}`
  const rowLabel = (i: number) => rows[i]?.name.trim() || `${rowName} ${i + 1}`
  // The columns of values, the Total column counted in.
  const valueColumns = $derived(columns.length + (showTotalColumn ? 1 : 0))
  // The width each column takes, in rem, below which the table scrolls.
  const minWidth = $derived(6.5 + valueColumns * (errors ? 6.2 : 3.6) + (canAddColumn ? 2.4 : 0))
  // Values take a share of the width (less each as there are more), the names the rest.
  const valueWidth = $derived(errors ? Math.min(16, 56 / valueColumns) : Math.min(40, 60 / valueColumns))
  const errorWidth = $derived(errors ? Math.min(10, 34 / columns.length) : 0)
</script>

<div class="scroll" onpaste={onpaste} onfocusout={tidy} bind:this={table}>
  <table style:min-width="{minWidth}rem" aria-label="{rowName} table">
    <colgroup>
      <col />
      {#each columns as _}<col style:width="{valueWidth}%" />{#if errors}<col style:width="{errorWidth}%" />{/if}{/each}
      {#if canAddColumn}<col class="c-new" />{/if}
      {#if showTotalColumn}<col style:width="{valueWidth}%" />{/if}
    </colgroup>
    <thead>
      <tr>
        <th class="corner" scope="col">{rowName}</th>
        {#each columns as _, j}
          <th scope="col" class:fixed>
            {#if fixed}
              {columns[j]}
            {:else}
              <input
                type="text" class="heading" id={headId(j)} aria-label="{columnName} {j + 1} heading"
                placeholder={j === 0 ? (placeholders.column ?? '') : ''} bind:value={columns[j]}
                onkeydown={(e) => down(e, -1, `v${j}`)}
              />
            {/if}
          </th>
          {#if errors}<th scope="col" class="pm" aria-label="± for {columnLabel(j)}">±</th>{/if}
        {/each}
        {#if canAddColumn}
          <th scope="col" class="new">
            <input
              type="text" class="heading" aria-label="Add a {columnName.toLowerCase()}" title="Add a {columnName.toLowerCase()}" placeholder="+"
              oninput={newColumn}
            />
          </th>
        {/if}
        {#if showTotalColumn}<th scope="col" class="corner">Total</th>{/if}
      </tr>
    </thead>
    <tbody>
      {#each rows as row, i}
        <tr>
          <th scope="row">
            <input type="text" class="name" id={cellId(i, 'name')} aria-label="{rowName} {i + 1}" bind:value={row.name} onkeydown={(e) => down(e, i, 'name')} />
          </th>
          {#each row.cells as cell, j}
            <td>
              <input
                type="text" class="value" {inputmode} id={cellId(i, `v${j}`)} aria-label="{rowLabel(i)}, {columnLabel(j)}"
                bind:value={cell.value} onkeydown={(e) => down(e, i, `v${j}`)}
              />
            </td>
            {#if errors}
              <td class="pm">
                <input
                  type="text" class="value" inputmode="decimal" id={cellId(i, `e${j}`)} aria-label="± for {rowLabel(i)}, {columnLabel(j)}"
                  bind:value={cell.error} onkeydown={(e) => down(e, i, `e${j}`)}
                />
              </td>
            {/if}
          {/each}
          {#if canAddColumn}<td class="new"></td>{/if}
          {#if showTotalColumn && rowTotals}
            <td>
              <input
                type="text" class="value" {inputmode} id={cellId(i, 't')} aria-label="{rowLabel(i)}, total"
                bind:value={rowTotals[i]} onkeydown={(e) => down(e, i, 't')}
              />
            </td>
          {/if}
        </tr>
      {/each}
      {#if canAddRow}
        <tr class="new">
          <th scope="row">
            <input
              type="text" class="name" id={cellId(rows.length, 'name')} aria-label="Add a {rowName.toLowerCase()}"
              placeholder="Add a {rowName.toLowerCase()}" oninput={(e) => newRow(e, 'name')}
            />
          </th>
          {#each columns as _, j}
            <td>
              <input
                type="text" class="value" {inputmode} id={cellId(rows.length, `v${j}`)} aria-label="Add a {rowName.toLowerCase()}: {columnLabel(j)}"
                oninput={(e) => newRow(e, `v${j}`)} onkeydown={showTotalRow ? (e) => down(e, rows.length, `v${j}`) : undefined}
              />
            </td>
            {#if errors}
              <td class="pm">
                <input type="text" class="value" inputmode="decimal" id={cellId(rows.length, `e${j}`)} aria-label="Add a {rowName.toLowerCase()}: ± for {columnLabel(j)}" oninput={(e) => newRow(e, `e${j}`)} />
              </td>
            {/if}
          {/each}
          {#if canAddColumn}<td class="new"></td>{/if}
          {#if showTotalColumn}
            <td>
              <input
                type="text" class="value" {inputmode} id={cellId(rows.length, 't')} aria-label="Add a {rowName.toLowerCase()}: total"
                oninput={(e) => newRow(e, 't')} onkeydown={showTotalRow ? (e) => down(e, rows.length, 't') : undefined}
              />
            </td>
          {/if}
        </tr>
      {/if}
      {#if showTotalRow && columnTotals}
        <tr class="total">
          <th scope="row" class="corner">Total</th>
          {#each columns as _, j}
            <td>
              <input type="text" class="value" {inputmode} id={totalId(`v${j}`)} aria-label="Total, {columnLabel(j)}" bind:value={columnTotals[j]} />
            </td>
            {#if errors}<td class="pm"></td>{/if}
          {/each}
          {#if canAddColumn}<td class="new"></td>{/if}
          {#if showTotalColumn}
            <td><input type="text" class="value" {inputmode} id={totalId('t')} aria-label="Grand total" bind:value={grand} /></td>
          {/if}
        </tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  /* A spreadsheet: ruled cells, gray headings, a blue ring on the box being
     typed in. It scrolls sideways only when the columns truly don't fit (the
     table's min-width); the padding keeps the focus ring inside, so focusing a
     box never scrolls it. */
  .scroll { overflow-x: auto; overflow-y: hidden; margin: -3px; padding: 3px; }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; background: #fff; font-size: 0.92rem; }
  .c-new { width: 2.4rem; }
  th, td { padding: 0; border: 1px solid var(--border); }
  thead th, tbody th { background: var(--bg); }
  thead th.fixed { padding: 0.3rem 0.55rem; font-size: 0.78rem; font-weight: 700; line-height: 1.15; color: var(--muted); text-align: right; }
  .corner { padding: 0 0.55rem; font-size: 0.78rem; font-weight: 700; color: var(--muted); text-align: left; white-space: nowrap; overflow: hidden; }
  .pm { color: var(--muted); }
  thead .pm { font-size: 0.85rem; font-weight: 700; text-align: center; }
  tbody .pm { background: #fbfcfd; }
  /* Under table, to outrank the site's own text box styles. */
  table input {
    display: block; width: 100%; min-width: 0; height: 2.2rem; margin: 0; padding: 0 0.55rem;
    border: 0; border-radius: 0; background: transparent; color: var(--ink); font: inherit; box-shadow: none;
  }
  table input:focus { outline: 2px solid var(--blue); outline-offset: -2px; background: #fff; }
  table input::placeholder { color: #9aa3b2; font-weight: 400; }
  .heading { font-weight: 700; }
  .value { text-align: right; font-variant-numeric: tabular-nums; }
  th.new, td.new, tr.new > * { background: #fff; border: 1px dashed #c9cfd8; }
  tr.new input::placeholder, th.new input::placeholder { color: var(--blue-dark); opacity: 0.75; }
  th.new input { padding: 0; text-align: center; font-size: 1.1rem; }
  th.new input::placeholder { opacity: 1; }
</style>
