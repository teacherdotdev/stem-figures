# Engineering Figures

Generators for clean, printable engineering figures that teachers paste into tests,
worksheets and slides. Live at **https://engineeringfigures.com**, a teacher.dev
project. See `CONTEXT.md` for the vocabulary (figure, generator, directory…)
and `docs/adr/` for decisions.

## Pages

- `/` **Directory**: every generator as a card with a live preview, plus a
  card to request one we don't make yet. There are no generators yet, so
  for now it shows only the request card.
- `/about`, `/privacy`, `/sitemap.xml`, `/robots.txt`

Every page has the top bar: the site name, the current generator, and a
"Built by teacher.dev" link, which the footer repeats. The directory's search box filters its cards as
you type, and its last card is **Request a generator**. Generators fill the
window with no footer. The help button in the corner opens the same kind of
email dialog. Behind every page is faint engineering graph paper, with a
darker line every fifth square.

A generator's settings live in the page address, so a link opens the same
figure, and the server renders that figure on first load (see ADR 0001).
Saved presets stay in the browser's localStorage.

## Code layout

```
src/routes/            SvelteKit pages
src/lib/site/          top bar, directory dialogs, Help, footer, SEO
src/lib/shared/        pieces generators use: figure card and toolbar,
                       undo history, presets, dialogs, fields, magnifier
$shared/               ../../packages/shared: pieces shared with the other sites
src/lib/generators/    index.ts lists every generator; one folder each
```

To add a generator: make a folder under `src/lib/generators/` with its
builder and preview, add one entry to `generators/index.ts`, and add its route
under `src/routes/`. The directory, search and sitemap pick it up from the list.

## Development

```bash
npm install   # once, from the stemfigures repo root (npm workspaces)
bun run dev   # Vite dev server; prints its address
npm run check   # svelte-check
npm run build
```

Deployed on Vercel with `@sveltejs/adapter-vercel`. The Cloudflare Web
Analytics token is read from `CF_BEACON_TOKEN`, which is set only in
Vercel's production environment.
