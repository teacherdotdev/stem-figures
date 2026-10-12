# Figures are in the public domain (CC0)

Teachers make figures here to paste into tests, worksheets and slides, which they then share, print, sell on Teachers Pay Teachers or put in a textbook. The sites' `/reuse` pages used to say the example figures were "open source under Apache 2.0", like the code. Apache is a software license: its conditions (keep the license text, mark changes) don't fit a picture on a quiz, and it said nothing about the figures teachers make themselves.

## Decision

1. **Every figure is dedicated to the public domain under CC0 1.0**: the figures teachers make and export, and the example pictures. CC0 is the most permissive tool Creative Commons offers, a waiver rather than a license, so there is no condition to meet, not even credit.
2. **The code stays Apache 2.0** (`LICENSE.txt`). Creative Commons advises against its tools for software.
3. **The terms are in one place**, `packages/shared/src/license.ts`, which every site's `src/lib/examples/license.ts` builds on. They're stated on each figure site's `/reuse` page (linked from its footer) and example pages, in the example pages' structured data, and as metadata in every exported file: RDF in an SVG's `<metadata>`, and a `Copyright` text chunk plus XMP in a PNG. `scripts/snapshot-examples.mjs` writes the same into the example pictures.

## Considered Options

- **CC BY 4.0**: the most permissive Creative Commons *license*, and it would get the sites credited, but teachers would have to credit a figure on every worksheet, and most won't know they're meant to.
- **Keep Apache 2.0**: no change, but a software license teachers can't easily follow for a picture.
- **A visible watermark or credit line in the figure**: teachers want clean figures, and CC0 needs no credit.

## Consequences

The dedication can't be taken back for figures already made. A figure that copies on the clipboard loses its metadata (browsers re-encode copied images), so the `/reuse` page, not the file, is the statement that counts. Anything a figure draws that isn't ours to give away, a third-party icon or artwork or an embedded font, would keep its own license, so a generator shouldn't bring any in. A new way of saving a figure should write the same metadata (`SVG_METADATA` and `withLicense` in `license.ts`).
