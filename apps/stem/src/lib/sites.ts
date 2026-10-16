// Every figure site in the STEM Figures family. The directory and the
// sitemap read this list, so adding a site means adding its icon under
// static/sites/ and one entry here.

export interface FigureSite {
  id: string
  /** e.g. "Math Figures" */
  name: string
  url: string
  /** one line for the directory card */
  blurb: string
  /** the site's own favicon, copied to static/sites/ */
  icon: string
}

export const SITES: FigureSite[] = [
  {
    id: 'math',
    name: 'Math Figures',
    url: 'https://mathfigures.com',
    blurb: 'Coordinate grids, number lines and triangles drawn to scale.',
    icon: '/sites/math.svg',
  },
  {
    id: 'physics',
    name: 'Physics Figures',
    url: 'https://physicsfigures.com',
    blurb: 'Inclined planes, pulleys, coils and magnets, with their forces and fields.',
    icon: '/sites/physics.svg',
  },
  {
    id: 'chemistry',
    name: 'Chemistry Figures',
    url: 'https://chemistryfigures.com',
    blurb: 'Graduated cylinders, burets and balances showing readings for students.',
    icon: '/sites/chemistry.svg',
  },
  {
    id: 'biology',
    name: 'Biology Figures',
    url: 'https://biologyfigures.com',
    blurb: 'Just getting started. Tell us the biology figure you need and we’ll build it.',
    icon: '/sites/biology.svg',
  },
  {
    id: 'engineering',
    name: 'Engineering Figures',
    url: 'https://engineeringfigures.com',
    blurb: 'Just getting started. Tell us the engineering figure you need and we’ll build it.',
    icon: '/sites/engineering.svg',
  },
  {
    id: 'economics',
    name: 'Econ Figures',
    url: 'https://econfigures.com',
    blurb: 'Just getting started. Tell us the economics figure you need and we’ll build it.',
    icon: '/sites/economics.svg',
  },
]
