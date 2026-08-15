// Shared fixed dataset + loss/gradient helpers for the linear-regression and
// loss-functions sections of Chapter 6. Colocated helper, not a shared primitive.

export interface DataPoint {
  x: number;
  y: number;
}

/** Roughly y ≈ 2.12x + 2.92 with noise — default points for the linear-regression playground. */
export const DEFAULT_REGRESSION_POINTS: DataPoint[] = [
  { x: 0, y: 2.8 },
  { x: 1, y: 5.6 },
  { x: 2, y: 6.4 },
  { x: 3, y: 10.1 },
  { x: 4, y: 10.6 },
  { x: 5, y: 14.3 },
  { x: 6, y: 14.7 },
  { x: 7, y: 18.5 },
  { x: 8, y: 18.9 },
  { x: 9, y: 22.6 },
];

/** A handful of values with one large outlier — used by the loss-functions playground (ŷ = c, m = 0). */
export const LOSS_DEMO_VALUES = [3, 5, 5, 6, 20];

/** MSE = (1/n)Σ(mxᵢ + b − yᵢ)² for ŷ = mx + b over `points`. */
export function meanSquaredError(points: DataPoint[], m: number, b: number): number {
  if (points.length === 0) return 0;
  const sum = points.reduce((acc, p) => acc + (m * p.x + b - p.y) ** 2, 0);
  return sum / points.length;
}

/** MAE = (1/n)Σ|mxᵢ + b − yᵢ| for ŷ = mx + b over `points`. */
export function meanAbsoluteError(points: DataPoint[], m: number, b: number): number {
  if (points.length === 0) return 0;
  const sum = points.reduce((acc, p) => acc + Math.abs(m * p.x + b - p.y), 0);
  return sum / points.length;
}

/**
 * ∂MSE/∂m = (2/n)Σ(mxᵢ + b − yᵢ)xᵢ and ∂MSE/∂b = (2/n)Σ(mxᵢ + b − yᵢ)
 * for ŷ = mx + b over `points`.
 */
export function mseGradient(points: DataPoint[], m: number, b: number): { gradM: number; gradB: number } {
  if (points.length === 0) return { gradM: 0, gradB: 0 };
  const n = points.length;
  let gradM = 0;
  let gradB = 0;
  for (const p of points) {
    const err = m * p.x + b - p.y;
    gradM += err * p.x;
    gradB += err;
  }
  return { gradM: (2 / n) * gradM, gradB: (2 / n) * gradB };
}
