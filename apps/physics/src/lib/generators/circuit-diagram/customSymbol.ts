import type { Field } from '$lib/shared/settings'

export const MAX_SVG_BYTES = 64 * 1024
export const CUSTOM_VIEWBOX = '-30 -24 60 48'

/** Kept with the diagram so presets, undo, and shared links retain the artwork. */
export const customSvgField = (): Field<string> => ({
  default: '',
  clean: value => typeof value === 'string' && value.length <= MAX_SVG_BYTES ? value : '',
  encode: String,
  decode: String,
})

export const CUSTOM_SYMBOL_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CUSTOM_VIEWBOX}" width="600" height="480">
  <title>Custom circuit symbol</title>
  <desc>Keep the viewBox unchanged. Draw inside x=-22 to 22, y=-20 to 20. Terminals are (-30,0) and (30,0). Keep the terminal wires attached to your artwork. The red guides are removed on import.</desc>
  <g id="artwork" fill="none" stroke="#111827" stroke-width="2.2" stroke-linejoin="round">
    <path d="M-30 0 H-20 M20 0 H30" />
    <rect x="-20" y="-8" width="40" height="16" fill="white" />
  </g>
  <g id="connection-guides" fill="none" stroke="#ef4444" stroke-width="0.4" stroke-dasharray="1 2">
    <rect x="-22" y="-20" width="44" height="40" />
    <path d="M-30 -3 V3 M-30 0 H-26 M30 -3 V3 M26 0 H30" />
  </g>
</svg>`

/** Static geometry only: no scripts, external resources, or editor-specific markup. */
export function importCustomSymbol(source: string): string {
  if (new TextEncoder().encode(source).length > MAX_SVG_BYTES) throw new Error('Choose an SVG smaller than 64 KB.')
  if (/<!ENTITY/i.test(source)) throw new Error('Export a plain SVG without XML entity declarations.')
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
  const root = doc.documentElement
  if (doc.querySelector('parsererror') || root.localName !== 'svg') throw new Error('This file is not a valid SVG.')
  const box = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  if (box.length !== 4 || box.some((n, i) => n !== [-30, -24, 60, 48][i])) throw new Error('Keep the template viewBox (-30 -24 60 48) so its terminals align with the wires.')
  root.querySelector('[id="connection-guides"]')?.remove()
  const tags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'title', 'desc'])
  const attributes = new Set(['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'd', 'points', 'transform', 'fill', 'fill-rule', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'dx', 'dy', 'display', 'visibility', 'color'])
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (!tags.has(element.localName) || element.namespaceURI !== 'http://www.w3.org/2000/svg') { element.remove(); continue }
    // Vector editors commonly put presentation properties in inline styles.
    const style = element.getAttribute('style') ?? ''
    for (const rule of style.split(';')) {
      const colon = rule.indexOf(':')
      if (colon < 0) continue
      const key = rule.slice(0, colon).trim(), value = rule.slice(colon + 1).trim()
      if (attributes.has(key) && !/url\s*\(|[<>@\\]|expression/i.test(value)) element.setAttribute(key, value)
    }
    for (const attr of [...element.attributes]) {
      if (!attributes.has(attr.name) || /url\s*\(|[<>@\\]|expression/i.test(attr.value)) element.removeAttributeNode(attr)
    }
  }
  if (!root.querySelector('path, rect, circle, ellipse, line, polyline, polygon, text')) throw new Error('The SVG needs some visible artwork. Convert objects to paths before importing.')
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  root.setAttribute('viewBox', CUSTOM_VIEWBOX)
  root.setAttribute('width', '60')
  root.setAttribute('height', '48')
  if (!root.hasAttribute('fill')) root.setAttribute('fill', 'none')
  if (!root.hasAttribute('stroke')) root.setAttribute('stroke', '#111827')
  if (!root.hasAttribute('stroke-width')) root.setAttribute('stroke-width', '2.2')
  const svg = new XMLSerializer().serializeToString(root)
  if (svg.length > MAX_SVG_BYTES) throw new Error('The SVG is too large. Simplify its paths and try again.')
  return svg
}

export function downloadSymbol(svg = CUSTOM_SYMBOL_TEMPLATE, filename = 'circuit-symbol-template.svg') {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
