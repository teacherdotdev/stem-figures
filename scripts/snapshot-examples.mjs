#!/usr/bin/env node
// Takes the picture of each example figure a site lists in its sitemap
// (e.g. Chemistry Figures' examples: apps/chemistry/src/lib/examples/examples.ts),
// for search engines to index as images, and each generator's social card.
// Start the site first, then pass its address, and --app=<name> for a site
// other than chemistry:
//
//   ./scripts/agent-dev.mjs stemfigures/apps/chemistry     (from the workspace root)
//   node scripts/snapshot-examples.mjs http://localhost:10003/
//   node scripts/snapshot-examples.mjs http://localhost:10003/ buret   (only examples whose page matches "buret")
//   node scripts/snapshot-examples.mjs --app=math http://localhost:10004/
//
// For every example page in the sitemap it opens the page's "Edit this
// figure" link, the generator with the example's settings, and exports the
// figure the way the generator's Download SVG / PNG buttons do (the same
// SVG, drawn on white, with the CC0 license written in), only larger: about
// 1600 pixels on its longest side.
// Each picture is saved where the sitemap says it is, under the app's
// static/ (e.g. static/examples/volume-reading/buret-reading-12-35-ml.png),
// and its size goes in src/lib/examples/sizes.json for the pages' <img> tags.
// A generator's first example is also drawn centered on a 1200×630 card,
// saved as static/og/<generator>.png.
//
// It uses the Chromium Playwright has installed (`npx playwright install chromium`).

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { withLicense } from '../packages/shared/src/license.ts'

const args = process.argv.slice(2)
const appName = args.find((a) => a.startsWith('--app='))?.slice('--app='.length) ?? 'chemistry'
const [base, only] = args.filter((a) => !a.startsWith('--app='))
if (!base) {
  console.error('Usage: node scripts/snapshot-examples.mjs [--app=<name>] <site URL> [part of an example page address]')
  process.exit(1)
}

const app = path.resolve(import.meta.dirname, '../apps', appName)
const staticDir = path.join(app, 'static')
const sizesFile = path.join(app, 'src/lib/examples/sizes.json')

/** The longest side of an example's picture, in pixels. */
const LONGEST = 1600
/** The social card, and the white space kept around the figure on it. */
const CARD = { width: 1200, height: 630, padX: 80, padY: 50 }

// The example pages and their pictures, from the sitemap: each <url> whose
// address has /examples/ in it, and its one <image:loc>.
const sitemap = await (await fetch(new URL('/sitemap.xml', base))).text()
const examples = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
  .map(([, block]) => ({
    page: new URL(/<loc>(.*?)<\/loc>/.exec(block)[1]).pathname,
    image: new URL(/<image:loc>(.*?)<\/image:loc>/.exec(block)?.[1] ?? 'x:').pathname,
  }))
  .filter((e) => /^\/[^/]+\/examples\/[^/]+$/.test(e.page))
  .map((e) => ({ ...e, generator: e.page.split('/')[1] }))
if (!examples.length) throw new Error('No example pages in the sitemap')

const firsts = new Set(examples.filter((e, i) => examples.findIndex((f) => f.generator === e.generator) === i))
const chosen = only ? examples.filter((e) => e.page.includes(only)) : examples

let sizes = {}
try {
  sizes = JSON.parse(await readFile(sizesFile, 'utf8'))
} catch {}

/** Save a PNG from a data: URL under static/, with the license written in. */
async function save(sitePath, dataUrl) {
  const file = path.join(staticDir, sitePath)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, withLicense(Buffer.from(dataUrl.split(',')[1], 'base64')))
}

/** Open a page, again if a dev server reloading it cut the first try short. */
async function open(page, address, waitUntil = 'load') {
  for (let tries = 1; ; tries++) {
    try {
      return await page.goto(new URL(address, base).href, { waitUntil })
    } catch (e) {
      if (tries >= 3) throw e
      await page.waitForTimeout(1000)
    }
  }
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  for (const example of chosen) {
    await open(page, example.page)
    const edit = await page.getByRole('link', { name: 'Edit this figure' }).getAttribute('href')

    // The generator, with the example's settings. Its Download SVG button
    // serializes the exact element it exports; catch that element. Clicked
    // until the page has hydrated and the button works, and the page opened
    // again if a dev server reloads it meanwhile.
    for (let tries = 1; ; tries++) {
      await open(page, edit, 'networkidle')
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => {
        const serialize = XMLSerializer.prototype.serializeToString
        XMLSerializer.prototype.serializeToString = function (node) {
          if (node instanceof SVGSVGElement) window.__figure ??= node
          return serialize.call(this, node)
        }
      })
      const caught = async () => page.evaluate(() => !!window.__figure).catch(() => false)
      for (let i = 0; i < 20 && !(await caught()); i++) {
        await page.getByRole('button', { name: 'Download SVG' }).click({ timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(250)
      }
      if (await caught()) break
      if (tries >= 3) throw new Error(`${edit} never exported its figure`)
    }

    const drawn = await page.evaluate(
      async ({ longest, card, og }) => {
        const svg = window.__figure
        const w = svg.viewBox.baseVal.width
        const h = svg.viewBox.baseVal.height
        // As exporting.ts does: the SVG as text, less anything marked
        // data-no-export, drawn on white.
        const copy = svg.cloneNode(true)
        for (const el of copy.querySelectorAll('[data-no-export]')) el.remove()
        const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }))
        const img = new Image()
        img.src = url
        await img.decode()
        const draw = (width, height, x, y, dw, dh) => {
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, x, y, dw, dh)
          return canvas.toDataURL('image/png')
        }
        const scale = longest / Math.max(w, h)
        const width = Math.round(w * scale)
        const height = Math.round(h * scale)
        const picture = draw(width, height, 0, 0, width, height)
        let social = null
        if (og) {
          const fit = Math.min((card.width - 2 * card.padX) / w, (card.height - 2 * card.padY) / h)
          const [dw, dh] = [w * fit, h * fit]
          social = draw(card.width, card.height, (card.width - dw) / 2, (card.height - dh) / 2, dw, dh)
        }
        URL.revokeObjectURL(url)
        return { picture, width, height, social }
      },
      { longest: LONGEST, card: CARD, og: firsts.has(example) },
    )

    await save(example.image, drawn.picture)
    sizes[example.image] = [drawn.width, drawn.height]
    console.log(`${example.image}  ${drawn.width}×${drawn.height}`)
    if (drawn.social) {
      await save(`/og/${example.generator}.png`, drawn.social)
      console.log(`/og/${example.generator}.png  ${CARD.width}×${CARD.height}`)
    }
  }
} finally {
  await browser.close()
}

// Only the pictures the sitemap still lists, in a steady order.
const listed = new Set(examples.map((e) => e.image))
const kept = Object.entries(sizes).filter(([k]) => listed.has(k)).sort(([a], [b]) => a.localeCompare(b))
await writeFile(sizesFile, `{\n${kept.map(([k, [w, h]]) => `  ${JSON.stringify(k)}: [${w}, ${h}]`).join(',\n')}\n}\n`)

// Pictures no example uses any more, to delete.
const saved = (await readdir(path.join(staticDir, 'examples'), { recursive: true })).filter((f) => f.endsWith('.png'))
for (const file of saved) {
  const sitePath = `/examples/${file.split(path.sep).join('/')}`
  if (!listed.has(sitePath)) console.warn(`Not in the sitemap, so no longer used: static${sitePath}`)
}
