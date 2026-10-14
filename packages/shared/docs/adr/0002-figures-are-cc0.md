# Figures are in the public domain (CC0)

Teachers make figures here to paste into tests, worksheets and slides, which they then share, print, sell on Teachers Pay Teachers or put in a textbook. The sites' `/reuse` pages used to say the example figures were "open source under Apache 2.0", like the code. Apache is a software license: its conditions (keep the license text, mark changes) don't fit a picture on a quiz, and it said nothing about the figures teachers make themselves.

## Decision

1. **Our part of every figure is dedicated to the public domain under CC0 1.0**: what the sites contribute to the figures teachers make and export (the drawing, its layout and style), and the example pictures, which are entirely ours. CC0 is the most permissive tool Creative Commons offers, a waiver rather than a license, so there is no condition to meet, not even credit.
2. **We don't claim what the teacher adds.** CC0 waives only the rights of whoever applies it, so we can't dedicate a teacher's own contribution. Mostly that's choosing settings, which is likely too slight to be copyrighted, so a typical figure belongs to no one. But anything original a teacher adds (long text of their own, a structure drawn in the Structure Editor) may be theirs, and so is the worksheet or deck they put a figure in. The `/reuse` pages and the files' metadata say so, and the XMP leaves out `xmpRights:Marked`, which would call the whole file public domain.
3. **The code stays Apache 2.0** (`LICENSE.txt`). Creative Commons advises against its tools for software.
4. **The terms are in one place**, `packages/shared/src/license.ts`, which every site's `src/lib/examples/license.ts` builds on. They're stated on every site's `/reuse` page (linked from its footer; Engineering and STEM Figures too, though they make no figures of their own yet) and the example pages, in the example pages' structured data, and as metadata in every exported file: RDF in an SVG's `<metadata>`, and a `Copyright` text chunk plus XMP in a PNG. `scripts/snapshot-examples.mjs` and `scripts/snapshot-previews.mjs` write the same into the example pictures and the directory previews.

## Considered Options

- **CC BY 4.0**: the most permissive Creative Commons *license*, and it would get the sites credited, but teachers would have to credit a figure on every worksheet, and most won't know they're meant to.
- **Keep Apache 2.0**: no change, but a software license teachers can't easily follow for a picture.
- **A visible watermark or credit line in the figure**: teachers want clean figures, and CC0 needs no credit.
- **Call every exported figure wholly public domain**: simpler wording, but it claims to give away the teacher's part, which isn't ours to give.

## Consequences

The dedication can't be taken back for figures already made. Whether a teacher owns anything in a given figure depends on what they added and where they are (UK law, for one, can treat the person who set up a computer-generated work as its author); the wording leaves that to them rather than deciding it. A figure that copies on the clipboard loses its metadata (browsers re-encode copied images), so the `/reuse` page, not the file, is the statement that counts. Anything a figure draws that isn't ours to give away, a third-party icon or artwork or an embedded font, would keep its own license, so a generator shouldn't bring any in. A new way of saving a figure should write the same metadata (`SVG_METADATA` and `withLicense` in `license.ts`).
