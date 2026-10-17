// Biology Figures' generators. See ./index.ts.

import type { CatalogEntry } from './index'

export const BIOLOGY: CatalogEntry[] = [
  {
    id: 'cell-diagram',
    site: 'biology',
    off: true,
    name: 'Cell Diagram',
    path: '/cell-diagram',
    blurb: 'An animal, plant or bacterial cell with the organelles you pick, labeled or left for students.',
    description:
      'Make printable cell diagrams for biology tests. Pick an animal, plant or bacterial cell and its organelles, then label them with names, numbers and a word bank, or blank lines, in color or black and white.',
    keywords: ['cell', 'organelles', 'animal cell', 'plant cell', 'bacteria', 'prokaryotic', 'eukaryotic', 'cell structure', 'nucleus', 'mitochondria', 'chloroplast', 'labeling', 'worksheet', 'coloring page', 'word bank', 'printable'],
  },
  {
    id: 'population-growth',
    site: 'biology',
    name: 'Population Growth',
    path: '/population-growth',
    blurb: 'J- and S-shaped growth curves, as numbers or per capita rates.',
    description:
      'Make printable population growth graphs for biology tests. Graph exponential or logistic growth toward a carrying capacity, as population size, growth rate or per capita growth rate, with census data or blank axes for students.',
    keywords: ['population', 'growth', 'exponential', 'logistic', 'j-curve', 's-curve', 'carrying capacity', 'per capita', 'growth rate', 'inflection point', 'lag phase', 'stationary phase', 'census', 'overshoot', 'ecology', 'graph', 'printable'],
  },
  {
    id: 'punnett-square',
    site: 'biology',
    name: 'Punnett Square',
    path: '/punnett-square',
    blurb: 'Any cross from Tt × Tt to X-linked, filled in or left for students.',
    description:
      'Make printable Punnett squares for biology tests. Type the parents’ genotypes for a monohybrid, dihybrid or X-linked cross, with complete, incomplete or codominance, and show the offspring, gametes and ratios filled in or blank.',
    keywords: [
      'punnett square',
      'genetics',
      'cross',
      'monohybrid',
      'dihybrid',
      'x-linked',
      'sex-linked',
      'incomplete dominance',
      'codominance',
      'blood type',
      'genotype',
      'phenotype',
      'ratio',
      'allele',
      'gamete',
      'dominant',
      'recessive',
      'mendel',
      'printable',
    ],
  },
  {
    id: 'pedigree',
    site: 'biology',
    name: 'Pedigree',
    path: '/pedigree',
    blurb: 'A random family for any inheritance mode, or one you change by hand.',
    description:
      'Make printable pedigree charts for biology tests. Get a random family students can diagnose for dominant, recessive, X-linked or Y-linked inheritance, or a classic like hemophilia, then click anyone to change them.',
    keywords: ['pedigree', 'pedigree chart', 'family tree', 'genetics', 'inheritance', 'carrier', 'affected', 'autosomal', 'dominant', 'recessive', 'x-linked', 'sex-linked', 'y-linked', 'genotype', 'hemophilia', 'huntington', 'cystic fibrosis', 'albinism', 'color blindness', 'printable'],
  },
  {
    id: 'cell-division',
    site: 'biology',
    off: true,
    name: 'Mitosis & Meiosis',
    path: '/cell-division',
    blurb: 'Cells at each phase of mitosis or meiosis, with the right chromosomes.',
    description:
      'Make printable mitosis and meiosis diagrams for biology tests. Pick 2n = 2 to 8 and an animal or plant cell, then show one phase or a strip of phases to label or put in order, with crossing over and chromosome counts.',
    keywords: ['mitosis', 'meiosis', 'cell division', 'cell cycle', 'phases', 'stages', 'chromosomes', 'interphase', 'prophase', 'prometaphase', 'metaphase', 'anaphase', 'telophase', 'cytokinesis', 'crossing over', 'tetrad', 'homologous chromosomes', 'sister chromatids', 'centromere', 'spindle', 'diploid', 'haploid', 'onion root tip', 'printable'],
  },
  {
    id: 'predator-prey',
    site: 'biology',
    name: 'Predator–Prey Cycles',
    path: '/predator-prey',
    blurb: 'Predator and prey populations rising and falling out of step.',
    description:
      'Make printable predator–prey graphs for biology tests. Pick a pair like hare and lynx, graph their populations cycling over time or as a phase plane, and mark the peaks, lag and period.',
    keywords: ['predator', 'prey', 'predator-prey', 'lotka-volterra', 'population', 'cycle', 'hare', 'lynx', 'wolf', 'phase plane', 'census', 'lag', 'ecology', 'graph', 'printable'],
  },
  {
    id: 'enzyme-activity',
    site: 'biology',
    name: 'Enzyme Activity',
    path: '/enzyme-activity',
    blurb: 'Rate of reaction against temperature, pH or substrate concentration.',
    description:
      'Make printable enzyme activity graphs for biology tests. Graph the rate of reaction against temperature, pH or substrate concentration for enzymes like pepsin and amylase, or with an inhibitor, and mark the optimum, denaturation, Vmax and Km.',
    keywords: [
      'enzyme', 'enzymes', 'enzyme activity', 'rate of reaction', 'reaction rate', 'temperature', 'ph', 'optimum', 'optimal',
      'denature', 'denaturation', 'substrate concentration', 'michaelis-menten', 'vmax', 'km', 'inhibitor', 'inhibition',
      'competitive', 'non-competitive', 'pepsin', 'amylase', 'trypsin', 'catalase', 'taq polymerase', 'graph', 'printable',
    ],
  },
  {
    id: 'dna-protein-synthesis',
    site: 'biology',
    name: 'DNA and Protein Synthesis',
    path: '/dna-protein-synthesis',
    blurb: 'A DNA strand transcribed and translated, base under base, with any row left for students.',
    description:
      'Make printable DNA and protein synthesis figures for biology tests. Type a DNA or mRNA sequence and get both DNA strands, the mRNA, the tRNA anticodons and the amino acids lined up base under base, with any row left blank for students, wrong pairings for multiple choice and a codon chart.',
    keywords: [
      'dna', 'rna', 'mrna', 'trna', 'protein synthesis', 'transcription', 'translation', 'central dogma', 'gene expression',
      'base pairing', 'complementary strand', 'template strand', 'coding strand', 'antiparallel', "5' 3'", 'codon', 'anticodon',
      'amino acids', 'genetic code', 'codon chart', 'codon table', 'start codon', 'stop codon', 'hydrogen bonds', 'worksheet', 'printable',
    ],
  },
  {
    id: 'gel-electrophoresis',
    site: 'biology',
    name: 'Gel Electrophoresis',
    path: '/gel-electrophoresis',
    blurb: 'An agarose gel with a DNA ladder and the band sizes you type.',
    description:
      'Make printable gel electrophoresis results for biology tests. Pick a DNA ladder and gel, type each lane’s band sizes, and every band runs as far as its size takes it.',
    keywords: ['gel electrophoresis', 'agarose', 'gel', 'dna', 'bands', 'ladder', 'marker', 'base pairs', 'dna fingerprinting', 'crime scene', 'forensics', 'paternity', 'pcr', 'restriction digest', 'plasmid', 'standard curve', 'printable'],
  },
  {
    id: 'micropipette-reading',
    site: 'biology',
    name: 'Micropipette Reading',
    path: '/micropipette-reading',
    blurb: 'A micropipette’s volume display, set to the volume you type.',
    description:
      'Make printable micropipette figures for biology tests. Pick a 2 µL to 1000 µL pipette and type a volume, and students read it from the digits in its display.',
    keywords: ['micropipette', 'pipette', 'pipettor', 'pipetman', 'p20', 'p200', 'p1000', 'dial', 'display', 'microliter', 'volume', 'measurement', 'parts', 'lab', 'printable'],
  },
  {
    id: 'microscope-field-of-view',
    site: 'biology',
    off: true,
    name: 'Microscope Field of View',
    path: '/microscope-field-of-view',
    blurb: 'The circle seen down a microscope, drawn to scale, for estimating size.',
    description:
      'Make printable microscope field of view figures for biology tests. Pick a magnification and a specimen, from onion cells to the letter e, and students estimate its size, work out the field at high power, or count the cells.',
    keywords: [
      'microscope', 'field of view', 'fov', 'field diameter', 'magnification', 'total magnification', 'objective', 'eyepiece', 'ocular',
      'low power', 'high power', 'specimen', 'cell size', 'estimate', 'micrometers', 'microns', 'onion cells', 'cheek cells',
      'red blood cells', 'paramecium', 'elodea', 'letter e', 'scale bar', 'lab', 'printable',
    ],
  },
]
