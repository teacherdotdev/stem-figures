// Every generator on the site. Their names, addresses and search words are
// in the STEM Figures catalog ($shared/catalog), with every other site's;
// here each gets the component drawing its directory preview. Page titles,
// the sitemap and the top bar read GENERATORS.

import type { Component } from 'svelte'
import { generatorsOn } from '$shared/catalog/index'
import { SITE_ID } from '$lib/site/config'
import CellDiagramPreview from './cell-diagram/Preview.svelte'
import PopulationGrowthPreview from './population-growth/Preview.svelte'
import PunnettSquarePreview from './punnett-square/Preview.svelte'
import PedigreePreview from './pedigree/Preview.svelte'
import CellDivisionPreview from './cell-division/Preview.svelte'
import PredatorPreyPreview from './predator-prey/Preview.svelte'
import FoodWebPreview from './food-web/Preview.svelte'
import EnzymeActivityPreview from './enzyme-activity/Preview.svelte'
import DnaProteinSynthesisPreview from './dna-protein-synthesis/Preview.svelte'
import PhotosynthesisRatePreview from './photosynthesis-rate/Preview.svelte'
import OsmosisPreview from './osmosis/Preview.svelte'
import GelElectrophoresisPreview from './gel-electrophoresis/Preview.svelte'
import MicropipetteReadingPreview from './micropipette-reading/Preview.svelte'
import MicroscopeFieldOfViewPreview from './microscope-field-of-view/Preview.svelte'

/** Each generator's directory preview, by id. */
export const PREVIEWS: Record<string, Component> = {
  'cell-diagram': CellDiagramPreview,
  'population-growth': PopulationGrowthPreview,
  'punnett-square': PunnettSquarePreview,
  pedigree: PedigreePreview,
  'cell-division': CellDivisionPreview,
  'predator-prey': PredatorPreyPreview,
  'food-web': FoodWebPreview,
  'enzyme-activity': EnzymeActivityPreview,
  'dna-protein-synthesis': DnaProteinSynthesisPreview,
  'photosynthesis-rate': PhotosynthesisRatePreview,
  osmosis: OsmosisPreview,
  'gel-electrophoresis': GelElectrophoresisPreview,
  'micropipette-reading': MicropipetteReadingPreview,
  'microscope-field-of-view': MicroscopeFieldOfViewPreview,
}

export const GENERATORS = generatorsOn(SITE_ID, PREVIEWS)

export type Generator = (typeof GENERATORS)[number]

export const findGenerator = (path: string) => GENERATORS.find((g) => g.path === path)
