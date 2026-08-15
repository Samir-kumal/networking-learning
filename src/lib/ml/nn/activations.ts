// Activation functions used by both the trainable Network (nn/network.ts) and the
// Chapter 7 "Activation Functions" playground, which plots fn/derivative directly.

export interface Activation {
  name: string;
  fn: (z: number) => number;
  /** d(fn)/dz, expressed in terms of the pre-activation z (not the activated value). */
  derivative: (z: number) => number;
}

export const sigmoid: Activation = {
  name: "sigmoid",
  fn: (z) => 1 / (1 + Math.exp(-z)),
  derivative: (z) => {
    const s = 1 / (1 + Math.exp(-z));
    return s * (1 - s);
  },
};

export const tanhActivation: Activation = {
  name: "tanh",
  fn: (z) => Math.tanh(z),
  derivative: (z) => 1 - Math.tanh(z) ** 2,
};

export const relu: Activation = {
  name: "relu",
  fn: (z) => Math.max(0, z),
  derivative: (z) => (z > 0 ? 1 : 0),
};

export const linear: Activation = {
  name: "linear",
  fn: (z) => z,
  derivative: () => 1,
};

/** Softmax over a full logit vector — not per-neuron, so it isn't an `Activation`. */
export function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}
