// Every generator on the site. Their names, addresses and search words are
// in the STEM Figures catalog ($shared/catalog), with every other site's;
// here each gets the component drawing its directory preview. Page titles,
// the sitemap and the top bar read GENERATORS. It includes the site's editor
// (src/lib/editors/), listed and shown like a generator.

import type { Component } from 'svelte'
import { generatorsOn, matches } from '$shared/catalog/index'
import { SITE_ID } from '$lib/site/config'
import BohrModelPreview from './bohr-model/Preview.svelte'
import GasSyringePreview from './gas-syringe/Preview.svelte'
import HalfLifeGraphPreview from './half-life-graph/Preview.svelte'
import HeatingCoolingCurvePreview from './heating-cooling-curve/Preview.svelte'
import LengthReadingPreview from './length-reading/Preview.svelte'
import LewisStructuresPreview from './lewis-structures/Preview.svelte'
import LineSpectrumPreview from './line-spectrum/Preview.svelte'
import MassReadingPreview from './mass-reading/Preview.svelte'
import MassSpectrumPreview from './mass-spectrum/Preview.svelte'
import OrbitalDiagramPreview from './orbital-diagram/Preview.svelte'
import ParticleDiagramPreview from './particle-diagram/Preview.svelte'
import PhReadingPreview from './ph-reading/Preview.svelte'
import PhotoelectronSpectrumPreview from './photoelectron-spectrum/Preview.svelte'
import TitrationCurvePreview from './titration-curve/Preview.svelte'
import TemperatureReadingPreview from './temperature-reading/Preview.svelte'
import VolumeByDisplacementPreview from './volume-by-displacement/Preview.svelte'
import VolumeReadingPreview from './volume-reading/Preview.svelte'
import StructureEditorPreview from '$lib/editors/structure-editor/Preview.svelte'

/** Each generator's directory preview, by id. */
export const PREVIEWS: Record<string, Component> = {
  'bohr-model': BohrModelPreview,
  'length-reading': LengthReadingPreview,
  'lewis-structures': LewisStructuresPreview,
  'line-spectrum': LineSpectrumPreview,
  'mass-reading': MassReadingPreview,
  'mass-spectrum': MassSpectrumPreview,
  'half-life-graph': HalfLifeGraphPreview,
  'orbital-diagram': OrbitalDiagramPreview,
  'particle-diagram': ParticleDiagramPreview,
  'ph-reading': PhReadingPreview,
  'photoelectron-spectrum': PhotoelectronSpectrumPreview,
  'temperature-reading': TemperatureReadingPreview,
  'titration-curve': TitrationCurvePreview,
  'heating-cooling-curve': HeatingCoolingCurvePreview,
  'volume-by-displacement': VolumeByDisplacementPreview,
  'gas-syringe': GasSyringePreview,
  'volume-reading': VolumeReadingPreview,
  'structure-editor': StructureEditorPreview,
}

export const GENERATORS = generatorsOn(SITE_ID, PREVIEWS)

export type Generator = (typeof GENERATORS)[number]

export const findGenerator = (path: string) => GENERATORS.find((g) => g.path === path)

/** The site's own generators matching a search. */
export const searchGenerators = (query: string) => GENERATORS.filter((g) => matches(g, query))
