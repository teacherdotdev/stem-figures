// Structured data (schema.org JSON-LD) for search engines: the site and who
// makes it, on the directory, and on each generator page the generator
// itself, where it sits in the site, and its questions and answers.

import { SITES } from '$shared/catalog/index'
import type { CatalogEntry } from '$shared/catalog/index'
import { FAMILY, SITE_ID, SITE_NAME, SITE_URL } from './config'
import type { GeneratorCopy } from './generatorCopy'

const TEACHER_DEV = { name: 'teacher.dev', url: 'https://teacher.dev' }

const ORGANIZATION_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

/** Econ Figures, as publisher: a short reference, for generator pages. */
const publisher = { '@type': 'Organization', '@id': ORGANIZATION_ID, name: SITE_NAME, url: `${SITE_URL}/` }

/** STEM Figures, the family of sites this one belongs to, with its other
 *  sites, made by teacher.dev. */
const family = {
  '@type': 'Organization',
  name: FAMILY.name,
  url: FAMILY.url,
  parentOrganization: { '@type': 'Organization', name: TEACHER_DEV.name, url: TEACHER_DEV.url },
  subOrganization: Object.entries(SITES)
    .filter(([id]) => id !== SITE_ID)
    .map(([, site]) => ({ '@type': 'Organization', name: site.name, url: site.url })),
}

/** The directory's: the site, and the organization behind it. */
export function homeJsonLd(description: string) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description,
      inLanguage: 'en',
      publisher: { '@id': ORGANIZATION_ID },
      isPartOf: { '@type': 'WebSite', name: FAMILY.name, url: FAMILY.url },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/favicon.svg`,
      description,
      parentOrganization: family,
    },
  ]
}

/** A generator page's: the generator as a free web app for teachers, its
 *  breadcrumb from the directory, and its questions and answers. */
export function generatorJsonLd(generator: CatalogEntry, copy: GeneratorCopy, image: string) {
  const url = `${SITE_URL}${generator.path}`
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: generator.name,
      url,
      description: generator.description,
      image: /^https?:\/\//.test(image) ? image : `${SITE_URL}${image}`,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires a modern web browser with JavaScript turned on.',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
      educationalLevel: copy.educationalLevel,
      about: 'Economics',
      featureList: copy.settings,
      inLanguage: 'en',
      publisher,
      isPartOf: { '@type': 'WebSite', '@id': WEBSITE_ID, name: SITE_NAME, url: `${SITE_URL}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: generator.name, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: copy.faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ]
}
