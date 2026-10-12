import { describe, expect, it } from 'vitest'
import { crc32, FIGURE_LICENSE, FIGURE_NOTICE, withLicense } from './license'

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

/** A PNG's chunks as [type, data], checking each one's CRC on the way. */
function chunks(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset)
  const found: [string, string][] = []
  for (let at = 8; at < png.length; ) {
    const length = view.getUint32(at)
    const typeAndData = png.subarray(at + 4, at + 8 + length)
    expect(view.getUint32(at + 8 + length)).toBe(crc32(typeAndData))
    found.push([new TextDecoder().decode(typeAndData.subarray(0, 4)), new TextDecoder().decode(typeAndData.subarray(4))])
    at += 12 + length
  }
  return found
}

/** A minimal PNG's bytes: the signature, a 13-byte IHDR and IEND. */
const blank = () => {
  const ihdr = [0, 0, 0, 13, ...new TextEncoder().encode('IHDR'), ...new Array(13).fill(0), 0, 0, 0, 0]
  const iend = [0, 0, 0, 0, ...new TextEncoder().encode('IEND'), 0xae, 0x42, 0x60, 0x82]
  const png = new Uint8Array([...SIGNATURE, ...ihdr, ...iend])
  new DataView(png.buffer).setUint32(8 + 8 + 13, crc32(png.subarray(12, 8 + 8 + 13)))
  return png
}

describe('the license in an exported PNG', () => {
  it('computes CRCs the way PNG does', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082)
  })

  it('goes straight after the header, leaving the rest as it was', () => {
    const png = withLicense(blank())
    expect([...png.subarray(0, 8)]).toEqual(SIGNATURE)
    expect(chunks(png).map(([type]) => type)).toEqual(['IHDR', 'tEXt', 'iTXt', 'IEND'])
  })

  it('names CC0 as plain text and as XMP', () => {
    const [, [, copyright], [, xmp]] = chunks(withLicense(blank()))
    expect(copyright).toBe(`Copyright\0${FIGURE_NOTICE}`)
    expect(xmp.startsWith('XML:com.adobe.xmp\0')).toBe(true)
    expect(xmp).toContain(`<xmpRights:WebStatement>${FIGURE_LICENSE.url}</xmpRights:WebStatement>`)
    expect(xmp).toContain('<xmpRights:Marked>False</xmpRights:Marked>')
  })
})
