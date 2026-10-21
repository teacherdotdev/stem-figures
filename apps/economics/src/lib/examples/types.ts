// What an example figure is: one generator's settings, with the words a
// teacher would search for it by. The settings types are imported as types
// only, so the gallery on a generator page doesn't pull in every generator.

import type { AdAsSettings } from '$lib/generators/ad-as/settings'
import type { BusinessCycleSettings } from '$lib/generators/business-cycle/settings'
import type { CostRevenueSettings } from '$lib/generators/cost-revenue-curves/settings'
import type { MoneyMarketsSettings } from '$lib/generators/money-markets/settings'
import type { PhillipsSettings } from '$lib/generators/phillips-curve/settings'
import type { PpcSettings } from '$lib/generators/production-possibilities/settings'
import type { SupplyDemandSettings } from '$lib/generators/supply-demand/settings'

/** Each generator's settings, by generator id. */
export interface SettingsById {
  'supply-demand': SupplyDemandSettings
  'ad-as': AdAsSettings
  'money-markets': MoneyMarketsSettings
  'business-cycle': BusinessCycleSettings
  'production-possibilities': PpcSettings
  'phillips-curve': PhillipsSettings
  'cost-revenue-curves': CostRevenueSettings
}

export type ExampleGeneratorId = keyof SettingsById

/** One example as written in ./examples.ts. */
export interface ExampleSpec<G extends ExampleGeneratorId = ExampleGeneratorId> {
  /** the page's and the image's name, in keywords: "supply-and-demand-graph-increase-in-demand" */
  slug: string
  /** the page's heading, as a teacher would search for it */
  title: string
  /** the image's alt text: what it shows, labels included */
  alt: string
  /** two to four sentences saying exactly what the figure shows */
  caption: string
  /** the settings that differ from the generator's defaults */
  settings: Partial<SettingsById[G]>
}

/** An example with where it lives. */
export interface Example extends Omit<ExampleSpec, 'settings'> {
  generator: ExampleGeneratorId
  settings: Record<string, unknown>
  /** the example's page, e.g. "/supply-demand/examples/supply-and-demand-graph-increase-in-demand" */
  path: string
  /** the image, in static/, e.g. "/examples/supply-demand/supply-and-demand-graph-increase-in-demand.png" */
  image: string
  /** the image's size in pixels, from scripts/snapshot-examples.mjs (0 until it has run) */
  width: number
  height: number
}
