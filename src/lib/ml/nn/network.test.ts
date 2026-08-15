import { describe, expect, it } from "vitest";
import { Network } from "./network";
import { sigmoid, tanhActivation, relu, linear } from "./activations";
import { mseLoss, bceLoss, type LossFn } from "./losses";
import { seededRng } from "./rng";
import type { Vector } from "./linalg";

/**
 * Finite-difference gradient check: perturbs each weight by ±epsilon, recomputes
 * the loss, and compares the numerical slope to the analytic gradient backward()
 * produced. This is the correctness proof for the flagship Chapter 8 playground's
 * hand-rolled backprop — see spec §8.
 */
function maxRelativeGradientError(net: Network, input: Vector, target: Vector, lossFn: LossFn, epsilon = 1e-5): number {
  const analytic = net.backward(input, target, lossFn);
  let maxError = 0;

  for (let l = 0; l < net.weights.length; l++) {
    for (let i = 0; i < net.weights[l].length; i++) {
      for (let j = 0; j < net.weights[l][i].length; j++) {
        const original = net.weights[l][i][j];

        net.weights[l][i][j] = original + epsilon;
        const lossPlus = net.backward(input, target, lossFn).loss;

        net.weights[l][i][j] = original - epsilon;
        const lossMinus = net.backward(input, target, lossFn).loss;

        net.weights[l][i][j] = original;

        const numericGrad = (lossPlus - lossMinus) / (2 * epsilon);
        const analyticGrad = analytic.gradWeights[l][i][j];
        const relError =
          Math.abs(numericGrad - analyticGrad) / Math.max(1e-8, Math.abs(numericGrad) + Math.abs(analyticGrad));
        maxError = Math.max(maxError, relError);
      }
    }
  }

  for (let l = 0; l < net.biases.length; l++) {
    for (let i = 0; i < net.biases[l].length; i++) {
      const original = net.biases[l][i];

      net.biases[l][i] = original + epsilon;
      const lossPlus = net.backward(input, target, lossFn).loss;

      net.biases[l][i] = original - epsilon;
      const lossMinus = net.backward(input, target, lossFn).loss;

      net.biases[l][i] = original;

      const numericGrad = (lossPlus - lossMinus) / (2 * epsilon);
      const analyticGrad = analytic.gradBiases[l][i];
      const relError =
        Math.abs(numericGrad - analyticGrad) / Math.max(1e-8, Math.abs(numericGrad) + Math.abs(analyticGrad));
      maxError = Math.max(maxError, relError);
    }
  }

  return maxError;
}

describe("Network backprop matches finite-difference gradients", () => {
  it("a 2-4-1 tanh/sigmoid binary classifier (BCE loss)", () => {
    const net = new Network([2, 4, 1], [tanhActivation, sigmoid], seededRng(42));
    const error = maxRelativeGradientError(net, [0.3, -0.7], [1], bceLoss);
    expect(error).toBeLessThan(1e-4);
  });

  it("a 3-5-4-2 relu/tanh/linear regression network (MSE loss)", () => {
    const net = new Network([3, 5, 4, 2], [relu, tanhActivation, linear], seededRng(7));
    const error = maxRelativeGradientError(net, [0.5, -0.2, 0.9], [0.1, -0.4], mseLoss);
    expect(error).toBeLessThan(1e-4);
  });

  it("the tiny 2-2-1 network used by the backprop walkthrough", () => {
    const net = new Network([2, 2, 1], [sigmoid, sigmoid], seededRng(1));
    const error = maxRelativeGradientError(net, [1, 0.5], [1], bceLoss);
    expect(error).toBeLessThan(1e-4);
  });
});

describe("Network training reduces loss", () => {
  it("drives XOR loss down over training steps", () => {
    const net = new Network([2, 4, 1], [tanhActivation, sigmoid], seededRng(3));
    const samples = [
      { input: [0, 0], target: [0] },
      { input: [0, 1], target: [1] },
      { input: [1, 0], target: [1] },
      { input: [1, 1], target: [0] },
    ];
    const initialLoss = net.trainBatch(samples, bceLoss, 0);
    for (let step = 0; step < 500; step++) {
      net.trainBatch(samples, bceLoss, 0.5);
    }
    const finalLoss = samples.reduce((sum, s) => sum + net.backward(s.input, s.target, bceLoss).loss, 0) / samples.length;
    expect(finalLoss).toBeLessThan(initialLoss * 0.5);
  });
});
