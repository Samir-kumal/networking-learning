import {
  addVectors,
  matTransposeVecMul,
  matVecMul,
  outerProduct,
  randomMatrix,
  zerosMatrix,
  zerosVector,
  type Matrix,
  type Vector,
} from "./linalg";
import type { Activation } from "./activations";
import type { LossFn } from "./losses";

export interface Sample {
  input: Vector;
  target: Vector;
}

export interface ForwardPass {
  /** Pre-activation values per layer (excludes the input layer). */
  zs: Vector[];
  /** Activations per layer, including the input as as[0]. */
  as: Vector[];
}

export interface BackwardPass {
  gradWeights: Matrix[];
  gradBiases: Vector[];
  loss: number;
  output: Vector;
}

/**
 * A dense feedforward network, forward/backward pass and SGD implemented from
 * scratch (no ML library) — see docs/superpowers/specs/2026-08-15-ml-foundations-lab-design.md §8.
 * Correctness is verified by network.test.ts's finite-difference gradient check.
 */
export class Network {
  readonly layerSizes: number[];
  readonly activations: Activation[];
  weights: Matrix[];
  biases: Vector[];

  constructor(layerSizes: number[], activations: Activation[], rng: () => number = Math.random) {
    if (activations.length !== layerSizes.length - 1) {
      throw new Error(
        `activations.length (${activations.length}) must equal layerSizes.length - 1 (${layerSizes.length - 1})`,
      );
    }
    this.layerSizes = layerSizes;
    this.activations = activations;
    this.weights = [];
    this.biases = [];
    for (let l = 0; l < layerSizes.length - 1; l++) {
      const inSize = layerSizes[l];
      const outSize = layerSizes[l + 1];
      const scale = Math.sqrt(2 / inSize);
      this.weights.push(randomMatrix(outSize, inSize, scale, rng));
      this.biases.push(zerosVector(outSize));
    }
  }

  forward(input: Vector): ForwardPass {
    const as: Vector[] = [input];
    const zs: Vector[] = [];
    let activated = input;
    for (let l = 0; l < this.weights.length; l++) {
      const z = addVectors(matVecMul(this.weights[l], activated), this.biases[l]);
      const activation = this.activations[l];
      activated = z.map((value) => activation.fn(value));
      zs.push(z);
      as.push(activated);
    }
    return { zs, as };
  }

  predict(input: Vector): Vector {
    const { as } = this.forward(input);
    return as[as.length - 1];
  }

  backward(input: Vector, target: Vector, lossFn: LossFn): BackwardPass {
    const { zs, as } = this.forward(input);
    const output = as[as.length - 1];
    const loss = lossFn.loss(output, target);

    const gradWeights: Matrix[] = this.weights.map((w) => zerosMatrix(w.length, w[0]?.length ?? 0));
    const gradBiases: Vector[] = this.biases.map((b) => zerosVector(b.length));

    const outputLayerIndex = this.activations.length - 1;
    let delta = lossFn
      .gradient(output, target)
      .map((g, i) => g * this.activations[outputLayerIndex].derivative(zs[zs.length - 1][i]));

    for (let l = this.weights.length - 1; l >= 0; l--) {
      gradWeights[l] = outerProduct(delta, as[l]);
      gradBiases[l] = delta;
      if (l > 0) {
        const upstream = matTransposeVecMul(this.weights[l], delta);
        const zPrev = zs[l - 1];
        const activationPrev = this.activations[l - 1];
        delta = upstream.map((value, i) => value * activationPrev.derivative(zPrev[i]));
      }
    }

    return { gradWeights, gradBiases, loss, output };
  }

  applyGradients(gradWeights: Matrix[], gradBiases: Vector[], learningRate: number): void {
    for (let l = 0; l < this.weights.length; l++) {
      for (let i = 0; i < this.weights[l].length; i++) {
        for (let j = 0; j < this.weights[l][i].length; j++) {
          this.weights[l][i][j] -= learningRate * gradWeights[l][i][j];
        }
      }
      for (let i = 0; i < this.biases[l].length; i++) {
        this.biases[l][i] -= learningRate * gradBiases[l][i];
      }
    }
  }

  /** One SGD step on a single sample. Returns the pre-update loss. */
  trainStep(input: Vector, target: Vector, lossFn: LossFn, learningRate: number): number {
    const { gradWeights, gradBiases, loss } = this.backward(input, target, lossFn);
    this.applyGradients(gradWeights, gradBiases, learningRate);
    return loss;
  }

  /** One SGD step averaging gradients over a mini-batch. Returns the mean pre-update loss. */
  trainBatch(samples: Sample[], lossFn: LossFn, learningRate: number): number {
    const gradWeightsAcc = this.weights.map((w) => zerosMatrix(w.length, w[0]?.length ?? 0));
    const gradBiasesAcc = this.biases.map((b) => zerosVector(b.length));
    let totalLoss = 0;

    for (const sample of samples) {
      const { gradWeights, gradBiases, loss } = this.backward(sample.input, sample.target, lossFn);
      totalLoss += loss;
      for (let l = 0; l < gradWeights.length; l++) {
        for (let i = 0; i < gradWeights[l].length; i++) {
          for (let j = 0; j < gradWeights[l][i].length; j++) {
            gradWeightsAcc[l][i][j] += gradWeights[l][i][j] / samples.length;
          }
        }
        for (let i = 0; i < gradBiases[l].length; i++) {
          gradBiasesAcc[l][i] += gradBiases[l][i] / samples.length;
        }
      }
    }

    this.applyGradients(gradWeightsAcc, gradBiasesAcc, learningRate);
    return totalLoss / samples.length;
  }
}
