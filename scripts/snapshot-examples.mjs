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
// saved as static/og/<generator>.png, unless CARD_COLUMNS gives it a card of
// several figures side by side.
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

/** Social cards drawn as columns, one figure each, instead of the generator's
 *  first example, by site and generator: each column's settings, as the
 *  query of the generator's address. Length Reading shows its three
 *  instruments (Math's copy has only the ruler, so it keeps its example). */
const CARD_COLUMNS = {
  physics: { 'length-reading': ['view=whole', 'instrument=caliper&closeUp=whole', 'instrument=micrometer&closeUp=whole'] },
  chemistry: { 'length-reading': ['view=whole', 'instrument=caliper&closeUp=whole', 'instrument=micrometer&closeUp=whole'] },
}[appName] ?? {}
/** The white space around and between a columned card's figures. */
const COLUMNS = { padX: 40, padY: 50, gap: 30 }

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

/** Open a generator and catch the exact SVG its Download SVG button exports,
 *  as text less anything marked data-no-export, with its size. Clicked until
 *  the page has hydrated and the button works, and the page opened again if
 *  a dev server reloads it meanwhile. */
async function figureAt(page, address) {
  for (let tries = 1; ; tries++) {
    await open(page, address, 'networkidle')
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
    if (tries >= 3) throw new Error(`${address} never exported its figure`)
  }
  // As exporting.ts does: the SVG as text, less anything marked data-no-export.
  return page.evaluate(() => {
    const svg = window.__figure
    const copy = svg.cloneNode(true)
    for (const el of copy.querySelectorAll('[data-no-export]')) el.remove()
    return { svg: new XMLSerializer().serializeToString(copy), w: svg.viewBox.baseVal.width, h: svg.viewBox.baseVal.height }
  })
}

/** A PNG (as a data: URL) of figures drawn on white, each at [x, y, width, height]. */
const drawOn = (page, width, height, placed) =>
  page.evaluate(
    async ({ width, height, placed }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, width, height)
      for (const { svg, at } of placed) {
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
        const img = new Image()
        img.src = url
        await img.decode()
        ctx.drawImage(img, ...at)
        URL.revokeObjectURL(url)
      }
      return canvas.toDataURL('image/png')
    },
    { width, height, placed },
  )

/** A figure fitted into a box and centered in it, as [x, y, width, height]. */
function fitted({ w, h }, x, y, boxW, boxH) {
  const fit = Math.min(boxW / w, boxH / h)
  return [x + (boxW - w * fit) / 2, y + (boxH - h * fit) / 2, w * fit, h * fit]
}

async function saveCard(generator, dataUrl) {
  await save(`/og/${generator}.png`, dataUrl)
  console.log(`/og/${generator}.png  ${CARD.width}×${CARD.height}`)
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  for (const example of chosen) {
    await open(page, example.page)
    const edit = await page.getByRole('link', { name: 'Edit this figure' }).getAttribute('href')
    // The generator, with the example's settings.
    const figure = await figureAt(page, edit)

    const scale = LONGEST / Math.max(figure.w, figure.h)
    const width = Math.round(figure.w * scale)
    const height = Math.round(figure.h * scale)
    await save(example.image, await drawOn(page, width, height, [{ svg: figure.svg, at: [0, 0, width, height] }]))
    sizes[example.image] = [width, height]
    console.log(`${example.image}  ${width}×${height}`)

    if (!firsts.has(example)) continue
    const columns = CARD_COLUMNS[example.generator]
    if (!columns) {
      const at = fitted(figure, CARD.padX, CARD.padY, CARD.width - 2 * CARD.padX, CARD.height - 2 * CARD.padY)
      await saveCard(example.generator, await drawOn(page, CARD.width, CARD.height, [{ svg: figure.svg, at }]))
      continue
    }
    const figures = []
    for (const query of columns) figures.push(await figureAt(page, `/${example.generator}?${query}`))
    const colW = (CARD.width - 2 * COLUMNS.padX - (columns.length - 1) * COLUMNS.gap) / columns.length
    const placed = figures.map((f, i) => ({
      svg: f.svg,
      at: fitted(f, COLUMNS.padX + i * (colW + COLUMNS.gap), COLUMNS.padY, colW, CARD.height - 2 * COLUMNS.padY),
    }))
    await saveCard(example.generator, await drawOn(page, CARD.width, CARD.height, placed))
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
