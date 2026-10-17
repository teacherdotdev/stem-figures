// What an example figure is: one generator's settings, with the words a
// teacher would search for it by. The settings types are imported as types
// only, so the gallery on a generator page doesn't pull in every generator.

import type { EnzymeSettings } from '$lib/generators/enzyme-activity/settings'
import type { DnaSettings } from '$lib/generators/dna-protein-synthesis/settings'
import type { GelSettings } from '$lib/generators/gel-electrophoresis/settings'
import type { PipetteSettings } from '$lib/generators/micropipette-reading/settings'
import type { PedigreeSettings } from '$lib/generators/pedigree/settings'
import type { PhotosynthesisSettings } from '$lib/generators/photosynthesis-rate/settings'
import type { PopulationSettings } from '$lib/generators/population-growth/settings'
import type { PredatorPreySettings } from '$lib/generators/predator-prey/settings'
import type { PunnettSettings } from '$lib/generators/punnett-square/settings'

/** Each generator's settings, by generator id. */
export interface SettingsById {
  'population-growth': PopulationSettings
  'punnett-square': PunnettSettings
  pedigree: PedigreeSettings
  'predator-prey': PredatorPreySettings
  'enzyme-activity': EnzymeSettings
  'dna-protein-synthesis': DnaSettings
  'photosynthesis-rate': PhotosynthesisSettings
  'gel-electrophoresis': GelSettings
  'micropipette-reading': PipetteSettings
}

export type ExampleGeneratorId = keyof SettingsById

/** One example as written in ./examples.ts. */
export interface ExampleSpec<G extends ExampleGeneratorId = ExampleGeneratorId> {
  /** the page's and the image's name, in keywords: "punnett-square-tt-x-tt-monohybrid-cross" */
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
  /** the example's page, e.g. "/punnett-square/examples/punnett-square-tt-x-tt-monohybrid-cross" */
  path: string
  /** the image, in static/, e.g. "/examples/punnett-square/punnett-square-tt-x-tt-monohybrid-cross.png" */
  image: string
  /** the image's size in pixels, from scripts/snapshot-examples.mjs (0 until it has run) */
  width: number
  height: number
}
