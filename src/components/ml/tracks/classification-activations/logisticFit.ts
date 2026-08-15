import { sigmoid } from "@/lib/ml/nn/activations";

export interface LabeledPoint2D {
  x1: number;
  x2: number;
  label: number;
}

export interface LogisticParams {
  w1: number;
  w2: number;
  b: number;
}

/**
 * Batch gradient descent on the binary cross-entropy loss for a single 2-input
 * logistic unit: dL/dw = X^T(sigmoid(Xw) - y) / n, dL/db = mean(sigmoid(Xw) - y).
 * Reuses the imported `sigmoid` Activation's `fn` so the fitted boundary always
 * agrees with the same sigmoid formula the playgrounds plot. Shared by the
 * logistic-regression and why-nonlinearity-matters sections.
 */
export function fitLogistic(
  points: LabeledPoint2D[],
  init: LogisticParams,
  iterations = 500,
  learningRate = 0.5,
): LogisticParams {
  let { w1, w2, b } = init;
  const n = points.length;
  for (let iter = 0; iter < iterations; iter++) {
    let gw1 = 0;
    let gw2 = 0;
    let gb = 0;
    for (const { x1, x2, label } of points) {
      const z = w1 * x1 + w2 * x2 + b;
      const err = sigmoid.fn(z) - label;
      gw1 += err * x1;
      gw2 += err * x2;
      gb += err;
    }
    w1 -= (learningRate * gw1) / n;
    w2 -= (learningRate * gw2) / n;
    b -= (learningRate * gb) / n;
  }
  return { w1, w2, b };
}

/** Guards the boundary-line formula x2 = -(w1*x1+b)/w2 against division by ~0. */
export function safeDivisor(w2: number): number {
  return Math.abs(w2) < 1e-3 ? (w2 < 0 ? -1e-3 : 1e-3) : w2;
}
