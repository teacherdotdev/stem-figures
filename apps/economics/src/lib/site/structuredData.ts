// Structured data (schema.org JSON-LD) for search engines: the site and who
// makes it, on the directory. (Biology Figures' structuredData.ts adds a
// generator page's, for when this site has generators.)

import { SITES } from '$shared/catalog/index'
import { FAMILY, SITE_ID, SITE_NAME, SITE_URL } from './config'

const TEACHER_DEV = { name: 'teacher.dev', url: 'https://teacher.dev' }

const ORGANIZATION_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

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
