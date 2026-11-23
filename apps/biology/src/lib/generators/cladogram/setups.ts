// Ready-made trees to start a cladogram from. The teacher can change
// anything after.

import { clade, ladder, taxon, type Clade } from './tree'

export interface Setup {
  id: string
  name: string
  note: string
  tree: Clade
}

export const SETUPS: Setup[] = [
  {
    id: 'vertebrates',
    name: 'Vertebrates',
    note: 'Seven chordates, each trait shared by every animal past it, the lancelet as the outgroup.',
    tree: ladder(
      ['Lancelet', 'Lamprey', 'Shark', 'Perch', 'Frog', 'Lizard', 'Mouse'],
      ['Notochord', 'Vertebrae', 'Jaws', 'Bony skeleton', 'Four limbs', 'Amniotic egg', 'Hair'],
    ),
  },
  {
    id: 'plants',
    name: 'Land plants',
    note: 'Green algae as the outgroup, then mosses, ferns, conifers and flowering plants.',
    tree: ladder(
      ['Green algae', 'Mosses', 'Ferns', 'Conifers', 'Flowering plants'],
      ['', 'Embryos', 'Vascular tissue', 'Seeds', 'Flowers'],
    ),
  },
  {
    id: 'apes',
    name: 'Apes',
    note: 'Humans’ closest living relatives, with no traits, for reading relatedness.',
    tree: ladder(['Gibbon', 'Orangutan', 'Gorilla', 'Chimpanzee', 'Human'], []),
  },
  {
    id: 'letters',
    name: 'Letters and numbers',
    note: 'Taxa A to F and numbered traits, for questions on which taxa share a trait.',
    tree: clade(
      '',
      taxon('A'),
      clade('1', clade('2', taxon('B'), taxon('C')), clade('3', taxon('D'), clade('4', taxon('E'), taxon('F')))),
    ),
  },
]
