# Econ Figures

Generators for clean, printable economics figures that teachers paste into
tests, worksheets and slides. Live at **https://econfigures.com** (with
economicsfigures.com as an alias), a teacher.dev project. See `CONTEXT.md`
for the vocabulary (figure, generator, directory…) and `docs/adr/` for
decisions.

## Pages

- `/` **Directory**: every generator as a card with a live preview, plus a
  card to request one we don't make yet. There are no generators yet, so
  for now it says the first ones are on the way and shows only the request
  card.
- `/about`, `/privacy`, `/reuse`, `/sitemap.xml`, `/robots.txt`

Every page has the top bar: the site name, the current generator, and links
to the other STEM Figures sites; the footer has the "Built by teacher.dev"
link. The directory's search box filters its cards as you type, searching
every STEM Figures site, and its last card is **Request a generator**.
Generators fill the window with no footer. The help button in the corner
opens the same kind of email dialog. Behind every page are faint economics
doodles: supply and demand, a bar chart, a production possibilities
frontier, a pie chart and a trend line.

A generator's settings live in the page address, so a link opens the same
figure, and the server renders that figure on first load (see ADR 0001).
Saved presets stay in the browser's localStorage.

## Code layout

```
src/routes/            SvelteKit pages
src/lib/site/          top bar, Help, footer, SEO and structured data, site config
$shared/               ../../packages/shared: pieces shared with the other sites
src/lib/generators/    index.ts gives each generator its preview; one folder each
```

To add a generator: its entry in `packages/shared/src/catalog/economics.ts`,
a folder under `src/lib/generators/` with its builder and preview, its
preview in `generators/index.ts`, its route under `src/routes/`, and a
preview snapshot (see `packages/shared/README.md`). The directory, search and
sitemap pick it up from the catalog.

## Development

```bash
npm install   # once, from the stemfigures repo root (npm workspaces)
../../../scripts/agent-dev.mjs stemfigures/apps/economics   # from the workspace, never npm run dev directly
npm run check   # svelte-check
npm run build
```

Deployed on Vercel with `@sveltejs/adapter-vercel`. The Cloudflare Web
Analytics token is read from `CF_BEACON_TOKEN`, which is set only in
Vercel's production environment.
