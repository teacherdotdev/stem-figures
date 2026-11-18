# Chemistry Figures

Generators for clean, printable chemistry figures that teachers paste into
tests, worksheets and slides. Live at **https://chemistryfigures.com**, a
teacher.dev project. See `CONTEXT.md` for the vocabulary (figure, generator,
directory…) and `docs/adr/` for decisions.

Start it with `bun run dev` (Vite) from `apps/chemistry`.

## Example figures

Each generator has a handful of example figures, so search engines have real
pictures to index. Each one has:

- its settings, title, alt text and caption in `src/lib/examples/examples.ts`
  (the first of each generator is its best);
- a static page at `/<generator>/examples/<slug>`, built by
  `src/routes/[generator=examplegenerator]/examples/[slug]/`, with the picture,
  its answer key (worked out by the generator's own code in
  `src/lib/examples/details.server.ts`), an "Edit this figure" link that opens
  the generator with those settings, and a PNG download;
- its picture at `static/examples/<generator>/<slug>.png`, listed in
  `sitemap.xml` as an image of both its page and its generator's page.

A generator's first example is also its social card, `static/og/<generator>.png`
(1200×630). `src/lib/examples/ExampleGallery.svelte` shows a generator's
examples as a grid of thumbnails. Who may reuse the pictures, and how, is in
`src/lib/examples/license.ts` and the `/reuse` page.

The build fails if an example's settings aren't ones its generator keeps as
written (a reading off the scale, say), so a picture can't show a different
figure than its page describes.

### Redoing the pictures

After adding or changing an example, or changing how a generator draws, take
the pictures again. With the site running:

```sh
(cd apps/chemistry && bun run dev)          # from the repo root; Vite prints its address
node scripts/snapshot-examples.mjs http://localhost:5173/  # from stemfigures/, with that address
node scripts/snapshot-examples.mjs http://localhost:5173/ buret   # just the examples whose page matches "buret"
```

It opens each example's generator, exports the figure as the Download buttons
do (about 1600 pixels on its longest side, on white), saves it and the social
cards under `static/`, and records each picture's size in
`src/lib/examples/sizes.json`. It needs the Chromium Playwright installs
(`npx playwright install chromium`). Look at the pictures before committing
them, and delete the PNG of an example you removed or renamed.
