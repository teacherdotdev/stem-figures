<script lang="ts">
  // Money Markets' picture on the directory: the market for reserves with
  // ample reserves, the Fed lowering its administered rates so the policy
  // rate falls, in large labels to read at the card's size.
  import MoneyMarketsFigure from './MoneyMarketsFigure.svelte'
  import { moneyMarketsSettings } from './settings'

  const settings = moneyMarketsSettings.tidy({ ...moneyMarketsSettings.defaults, graph: 'reserves', shift: 'demand', demandDir: 'decrease', labelSize: 'large' })
</script>

<MoneyMarketsFigure {settings} id="preview-money-markets" />
