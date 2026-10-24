// What an example figure is: one generator's settings, with the words a
// teacher would search for it by. The settings types are imported as types
// only, so the gallery on a generator page doesn't pull in every generator.

import type { Settings as ShapeSettings } from '$lib/generators/3d-shape/settings'
import type { Settings as BarGraphSettings } from '$lib/generators/bar-graph/settings'
import type { Settings as BoxPlotSettings } from '$lib/generators/box-plot/settings'
import type { Settings as GridSettings } from '$lib/generators/coordinate-grid/settings'
import type { Settings as CumulativeSettings } from '$lib/generators/cumulative-frequency/settings'
import type { LengthSettings } from '$lib/generators/length-reading/settings'
import type { Settings as MappingSettings } from '$lib/generators/mapping-diagram/settings'
import type { Settings as NumberLineSettings } from '$lib/generators/number-line/settings'
import type { Settings as PolygonSettings } from '$lib/generators/regular-polygon/settings'
import type { Settings as StemAndLeafSettings } from '$lib/generators/stem-and-leaf/settings'
import type { Settings as TriangleSettings } from '$lib/generators/triangle/settings'
import type { Settings as QuadrilateralSettings } from '$lib/shapes/quadrilateral/settings'

/** Each generator's settings, by generator id. */
export interface SettingsById {
  'coordinate-grid': GridSettings
  'number-line': NumberLineSettings
  'triangle': TriangleSettings
  'rectangle': QuadrilateralSettings
  'parallelogram': QuadrilateralSettings
  'trapezoid': QuadrilateralSettings
  'kite': QuadrilateralSettings
  'regular-polygon': PolygonSettings
  'prism': ShapeSettings
  'cylinder': ShapeSettings
  'pyramid': ShapeSettings
  'cone': ShapeSettings
  'sphere': ShapeSettings
  'box-plot': BoxPlotSettings
  'bar-graph': BarGraphSettings
  'stem-and-leaf': StemAndLeafSettings
  'cumulative-frequency': CumulativeSettings
  'mapping-diagram': MappingSettings
  'length-reading': LengthSettings
}

export type ExampleGeneratorId = keyof SettingsById

/** Some of a setting's value: a row of a list can give only the fields that
 *  differ from a new row's, which the generator fills in. */
type Given<T> = T extends (infer R)[] ? Given<R>[] : T extends object ? { [K in keyof T]?: Given<T[K]> } : T

/** One example as written in ./examples.ts. */
export interface ExampleSpec<G extends ExampleGeneratorId = ExampleGeneratorId> {
  /** the page's and the image's name, in keywords: "right-triangle-with-legs-3-and-4" */
  slug: string
  /** the page's heading, as a teacher would search for it */
  title: string
  /** the image's alt text: what it shows, labels included */
  alt: string
  /** two to four sentences saying exactly what the figure shows */
  caption: string
  /** the settings that differ from the generator's defaults */
  settings: Given<Partial<SettingsById[G]>>
}

/** An example with where it lives. */
export interface Example extends Omit<ExampleSpec, 'settings'> {
  generator: ExampleGeneratorId
  settings: Record<string, unknown>
  /** the example's page, e.g. "/triangle/examples/right-triangle-with-legs-3-and-4" */
  path: string
  /** the image, in static/, e.g. "/examples/triangle/right-triangle-with-legs-3-and-4.png" */
  image: string
  /** the image's size in pixels, from scripts/snapshot-examples.mjs (0 until it has run) */
  width: number
  height: number
}
