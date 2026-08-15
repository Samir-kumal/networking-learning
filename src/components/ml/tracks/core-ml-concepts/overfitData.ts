// Fixed noisy dataset for the overfitting-underfitting section: 16 points sampled from a
// true cubic plus noise, generated once at module load with a fixed seed so every render
// (and every reload) sees the exact same points.

import { seededRng } from "@/lib/ml/nn/rng";
import type { DataPoint } from "./polyfit";

export const OVERFIT_DOMAIN: [number, number] = [-3, 3];

/** The true underlying function the noisy data was sampled from (unknown to any fitted model). */
export function trueCubic(x: number): number {
  return 0.15 * x ** 3 - 0.5 * x ** 2 - x + 3;
}

function generateNoisyCubicData(): DataPoint[] {
  const rng = seededRng(42);
  const count = 16;
  const [d0, d1] = OVERFIT_DOMAIN;
  const points: DataPoint[] = [];
  for (let i = 0; i < count; i++) {
    const x = d0 + ((d1 - d0) * i) / (count - 1);
    const noise = (rng() - 0.5) * 1.4;
    points.push({ x, y: trueCubic(x) + noise });
  }
  return points;
}

/** Fixed dataset (seed 42) — computed once at module load, identical on every render. */
export const OVERFIT_DATA_POINTS: DataPoint[] = generateNoisyCubicData();
