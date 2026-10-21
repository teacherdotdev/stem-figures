import { EXAMPLES, examplesFor } from '$lib/examples/examples'
import { IMAGE_LICENSE } from '$lib/examples/license'
import { GENERATORS } from '$lib/generators/index'
import { SITE_URL } from '$lib/site/config'

export const prerender = true

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A page, with the example images it shows (Google's image sitemap extension). */
function url(path: string, images: string[] = []) {
  const pics = images.map((src) => `\n    <image:image><image:loc>${escape(SITE_URL + src)}</image:loc></image:image>`).join('')
  return `  <url>\n    <loc>${escape(SITE_URL + path)}</loc>${pics}\n  </url>`
}

export function GET() {
  // Each generator page shows its examples' thumbnails, and each example page its own picture.
  const urls = [
    url('/'),
    ...GENERATORS.map((g) => url(g.path, examplesFor(g.id).map((e) => e.image))),
    ...EXAMPLES.map((e) => url(e.path, [e.image])),
    url('/about'),
    url('/privacy'),
    url(IMAGE_LICENSE.page),
  ]
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    `${urls.join('\n')}\n</urlset>\n`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
}
