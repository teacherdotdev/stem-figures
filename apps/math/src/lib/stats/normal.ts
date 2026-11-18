// The normal distribution's numbers, for the Normal Curve Generator: the
// height of the curve, the area to the left of a value, and the value with a
// given area to its left. Areas are accurate to well past the 4 decimal
// places a figure writes, so they match a calculator's normalcdf and invNorm.

const SQRT_2PI = Math.sqrt(2 * Math.PI)

/** The standard normal curve's height at z. */
export const phi = (z: number) => Math.exp(-(z * z) / 2) / SQRT_2PI

/**
 * The area under the standard normal curve left of z, Φ(z). Hart's double
 * precision rational approximation as given by West (2005), "Better
 * approximations to cumulative normal functions", good to about 1e-15.
 */
export function Phi(z: number): number {
  if (Number.isNaN(z)) return NaN
  const x = Math.abs(z)
  let tail: number
  if (x > 37) tail = 0
  else {
    const e = Math.exp(-(x * x) / 2)
    if (x < 7.07106781186547) {
      let n = 3.52624965998911e-2 * x + 0.700383064443688
      n = n * x + 6.37396220353165
      n = n * x + 33.912866078383
      n = n * x + 112.079291497871
      n = n * x + 221.213596169931
      n = n * x + 220.206867912376
      let d = 8.83883476483184e-2 * x + 1.75566716318264
      d = d * x + 16.064177579207
      d = d * x + 86.7807322029461
      d = d * x + 296.564248779674
      d = d * x + 637.333633378831
      d = d * x + 793.826512519948
      d = d * x + 440.413735824752
      tail = (e * n) / d
    } else {
      let d = x + 0.65
      d = x + 4 / d
      d = x + 3 / d
      d = x + 2 / d
      d = x + 1 / d
      tail = e / d / SQRT_2PI
    }
  }
  return z > 0 ? 1 - tail : tail
}

// Acklam's rational approximation to the inverse, refined below.
const A = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
const B = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
const C = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
const D = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
const P_LOW = 0.02425

/** The z with area p to its left, Φ⁻¹(p), for 0 < p < 1 (±Infinity at 0 and 1). */
export function PhiInverse(p: number): number {
  if (!(p >= 0 && p <= 1)) return NaN
  if (p === 0) return -Infinity
  if (p === 1) return Infinity
  let z: number
  if (p < P_LOW) {
    const q = Math.sqrt(-2 * Math.log(p))
    z = (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
  } else if (p <= 1 - P_LOW) {
    const q = p - 0.5
    const r = q * q
    z = ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) / (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    z = -(((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
  }
  // One step of Halley's method takes it to full double precision.
  const e = Phi(z) - p
  const u = e * SQRT_2PI * Math.exp((z * z) / 2)
  return z - u / (1 + (z * u) / 2)
}

/** The area under a normal curve with mean mu and SD sigma left of x. */
export const cdf = (x: number, mu: number, sigma: number) => Phi((x - mu) / sigma)

/** The value with area p to its left under a normal curve with mean mu and SD sigma. */
export const inverse = (p: number, mu: number, sigma: number) => mu + sigma * PhiInverse(p)
