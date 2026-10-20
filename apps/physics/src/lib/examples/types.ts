// What an example figure is: one generator's settings, with the words a
// teacher would search for it by. The settings types are imported as types
// only, so the gallery on a generator page doesn't pull in every generator.

import type { CircuitSettings } from '$lib/generators/circuit-diagram/settings'
import type { FbdSettings } from '$lib/generators/free-body-diagram/settings'
import type { InclineSettings } from '$lib/generators/inclined-plane/settings'
import type { MotionSettings } from '$lib/generators/motion-graphs/settings'
import type { MapSettings } from '$lib/generators/motion-map/settings'
import type { ProjectileSettings } from '$lib/generators/projectile-motion/settings'
import type { PulleySettings } from '$lib/generators/pulley/settings'
import type { SpringScaleSettings } from '$lib/generators/spring-scale/settings'
import type { VectorSettings } from '$lib/generators/vector-diagram/settings'
import type { WaveSettings } from '$lib/generators/waves/settings'

/** Each generator's settings, by generator id. */
export interface SettingsById {
  'free-body-diagram': FbdSettings
  'vector-diagram': VectorSettings
  'inclined-plane': InclineSettings
  'pulley': PulleySettings
  'projectile-motion': ProjectileSettings
  'motion-graphs': MotionSettings
  'motion-map': MapSettings
  'spring-scale': SpringScaleSettings
  'waves': WaveSettings
  'circuit-diagram': CircuitSettings
}

export type ExampleGeneratorId = keyof SettingsById

/** One example as written in ./examples.ts. */
export interface ExampleSpec<G extends ExampleGeneratorId = ExampleGeneratorId> {
  /** the page's and the image's name, in keywords: "free-body-diagram-box-pushed-with-friction" */
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
  /** the example's page, e.g. "/free-body-diagram/examples/free-body-diagram-box-pushed-with-friction" */
  path: string
  /** the image, in static/, e.g. "/examples/free-body-diagram/free-body-diagram-box-pushed-with-friction.png" */
  image: string
  /** the image's size in pixels, from scripts/snapshot-examples.mjs (0 until it has run) */
  width: number
  height: number
}
