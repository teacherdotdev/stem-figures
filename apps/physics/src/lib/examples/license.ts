// The terms this site's figures are shared under, in one place: the example
// pages and their structured data, the /reuse page and the sitemap read it.
// Like every figure on STEM Figures, they're dedicated to the public domain
// under CC0 ($shared/license.ts).
import { FIGURE_LICENSE } from '$shared/license'

export const IMAGE_LICENSE = {
  ...FIGURE_LICENSE,
  /** the name search engines show as the images' credit */
  credit: 'Physics Figures',
  copyright: 'No rights reserved. Dedicated to the public domain by Physics Figures (physicsfigures.com), a teacher.dev project',
} as const
