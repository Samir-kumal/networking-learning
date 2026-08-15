// Minimal vector/matrix helpers backing the from-scratch neural network engine.
// Matrices are row-major: an [outSize x inSize] Matrix represents a dense layer's
// weights, so matVecMul(W, x) computes W's forward pass directly.

export type Vector = number[];
export type Matrix = number[][];

export function zerosVector(n: number): Vector {
  return new Array(n).fill(0);
}

export function zerosMatrix(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

export function randomMatrix(rows: number, cols: number, scale: number, rng: () => number = Math.random): Matrix {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rng() * 2 - 1) * scale));
}

export function matVecMul(matrix: Matrix, vector: Vector): Vector {
  return matrix.map((row) => row.reduce((sum, weight, j) => sum + weight * vector[j], 0));
}

/** Computes `matrix^T @ vector` — used in backprop to push a downstream layer's delta upstream. */
export function matTransposeVecMul(matrix: Matrix, vector: Vector): Vector {
  const cols = matrix[0]?.length ?? 0;
  const result = zerosVector(cols);
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < cols; j++) {
      result[j] += matrix[i][j] * vector[i];
    }
  }
  return result;
}

export function outerProduct(a: Vector, b: Vector): Matrix {
  return a.map((ai) => b.map((bj) => ai * bj));
}

export function addVectors(a: Vector, b: Vector): Vector {
  return a.map((value, i) => value + b[i]);
}
