// Physics Figures' generators. See ./index.ts.

import type { CatalogEntry } from './index'

export const PHYSICS: CatalogEntry[] = [
  {
    id: 'free-body-diagram',
    site: 'physics',
    name: 'Free Body Diagram Generator',
    path: '/free-body-diagram',
    blurb: 'A dot or block with every force on it, and nothing else.',
    description:
      'Make printable free body diagrams for physics tests. Draw a dot or block with up to eight forces, each labeled or left blank.',
    keywords: [
      'free body diagram', 'fbd', 'force diagram', 'forces', 'force', 'gravity', 'weight', 'normal force', 'friction',
      'tension', 'applied force', 'spring', 'air resistance', 'drag', 'net force', 'equilibrium', 'balanced',
      'unbalanced', 'components', 'newton', "newton's laws", 'dot', 'particle', 'mechanics', 'printable',
    ],
  },
  {
    id: 'vector-diagram',
    site: 'physics',
    alsoOn: ['math'],
    name: 'Vector Diagram Generator',
    path: '/vector-diagram',
    blurb: 'Up to three vectors head to tail on a grid, with their resultant.',
    description:
      'Make printable vector diagrams for physics tests. Add up to three vectors head to tail, with the resultant drawn or left for students.',
    keywords: [
      'vector', 'vectors', 'vector diagram', 'vector addition', 'adding vectors', 'head to tail', 'tip to tail',
      'resultant', 'sum', 'components', 'resolve', 'resolving', 'x component', 'y component', 'magnitude', 'direction',
      'displacement', 'velocity', 'force', 'net force', 'grid', 'graph paper', 'axes', 'scale drawing', 'trigonometry',
      'mechanics', 'printable',
    ],
  },
  {
    id: 'inclined-plane',
    site: 'physics',
    name: 'Inclined Plane Generator',
    path: '/inclined-plane',
    blurb: 'A block, ball or cart on a ramp, with its angle and forces.',
    description:
      'Make printable inclined plane figures for physics tests. Put a block, ball or cart on a ramp at any angle, labeled or left blank.',
    keywords: [
      'incline', 'inclined plane', 'ramp', 'slope', 'wedge', 'block', 'ball', 'cart', 'angle', 'theta', 'friction',
      'rough', 'smooth', 'free body diagram', 'fbd', 'forces', 'normal force', 'gravity', 'newton', "newton's laws", 'sliding',
      'rolling', 'mechanics', 'printable',
    ],
  },
  {
    id: 'pulley',
    site: 'physics',
    name: 'Pulley Generator',
    path: '/pulley',
    blurb: 'Objects on strings over pulleys, from an Atwood machine up.',
    description:
      'Make printable pulley figures for physics tests. Draw an Atwood machine, a block tied over a pulley to a hanging mass, or a block and tackle.',
    keywords: [
      'pulley', 'pulleys', 'atwood', 'atwood machine', 'string', 'rope', 'tension', 'hanging mass', 'block', 'table',
      'ramp', 'block and tackle', 'mechanical advantage', 'strands', 'free body diagram', 'fbd', 'forces', 'newton',
      "newton's laws", 'mechanics', 'printable',
    ],
  },
  {
    id: 'projectile-motion',
    site: 'physics',
    name: 'Projectile Motion Generator',
    path: '/projectile-motion',
    blurb: 'A ball launched from the ground or a cliff, with its path.',
    description:
      'Make printable projectile motion figures for physics tests. Launch a ball from the ground or a cliff, with its path, height and range.',
    keywords: [
      'projectile', 'projectile motion', 'trajectory', 'parabola', 'path', 'launch', 'launch angle', 'thrown', 'kicked',
      'cannon', 'cliff', 'horizontal launch', 'range', 'maximum height', 'time of flight', 'velocity', 'components',
      'gravity', 'free fall', 'kinematics', '2d motion', 'two dimensional motion', 'mechanics', 'printable',
    ],
  },
  {
    id: 'spring-scale',
    site: 'physics',
    alsoOn: ['chemistry'],
    name: 'Spring Scale Generator',
    path: '/spring-scale',
    blurb: 'A spring scale with its pointer at any force, for reading practice.',
    description:
      'Make printable spring scale figures for physics tests. Set the pointer to any force, in newtons, grams or both, for students to read.',
    keywords: [
      'spring scale', 'spring balance', 'newton meter', 'newtonmeter', 'force meter', 'forcemeter', 'force', 'weight',
      'newton', 'newtons', 'grams', 'mass', 'hooke', "hooke's law", 'spring', 'reading', 'measuring', 'measurement',
      'scale', 'zero error', 'zero offset', 'magnifier', 'slotted masses', 'hanging mass', 'mechanics', 'printable',
    ],
  },
  {
    id: 'circuit-diagram',
    site: 'physics',
    name: 'Circuit Diagram Generator',
    path: '/circuit-diagram',
    blurb: 'A battery with resistors or bulbs in series or in parallel.',
    description:
      'Make printable circuit diagrams for physics tests. Draw a cell or battery with up to four resistors or bulbs in series or parallel, with meters, labeled or left blank.',
    keywords: [
      'circuit', 'circuits', 'circuit diagram', 'schematic', 'electric', 'electricity', 'series', 'parallel', 'resistor',
      'resistance', 'ohm', "ohm's law", 'battery', 'cell', 'emf', 'bulb', 'lamp', 'switch', 'ammeter', 'voltmeter',
      'current', 'voltage', 'potential difference', 'equivalent resistance', 'symbols', 'iec', 'gcse', 'printable',
    ],
  },
  {
    id: 'circuit-editor',
    site: 'physics',
    kind: 'editor',
    name: 'Circuit Editor',
    path: '/circuit-editor',
    blurb: 'Draw any circuit yourself, part by part and wire by wire.',
    description:
      'Draw circuit diagrams for physics tests. Drag cells, resistors, bulbs, switches and meters onto a grid, join them with wires, and copy the finished schematic into your worksheet.',
    keywords: [
      'circuit', 'circuits', 'circuit diagram', 'circuit builder', 'circuit maker', 'schematic', 'draw', 'drawing', 'editor',
      'electric', 'electricity', 'series', 'parallel', 'combination', 'kirchhoff', 'resistor', 'battery', 'cell', 'bulb',
      'lamp', 'switch', 'ammeter', 'voltmeter', 'wire', 'symbols', 'iec', 'gcse', 'printable',
    ],
  },
]
