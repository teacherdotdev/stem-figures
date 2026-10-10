# Physics Figures

Generators for clean, printable physics figures that teachers paste into
tests, worksheets and slides. Live at **https://physicsfigures.com**, a teacher.dev
project. See `CONTEXT.md` for the vocabulary (figure, generator, directory…)
and `docs/adr/` for decisions.

## Pages

- `/` **Directory**: every generator as a card with a live preview, plus a
  card to request one we don't make yet.
- `/<generator>`: one generator. The About button in the top bar opens a
  drawer with what it makes, what can be set, its example figures and
  frequently asked questions (`src/lib/site/generatorCopy.ts`, which also
  feeds the page's structured data).
- `/<generator>/examples/<slug>`: one example figure (see below).
- `/about`, `/privacy`, `/reuse`, `/sitemap.xml`, `/robots.txt`

Every page has the top bar: the site name, the current generator, and a
"Built by teacher.dev" link, which the footer repeats. The directory's search box filters its cards as
you type, and its last card is **Request a generator**. Generators fill the
window with no footer. The help button in the corner opens the same kind of
email dialog. Behind every page are faint physics doodles: an atom, a wave,
a pendulum, a spring, a lens, a free body diagram and an orbit.

A generator's settings live in the page address, so a link opens the same
figure, and the server renders that figure on first load (see ADR 0001).
Saved presets stay in the browser's localStorage.

## Example figures

Each generator has a handful of example figures, so search engines have real
pictures to index. Each one has:

- its settings, title, alt text and caption in `src/lib/examples/examples.ts`
  (the first of each generator is its best);
- a static page at `/<generator>/examples/<slug>`, built by
  `src/routes/[generator=examplegenerator]/examples/[slug]/`, with the picture,
  an "Edit this figure" link that opens the generator with those settings, a
  PNG download, and an answer key where the generator works one out (the
  Spring Scale's reading, the Vector Diagram's resultant and components), from
  the generator's own code in `src/lib/examples/details.server.ts`;
- its picture at `static/examples/<generator>/<slug>.png`, listed in
  `sitemap.xml` as an image of both its page and its generator's page.

A generator's first example is also its social card, `static/og/<generator>.png`
(1200×630). The first card in each generator's settings opens its examples to
start from. Who may reuse the pictures, and how, is in
`src/lib/examples/license.ts` and the `/reuse` page.

The build fails if an example's settings aren't ones its generator keeps as
written (a force past the scale, say), so a picture can't show a different
figure than its page describes.

### Redoing the pictures

After adding or changing an example, or changing how a generator draws, take
the pictures again. With the site running:

```sh
./scripts/agent-dev.mjs stemfigures/apps/physics                          # from the workspace root; prints its address
node scripts/snapshot-examples.mjs --app=physics http://localhost:10003/  # from stemfigures/, with that address
```

It needs the Chromium Playwright installs (`npx playwright install chromium`).
Look at the pictures before committing them, and delete the PNG of an example
you removed or renamed.

## Code layout

```
src/routes/            SvelteKit pages
src/lib/site/          top bar, About drawer and page copy, Help, footer, SEO
src/lib/examples/      example figures, their pages' details and gallery
src/lib/shared/        pieces every generator uses: figure card and toolbar,
                       undo history, presets, dialogs, fields
$shared/               ../../packages/shared: pieces shared with the other sites
src/lib/generators/    index.ts lists every generator; one folder each
src/lib/editors/       the Circuit Editor, drawn by hand (listed in index.ts too)
```

To add a generator: make a folder under `src/lib/generators/` with its
builder and preview, add one entry to `generators/index.ts`, and add its route
under `src/routes/`. The directory, search and sitemap pick it up from the list.
Its page needs its words in `src/lib/site/generatorCopy.ts`, and it should get
a few examples in `src/lib/examples/examples.ts` (with its settings type in
`types.ts` and its definition in `details.server.ts`).

## Development

```bash
npm install   # once, from the stemfigures repo root (npm workspaces)
../../../scripts/agent-dev.mjs stemfigures/apps/physics   # from the workspace, never npm run dev directly
npm run check   # svelte-check (TypeScript, strict)
npm run build
```

Deployed on Vercel with `@sveltejs/adapter-vercel`. The Cloudflare Web
Analytics token is read from `CF_BEACON_TOKEN`, which is set only in
Vercel's production environment.
