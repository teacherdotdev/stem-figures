#!/usr/bin/env node
// Takes a picture of each directory preview a site draws itself, for the
// other sites to show (see packages/shared/src/catalog/previews.ts). Start the
// site first, then pass its directory's address. Each picture has the CC0
// license written in, like every exported figure (packages/shared/src/license.ts):
//
//   ./scripts/agent-dev.mjs stemfigures/apps/chemistry     (from the workspace root)
//   node scripts/snapshot-previews.mjs http://localhost:10003/
//
// It uses the Chromium Playwright has installed (`npx playwright install chromium`).

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { withLicense } from '../packages/shared/src/license.ts'

const url = process.argv[2]
if (!url) {
  console.error('Usage: node scripts/snapshot-previews.mjs <directory URL>')
  process.exit(1)
}

const out = path.resolve(import.meta.dirname, '../packages/shared/src/catalog/previews')
await mkdir(out, { recursive: true })

const browser = await chromium.launch()
try {
  // Three cards across, as on a laptop, at twice the pixels for sharp screens.
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
  await page.goto(url)
  await page.locator('[data-preview]').first().waitFor()
  await page.evaluate(() => document.fonts.ready)
  // Square corners and no rule under the preview, so the picture is only the preview.
  await page.addStyleTag({ content: '.card { border-radius: 0 !important } [data-preview] { border-bottom-color: #fff !important }' })
  const previews = await page.locator('[data-preview]').all()
  for (const preview of previews) {
    const id = await preview.getAttribute('data-preview')
    // Whole pixels inside the preview's box, so no sliver of the card's border shows.
    const box = await preview.boundingBox()
    const [left, top] = [Math.ceil(box.x), Math.ceil(box.y)]
    const clip = { x: left, y: top, width: Math.floor(box.x + box.width) - left, height: Math.floor(box.y + box.height) - top }
    const png = await page.screenshot({ clip, fullPage: true, animations: 'disabled' })
    await writeFile(path.join(out, `${id}.png`), withLicense(png))
    console.log(`${id}.png`)
  }
} finally {
  await browser.close()
}
