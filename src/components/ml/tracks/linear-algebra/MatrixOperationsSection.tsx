"use client";

import { useState } from "react";
import { ConceptCallout, Katex, MatrixGrid, PlaygroundShell } from "@/components/ml/primitives";
import type { Matrix2x2 } from "@/components/ml/primitives";
import { TwoMatrixInputs } from "./TwoMatrixInputs";

/** Standard 2x2 matrix product: result[i][j] = sum_k A[i][k] * B[k][j]. */
function multiply2x2(A: Matrix2x2, B: Matrix2x2): Matrix2x2 {
  return [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
}

export default function MatrixOperationsSection() {
  const [matA, setMatA] = useState<Matrix2x2>([
    [2, 0],
    [1, 2],
  ]);
  const [matB, setMatB] = useState<Matrix2x2>([
    [1, 1],
    [0, 1],
  ]);

  const product = multiply2x2(matA, matB);
  const [[a, b], [c, d]] = matA;
  const detA = a * d - b * c;

  const reset = () => {
    setMatA([
      [2, 0],
      [1, 2],
    ]);
    setMatB([
      [1, 1],
      [0, 1],
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          <strong>Matrix multiplication</strong> composes two transformations: applying <Katex expr="B" /> and then{" "}
          <Katex expr="A" /> to a vector is the same as applying the single matrix <Katex expr="AB" />. Each entry is
          a dot product of a row of <Katex expr="A" /> with a column of <Katex expr="B" />:{" "}
          <Katex expr="(AB)_{ij} = \sum_k A_{ik} B_{kj}" />. The <strong>identity matrix</strong>{" "}
          <Katex expr="I = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}" /> is the &ldquo;do nothing&rdquo;
          transformation: <Katex expr="AI = IA = A" /> for every matrix <Katex expr="A" />.
        </p>
        <p>
          A matrix has an <strong>inverse</strong> <Katex expr="A^{-1}" /> when <Katex expr="AA^{-1} = I" /> — undoing
          the transformation exactly. For a 2×2 matrix{" "}
          <Katex expr="A = \begin{bmatrix} a & b \\ c & d \end{bmatrix}" />,{" "}
          <Katex expr="A^{-1} = \dfrac{1}{ad - bc}\begin{bmatrix} d & -b \\ -c & a \end{bmatrix}" /> — which only
          exists when the <strong>determinant</strong> <Katex expr="ad - bc \neq 0" />. A determinant of zero means
          the transformation squashes the plane onto a line (or a point), an operation with no well-defined inverse:
          you can&rsquo;t un-squash information that no longer exists.
        </p>
      </div>

      <ConceptCallout>
        Composing two neural network layers (each computing <Katex expr="y = Wx" />) is literally matrix
        multiplication of their weight matrices. The identity matrix models a skip/residual connection that passes
        its input through unchanged. A weight matrix with determinant near zero collapses information — a real
        failure mode (vanishing directions) in poorly-initialized deep networks.
      </ConceptCallout>

      <PlaygroundShell
        title="Multiplication, Identity, Inverse & Determinant"
        description="Edit A and B; the product C = AB and its area-scaling determinant update live. A's inverse (or why it doesn't have one) is shown below."
        equation={`C = AB = \\begin{bmatrix} ${product[0][0].toFixed(1)} & ${product[0][1].toFixed(1)} \\\\ ${product[1][0].toFixed(1)} & ${product[1][1].toFixed(1)} \\end{bmatrix}`}
        onReset={reset}
        onRandomize={() => {
          const r = () => Math.round((Math.random() * 3 - 1.5) * 10) / 10;
          setMatA([
            [r(), r()],
            [r(), r()],
          ]);
          setMatB([
            [r(), r()],
            [r(), r()],
          ]);
        }}
        presets={[
          {
            label: "A × I = A",
            apply: () => {
              setMatA([[2, 1], [0, 3]]);
              setMatB([[1, 0], [0, 1]]);
            },
          },
          {
            label: "A × A⁻¹ = I",
            apply: () => {
              setMatA([[2, 0], [0, 2]]);
              setMatB([[0.5, 0], [0, 0.5]]);
            },
          },
          {
            label: "Singular (det = 0)",
            apply: () => {
              setMatA([[2, 2], [1, 1]]);
              setMatB([[1, 1], [0, 1]]);
            },
          },
          {
            label: "Compose rotations",
            apply: () => {
              setMatA([[0, -1], [1, 0]]);
              setMatB([[0, -1], [1, 0]]);
            },
          },
        ]}
        controls={
          <>
            <TwoMatrixInputs label="Matrix A" matrix={matA} onChange={setMatA} />
            <TwoMatrixInputs label="Matrix B" matrix={matB} onChange={setMatB} />
            <div className="space-y-1 border-t border-slate-200 pt-3 text-[12px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <p className="font-medium text-slate-600 dark:text-slate-300">Inverse of A</p>
              {detA === 0 ? (
                <p>det(A) = 0 → A is not invertible (singular).</p>
              ) : (
                <>
                  <p>det(A) = {detA.toFixed(2)}</p>
                  <Katex
                    block
                    expr={`A^{-1} = \\dfrac{1}{${detA.toFixed(2)}}\\begin{bmatrix} ${d.toFixed(1)} & ${(-b).toFixed(1)} \\\\ ${(-c).toFixed(1)} & ${a.toFixed(1)} \\end{bmatrix} = \\begin{bmatrix} ${(d / detA).toFixed(2)} & ${(-b / detA).toFixed(2)} \\\\ ${(-c / detA).toFixed(2)} & ${(a / detA).toFixed(2)} \\end{bmatrix}`}
                  />
                </>
              )}
            </div>
          </>
        }
      >
        <MatrixGrid matrix={product} domain={6} />
      </PlaygroundShell>
    </div>
  );
}
