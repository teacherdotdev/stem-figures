#!/usr/bin/env node
// Food Webs and Energy Pyramids' uploads, tested in a real browser, since
// they need a canvas and IndexedDB (jsdom has neither). With the site
// running (see the app's README):
//
//   node apps/biology/scripts/test-food-web-uploads.mjs http://localhost:10003/
//
// It uploads a large PNG and checks it is kept within 300 px, drawn in the
// figure as a data URI and carried into a downloaded SVG and PNG; that the
// same file uploaded again is the same picture; that an SVG with a script
// in it is stored as a PNG without running it; and that a link opened in
// another browser draws a dashed box and says the picture is only on the
// computer it was uploaded on, with no errors. It needs the Chromium
// Playwright installs (npx playwright install chromium).

import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const base = (process.argv[2] ?? 'http://localhost:10003/').replace(/\/$/, '')
const failures = []
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`)
  if (!ok) failures.push(what)
}

const browser = await chromium.launch()
try {
  const context = await browser.newContext({ acceptDownloads: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${base}/food-web`, { waitUntil: 'networkidle' })

  // A 1200 × 800 PNG, drawn in the page.
  const png = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement('canvas')
      c.width = 1200
      c.height = 800
      const g = c.getContext('2d')
      g.fillStyle = '#c0392b'
      g.fillRect(0, 0, 1200, 800)
      g.fillStyle = '#2980b9'
      g.beginPath()
      g.arc(600, 400, 300, 0, Math.PI * 2)
      g.fill()
      return c.toDataURL('image/png').split(',')[1]
    }),
    'base64',
  )

  async function upload(file) {
    await page.getByRole('button', { name: 'Add an organism' }).click()
    await page.getByRole('tab', { name: 'My pictures' }).click()
    await page.locator('dialog input[type=file]').setInputFiles(file)
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 10000 })
    await page.waitForTimeout(400)
  }

  await upload({ name: 'Snowshoe hare.png', mimeType: 'image/png', buffer: png })
  const key = new URL(page.url()).searchParams.get('web')?.match(/u-[0-9a-f]{12}/)?.[0]
  check(!!key, `the upload is in the address by reference (${key})`)
  const href = await page.locator('.figure-side svg[role=img] image').first().getAttribute('href')
  check(href?.startsWith('data:image/png;base64,'), 'the figure draws it as a PNG data URI')
  const stored = await page.evaluate(
    (key) =>
      new Promise((resolve) => {
        const req = indexedDB.open('food-web-images')
        req.onsuccess = () => {
          const all = req.result.transaction('images').objectStore('images').getAll()
          all.onsuccess = () => resolve(all.result.map((r) => ({ key: r.key, width: r.width, height: r.height, type: r.blob.type, name: r.name })))
        }
      }),
    key,
  )
  const hare = stored.find((s) => s.key === key)
  check(hare && hare.width === 300 && hare.height === 200 && hare.type === 'image/png', `it is stored as a PNG within 300 px (${hare?.width} × ${hare?.height})`)
  check(hare?.name === 'Snowshoe hare', 'it keeps the file’s name')

  await upload({ name: 'Snowshoe hare.png', mimeType: 'image/png', buffer: png })
  const again = new URL(page.url()).searchParams.get('web')
  check((again.match(new RegExp(key, 'g')) ?? []).length === 2, 'the same file uploaded again is the same picture')

  const evil = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><script>window.parent.pwned = 1</script><rect width="400" height="400" fill="#16a085"/></svg>'
  await upload({ name: 'evil.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(evil) })
  const all = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('food-web-images')
        req.onsuccess = () => {
          const all = req.result.transaction('images').objectStore('images').getAll()
          all.onsuccess = () => resolve(all.result.map((r) => ({ type: r.blob.type, width: r.width })))
        }
      }),
  )
  check(all.length === 2 && all.every((r) => r.type === 'image/png' && r.width <= 300), 'an SVG is stored as a PNG too')
  check(!(await page.evaluate(() => 'pwned' in window)), 'an uploaded SVG’s script never runs')

  const [svgDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download SVG' }).click()])
  const exported = await readFile(await svgDownload.path(), 'utf8')
  check(/<image[^>]*href="data:image\/png;base64,/.test(exported), 'a downloaded SVG carries the picture as a data URI')
  const [pngDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()])
  const shot = await readFile(await pngDownload.path())
  // The picture's red shows in the PNG, which only happens if the data URI was drawn.
  const red = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 90 && d[i + 2] < 90) n++
    return n
  }, shot.toString('base64'))
  check(red > 100, `a downloaded PNG shows the picture (${red} red pixels)`)
  check(errors.length === 0, `no errors on the page${errors.length ? `: ${errors.join('; ')}` : ''}`)

  // The same link in another browser, which doesn't have the pictures.
  const other = await browser.newContext()
  const away = await other.newPage()
  const awayErrors = []
  away.on('pageerror', (e) => awayErrors.push(String(e)))
  await away.goto(page.url(), { waitUntil: 'networkidle' })
  await away.waitForTimeout(500)
  check((await away.locator('.figure-side svg[role=img] image').count()) === 0, 'another browser draws no picture for it')
  check((await away.locator('.figure-side svg[role=img] rect[stroke-dasharray="6 5"]').count()) >= 2, 'it draws a dashed box instead')
  check((await away.locator('.figure-side svg[role=img] text', { hasText: 'Snowshoe hare' }).count()) >= 1, 'with the organism’s name')
  await away.locator('.organisms .row', { hasText: 'Snowshoe hare' }).first().click()
  check(await away.getByText('This picture is only on the computer it was uploaded on.').isVisible(), 'and says the picture is only on the other computer')
  check(awayErrors.length === 0, `no errors in the other browser${awayErrors.length ? `: ${awayErrors.join('; ')}` : ''}`)
} finally {
  await browser.close()
}
if (failures.length) {
  console.log(`\n${failures.length} failed`)
  process.exit(1)
}
console.log('\nAll passed')
