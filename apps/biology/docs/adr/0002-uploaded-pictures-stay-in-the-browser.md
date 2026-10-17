# Uploaded pictures stay in the browser, by reference in the address

Food Webs and Energy Pyramids lets a teacher upload a picture for an organism our bundled drawings don't have. The sites have no accounts or server storage, and a figure's settings live in its page address (ADR 0001), which can't hold a picture. Saved presets and undo history already fill localStorage, which is only about 5 MB a site.

## Decision

1. **Uploads are kept in IndexedDB** (`food-web-images`), the same browser-only tier as localStorage with far more room. Each is redrawn on a canvas as a PNG at most 300 px on its longer side (which also leaves behind any script in an SVG), up to 60 pictures, any of which the teacher can delete.
2. **The address, presets and undo history hold only a reference**: `u-` and the first 12 hex digits of the SHA-256 of the file uploaded. The same file always gets the same reference and a stored picture never changes, so undo and presets always bring back exactly the picture they had.
3. **A figure draws an upload as a data URI**, read from IndexedDB into memory when needed, so downloaded SVGs and PNGs and copied images all carry it. (`$shared/exporting` draws the SVG through an `<img>`, which can't load `blob:` or outside addresses.)
4. **Where the picture isn't, the figure still draws**: on the server, or from a link opened on another computer, the organism is a dashed empty box with its name, and the settings say the picture is only on the computer it was uploaded on.
5. **The upload button says to upload only pictures the teacher has the right to use.** A teacher's own picture is theirs, as `FIGURE_NOTICE` and ADR 0002 in `packages/shared` already say; nothing about the figures' licence changes.

## Considered Options

- **localStorage, as data URIs**: no new kind of storage, but a handful of pictures would crowd out every generator's presets and undo history.
- **Upload to a server**: links would work anywhere, but it means accounts or anonymous hosting of anything uploaded, which the data hierarchy in AGENTS.md rules out for now.
- **The picture in the address**: links would work anywhere, but even a small PNG is tens of kilobytes, too long for an address.

## Consequences

A link to a figure with an upload only fully works in the browser that uploaded it, and clearing site data loses the pictures. If another generator wants uploaded pictures (Physics' free-body diagrams, say), `food-web/images.ts` is the piece to lift into `packages/shared`.
