"use client";

import { useState } from "react";
import { ConceptCallout, Katex, MatrixGrid, PlaygroundShell, VectorCanvas } from "@/components/ml/primitives";
import type { Matrix2x2 } from "@/components/ml/primitives";

/**
 * Analytic eigen-decomposition for a *symmetric* 2x2 matrix [[a,b],[b,d]].
 * trace T = a+d, det D = ad - b^2 (always real for symmetric matrices, since
 * T^2 - 4D = (a-d)^2 + 4b^2 >= 0 for every a, b, d).
 */
function eigenSymmetric2x2(a: number, b: number, d: number) {
  const trace = a + d;
  const det = a * d - b * b;
  const discriminant = Math.max(0, trace * trace - 4 * det);
  const sqrtDisc = Math.sqrt(discriminant);
  const l1 = (trace + sqrtDisc) / 2;
  const l2 = (trace - sqrtDisc) / 2;

  const eigenvectorFor = (lambda: number) => {
    if (Math.abs(b) > 1e-9) {
      const raw = { x: 1, y: -(a - lambda) / b };
      const norm = Math.hypot(raw.x, raw.y);
      return { x: raw.x / norm, y: raw.y / norm };
    }
    // b === 0: matrix is already diagonal, eigenvectors are the standard basis vectors.
    return Math.abs(lambda - a) < Math.abs(lambda - d) ? { x: 1, y: 0 } : { x: 0, y: 1 };
  };

  return { l1, l2, v1: eigenvectorFor(l1), v2: eigenvectorFor(l2) };
}

export default function EigenvectorsEigenvaluesSection() {
  const [matrix, setMatrix] = useState<Matrix2x2>([
    [2, 1],
    [1, 2],
  ]);
  const [sample, setSample] = useState({ x: 2, y: 0.6 });

  const [[a, b], [, d]] = matrix;
  const { l1, l2, v1, v2 } = eigenSymmetric2x2(a, b, d);
  // Scale the canvas out for large eigenvalues so transformed vectors never run off the edge.
  const canvasDomain = Math.max(5, Math.ceil(Math.max(Math.abs(l1), Math.abs(l2), 1) * 2.5));

  const apply = (x: number, y: number) => ({ x: matrix[0][0] * x + matrix[0][1] * y, y: matrix[1][0] * x + matrix[1][1] * y });

  const before = [
    { id: "v1", x: v1.x * 2, y: v1.y * 2, color: "#4f46e5", label: "v₁ (eigen)" },
    { id: "v2", x: v2.x * 2, y: v2.y * 2, color: "#059669", label: "v₂ (eigen)" },
    { id: "u", x: sample.x, y: sample.y, color: "#f59e0b", label: "u (not eigen)" },
  ];
  const after = before.map((v) => ({ ...v, ...apply(v.x, v.y) }));

  // Keep the matrix symmetric: whichever off-diagonal cell the user just edited wins, and
  // is mirrored onto the other one, so eigenvalues stay guaranteed-real.
  const handleMatrixChange = (next: Matrix2x2) => {
    const off = next[0][1] !== matrix[0][1] ? next[0][1] : next[1][0];
    setMatrix([
      [next[0][0], off],
      [off, next[1][1]],
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          Most vectors change <em>direction</em> when a matrix transforms them. An{" "}
          <strong>eigenvector</strong> is special: it only gets scaled, never rotated —{" "}
          <Katex expr="A\mathbf{v} = \lambda \mathbf{v}" /> for some scalar <Katex expr="\lambda" />, its{" "}
          <strong>eigenvalue</strong>. The vector still lies on the same line through the origin after the
          transform; <Katex expr="\lambda" /> just says how much longer (or shorter, or flipped if{" "}
          <Katex expr="\lambda < 0" />) it got.
        </p>
        <p>
          This playground restricts the matrix to <strong>symmetric</strong> ones (<Katex expr="b = c" />, the two
          off-diagonal sliders are linked) because a symmetric 2×2 matrix always has real eigenvalues —{" "}
          <Katex expr="\lambda = \dfrac{T \pm \sqrt{T^2 - 4D}}{2}" /> where <Katex expr="T = a+d" /> is the trace and{" "}
          <Katex expr="D = ad - bc" /> is the determinant, and for a symmetric matrix{" "}
          <Katex expr="T^2 - 4D = (a-d)^2 + 4b^2 \geq 0" /> is never negative. A general (non-symmetric) matrix can
          have complex eigenvalues with no real &ldquo;unchanged direction&rdquo; to draw at all.
        </p>
      </div>

      <ConceptCallout>
        Principal Component Analysis finds the eigenvectors of a dataset&rsquo;s (symmetric) covariance matrix — the
        eigenvector with the largest eigenvalue is the direction of maximum spread in the data, used for
        dimensionality reduction. The Hessian of a loss function is symmetric too; its eigenvalues describe how
        curved the loss surface is along each principal direction, which governs how gradient descent (Chapter 6)
        behaves near a minimum.
      </ConceptCallout>

      <PlaygroundShell
        title="Eigenvectors & Eigenvalues"
        description="Edit the symmetric matrix; v₁ and v₂ (the eigenvectors) stay on their original line after the transform — u doesn't."
        equation={`A\\mathbf{v} = \\lambda\\mathbf{v} \\quad\\Rightarrow\\quad \\lambda_1 = ${l1.toFixed(2)},\\ \\lambda_2 = ${l2.toFixed(2)}`}
        onReset={() => {
          setMatrix([
            [2, 1],
            [1, 2],
          ]);
          setSample({ x: 2, y: 0.6 });
        }}
        onRandomize={() => {
          const r = () => Math.round((Math.random() * 6 - 3) * 10) / 10;
          const rb = () => Math.round((Math.random() * 4 - 2) * 10) / 10;
          const nb = rb();
          setMatrix([
            [r(), nb],
            [nb, r()],
          ]);
        }}
        presets={[
          { label: "Real distinct (default)", apply: () => setMatrix([[2, 1], [1, 2]]) },
          { label: "Axis-aligned (diagonal)", apply: () => setMatrix([[3, 0], [0, 1]]) },
          { label: "Negative eigenvalue (flip)", apply: () => setMatrix([[1, 2], [2, 1]]) },
          { label: "Equal eigenvalues (uniform scale)", apply: () => setMatrix([[2, 0], [0, 2]]) },
        ]}
        controls={
          <div className="space-y-3">
            <MatrixGrid matrix={matrix} onChange={handleMatrixChange} domain={5} showDeterminant />
            <div className="space-y-1 border-t border-slate-200 pt-3 text-[12px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <p>
                <Katex expr="\lambda_1" /> = {l1.toFixed(2)}, eigenvector ≈ ({v1.x.toFixed(2)}, {v1.y.toFixed(2)})
              </p>
              <p>
                <Katex expr="\lambda_2" /> = {l2.toFixed(2)}, eigenvector ≈ ({v2.x.toFixed(2)}, {v2.y.toFixed(2)})
              </p>
              <p>sum of eigenvalues = trace ({(a + d).toFixed(2)}); product = determinant.</p>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Before (drag u)
            </p>
            <VectorCanvas
              vectors={before}
              domain={canvasDomain}
              onDragVector={(id, x, y) => {
                if (id === "u") setSample({ x, y });
              }}
            />
          </div>
          <div>
            <p className="mb-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
              After A is applied
            </p>
            <VectorCanvas vectors={after} domain={canvasDomain} />
          </div>
        </div>
      </PlaygroundShell>
    </div>
  );
}
