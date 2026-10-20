// Pictures teachers upload for their own organisms. They stay in this
// browser, in IndexedDB (localStorage is too small, and already holds every
// generator's undo history and presets): see docs/adr/0002. The page address,
// undo history and presets hold only a picture's reference, u- and the first
// 12 hex digits of the SHA-256 of the file uploaded, so the same file always
// gets the same reference and a stored picture never changes.
//
// Each upload (PNG, JPEG, WebP, GIF or SVG) is drawn onto a canvas and kept
// as a PNG no more than 300 px on its longer side; drawing an SVG that way
// also leaves behind any script in it. A figure draws a picture as a data
// URI, read into memory when needed, so an exported SVG or PNG carries it
// (an <img> drawing an SVG, as $shared/exporting does, can't load blob: or
// outside addresses).

import { SvelteMap } from 'svelte/reactivity'

export const MAX_IMAGES = 60
export const MAX_SIDE = 300
export const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

const DB = 'food-web-images'
const STORE = 'images'

export interface StoredImage {
  key: string
  blob: Blob
  name: string
  width: number
  height: number
  added: number
}

/** A width and height scaled down, keeping their shape, to fit within `max` on the longer side. */
export function fitWithin(width: number, height: number, max = MAX_SIDE) {
  const w = width > 0 ? width : max
  const h = height > 0 ? height : max
  const k = Math.min(1, max / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}

/** A picture's reference: u- and the first 12 hex digits of its bytes' SHA-256. */
export async function keyOf(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `u-${hex.slice(0, 12)}`
}

/** An uploaded file redrawn as a PNG within MAX_SIDE. Browser only. */
export async function downscale(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('This picture could not be read.')
    return { blob, width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

let opening: Promise<IDBDatabase> | null = null
function db(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      opening = null
      reject(req.error)
    }
  })
  return opening
}

async function request<T>(mode: IDBTransactionMode, make: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await db()).transaction(STORE, mode).objectStore(STORE)
  return new Promise((resolve, reject) => {
    const req = make(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Every stored picture, oldest first. */
export async function listImages(): Promise<StoredImage[]> {
  const all = await request<StoredImage[]>('readonly', (s) => s.getAll())
  return all.sort((a, b) => a.added - b.added)
}

export const getImage = (key: string) => request<StoredImage | undefined>('readonly', (s) => s.get(key))

/** Stores an uploaded file, or finds it already stored, and gives its
 *  reference. Throws with a message for the teacher when it can't. */
export async function addImage(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Choose a PNG, JPEG, WebP, GIF or SVG picture.')
  const key = await keyOf(await file.arrayBuffer())
  if (await getImage(key)) return key
  if ((await request<number>('readonly', (s) => s.count())) >= MAX_IMAGES)
    throw new Error(`You have ${MAX_IMAGES} pictures already. Delete one to add another.`)
  const { blob, width, height } = await downscale(file)
  const name = file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 40) || 'Picture'
  await request('readwrite', (s) => s.put({ key, blob, name, width, height, added: Date.now() } satisfies StoredImage))
  uploads.delete(key)
  return key
}

export async function deleteImage(key: string) {
  await request('readwrite', (s) => s.delete(key))
  uploads.set(key, null)
}

const dataUri = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

/** Each looked-up picture as a data URI, or null when this browser doesn't
 *  have it (a link opened on another computer). Not looked up yet, or on
 *  the server, it is missing from the map, and drawn as missing. */
export const uploads = new SvelteMap<string, string | null>()

/** Looks up pictures not looked up yet. Browser only. */
export async function loadUploads(keys: Iterable<string>) {
  for (const key of new Set(keys)) {
    if (uploads.has(key)) continue
    try {
      const stored = await getImage(key)
      uploads.set(key, stored ? await dataUri(stored.blob) : null)
    } catch {
      uploads.set(key, null)
    }
  }
}
