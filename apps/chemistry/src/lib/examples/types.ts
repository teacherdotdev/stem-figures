// What an example figure is: one generator's settings, with the words a
// teacher would search for it by. The settings types are imported as types
// only, so the gallery on a generator page doesn't pull in every generator.

import type { BohrSettings } from '$lib/generators/bohr-model/settings'
import type { SyringeSettings } from '$lib/generators/gas-syringe/settings'
import type { HalfLifeSettings } from '$lib/generators/half-life-graph/settings'
import type { CurveSettings } from '$lib/generators/heating-cooling-curve/settings'
import type { LengthSettings } from '$lib/generators/length-reading/settings'
import type { LewisSettings } from '$lib/generators/lewis-structures/settings'
import type { SpectrumSettings } from '$lib/generators/line-spectrum/settings'
import type { MassSettings } from '$lib/generators/mass-reading/settings'
import type { MassSpectrumSettings } from '$lib/generators/mass-spectrum/settings'
import type { NuclideSettings } from '$lib/generators/nuclide-notation/settings'
import type { OrbitalSettings } from '$lib/generators/orbital-diagram/settings'
import type { ParticleSettings } from '$lib/generators/particle-diagram/settings'
import type { PhSettings } from '$lib/generators/ph-reading/settings'
import type { PesSettings } from '$lib/generators/photoelectron-spectrum/settings'
import type { TemperatureSettings } from '$lib/generators/temperature-reading/settings'
import type { TitrationSettings } from '$lib/generators/titration-curve/settings'
import type { DisplacementSettings } from '$lib/generators/volume-by-displacement/settings'
import type { VolumeSettings } from '$lib/generators/volume-reading/settings'

/** Each generator's settings, by generator id. */
export interface SettingsById {
  'volume-reading': VolumeSettings
  'volume-by-displacement': DisplacementSettings
  'gas-syringe': SyringeSettings
  'length-reading': LengthSettings
  'mass-reading': MassSettings
  'temperature-reading': TemperatureSettings
  'ph-reading': PhSettings
  'titration-curve': TitrationSettings
  'heating-cooling-curve': CurveSettings
  'particle-diagram': ParticleSettings
  'bohr-model': BohrSettings
  'nuclide-notation': NuclideSettings
  'lewis-structures': LewisSettings
  'orbital-diagram': OrbitalSettings
  'line-spectrum': SpectrumSettings
  'photoelectron-spectrum': PesSettings
  'mass-spectrum': MassSpectrumSettings
  'half-life-graph': HalfLifeSettings
}

export type ExampleGeneratorId = keyof SettingsById

/** One example as written in ./examples.ts. */
export interface ExampleSpec<G extends ExampleGeneratorId = ExampleGeneratorId> {
  /** the page's and the image's name, in keywords: "graduated-cylinder-reading-34-5-ml" */
  slug: string
  /** the page's heading, as a teacher would search for it */
  title: string
  /** the image's alt text: what it shows, reading included */
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
  /** the example's page, e.g. "/volume-reading/examples/graduated-cylinder-reading-34-5-ml" */
  path: string
  /** the image, in static/, e.g. "/examples/volume-reading/graduated-cylinder-reading-34-5-ml.png" */
  image: string
  /** the image's size in pixels, from scripts/snapshot-examples.mjs (0 until it has run) */
  width: number
  height: number
}
