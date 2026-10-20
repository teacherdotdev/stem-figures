// The optics of a Ray Diagram: where a thin lens or a mirror puts the image of
// an object, and the principal rays from the object's tip. Signs are handled
// here and nowhere else, "real is positive": a focal length is negative for a
// diverging lens or a convex mirror, and an image distance is negative for a
// virtual image.
//
// Everything is in cm, with the lens or mirror at x = 0, the object on the
// left at x = −d_o, and y up from the principal axis. Rays bend (or reflect)
// at the vertical line x = 0, the thin-lens convention textbooks draw, so they
// meet exactly where 1/f = 1/d_o + 1/d_i puts the image.

export const ELEMENTS = ['converging', 'diverging', 'concave', 'convex', 'plane'] as const
export type Element = (typeof ELEMENTS)[number]

export const isLens = (e: Element) => e === 'converging' || e === 'diverging'
/** A concave or convex mirror: one with focal points. */
export const isCurvedMirror = (e: Element) => e === 'concave' || e === 'convex'

/** The focal length with its sign: positive for a converging lens or concave
 *  mirror, negative for a diverging lens or convex mirror. A plane mirror has
 *  none (it is infinite). */
export function signedFocal(e: Element, f: number) {
  if (e === 'plane') return Infinity
  return e === 'converging' || e === 'concave' ? Math.abs(f) : -Math.abs(f)
}

export interface Point {
  x: number
  y: number
}

export interface Image {
  /** d_i: positive for a real image, negative for a virtual one */
  distance: number
  /** m = −d_i/d_o: positive for an image the same way up as the object */
  magnification: number
  /** where it is on the axis, in cm right of the lens or mirror */
  x: number
  /** its tip's height, in cm up from the axis */
  height: number
  real: boolean
}

/** How close two distances must be to count as the same, in cm: an object this close to F is at F. */
const SAME = 1e-9

/** Is the object at the focal point of a converging lens or concave mirror, so its rays leave parallel and there's no image? */
export const atFocus = (e: Element, f: number, d: number) => {
  const fs = signedFocal(e, f)
  return fs > 0 && Number.isFinite(fs) && Math.abs(d - fs) < SAME
}

/**
 * The image of an object `d` cm from the lens or mirror whose tip is `h` cm
 * up from the axis (negative for an object pointing down), from the thin lens
 * and mirror equation 1/f = 1/d_o + 1/d_i with m = −d_i/d_o. A plane mirror's
 * image is as far behind it as the object is in front, the same size. Null
 * for an object at F: its rays leave parallel and the image is at infinity.
 */
export function imageOf(e: Element, f: number, d: number, h: number): Image | null {
  if (atFocus(e, f, d)) return null
  const fs = signedFocal(e, f)
  const distance = e === 'plane' ? -d : (fs * d) / (d - fs)
  const magnification = -distance / d
  // A lens's real image is on the far side; a mirror's is in front of it, on the object's side.
  const x = isLens(e) ? distance : -distance
  return { distance, magnification, x, height: magnification * h, real: distance > 0 }
}

/** The principal rays, by name. A plane mirror has two rays from the tip, one down to its foot and one up past the tip. */
export type RayId = 'parallel' | 'center' | 'focal' | 'vertex' | 'upper'

export const RAYS_OF: Record<Element, RayId[]> = {
  converging: ['parallel', 'center', 'focal'],
  diverging: ['parallel', 'center', 'focal'],
  concave: ['parallel', 'focal', 'center', 'vertex'],
  convex: ['parallel', 'focal', 'center', 'vertex'],
  plane: ['vertex', 'upper'],
}

/** One principal ray, from the object's tip to the lens or mirror and on. */
export interface PrincipalRay {
  id: RayId
  /** the object's tip */
  from: Point
  /** where it meets the line through the lens's middle or the mirror's vertex */
  hit: Point
  /** the way it goes from there (not of unit length) */
  dir: Point
  /** For a ray that leaves as if from a focal point behind it (a diverging lens's or convex mirror's parallel ray), that point: its dashed line back goes there. */
  backTo?: Point
  /** A dashed construction line along the rule: from F to the tip, for a ray that seems to come from F, or on from the hit to the point the ray was heading for. */
  aim?: [Point, Point]
}

const p = (x: number, y: number): Point => ({ x, y })

/**
 * The principal rays from the tip of an object `d` cm away and `h` cm tall.
 * Lenses: parallel then through F′ (or as if from F), through the centre
 * undeviated, and through F (or toward F′) then parallel. Mirrors: parallel
 * then through F, through F then parallel, through C and back on itself, and
 * to the vertex, reflected at the same angle. A ray along the lens or mirror
 * (through F with the object at F, or through C with the object at C) is
 * left out, since it never reaches it.
 */
export function principalRays(e: Element, f: number, d: number, h: number): PrincipalRay[] {
  const tip = p(-d, h)
  if (e === 'plane') {
    return [
      { id: 'vertex', from: tip, hit: p(0, 0), dir: p(-d, -h) },
      { id: 'upper', from: tip, hit: p(0, 2 * h), dir: p(-d, h) },
    ]
  }
  const fs = signedFocal(e, f)
  const a = Math.abs(fs)
  const sign = Math.sign(fs)
  const lens = isLens(e)
  // Rays leave a lens going right, and a mirror going left.
  const out = lens ? 1 : -1
  /** the focal point a ray through F heads for: in front of a converging lens or concave mirror, behind a diverging lens or convex mirror */
  const F = p(-fs, 0)
  /** the focal point a parallel ray leaves through, or seems to come from */
  const parallelF = lens ? p(fs, 0) : p(-fs, 0)
  const rays: PrincipalRay[] = []

  rays.push({
    id: 'parallel',
    from: tip,
    hit: p(0, h),
    dir: p(out * a, -sign * h),
    backTo: fs < 0 ? parallelF : undefined,
  })

  if (lens) rays.push({ id: 'center', from: tip, hit: p(0, 0), dir: p(d, -h) })

  if (Math.abs(d - fs) >= SAME) {
    const y = (-h * fs) / (d - fs)
    const hit = p(0, y)
    rays.push({
      id: 'focal',
      from: tip,
      hit,
      dir: p(out, 0),
      aim: fs > 0 ? (d < fs ? [F, tip] : undefined) : [hit, F],
    })
  }

  if (!lens) {
    const C = p(-2 * fs, 0)
    if (Math.abs(d - 2 * fs) >= SAME) {
      const hit = p(0, (-2 * fs * h) / (d - 2 * fs))
      rays.push({ id: 'center', from: tip, hit, dir: p(tip.x - hit.x, tip.y - hit.y), aim: fs < 0 ? [hit, C] : undefined })
    }
    rays.push({ id: 'vertex', from: tip, hit: p(0, 0), dir: p(-d, -h) })
  }
  return rays
}

/** The focal points marked on the axis, in cm from the lens or mirror: F, F′, 2F and 2F′ on a lens (F and 2F on the object's side), F and C on a mirror. */
export function focalPoints(e: Element, f: number): { id: 'f' | 'fBack' | 'twoF' | 'twoFBack' | 'c'; x: number }[] {
  if (e === 'plane') return []
  const fs = signedFocal(e, f)
  const a = Math.abs(fs)
  if (isLens(e)) {
    return [
      { id: 'twoF', x: -2 * a },
      { id: 'f', x: -a },
      { id: 'fBack', x: a },
      { id: 'twoFBack', x: 2 * a },
    ]
  }
  return [
    { id: 'c', x: -2 * fs },
    { id: 'f', x: -fs },
  ]
}

/** A distance in cm as the answer key writes it: to a tenth, with a real minus sign. */
export function cmText(n: number) {
  const r = Math.round(n * 10) / 10 || 0
  return `${r < 0 ? '−' : ''}${Math.abs(r)} cm`
}

/** A magnification to two places, with its sign: "+2", "−0.5", "+0.33". */
export function magnificationText(m: number) {
  const r = Math.round(m * 100) / 100 || 0
  return `${r < 0 ? '−' : '+'}${Math.abs(r)}`
}

/**
 * The answer key, real is positive, with the words too, so it reads right in
 * any sign convention: "Image distance: 15 cm, magnification: −0.5" and
 * "Real, inverted, diminished, on the far side of the lens".
 */
export function answerLines(e: Element, f: number, d: number): string[] {
  const image = imageOf(e, f, d, 1)
  if (!image) return ['No image (at infinity): the rays leave parallel']
  const m = image.magnification
  const size = Math.abs(Math.abs(m) - 1) < 1e-6 ? 'same size' : Math.abs(m) > 1 ? 'magnified' : 'diminished'
  const where = isLens(e)
    ? image.real
      ? 'on the far side of the lens'
      : 'on the same side as the object'
    : image.real
      ? 'in front of the mirror'
      : 'behind the mirror'
  return [
    `Image distance: ${cmText(image.distance)}, magnification: ${magnificationText(m)}`,
    `${image.real ? 'Real' : 'Virtual'}, ${m > 0 ? 'upright' : 'inverted'}, ${size}, ${where}`,
  ]
}
