// Every generator's address parameters, in the site's catalog order, with its
// catalog entry: what /linking, /llms.txt and /llms-full.txt are made from.

import { CATALOG, type CatalogEntry } from '$shared/catalog/index'
import { SITE_ID } from '$lib/site/config'
import { bohrLinking } from '$lib/generators/bohr-model/linking'
import { dotCrossLinking } from '$lib/generators/dot-and-cross/linking'
import { syringeLinking } from '$lib/generators/gas-syringe/linking'
import { halfLifeLinking } from '$lib/generators/half-life-graph/linking'
import { curveLinking } from '$lib/generators/heating-cooling-curve/linking'
import { lengthLinking } from '$lib/generators/length-reading/linking'
import { lewisLinking } from '$lib/generators/lewis-structures/linking'
import { spectrumLinking } from '$lib/generators/line-spectrum/linking'
import { massLinking } from '$lib/generators/mass-reading/linking'
import { massSpectrumLinking } from '$lib/generators/mass-spectrum/linking'
import { nuclideLinking } from '$lib/generators/nuclide-notation/linking'
import { orbitalLinking } from '$lib/generators/orbital-diagram/linking'
import { particleLinking } from '$lib/generators/particle-diagram/linking'
import { phLinking } from '$lib/generators/ph-reading/linking'
import { pesLinking } from '$lib/generators/photoelectron-spectrum/linking'
import { energyLinking } from '$lib/generators/potential-energy-diagram/linking'
import { temperatureLinking } from '$lib/generators/temperature-reading/linking'
import { titrationLinking } from '$lib/generators/titration-curve/linking'
import { displacementLinking } from '$lib/generators/volume-by-displacement/linking'
import { volumeLinking } from '$lib/generators/volume-reading/linking'
import type { GeneratorLinking } from './define'

const BY_ID: Record<string, GeneratorLinking> = Object.fromEntries(
  [
    volumeLinking,
    displacementLinking,
    syringeLinking,
    lengthLinking,
    massLinking,
    temperatureLinking,
    phLinking,
    titrationLinking,
    curveLinking,
    energyLinking,
    particleLinking,
    bohrLinking,
    nuclideLinking,
    lewisLinking,
    dotCrossLinking,
    orbitalLinking,
    spectrumLinking,
    pesLinking,
    massSpectrumLinking,
    halfLifeLinking,
  ].map((l) => [l.id, l as GeneratorLinking]),
)

export interface LinkedGenerator {
  generator: CatalogEntry
  linking: GeneratorLinking
}

/** The site's generators with their parameters. A generator without them
 *  fails the build. Editors are left out: nothing goes in their address. */
export const LINKED: LinkedGenerator[] = CATALOG.filter((g) => g.site === SITE_ID && g.kind !== 'editor').map((generator) => {
  const linking = BY_ID[generator.id]
  if (!linking) throw new Error(`No linking description for the ${generator.id} generator`)
  return { generator, linking }
})

/** The docs page's address. */
export const LINKING_PATH = '/linking'

/** An anchor on the docs page for one generator's section. */
export const sectionId = (g: CatalogEntry) => g.id
