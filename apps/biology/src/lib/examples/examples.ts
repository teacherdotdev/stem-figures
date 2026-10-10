// Example figures: real figures from each generator, each with its own page
// (/<generator>/examples/<slug>) and a PNG in static/examples/, so search
// engines can index them as images. Each is the generator's own settings, so
// "Edit this figure" opens exactly the figure shown.
//
// After adding or changing one, redo the pictures with
// scripts/snapshot-examples.mjs (see the app's README). The first example of
// each generator is also its social card (static/og/<generator>.png).
//
// Captions say only what the figure shows; answer keys come from the
// generators' own logic (./details.server.ts), never typed here.

import { CATALOG } from '$shared/catalog/index'
import { SITE_ID } from '$lib/site/config'
import sizes from './sizes.json'
import type { Example, ExampleGeneratorId, ExampleSpec } from './types'

const SIZES = sizes as Record<string, number[]>

/** A generator's examples, or none while it is turned off (see $shared/catalog). */
function examplesOf<G extends ExampleGeneratorId>(generator: G, specs: ExampleSpec<G>[]): Example[] {
  if (!CATALOG.some((g) => g.site === SITE_ID && g.id === generator)) return []
  return specs.map((spec) => {
    const image = `/examples/${generator}/${spec.slug}.png`
    const [width, height] = SIZES[image] ?? [0, 0]
    return { ...spec, generator, settings: spec.settings as Record<string, unknown>, path: `/${generator}/examples/${spec.slug}`, image, width, height }
  })
}

export const EXAMPLES: Example[] = [
  ...examplesOf('population-growth', [
    {
      slug: 'logistic-growth-curve-carrying-capacity-s-curve',
      title: 'Logistic growth curve with carrying capacity (S-curve)',
      alt: 'S-shaped logistic growth curve of a deer population rising from 20 and leveling off at a dashed carrying capacity line at 500, labeled Carrying capacity (K), with the inflection point at 250 deer marked by a dot',
      caption:
        'The logistic growth of a deer population on an island over 30 years, starting from 20 deer with r = 0.4 per year and a carrying capacity of 500. The S-shaped curve speeds up, then slows and levels off along the dashed carrying capacity line. The inflection point is marked with a dot and dashed lines to the axes where the population reaches 250, half of K.',
      settings: {
        r: 0.4, k: 500, span: 30, organism: 'deer', inflection: true,
        nTitle: 'Number of deer', rateTitle: 'Growth rate (deer/year)',
        xTo: '30', xStep: '2', yTo: '550', yStep: '50',
      },
    },
    {
      slug: 'exponential-vs-logistic-growth-j-curve-s-curve',
      title: 'Exponential vs. logistic growth graph (J-curve and S-curve)',
      alt: 'Graph of population size over 20 years with a dashed red J-shaped curve labeled Exponential growth running off the top and a blue S-shaped curve labeled Logistic growth leveling off at a dashed carrying capacity line at 1000',
      caption:
        'Exponential and logistic growth from the same starting population of 10 and the same r, 0.5 per year, graphed over 20 years. The two curves match at first; then the dashed exponential J-curve shoots off the top of the graph, while the logistic S-curve slows and levels off at the carrying capacity, 1000.',
      settings: { model: 'both', n0: 10, yTo: '1300' },
    },
    {
      slug: 'growth-rate-and-per-capita-growth-rate-vs-population-size',
      title: 'Growth rate and per capita growth rate vs. population size',
      alt: 'Two stacked graphs against population size N from 0 to 1100: the growth rate dN/dt as a hump peaking at 125 individuals per year at N = 500, labeled Fastest growth (N = K/2), and the per capita growth rate falling in a straight line from 0.5 to 0, with a dashed carrying capacity line at 1000 on both',
      caption:
        'Logistic growth with r = 0.5 per year and K = 1000, graphed against population size. On top, the growth rate dN/dt is a hump that is 0 at N = 0 and at K, with its peak marked at N = K/2. Below, the per capita growth rate falls in a straight line from 0.5 to 0 at the carrying capacity, which is a dashed line on both graphs.',
      settings: {
        n0: 10, graphs: 'rate-percapita-n', inflection: true,
        xTo: '1100', xStep: '50', yTo: '160', yStep: '20', y2To: '0.7', y2Step: '0.1',
      },
    },
    {
      slug: 'yeast-population-growth-curve-census-data-phases',
      title: 'Yeast population growth curve with census data and growth phases',
      alt: 'Logistic growth curve of yeast cells in thousands over 18 hours with hourly census dots scattered near it, a dashed carrying capacity line at 665, and brackets above labeled Lag phase, Exponential phase and Stationary phase',
      caption:
        'Yeast growing in a flask over 18 hours, from 10 thousand cells at 0.54 per hour toward a carrying capacity of 665 thousand. Census counts taken every hour are scattered by about 5% around the logistic curve, like real lab data. Brackets above the graph mark the lag, exponential and stationary phases, with dotted lines down the graph where each ends.',
      settings: {
        n0: 10, r: 0.54, k: 665, span: 18, unit: 'hours', organism: 'yeast cells',
        census: true, noise: 5, seed: 5, phases: true,
        timeTitle: 'Time (hours)', nTitle: 'Yeast cells (thousands)',
        rateTitle: 'Growth rate (yeast cells/hour)', pcTitle: 'Per capita growth rate (per hour)',
        xTo: '18', yTo: '800',
      },
    },
    {
      slug: 'blank-population-growth-graph-worksheet',
      title: 'Blank population growth graph for students to draw on',
      alt: 'Blank graph of population size (N) from 0 to 1100 against time in years from 0 to 20, with only a dashed line at 1000 labeled Carrying capacity (K)',
      caption:
        'Empty axes for students to sketch a population’s growth: population size (N) up to 1100 against time from 0 to 20 years. Only the carrying capacity is drawn, a dashed line at 1000 labeled Carrying capacity (K), so students can draw the S-curve leveling off at it, or an exponential J-curve to compare.',
      settings: { curve: false },
    },
  ]),

  ...examplesOf('punnett-square', [
    {
      slug: 'punnett-square-tt-x-tt-monohybrid-cross',
      title: 'Tt × Tt Punnett square: monohybrid cross for pea plant height',
      alt: 'A Punnett square titled Pea plant height crossing Tt × Tt, with gametes T and t on each side, offspring TT, Tt, Tt and tt, the tall cells shaded gray, a key for tall and short, and the genotype and phenotype ratios below',
      caption:
        'A Punnett square for Mendel’s pea plants under the chart title “Pea plant height”: Tt across the top and Tt down the side, with gametes T and t on each edge and the offspring TT, Tt, Tt and tt in the four cells. The tall cells are shaded gray and the short one left white, with a key below. The genotype and phenotype ratios are printed under the square.',
      settings: { shade: 'each', titleMode: 'text', title: 'Pea plant height' },
    },
    {
      slug: 'dihybrid-cross-punnett-square-rryy-x-rryy',
      title: 'Dihybrid cross Punnett square: RrYy × RrYy',
      alt: 'A 4 by 4 Punnett square crossing RrYy × RrYy with gametes RY, Ry, rY and ry on each side, 16 offspring genotypes shaded by phenotype, a key for round yellow, round green, wrinkled yellow and wrinkled green, and the genotype and phenotype ratios below',
      caption:
        'A 4 × 4 dihybrid Punnett square crossing two pea plants heterozygous for seed shape and seed color, RrYy × RrYy. Each parent’s four gametes, RY, Ry, rY and ry, run across the top and down the side, and the 16 cells hold the offspring genotypes. Each phenotype has its own fill, with a key: gray for round yellow, hatching for round green, dots for wrinkled yellow, and white for wrinkled green. Both ratios are printed below.',
      settings: { cross: 'dihybrid', parents: 'RrYy × RrYy', names: 'R:round;r:wrinkled;Y:yellow;y:green', shade: 'each' },
    },
    {
      slug: 'color-blindness-punnett-square-x-linked-cross',
      title: 'Color blindness Punnett square: X-linked cross of a carrier mother',
      alt: 'An X-linked Punnett square crossing ♀ XᴮXᵇ × ♂ XᴮY, with gametes Xᴮ and Xᵇ across the top and Xᴮ and Y down the side, offspring XᴮXᴮ, XᴮXᵇ, XᴮY and XᵇY, the color-blind cell shaded gray, and percentages for genotypes, daughters and sons below',
      caption:
        'An X-linked Punnett square for red-green color blindness: a carrier mother, ♀ XᴮXᵇ, across the top and a father with normal vision, ♂ XᴮY, down the side. The cells hold two daughters, XᴮXᴮ and XᴮXᵇ, and two sons, XᴮY and XᵇY, with the color-blind cell shaded gray and a key. Under the square the genotypes are given as percentages, then the phenotypes separately for daughters and for sons.',
      settings: {
        cross: 'x-linked',
        parents: 'X^B X^b × X^B Y',
        names: 'X^B:normal vision;X^b:color-blind',
        parentLabels: 'sex',
        shade: 'X^b',
        form: 'percent',
      },
    },
    {
      slug: 'incomplete-dominance-punnett-square-snapdragon-flower-color',
      title: 'Incomplete dominance Punnett square: snapdragon flower color',
      alt: 'A Punnett square crossing two pink snapdragons, CᴿCᵂ × CᴿCᵂ, with offspring CᴿCᴿ red, CᴿCᵂ pink, CᴿCᵂ pink and CᵂCᵂ white, red shaded gray, pink hatched, white unshaded, a key, and the genotype and phenotype ratios below',
      caption:
        'A Punnett square for snapdragon flower color, a classic case of incomplete dominance: two pink parents, CᴿCᵂ × CᴿCᵂ, with gametes Cᴿ and Cᵂ on each side. Each cell gives its genotype with the flower color written under it, and each color has its own fill: gray for red, hatching for pink and white left unshaded, with a key. The genotype and phenotype ratios are printed below.',
      settings: {
        dominance: 'incomplete',
        parents: 'C^R C^W × C^R C^W',
        names: 'C^R:red;C^R+C^W:pink;C^W:white',
        cellNames: true,
        shade: 'each',
      },
    },
    {
      slug: 'abo-blood-type-punnett-square-worksheet-blank',
      title: 'Blank ABO blood type Punnett square worksheet (codominance)',
      alt: 'A blank Punnett square under a question about blood type, with Mother Iᴬi across the top and Father Iᴮi down the side, gametes Iᴬ and i and Iᴮ and i, four empty cells, and blank lines for the genotype and phenotype ratios',
      caption:
        'A Punnett square worksheet on ABO blood type, with a question above it: a mother with type A blood and a father with type B blood each carry the allele for type O. The parents are labeled Mother Iᴬi and Father Iᴮi, with gametes Iᴬ and i across the top and Iᴮ and i down the side, and the four cells are left empty for students. Blank lines follow for the genotype and phenotype ratios.',
      settings: {
        dominance: 'codominance',
        parents: 'I^A i × I^B i',
        names: 'I^A:type A;I^A+I^B:type AB;I^B:type B;i:type O',
        parentLabels: 'mother',
        cells: 'blank',
        genotypeRatio: 'blank',
        phenotypeRatio: 'blank',
        question:
          'A mother with type A blood and a father with type B blood each carry the allele for type O. Complete the Punnett square and give the ratios.',
      },
    },
  ]),

  ...examplesOf('pedigree', [
    {
      slug: 'hemophilia-pedigree-royal-family-x-linked-recessive-carriers',
      title: 'Hemophilia pedigree: X-linked recessive in a royal family',
      alt: 'A four-generation pedigree titled Hemophilia in a royal family, with a half-filled carrier woman in generation I, seven affected men across generations II to IV, six more half-filled carrier women, deceased slashes, a proband arrow at IV-5 and a key',
      caption:
        'A four-generation pedigree of 29 people, modeled on Queen Victoria’s family: a carrier woman, I-2, has an affected son, II-4, and two carrier daughters, II-3 and II-6. Every affected person is a man, seven in all across generations II to IV, and six of them are marked deceased. Carrier women are drawn half filled, the arrow marks the proband, IV-5, and the key below explains every symbol.',
      settings: {
        mode: 'xr',
        family: 'm-fc4mfc-m3fc-m2MdmMdfc-m3ffMpMd-f1fc-m2Mdmfc-m2fc-m3MdmfMd',
        carriers: 'half',
        letter: 'H',
        titleMode: 'text',
        title: 'Hemophilia in a royal family',
      },
    },
    {
      slug: 'cystic-fibrosis-pedigree-autosomal-recessive-genotype-worksheet',
      title: 'Cystic fibrosis pedigree with blank genotypes (autosomal recessive)',
      alt: 'A three-generation pedigree titled Cystic fibrosis, with two affected daughters, II-3 and III-4, both born to unaffected parents, and a blank line under each of the 13 people for a genotype',
      caption:
        'A three-generation pedigree of 13 people. Unaffected parents I-1 and I-2 have an affected daughter, II-3, and a generation later unaffected II-5 and II-6 have an affected daughter, III-4; no one else is affected. Carriers aren’t marked, and a blank line under every person is for students to write the genotype, using F and f.',
      settings: {
        family: 'mc-fc4mc-f2mfFmfc-mc3mFmc',
        genotypes: 'blank',
        letter: 'F',
        titleMode: 'text',
        title: 'Cystic fibrosis',
      },
    },
    {
      slug: 'huntingtons-disease-pedigree-autosomal-dominant-genotypes',
      title: 'Huntington’s disease pedigree with genotypes (autosomal dominant)',
      alt: 'A three-generation pedigree titled Huntington’s disease, with an affected deceased man in generation I, affected people in every generation, Hh or hh written under each person, a key, and the answer key line',
      caption:
        'A three-generation pedigree of 17 people, starting with an affected man, I-1, marked deceased. Affected men and women appear in every generation, every affected child has an affected parent, and II-5 passes the trait to his son, III-6. Each person’s genotype is written under their number, Hh or hh, and the answer key line is printed under the key.',
      settings: {
        mode: 'ad',
        family: 'Md-f4F-m3MfFm-f2fmM-f3Mfmf',
        genotypes: 'answers',
        letter: 'H',
        titleMode: 'text',
        title: 'Huntington’s disease',
        answerKey: true,
      },
    },
    {
      slug: 'color-blindness-pedigree-x-linked-genotypes-carriers',
      title: 'Red–green color blindness pedigree with X-linked genotypes',
      alt: 'A three-generation pedigree titled Red–green color blindness, with an affected grandfather, carrier daughters drawn with a center dot, two affected grandsons, and each person’s genotype written on X and Y with B or b as a superscript',
      caption:
        'A three-generation pedigree of 15 people. An affected grandfather, I-1, has two carrier daughters, II-2 and II-5, shown with a dot in the middle, and each has an affected son, III-1 and III-7; his son II-3 has unaffected children. Every person’s genotype is written on X and Y chromosomes with B and b as superscripts, and the key adds the carrier symbol.',
      settings: {
        mode: 'xr',
        family: 'M-f3fc-m3Mmfcm-f2mffc-m2fM',
        carriers: 'dot',
        genotypes: 'answers',
        letter: 'B',
        titleMode: 'text',
        title: 'Red–green color blindness',
      },
    },
    {
      slug: 'y-linked-pedigree-father-to-son',
      title: 'Y-linked pedigree: a random family over 3 generations',
      alt: 'A three-generation pedigree of 18 people in which only I-1, his son II-2 and II-2’s sons III-1 and III-2 are affected, all men, with a key',
      caption:
        'A random three-generation family of 18 people. The affected man in generation I, I-1, has an affected son, II-2, whose two sons, III-1 and III-2, are affected too; every woman is unaffected, and so are the sons of I-1’s daughters. There is no chart title, so the figure doesn’t give the trait away.',
      settings: { mode: 'y', seed: 2 },
    },
  ]),

  ...examplesOf('predator-prey', [
    {
      slug: 'hare-lynx-predator-prey-graph-lag-period',
      title: 'Snowshoe hare and lynx population graph with lag and period',
      alt: 'Graph of snowshoe hare and Canada lynx populations in thousands over 40 years, hares a solid blue line and lynx a dashed red line, each peak marked with a dot and a dotted line, with arrows labeled “Lag: 1.6 years” and “Period: 10 years”',
      caption:
        'Snowshoe hares (solid blue) and Canada lynx (dashed red), in thousands, over 40 years, from the Lotka–Volterra model. Both populations rise and fall in a repeating cycle, the lynx peaking a little after the hares. Each peak has a dot with a dotted line down to the time axis, and arrows mark the lag from a hare peak to the next lynx peak (1.6 years) and the period from one hare peak to the next (10 years).',
      settings: { peaks: true, lag: true, cycle: true },
    },
    {
      slug: 'predator-prey-phase-plane-hare-lynx',
      title: 'Predator–prey phase plane: lynx against hares',
      alt: 'Phase plane graph with hares (thousands) on the x-axis and lynx (thousands) on the y-axis: a closed blue loop with four arrows going round it counterclockwise',
      caption:
        'The same hare and lynx cycle drawn as a phase plane: lynx against hares, both in thousands, over one full cycle. The populations trace a closed loop that goes round counterclockwise, the way the arrows point: hares rise while lynx are few, lynx rise as hares peak, hares fall while lynx are many, and lynx fall while hares are few. One trip round the loop is one cycle.',
      settings: { view: 'phase' },
    },
    {
      slug: 'hare-lynx-population-census-data-graph',
      title: 'Hare and lynx census data graph',
      alt: 'Graph of yearly census counts of hares (blue dots joined by a solid line) and lynx (red open squares joined by a dashed line), in thousands, over 40 years, rising and falling in four uneven cycles',
      caption:
        'Census counts of snowshoe hares (blue dots) and Canada lynx (red squares), in thousands, taken once a year for 40 years and joined by lines, solid for hares and dashed for lynx. Each count is off by about 10%, the way a real census is, so the peaks come out uneven, but the lynx still peak after the hares in every cycle.',
      settings: { data: 'census', seed: 4 },
    },
    {
      slug: 'predator-prey-graph-worksheet-lag-period-rabbit-fox',
      title: 'Predator–prey graph worksheet: find the lag and period',
      alt: 'Black and white graph of rabbits (solid line, left axis 0 to 1000) and foxes (dashed line, right axis 0 to 100) over 20 years, with arrows labeled “Lag:” and “Period:” followed by blank lines',
      caption:
        'Rabbits (solid line) and red foxes (dashed line) over 20 years, in black and white, with rabbits counted on the left axis and foxes on the right. One arrow spans from a rabbit peak to the fox peak after it and another from one rabbit peak to the next, labeled “Lag:” and “Period:” with blank lines for students to fill in from the time axis.',
      settings: {
        preyName: 'Rabbits', predatorName: 'Foxes', prey: 200, predators: 30, preyAverage: 400, predatorAverage: 40, period: 5,
        span: 20, every: 0.5, scale: 'two', alpha: 1.31, beta: 0.0326, gamma: 1.31, delta: 0.00326,
        yTitle: 'Rabbits', y2Title: 'Foxes', pxTitle: 'Rabbits', pyTitle: 'Foxes',
        lag: true, cycle: true, markLabels: 'blank', color: false,
      },
    },
    {
      slug: 'moose-wolf-isle-royale-population-cycles-graph',
      title: 'Moose and wolf population cycles graph (Isle Royale)',
      alt: 'Graph of moose (solid blue line, left axis 0 to 1800) and wolves (dashed red line, right axis 0 to 45) over 90 years, three cycles, each peak marked with a dot and a dotted line down to the time axis',
      caption:
        'Moose (solid blue) and wolves (dashed red) over 90 years, moose on the left axis and wolves on the right, from the model with classroom numbers for the moose and wolves of Isle Royale rather than real counts. The cycle is long and slow, the wolves peaking several years after the moose, and every peak is marked with a dot and a dotted line down to the time axis so students can read when it happens.',
      settings: {
        preyName: 'Moose', predatorName: 'Wolves', prey: 600, predators: 20, preyAverage: 1000, predatorAverage: 25, period: 30,
        span: 90, scale: 'two', alpha: 0.214, beta: 0.00857, gamma: 0.214, delta: 0.000214,
        yTitle: 'Moose', y2Title: 'Wolves', pxTitle: 'Moose', pyTitle: 'Wolves',
        peaks: true,
      },
    },
  ]),

  ...examplesOf('enzyme-activity', [
    {
      slug: 'enzyme-activity-ph-graph-pepsin-amylase-trypsin',
      title: 'Enzyme activity against pH: pepsin, amylase and trypsin',
      alt: 'Graph of rate of reaction against pH with no numbers on the axes: three bell-shaped curves, pepsin (solid blue) peaking at pH 2, salivary amylase (dashed red) at pH 7 and trypsin (dotted green) at pH 8, each peak marked with a dot, a dashed line down to the pH axis and the label Optimum, and a key under the graph',
      caption:
        'The rate of reaction against pH for three digestive enzymes, drawn as shapes with no numbers on the axes. Pepsin (solid blue) works best at about pH 2, as in the stomach, salivary amylase (dashed red) at about pH 7, as in the mouth, and trypsin (dotted green) at about pH 8, as in the small intestine. Each curve is a bell around its optimum, marked with a dot and a dashed line down to the pH axis, and falls to zero either side where the enzyme denatures.',
      settings: { graph: 'ph', xTitle: 'pH', enzyme1: 'pepsin', show2: true, enzyme2: 'amylase', show3: true, enzyme3: 'trypsin' },
    },
    {
      slug: 'enzyme-activity-temperature-graph-human-enzyme-taq-polymerase',
      title: 'Enzyme activity against temperature: human enzyme and Taq polymerase',
      alt: 'Graph of rate of reaction against temperature (°C) with no numbers on the axes: a solid blue curve for a human enzyme and a dashed red curve for Taq polymerase, each rising slowly to an optimum marked with a dot and a dashed line, labeled Optimum, then falling steeply to a dot on the axis labeled Denatured',
      caption:
        'The rate of reaction against temperature for an enzyme from the human body (solid blue) and Taq polymerase, from bacteria living in hot springs (dashed red). Each rate rises gently as the temperature goes up, peaks at the enzyme’s optimum, about 37 °C for the human enzyme and 75 °C for Taq polymerase, then falls steeply as the enzyme denatures. Dots mark each optimum, with a dashed line down to the temperature axis, and where each curve falls to zero.',
      settings: { show2: true, markDen: true },
    },
    {
      slug: 'competitive-non-competitive-inhibitor-graph-michaelis-menten',
      title: 'Competitive and non-competitive inhibitor graph (rate against substrate concentration)',
      alt: 'Graph of rate of reaction against substrate concentration with no numbers on the axes: three curves rising and levelling off, no inhibitor (solid blue), a competitive inhibitor (dashed red) reaching the same Vmax more slowly, and a non-competitive inhibitor (dotted green) levelling off at a lower Vmax, with dashed Vmax lines labeled Vmax and Vmax (non-competitive) at the y-axis and a key under the graph',
      caption:
        'The rate of reaction against substrate concentration for an enzyme on its own (solid blue), with a competitive inhibitor (dashed red) and with a non-competitive inhibitor (dotted green), drawn as Michaelis–Menten curves. With a competitive inhibitor the rate climbs more slowly but reaches the same Vmax, since enough substrate outcompetes it; with a non-competitive inhibitor it levels off at a lower Vmax. Dashed lines across mark each Vmax, labeled at the y-axis: the enzyme’s own, which the competitive inhibitor shares, and the non-competitive inhibitor’s.',
      settings: { graph: 'substrate', xTitle: 'Substrate concentration', show2: true, show3: true },
    },
    {
      slug: 'michaelis-menten-graph-vmax-km',
      title: 'Michaelis–Menten graph with Vmax, ½Vmax and Km',
      alt: 'Graph of rate of reaction against substrate concentration with no numbers on the axes: one curve rising steeply and levelling off under a dashed line labeled Vmax, with a dot at half that height joined by dashed lines to the y-axis, labeled ½Vmax, and down to the x-axis, labeled Km',
      caption:
        'A Michaelis–Menten curve: the rate of an enzyme-catalysed reaction rises steeply as substrate is added, then levels off as every active site becomes busy. A dashed line across marks the top rate, Vmax. A dot marks where the rate is half of Vmax, with dashed lines across to the y-axis, labeled ½Vmax, and down to the substrate concentration that gives it, labeled Km.',
      settings: { graph: 'substrate', xTitle: 'Substrate concentration', markKm: true },
    },
    {
      slug: 'enzyme-temperature-graph-worksheet-label-optimum-denatured',
      title: 'Enzyme and temperature graph worksheet: label the optimum and denaturation',
      alt: 'Black and white graph of rate of reaction against temperature (°C) with no numbers on the axes: one curve rising to a peak and falling steeply to the axis, a dot on the peak with a dashed line down and a dot where the curve meets the axis, each with a blank line for students to label',
      caption:
        'A worksheet graph of a human enzyme’s rate of reaction against temperature, in black and white with no numbers on the axes. The rate rises to a peak and then falls steeply to zero. A dot marks the peak, with a dashed line down to the temperature axis, and another marks where the rate reaches zero, each with a blank line for students to write what happens there.',
      settings: { color: false, markDen: true, optLabelMode: 'blank', denLabelMode: 'blank' },
    },
  ]),

  ...examplesOf('gel-electrophoresis', [
    {
      slug: 'dna-fingerprinting-gel-crime-scene-suspects',
      title: 'DNA fingerprinting gel: crime scene and three suspects',
      alt: 'A glowing agarose gel with five lanes labeled Ladder, Crime scene, Suspect 1, Suspect 2 and Suspect 3; the 1 kb ladder is labeled from 10,000 bp down to 500 bp, and each other lane has four bands',
      caption:
        'A 1% agarose gel with glowing bands on a dark background, as a stained gel looks under UV light. The first lane is a 1 kb ladder with its sizes written beside it, from 10,000 bp to 500 bp; the next holds DNA from a crime scene, and the last three hold DNA from three suspects, four bands each. Students compare each suspect’s bands with the crime scene’s to decide which one matches.',
      settings: { look: 'glow' },
    },
    {
      slug: 'paternity-test-gel-electrophoresis-mother-child-two-fathers',
      title: 'Paternity test gel: mother, child and two possible fathers',
      alt: 'A pale blue agarose gel with blue bands in five lanes labeled Ladder, Mother, Child, Father 1 and Father 2; the 1 kb ladder is labeled from 10,000 bp to 500 bp, and each other lane has four bands',
      caption:
        'A 1% agarose gel in blue, as a classroom DNA stain leaves it, with a 1 kb ladder labeled from 10,000 bp to 500 bp in the first lane. The other lanes hold DNA from a mother, her child and two possible fathers, four bands each. Every band of the child’s must come from the mother or the father, so students match the child’s bands to decide which man is the father.',
      settings: {
        lanes: [
          { type: 'ladder', id: 1, label: 'Ladder', ladder: '1kb' },
          { type: 'sample', id: 2, label: 'Mother', bands: '4800, 2900, 1600, 800' },
          { type: 'sample', id: 3, label: 'Child', bands: '4800, 3200, 1600, 650' },
          { type: 'sample', id: 4, label: 'Father 1', bands: '5600, 3500, 2200, 1100' },
          { type: 'sample', id: 5, label: 'Father 2', bands: '4400, 3200, 1900, 650' },
        ],
        look: 'blue',
      },
    },
    {
      slug: 'ptc-taster-gene-pcr-gel-haeiii-100-bp-ladder',
      title: 'PTC taster gene PCR and HaeIII digest gel with a 100 bp ladder',
      alt: 'A 2% agarose gel with five numbered lanes labeled Ladder, Uncut, TT, Tt and tt; the 100 bp ladder is labeled from 1517 bp down to 100 bp, the uncut and tt lanes have one band, TT has two and Tt has three',
      caption:
        'A 2% agarose gel with a 100 bp ladder in lane 1, labeled from 1517 bp to 100 bp, with its 500 and 517 bp bands run together as one. Lane 2 holds the uncut PCR product from the TAS2R38 bitter taste gene; lanes 3 to 5 hold it after cutting with HaeIII, which cuts the taster allele but not the nontaster allele, for a TT taster, a Tt taster and a tt nontaster. The smallest fragment is faint and runs past the 100 bp band, below what a 2% gel separates well.',
      settings: {
        lanes: [
          { type: 'ladder', id: 1, label: 'Ladder', ladder: '100bp' },
          { type: 'sample', id: 2, label: 'Uncut', bands: '221' },
          { type: 'sample', id: 3, label: 'TT', bands: '177, 44 x0.3' },
          { type: 'sample', id: 4, label: 'Tt', bands: '221, 177, 44 x0.3' },
          { type: 'sample', id: 5, label: 'tt', bands: '221' },
        ],
        gel: '2',
        laneNumbers: true,
      },
    },
    {
      slug: 'lambda-dna-restriction-digest-gel-ruler-standard-curve',
      title: 'Lambda DNA restriction digest gel with a ruler for a standard curve',
      alt: 'A 0.8% agarose gel with four lanes labeled Ladder, Uncut, EcoRI and BamHI, the λ DNA / HindIII ladder labeled from 23.1 kb to 0.125 kb, and a centimeter ruler beside the gel from 0 to 8 cm',
      caption:
        'A 0.8% agarose gel with a λ DNA / HindIII ladder in the first lane, labeled in kb from 23.1 kb to 0.125 kb, then uncut λ DNA and λ DNA cut with EcoRI and with BamHI. A ruler in cm and mm runs beside the gel, with 0 at the bottom of the wells, so students can measure how far each band ran and plot a standard curve from the ladder. The largest pieces crowd together near the wells, and in the EcoRI and BamHI lanes, fragments too close in size to separate on this gel run together as thicker bands.',
      settings: {
        lanes: [
          { type: 'ladder', id: 1, label: 'Ladder', ladder: 'lambda' },
          { type: 'sample', id: 2, label: 'Uncut', bands: '48502 x8' },
          { type: 'sample', id: 3, label: 'EcoRI', bands: '21226 x3.5, 7421 x1.2, 5804, 5643, 4878 x0.8, 3530 x0.6' },
          { type: 'sample', id: 4, label: 'BamHI', bands: '16841 x2.7, 7233 x1.2, 6770 x1.1, 6527 x1.1, 5626 x0.9, 5505 x0.9' },
        ],
        gel: '0.8',
        sizeUnits: 'kb',
        ruler: true,
      },
    },
    {
      slug: 'plasmid-restriction-digest-gel-worksheet-draw-the-bands',
      title: 'Plasmid restriction digest gel worksheet: draw the double digest',
      alt: 'A 1% agarose gel with four lanes labeled Ladder, EcoRI, HindIII and Both; blank lines beside the ladder’s ten bands, empty circles at both ends for the electrodes, and the Both lane left empty',
      caption:
        'A 1% agarose gel of a 5,000 bp plasmid cut by EcoRI, which leaves one band, by HindIII, which leaves two, and by both enzymes together. The Both lane is left empty for students to draw its bands from the two single digests. The 1 kb ladder’s ten bands have blank lines beside them for students to label, and the electrodes are empty circles for them to mark − and +.',
      settings: {
        lanes: [
          { type: 'ladder', id: 1, label: 'Ladder', ladder: '1kb' },
          { type: 'sample', id: 2, label: 'EcoRI', bands: '5000' },
          { type: 'sample', id: 3, label: 'HindIII', bands: '3200, 1800' },
          { type: 'sample', id: 4, label: 'Both', bands: '' },
        ],
        sizeLabels: 'blank',
        electrodes: 'blank',
      },
    },
  ]),

  ...examplesOf('micropipette-reading', [
    {
      slug: 'p20-micropipette-reading-15-7-ul',
      title: 'P20 micropipette set to 15.7 µL',
      alt: 'A 20 µL micropipette with a yellow tip, its volume display reading 1, 5, 7 from top to bottom, the 7 in red below a line',
      caption:
        'A 20 µL micropipette (a P20) with a yellow tip and its size printed above the volume display. The display reads 1, 5 and 7 from top to bottom, with the 7 in red below a line across the display. On a P20 the digits stand for tens, ones and tenths of a µL, so the red digit is the tenths.',
      settings: { volume: 15.7 },
    },
    {
      slug: 'p200-micropipette-reading-154-ul',
      title: 'P200 micropipette set to 154 µL',
      alt: 'A 200 µL micropipette with a yellow tip, its volume display reading 1, 5, 4 from top to bottom, all in black',
      caption:
        'A 200 µL micropipette (a P200) with a yellow tip and a yellow plunger cap. Its display reads 1, 5 and 4 from top to bottom, all in black: a P200’s digits stand for hundreds, tens and ones of a µL, so it has no red digits and no decimal line. It is set in whole microliters, from 20 to 200 µL.',
      settings: { model: 'P200', volume: 154 },
    },
    {
      slug: 'p1000-micropipette-reading-820-ul',
      title: 'P1000 micropipette set to 820 µL',
      alt: 'A 1000 µL micropipette with a wide shaft and a blue tip, its volume display reading 0, 8, 2, 0 from the top',
      caption:
        'A 1000 µL micropipette (a P1000), the largest size, with a wide shaft, a blue tip and a blue plunger cap. Its display is read from the top, where the first digit counts thousands of µL: the 0 there shows it is set below 1000 µL, and the 8, 2 and 0 under it are the hundreds, tens and ones.',
      settings: { model: 'P1000', volume: 820 },
    },
    {
      slug: 'p2-micropipette-reading-0-85-ul',
      title: 'P2 micropipette set to 0.85 µL',
      alt: 'A 2 µL micropipette with a slim shaft and a clear tip, its volume display reading 0, 8, 5 from top to bottom, the 8 and 5 in red below a line',
      caption:
        'A 2 µL micropipette (a P2), the smallest size, with a slim shaft and a clear tip. Its display reads 0, 8 and 5 from top to bottom, with the 8 and 5 in red below a line: on a P2 the digits stand for ones, tenths and hundredths of a µL. The 0 on top means less than 1 µL, a common trip-up for students.',
      settings: { model: 'P2', volume: 0.85 },
    },
    {
      slug: 'p10-micropipette-black-and-white-4-6-ul',
      title: 'Black and white P10 micropipette set to 4.6 µL',
      alt: 'A black and white outline drawing of a 10 µL micropipette with no tip, its volume display reading 0, 4, 6 from top to bottom with a line above the 6',
      caption:
        'A 10 µL micropipette (a P10) drawn in black outline with no tip, ready to photocopy. Its display reads 0, 4 and 6 from top to bottom. With no red ink, the line across the display above the 6 marks the decimal point, so the bottom digit is the tenths of a µL.',
      settings: { model: 'P10', volume: 4.6, color: false, tip: false },
    },
  ]),
]

/** A generator's examples, in order; the first is its best. */
export const examplesFor = (generator: string) => EXAMPLES.filter((e) => e.generator === generator)

export const findExample = (generator: string, slug: string) => EXAMPLES.find((e) => e.generator === generator && e.slug === slug)

/** Generators with examples. */
export const EXAMPLE_GENERATORS = [...new Set(EXAMPLES.map((e) => e.generator))]

/** The generator's social card image (static/og/<generator>.png), made from its first example. */
export const ogImage = (generator: string) => `/og/${generator}.png`
