// Saving the figure as a picture, for pasting into Docs, Slides or a worksheet.
// Every SVG and PNG carries the CC0 dedication (see license.ts).

import { SVG_METADATA, withLicense } from './license'

/** The figure as SVG text, without anything marked data-no-export (a
 *  selection highlight, say, which is only there while editing), and with
 *  the license as metadata. */
function svgText(svg: SVGSVGElement) {
  const copy = svg.cloneNode(true) as SVGSVGElement
  for (const el of copy.querySelectorAll('[data-no-export]')) el.remove()
  const metadata = new DOMParser().parseFromString(SVG_METADATA, 'image/svg+xml').documentElement
  copy.prepend(copy.ownerDocument.importNode(metadata, true))
  return new XMLSerializer().serializeToString(copy)
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Render the SVG to a high-resolution PNG (3× so it stays sharp when printed),
 *  with the license written into it. */
export function pngBlob(svg: SVGSVGElement, scale = 3): Promise<Blob> {
  const w = svg.viewBox.baseVal.width
  const h = svg.viewBox.baseVal.height
  const url = URL.createObjectURL(new Blob([svgText(svg)], { type: 'image/svg+xml' }))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('PNG export failed'))
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => {
        if (!b) return reject(new Error('PNG export failed'))
        b.arrayBuffer().then((bytes) => resolve(new Blob([withLicense(new Uint8Array(bytes))], { type: 'image/png' })), reject)
      }, 'image/png')
    }
    img.onerror = reject
    img.src = url
  })
}

export async function downloadPng(svg: SVGSVGElement, filename: string) {
  download(await pngBlob(svg), filename)
}

export function downloadSvg(svg: SVGSVGElement, filename: string) {
  download(new Blob([svgText(svg)], { type: 'image/svg+xml' }), filename)
}

/** Put the figure on the clipboard as an image. The promise is handed straight
 *  to ClipboardItem so Safari keeps the click's permission. */
export async function copyPng(svg: SVGSVGElement) {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob(svg) })])
}
