// The terms every figure made on a STEM Figures site is shared under: CC0, so
// teachers can use them anywhere without asking or giving credit (see
// docs/adr/0002-figures-are-cc0.md). The code is separately Apache 2.0
// (LICENSE.txt at the repo root).
//
// Plain TypeScript with no imports, so scripts/snapshot-examples.mjs can load
// it straight from Node to stamp the example pictures too.

export const FIGURE_LICENSE = {
  name: 'CC0 1.0',
  fullName: 'CC0 1.0 Universal public domain dedication',
  url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  /** each site's page telling teachers how they may reuse the figures */
  page: '/reuse',
} as const

/** The notice written into every exported SVG and PNG. */
export const FIGURE_NOTICE =
  `Made with STEM Figures (stemfigures.com), a teacher.dev project. No rights reserved: ` +
  `dedicated to the public domain under ${FIGURE_LICENSE.fullName} (${FIGURE_LICENSE.url}).`

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const DC = 'http://purl.org/dc/elements/1.1/'
const CC = 'http://creativecommons.org/ns#'

/** A <metadata> element for an SVG, in the RDF Creative Commons recommends. */
export const SVG_METADATA =
  `<metadata xmlns="http://www.w3.org/2000/svg"><rdf:RDF xmlns:rdf="${RDF}" xmlns:dc="${DC}" xmlns:cc="${CC}">` +
  `<cc:Work rdf:about=""><dc:rights>${FIGURE_NOTICE}</dc:rights>` +
  `<cc:license rdf:resource="${FIGURE_LICENSE.url}"/></cc:Work></rdf:RDF></metadata>`

/** The same as XMP, which image viewers, editors and search engines read from a PNG.
 *  xmpRights:Marked False is how XMP says public domain. */
const XMP =
  `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>` +
  `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="${RDF}">` +
  `<rdf:Description rdf:about="" xmlns:dc="${DC}" xmlns:cc="${CC}" xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/">` +
  `<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${FIGURE_NOTICE}</rdf:li></rdf:Alt></dc:rights>` +
  `<xmpRights:Marked>False</xmpRights:Marked>` +
  `<xmpRights:WebStatement>${FIGURE_LICENSE.url}</xmpRights:WebStatement>` +
  `<cc:license rdf:resource="${FIGURE_LICENSE.url}"/>` +
  `</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="r"?>`

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

export function crc32(bytes: Uint8Array) {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** One PNG chunk: its length, type, data and CRC. */
function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(new TextEncoder().encode(type), 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) (out.set(p, at), (at += p.length))
  return out
}

const ascii = (s: string) => new TextEncoder().encode(s)

/** The PNG with the license written into it: a Copyright text chunk and the
 *  XMP, placed straight after the header chunk (IHDR). */
export function withLicense(png: Uint8Array): Uint8Array<ArrayBuffer> {
  const afterHeader = 8 + 12 + new DataView(png.buffer, png.byteOffset).getUint32(8)
  const copyright = chunk('tEXt', concat(ascii('Copyright\0'), ascii(FIGURE_NOTICE)))
  // iTXt: keyword, then no compression, no language tag, no translated keyword.
  const xmp = chunk('iTXt', concat(ascii('XML:com.adobe.xmp\0\0\0\0\0'), new TextEncoder().encode(XMP)))
  return concat(png.subarray(0, afterHeader), copyright, xmp, png.subarray(afterHeader))
}
