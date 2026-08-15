import type { Vector } from "./linalg";

export interface LossFn {
  loss: (output: Vector, target: Vector) => number;
  /** dLoss/dOutput, one entry per output neuron. */
  gradient: (output: Vector, target: Vector) => Vector;
}

/** Mean squared error over the output vector — regression. */
export const mseLoss: LossFn = {
  loss: (output, target) => output.reduce((sum, value, i) => sum + (value - target[i]) ** 2, 0) / output.length,
  gradient: (output, target) => output.map((value, i) => (2 / output.length) * (value - target[i])),
};

const BCE_EPSILON = 1e-12;

/** Binary cross-entropy — `output` entries must be probabilities in (0, 1) (i.e. a sigmoid output layer). */
export const bceLoss: LossFn = {
  loss: (output, target) =>
    -output.reduce((sum, value, i) => {
      const p = Math.min(Math.max(value, BCE_EPSILON), 1 - BCE_EPSILON);
      return sum + (target[i] * Math.log(p) + (1 - target[i]) * Math.log(1 - p));
    }, 0) / output.length,
  gradient: (output, target) =>
    output.map((value, i) => {
      const p = Math.min(Math.max(value, BCE_EPSILON), 1 - BCE_EPSILON);
      return (p - target[i]) / (p * (1 - p) * output.length);
    }),
};
