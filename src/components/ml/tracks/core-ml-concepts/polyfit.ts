// Least-squares polynomial fitting via the normal equations. Colocated helper for the
// overfitting-underfitting section — no numeric library, plain Gaussian elimination.

export interface DataPoint {
  x: number;
  y: number;
}

/** Solves the linear system `matrix · result = vector` via Gaussian elimination with partial pivoting. */
function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const n = vector.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(augmented[r][col]) > Math.abs(augmented[pivotRow][col])) pivotRow = r;
    }
    if (Math.abs(augmented[pivotRow][col]) < 1e-12) continue;
    [augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];

    const pivot = augmented[col][col];
    for (let j = col; j <= n; j++) augmented[col][j] /= pivot;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = augmented[r][col];
      for (let j = col; j <= n; j++) augmented[r][j] -= factor * augmented[col][j];
    }
  }

  return augmented.map((row) => row[n]);
}

/**
 * Least-squares polynomial fit of the given `degree` to `points` via the normal
 * equations (XᵀX)β = Xᵀy, where X is the Vandermonde design matrix. Returns
 * coefficients ascending by power: `coeffs[0]` is the constant term.
 */
export function fitPolynomial(points: DataPoint[], degree: number): number[] {
  const n = degree + 1;
  const design = points.map((p) => Array.from({ length: n }, (_, k) => p.x ** k));

  const XtX = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => design.reduce((sum, row) => sum + row[i] * row[j], 0)),
  );
  const Xty = Array.from({ length: n }, (_, i) => design.reduce((sum, row, k) => sum + row[i] * points[k].y, 0));

  return solveLinearSystem(XtX, Xty);
}

/** Evaluates a polynomial (coefficients ascending by power) at `x`. */
export function evalPolynomial(coeffs: number[], x: number): number {
  return coeffs.reduce((sum, c, p) => sum + c * x ** p, 0);
}

/** Training MSE of a fitted polynomial over `points`. */
export function polynomialMSE(points: DataPoint[], coeffs: number[]): number {
  if (points.length === 0) return 0;
  return points.reduce((sum, p) => sum + (evalPolynomial(coeffs, p.x) - p.y) ** 2, 0) / points.length;
}

/** Renders `coeffs` (ascending by power) as a KaTeX-ready ŷ = ... string, highest power first. */
export function formatPolynomialLatex(coeffs: number[]): string {
  const degree = coeffs.length - 1;
  const parts: string[] = [];
  for (let p = degree; p >= 0; p--) {
    const c = coeffs[p];
    const varPart = p === 0 ? "" : p === 1 ? "x" : `x^{${p}}`;
    const numeric = c.toFixed(2);
    const prefix = c >= 0 && parts.length > 0 ? "+\\," : "";
    parts.push(`${prefix}${numeric}${varPart ? `\\,${varPart}` : ""}`);
  }
  return `\\hat{y} = ${parts.join(" ")}`;
}
