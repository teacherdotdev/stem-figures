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

  ...examplesOf('food-web', [
    {
      slug: 'grassland-food-web-trophic-levels',
      title: 'Grassland food web with trophic levels',
      alt: 'Food web of organism pictures in boxes, named underneath, in rows labeled Producers (grass), Primary consumers (grasshopper, rabbit, mouse), Secondary consumers (frog, songbird, fox), Tertiary consumers (snake) and Quaternary consumers (hawk), with arrows from each food up to what eats it, and a mushroom at the side labeled Decomposers with dashed arrows from every row',
      caption:
        'A grassland food web, its arrows pointing the way energy flows, from what is eaten to what eats it. Grass is the producer along the bottom. Grasshoppers, rabbits and mice eat the grass; frogs and songbirds eat grasshoppers, and foxes eat rabbits and mice; snakes eat frogs, mice and songbirds; and hawks, at the top, eat snakes, rabbits, mice and songbirds. Each row is labeled with its trophic level, and a mushroom at the side breaks down dead matter from every level.',
      settings: { levelLabels: 'text' },
    },
    {
      slug: 'pond-food-chain-worksheet-blank-names',
      title: 'Pond food chain worksheet: name the organisms and trophic levels',
      alt: 'Food chain of five organism pictures in boxes from left to right, phytoplankton, an unnamed copepod, small fish, an unnamed large fish and a heron, joined by arrows, with a blank line above each for its trophic level and blank lines under the two unnamed organisms',
      caption:
        'A pond food chain from left to right: phytoplankton are eaten by zooplankton, which are eaten by small fish, which are eaten by a larger fish, which is eaten by a heron. The zooplankton’s and the large fish’s names are left as blank lines, and a blank line above each organism is for its trophic level, from producer to quaternary consumer.',
      settings: {
        figure: 'chain',
        web: 'algae;phytoplankton;zooplankton!n=phytoplankton;snail=algae;beetle:Water beetle=zooplankton;duck=algae,snail;small-fish=zooplankton,snail;frog=beetle,snail;turtle=algae,small-fish;large-fish!n=small-fish,frog;heron=small-fish,large-fish,frog;bacteria',
        chain: 'phytoplankton,zooplankton,small-fish,large-fish,heron',
        levelLabels: 'blank',
      },
    },
    {
      slug: 'energy-pyramid-10-percent-rule-worksheet',
      title: 'Energy pyramid worksheet: the 10% rule',
      alt: 'Energy pyramid of four stacked trapezoids, Producers at the base with 10,000 kcal, then Primary, Secondary and Tertiary consumers with blank lines before kcal, a picture beside each level (grass, grasshopper, frog, snake) and an arrow out of each level’s right side labeled 90% lost as heat',
      caption:
        'An energy pyramid for a grassland food chain, with 10,000 kcal in the producers at its base. Each level passes 10% of its energy to the level above and loses 90%, mostly as heat, shown by the arrows out of its side. The values above the base are blank lines for students to work out: 1,000 kcal for the primary consumers, 100 for the secondary consumers and 10 for the tertiary consumers.',
      settings: { figure: 'pyramid', chain: 'grass,grasshopper,frog,snake', values: 'base', pictures: true, heat: 'text' },
    },
    {
      slug: 'ocean-marine-food-web',
      title: 'Ocean food web: phytoplankton to orca',
      alt: 'Marine food web of organism pictures in color: phytoplankton and kelp at the bottom; zooplankton, krill and a crab above them; small fish and a baleen whale; a large fish; a seal; and a shark and an orca at the top, with arrows from each food to what eats it and bacteria at the side as decomposers',
      caption:
        'An ocean food web in color. Phytoplankton and kelp are the producers. Zooplankton and krill eat phytoplankton, and crabs eat kelp; small fish eat zooplankton and krill, and baleen whales filter krill and zooplankton; large fish eat small fish and crabs; seals eat fish; and sharks and orcas, at the top, eat seals and large fish. Bacteria at the side break down dead matter from every level.',
      settings: {
        web: 'phytoplankton;kelp;zooplankton=phytoplankton;krill=phytoplankton;crab=kelp;small-fish=zooplankton,krill;whale=krill,zooplankton;large-fish=small-fish,crab;seal=small-fish,large-fish;shark=large-fish,seal;orca=seal,large-fish;bacteria',
        chain: 'phytoplankton,krill,small-fish,seal,orca',
      },
    },
    {
      slug: 'desert-food-web-herbivores-carnivores-omnivores',
      title: 'Desert food web: herbivores, carnivores and omnivores',
      alt: 'Desert food web of organism pictures in rows labeled Producers (cactus, grass), Herbivores (grasshopper, mouse, rabbit), Omnivores and carnivores (scorpion, lizard, coyote), Carnivores (snake) and Top carnivores (hawk), with arrows from each food to what eats it and bacteria at the side labeled Decomposers',
      caption:
        'A desert food web labeled by what each organism eats. Cactus and grass are the producers; grasshoppers, mice and rabbits are herbivores; lizards and scorpions eat grasshoppers; coyotes eat rabbits, mice and cactus fruit, which makes them omnivores; snakes eat mice and lizards; and hawks eat snakes, rabbits and lizards. Bacteria at the side are the decomposers.',
      settings: {
        web: 'cactus;grass;grasshopper=grass;mouse=cactus,grass;rabbit=cactus,grass;lizard=grasshopper;scorpion=grasshopper;snake=mouse,lizard;hawk=snake,rabbit,lizard;coyote=rabbit,mouse,cactus;bacteria',
        chain: 'grass,grasshopper,lizard,snake,hawk',
        levelLabels: 'text',
        wording: 'diet',
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

  ...examplesOf('dna-protein-synthesis', [
    {
      slug: 'transcription-translation-template-strand-tac-mrna-trna-amino-acids',
      title: 'Transcription and translation from a template strand starting TAC',
      alt: 'Five rows of base boxes lined up base under base, each with its 5′ and 3′ ends: the DNA coding strand 5′ ATG CCT AAG TTC GGC 3′, the DNA template strand 3′ TAC GGA TTC AAG CCG 5′, the mRNA 5′ AUG CCU AAG UUC GGC 3′, the tRNA anticodons UAC GGA UUC AAG CCG, and a chain of amino acid beads Met, Pro, Lys, Phe and Gly, one under each codon',
      caption:
        'A gene transcribed and translated, every row lined up base under base. The DNA template strand, written 3′ to 5′, starts TAC; the coding strand above it pairs A with T and G with C, and the mRNA below matches the coding strand with U in place of T. Each tRNA anticodon is complementary to its mRNA codon, and the amino acids methionine, proline, lysine, phenylalanine and glycine are joined in a chain under their codons.',
      settings: {},
    },
    {
      slug: 'coding-strand-start-codon-stop-codon-leader-bases',
      title: 'Coding strand with bases before the start codon and a stop codon',
      alt: 'Rows of base boxes for a 24-base DNA coding strand 5′ GCCA ATG GTT CAC TGG AAA TAA GC 3′, its template strand, the mRNA, the tRNA anticodons and the amino acids, with brackets under each codon of the mRNA from AUG to the stop codon UAA: Met, Val, His, Trp and Lys as a chain of beads, then Stop, and no amino acids under the four bases before AUG or the two after UAA',
      caption:
        'A DNA coding strand with four bases before the start codon. Translation starts at the first AUG in the mRNA, so the bases before it get no codons or amino acids, and a bracket marks each codon read after it. It ends at the stop codon UAA, which codes for no amino acid and has no tRNA, so the chain is Met, Val, His, Trp and Lys, and the last two bases are not read.',
      settings: { seq: 'GCCAATGGTTCACTGGAAATAAGC', typed: 'coding', brackets: true },
    },
    {
      slug: 'dna-complementary-strand-worksheet-draw-the-other-half',
      title: 'DNA complementary strand worksheet: draw the other half',
      alt: 'A DNA coding strand 5′ ATG CGT ACC TTA GGC ATA 3′ in boxes, with a row of 18 empty boxes under it labeled DNA template strand, running 3′ to 5′, for students to write the complementary bases in',
      caption:
        'Half a DNA molecule for students to complete: the coding strand is written in, 5′ to 3′, and the template strand under it is left as empty boxes. Students pair each base, A with T and G with C, and see from the 5′ and 3′ labels that the two strands run in opposite directions. The answer key gives the template strand, 3′-TAC GCA TGG AAT CCG TAT-5′.',
      settings: { seq: 'ATGCGTACCTTAGGCATA', typed: 'coding', template: 'blank', mrna: 'off', trna: 'off', amino: 'off' },
    },
    {
      slug: 'transcription-multiple-choice-mrna-wrong-base-pairing',
      title: 'Transcription multiple choice: spot the wrong base pairing in the mRNA',
      alt: 'Answer choice B: the DNA coding strand 5′ ATG CCT AAG TTC GGC 3′, the template strand 3′ TAC GGA TTC AAG CCG 5′ and an mRNA row 5′ AUG CCU CAG UUC GGC 3′, where the seventh base, C, does not pair with the T above it',
      caption:
        'One answer choice for a transcription question: two DNA strands and the mRNA made from the template strand, with one base deliberately wrong. The seventh mRNA base is C, where the template strand’s T calls for A. Make the other choices with no mistakes or with a different set shuffled, and print each with its letter as the title.',
      settings: { trna: 'off', amino: 'off', titleMode: 'text', title: 'B.', mistakes: 1, mistakeSeed: 7 },
    },
    {
      slug: 'codon-chart-genetic-code-table-start-stop-codons',
      title: 'Codon chart: the standard genetic code table',
      alt: 'A square codon chart with the first base U, C, A, G down the left, the second base across the top and the third base down the right, each of the 16 cells listing four codons with their amino acids, AUG Met (Start) and the stop codons UAA, UAG and UGA in bold on gray',
      caption:
        'The standard genetic code as a square table. Find a codon’s first base down the left, its second across the top and its third down the right of the cell. Each of the 64 codons is listed with the amino acid it codes for in three-letter code; AUG, methionine, is the start codon, and UAA, UAG and UGA are the stop codons.',
      settings: { show: 'chart' },
    },
  ]),

  ...examplesOf('photosynthesis-rate', [
    {
      slug: 'limiting-factors-photosynthesis-graph-light-intensity-co2-temperature',
      title: 'Limiting factors in photosynthesis: rate against light intensity at different CO₂ and temperatures',
      alt: 'Graph of rate of photosynthesis against light intensity with no numbers on the axes: three curves rising together in a straight line, labeled Light is limiting, then levelling off at different heights, 0.1 % CO₂ at 25 °C (solid blue) highest, 0.1 % CO₂ at 15 °C (dashed red) lower and 0.04 % CO₂ at 15 °C (dotted green) lowest, with CO₂ or temperature is limiting written over the top plateau and a key under the graph',
      caption:
        'The classic limiting-factor graph: the rate of photosynthesis against light intensity at 0.1 % CO₂ and 25 °C (solid blue), 0.1 % CO₂ and 15 °C (dashed red), and 0.04 % CO₂ and 15 °C (dotted green). At low light the three curves share one straight line, because light is limiting. Each then levels off where CO₂ or temperature limits the rate instead, highest with more CO₂ and the warmer temperature.',
      settings: { markLimit: true },
    },
    {
      slug: 'pondweed-lamp-distance-bubbles-per-minute-graph',
      title: 'Pondweed and lamp distance: bubbles of oxygen per minute against distance from the lamp',
      alt: 'Graph of bubbles of oxygen per minute, 0 to 35, against distance from the lamp, 0 to 50 cm, on a grid: measured points scattered along a curve that stays level at about 27 bubbles a minute up to about 19 cm from the lamp, then falls, steeply at first and then more slowly, to about 4 bubbles a minute at 50 cm',
      caption:
        'The pondweed practical: bubbles of oxygen counted each minute with the lamp 5 to 50 cm away, at 20 °C with plenty of CO₂. Close to the lamp the rate stays level, because light isn’t limiting. Farther away the light intensity falls as 1/d², so the rate falls with it, steeply at first and then more slowly. The points are scattered a little around the curve, like real counts.',
      settings: {
        graph: 'light', lightAxis: 'distance', rateUnit: 'bubbles', temp1: 20, show2: false, show3: false,
        axes: 'numbered', gridlines: true, points: 'on', seed: 3,
        xTitle: 'Distance from lamp (cm)', yTitle: 'Bubbles of oxygen per minute',
      },
    },
    {
      slug: 'rate-of-photosynthesis-against-co2-concentration-two-light-intensities',
      title: 'Rate of photosynthesis against CO₂ concentration at high and low light intensity',
      alt: 'Graph of rate of photosynthesis against CO₂ concentration (%) with no numbers on the axes: two curves rising together, the dashed red low light intensity curve levelling off early and low and the solid blue high light intensity curve rising further and levelling off about twice as high, with a key under the graph',
      caption:
        'The rate of photosynthesis against CO₂ concentration at a high light intensity (solid blue) and a low one (dashed red), both at 25 °C. At first more CO₂ speeds photosynthesis up whatever the light, so the curves rise together. Then each levels off where light becomes the limiting factor, the dimly lit plant at a much lower rate and lower CO₂ concentration.',
      settings: {
        graph: 'co2', name1: 'High light intensity', name2: 'Low light intensity', light2: 30, temp2: 25, show3: false,
        xTitle: 'CO₂ concentration (%)',
      },
    },
    {
      slug: 'rate-of-photosynthesis-against-temperature-high-low-light',
      title: 'Rate of photosynthesis against temperature at high and low light intensity',
      alt: 'Graph of rate of photosynthesis against temperature (°C) with no numbers on the axes: a solid blue high light intensity curve rising to a peak marked Optimum with a dot and a dashed line down to the axis, then falling steeply to zero, and a dashed red low light intensity curve with a low flat top that follows it down at both ends',
      caption:
        'The rate of photosynthesis against temperature in high light (solid blue) and low light (dashed red), at 0.1 % CO₂. In bright light the rate follows the enzymes: it rises to an optimum near 30 °C, marked, then falls steeply as they denature. In dim light the curve has a low, flat top, because light limits the rate whatever the temperature; only where it is cold or the enzymes denature does it fall away.',
      settings: {
        graph: 'temperature', name1: 'High light intensity', light1: 80, name2: 'Low light intensity', light2: 15, show3: false,
        xTitle: 'Temperature (°C)',
      },
    },
    {
      slug: 'co2-concentration-closed-chamber-dark-dim-bright-light',
      title: 'CO₂ concentration in a closed chamber in the dark, dim and bright light',
      alt: 'Graph of CO₂ concentration (%) against time (minutes) with no numbers on the axes: from one starting point, a solid blue line labeled Dark rises steadily, a dashed red line labeled Dim light (compensation point) stays level, and a dotted green line labeled Bright light falls and levels off near the bottom, with a key under the graph',
      caption:
        'The CO₂ around a plant in a closed chamber over an hour, starting from the 0.04 % in air. In the dark (solid blue) the plant only respires, so the CO₂ rises in a straight line. In dim light at the compensation point (dashed red), photosynthesis uses just as much CO₂ as respiration gives off, so it stays level. In bright light (dotted green) it falls, then levels off at the CO₂ compensation point.',
      settings: {
        graph: 'chamber', name1: 'Dark', light1: 0, name2: 'Dim light (compensation point)', light2: 6.01, temp2: 25,
        name3: 'Bright light', light3: 60, temp3: 25, xTitle: 'Time (minutes)', yTitle: 'CO₂ concentration (%)',
      },
    },
    {
      slug: 'co2-and-o2-concentration-over-time-light-and-dark',
      title: 'CO₂ and O₂ concentration around a plant in the light and then the dark',
      alt: 'Graph against time in minutes, 0 to 60, on a grid, with CO₂ concentration (%) on the left axis and O₂ concentration (%) on the right: in the first 30 minutes, unshaded and labeled Light, the solid blue CO₂ line falls from 0.04 % toward 0.01 % while the dashed red O₂ line rises from 21 % to about 21.03 %; in the shaded half labeled Dark, CO₂ rises and O₂ falls in straight lines',
      caption:
        'The CO₂ (solid blue, left axis) and O₂ (dashed red, right axis) in a closed chamber around a plant in bright light for 30 minutes, then in the dark, shaded. In the light, photosynthesis takes in CO₂ and gives off O₂ faster than respiration does the opposite, so the CO₂ falls and the O₂ rises by the same amount, both levelling off. In the dark the plant only respires: the CO₂ rises and the O₂ falls in straight lines.',
      settings: {
        graph: 'gases', show2: false, show3: false, lightsOff: true, axes: 'numbered', gridlines: true,
        xTitle: 'Time (minutes)', yTitle: 'CO₂ concentration (%)',
      },
    },
    {
      slug: 'limiting-factors-worksheet-lettered-points-black-and-white',
      title: 'Limiting factors worksheet: what limits the rate of photosynthesis at A, B, C and D?',
      alt: 'Black and white graph of rate of photosynthesis against light intensity with no numbers on the axes: a solid, a dashed and a dotted curve rising together and levelling off at three heights, with point A on the shared straight rise and points B, C and D on the three plateaus at the same light intensity, and a key naming 0.1 % CO₂ at 25 °C, 0.1 % CO₂ at 15 °C and 0.04 % CO₂ at 15 °C',
      caption:
        'A black-and-white worksheet graph of the rate of photosynthesis against light intensity at three combinations of CO₂ and temperature. Point A is on the straight rise all three curves share; B, C and D are on their plateaus at the same light intensity, for questions like “What limits the rate at A?” and “Why is the rate at C lower than at B?”',
      settings: { letters: true, color: false },
    },
  ]),

  ...examplesOf('osmosis', [
    {
      slug: 'red-blood-cells-hypotonic-isotonic-hypertonic-solutions',
      title: 'Red blood cells in hypotonic, isotonic and hypertonic solutions',
      alt: 'Three red blood cells, each in a box of salt solution with gray NaCl particles and blue water particles: A in a hypotonic 0.45% solution, swollen round, with water arrows pointing in; B in an isotonic 0.9% solution, a normal disc with arrows both ways and the words No net movement; C in a hypertonic 1.8% solution, shrunken with spiky edges, with water arrows pointing out',
      caption:
        'The same red blood cell, 0.9% NaCl inside, in three salt solutions. In the hypotonic solution (0.45% NaCl) water moves in and the cell swells; in the isotonic solution (0.9%) water crosses equally both ways, so there is no net movement and it stays a normal biconcave disc; in the hypertonic solution (1.8%) water moves out and the cell shrinks and crenates. Solute particles are drawn as crowded as their concentration, with water particles in the room they leave.',
      settings: {},
    },
    {
      slug: 'red-blood-cell-in-pure-water-hypotonic-bursts',
      title: 'Red blood cell in pure water: hypotonic, swells and bursts',
      alt: 'A red blood cell with a few gray NaCl particles inside, in a box of pure water full of blue water particles, with water arrows pointing into the cell, labeled Hypotonic solution, then an arrow to the same cell swollen and burst open, its membrane torn, labeled Bursts (lysed)',
      caption:
        'A red blood cell, 0.9% NaCl inside, put in pure water. The water outside is hypotonic to the cell, so water moves into it by osmosis, shown by the arrows. On the right the cell has swollen until its membrane tears and it bursts, called hemolysis or lysis.',
      settings: { view: 'both', out1: 0, burst: true },
    },
    {
      slug: 'red-blood-cell-in-isotonic-saline-0-9-percent',
      title: 'Red blood cell in 0.9% saline: isotonic, no net movement',
      alt: 'A red blood cell with gray NaCl particles inside in a box of 0.9% NaCl solution with as many particles per space, water arrows going both ways across the membrane labeled No net movement, labeled Isotonic solution, then an arrow to the same normal disc-shaped cell',
      caption:
        'A red blood cell, 0.9% NaCl inside, in 0.9% saline, the concentration of normal saline drips. Inside and outside are isotonic, so water crosses the membrane equally both ways: no net movement. The cell keeps its normal biconcave shape, drawn pale in the middle.',
      settings: { view: 'both', out1: 0.9 },
    },
    {
      slug: 'red-blood-cell-in-salt-solution-hypertonic-crenated',
      title: 'Red blood cell in 5% salt solution: hypertonic, shrinks and crenates',
      alt: 'A red blood cell with a few gray NaCl particles inside, in a box crowded with NaCl particles, with water arrows pointing out of the cell, labeled Hypertonic solution, then an arrow to the same cell shrunken with spiky edges, labeled Shrinks (crenated)',
      caption:
        'A red blood cell, 0.9% NaCl inside, in a 5% NaCl solution. The solution is hypertonic to the cell, so water moves out of it by osmosis, shown by the arrows. On the right the cell has shrunk and its edge has crinkled into spikes: it is crenated.',
      settings: { view: 'both' },
    },
    {
      slug: 'plant-cell-plasmolysis-hypertonic-sugar-solution',
      title: 'Plant cell plasmolysis in a strong sugar solution',
      alt: 'A plant cell with a nucleus and chloroplasts, its cell wall, vacuole and cell membrane labeled down the left, in a box crowded with gray sucrose particles, with water arrows pointing out across the wall, labeled Hypertonic solution, then an arrow to the same cell plasmolyzed, its membrane and cytoplasm pulled away from the wall into a rounded shape around a small vacuole, with the sugar solution filling the gap',
      caption:
        'A plant cell, 5% sucrose in its vacuole, in a 30% sucrose solution. The solution is hypertonic, so water leaves the vacuole and the cytoplasm and crosses the membrane and the cell wall. On the right the cell is plasmolyzed: the vacuole has shrunk, the membrane and cytoplasm have pulled away from the wall, and the sugar solution, which passes through the wall, fills the gap between them.',
      settings: { scene: 'plant', view: 'both', name1: 'sucrose', in1: 5, out1: 30, partsMode: 'text' },
    },
    {
      slug: 'u-tube-osmosis-sucrose-and-water-before-and-after',
      title: 'U-tube osmosis: sucrose solution and water, before and after',
      alt: 'A U-tube with a selectively permeable membrane at the bottom: side A holds 10% sucrose with gray sucrose particles and fewer blue water particles, side B holds pure water, the levels equal, with a water arrow from side B across the membrane to side A; then an arrow to the same U-tube with the level higher on side A and lower on side B',
      caption:
        'A U-tube split at the bottom by a selectively permeable membrane, with 10% sucrose on side A and pure water on side B, the levels equal at the start. Sucrose can’t cross the membrane, so side A is hypertonic and water moves by osmosis from side B to side A. On the right the level has risen on side A and fallen on side B.',
      settings: { scene: 'utube', view: 'both', name1: 'sucrose', in1: 10, out1: 0 },
    },
    {
      slug: 'ap-biology-dialysis-tubing-bag-glucose-starch',
      title: 'AP Biology dialysis tubing bag with glucose and starch',
      alt: 'A dialysis tubing bag tied to a rod, in a beaker of pure water, holding white glucose particles and a dark starch particle among blue water particles; water arrows point into the bag and a dashed arrow labeled glucose points out of it; then an arrow to the same bag swollen larger, with glucose particles now on both sides and the starch still inside',
      caption:
        'A dialysis tubing bag holding 15% glucose and 3% starch, in a beaker of pure water. Glucose is small enough to cross the tubing, so it moves out of the bag until its concentration is the same on both sides; starch can’t cross, so the beaker is hypotonic to the bag and water moves in. On the right the bag has swollen, with glucose on both sides and the starch still inside.',
      settings: { scene: 'bag', view: 'both', on1: false, on2: true, in2: 15, on3: true, in3: 3 },
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
