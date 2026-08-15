"use client";

import { useState } from "react";
import { ConceptCallout, Katex, MatrixGrid, PlaygroundShell } from "@/components/ml/primitives";
import type { Matrix2x2 } from "@/components/ml/primitives";

export default function MatrixTransformationsSection() {
  const [matrix, setMatrix] = useState<Matrix2x2>([
    [1, 0],
    [0, 1],
  ]);

  const [[a, b], [c, d]] = matrix;
  const det = a * d - b * c;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          A 2×2 matrix is more than a grid of numbers — it&rsquo;s a rule for moving every point in the plane, called
          a <strong>linear transformation</strong>. Applying matrix{" "}
          <Katex expr="A = \begin{bmatrix} a & b \\ c & d \end{bmatrix}" /> to a vector{" "}
          <Katex expr="(x, y)" /> gives the new point{" "}
          <Katex expr="(ax + by,\ cx + dy)" />. Grid lines that were straight and evenly spaced stay straight and
          evenly spaced after the transform — that&rsquo;s exactly what makes it <em>linear</em>.
        </p>
        <p>
          The fastest way to read a matrix: its <strong>first column</strong> <Katex expr="(a, c)" /> is where the
          basis vector <Katex expr="\hat{i} = (1,0)" /> lands, and its <strong>second column</strong>{" "}
          <Katex expr="(b, d)" /> is where <Katex expr="\hat{j} = (0,1)" /> lands. Every other vector transforms as a
          combination of those two landing spots. The shaded unit square below shows both basis vectors&rsquo;
          images at once — its area is <Katex expr="|\det A|" />, the transformation&rsquo;s area scale factor
          (Chapter 2.3 covers this in depth).
        </p>
      </div>

      <ConceptCallout>
        Every fully-connected neural network layer computes <Katex expr="\mathbf{y} = W\mathbf{x}" /> — a matrix
        multiplication that linearly reshapes its input space, exactly like this grid distortion — before a
        non-linear activation (Chapter 7) bends it further. Stacking layers composes these linear transformations.
      </ConceptCallout>

      <PlaygroundShell
        title="Matrices as Transformations"
        description="Edit the four entries (or use a preset) and watch the grid and unit square warp."
        equation={`A = \\begin{bmatrix} ${a.toFixed(1)} & ${b.toFixed(1)} \\\\ ${c.toFixed(1)} & ${d.toFixed(1)} \\end{bmatrix}`}
        onReset={() =>
          setMatrix([
            [1, 0],
            [0, 1],
          ])
        }
        onRandomize={() => {
          const r = () => Math.round((Math.random() * 4 - 2) * 10) / 10;
          setMatrix([
            [r(), r()],
            [r(), r()],
          ]);
        }}
        presets={[
          { label: "Identity", apply: () => setMatrix([[1, 0], [0, 1]]) },
          { label: "Rotate 90°", apply: () => setMatrix([[0, -1], [1, 0]]) },
          { label: "Shear", apply: () => setMatrix([[1, 1], [0, 1]]) },
          { label: "Scale 2x", apply: () => setMatrix([[2, 0], [0, 2]]) },
        ]}
        controls={
          <div className="space-y-3 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            <p>
              <span className="font-medium text-slate-600 dark:text-slate-300">
                Column 1 — where <Katex expr="\hat{i}" /> lands:
              </span>{" "}
              ({a.toFixed(1)}, {c.toFixed(1)})
            </p>
            <p>
              <span className="font-medium text-slate-600 dark:text-slate-300">
                Column 2 — where <Katex expr="\hat{j}" /> lands:
              </span>{" "}
              ({b.toFixed(1)}, {d.toFixed(1)})
            </p>
            <p>
              {det === 0
                ? "det = 0: the grid collapses onto a line — the transform squashes 2D space into 1D."
                : det < 0
                  ? `det = ${det.toFixed(2)}: negative, so the transform flips orientation (mirrors the plane) in addition to scaling area by |det|.`
                  : `det = ${det.toFixed(2)}: positive, so orientation is preserved and area scales by this factor.`}
            </p>
          </div>
        }
      >
        <MatrixGrid matrix={matrix} onChange={setMatrix} domain={5} />
      </PlaygroundShell>
    </div>
  );
}
