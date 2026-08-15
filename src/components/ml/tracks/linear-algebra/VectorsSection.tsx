"use client";

import { useState } from "react";
import { ConceptCallout, Katex, PlaygroundShell, Slider, VectorCanvas } from "@/components/ml/primitives";

export default function VectorsSection() {
  const [a, setA] = useState({ x: 3, y: 1 });
  const [bRaw, setBRaw] = useState({ x: 1, y: 3 });
  const [k, setK] = useState(1);

  // b is bRaw scaled by k — dragging the on-canvas vector "un-scales" back into bRaw
  // so the slider and the drag stay consistent with each other.
  const b = { x: k * bRaw.x, y: k * bRaw.y };
  const dot = a.x * b.x + a.y * b.y;
  const sum = { x: a.x + b.x, y: a.y + b.y };

  const reset = () => {
    setA({ x: 3, y: 1 });
    setBRaw({ x: 1, y: 3 });
    setK(1);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          A <strong>vector</strong> is just an ordered list of numbers — <Katex expr="\mathbf{v} = (x, y)" /> in 2D —
          but it has a geometric picture too: an arrow from the origin to the point <Katex expr="(x, y)" />.
          <strong> Addition</strong> is tail-to-head: <Katex expr="\mathbf{a} + \mathbf{b}" /> lands where you&rsquo;d
          end up walking along <Katex expr="\mathbf{a}" /> and then <Katex expr="\mathbf{b}" />.{" "}
          <strong>Scaling</strong> a vector by <Katex expr="k" /> stretches (or flips, if <Katex expr="k < 0" />) it
          without changing its direction: <Katex expr="k\mathbf{v} = (kx, ky)" />.
        </p>
        <p>
          The <strong>dot product</strong> <Katex expr="\mathbf{a} \cdot \mathbf{b} = a_x b_x + a_y b_y" /> is a single
          number measuring how much two vectors point the same way. Geometrically it equals{" "}
          <Katex expr="|\mathbf{a}||\mathbf{b}|\cos\theta" /> — positive when the angle between them is under 90°,
          zero when they&rsquo;re perpendicular (orthogonal), negative when they point more away from each other than
          toward. The gold segment in the playground below is the <em>projection</em> of one vector onto the other —
          its signed length, scaled by <Katex expr="|\mathbf{a}|" />, is exactly the dot product.
        </p>
      </div>

      <ConceptCallout>
        A dot product is the core arithmetic inside every neuron: a layer computes a weighted sum{" "}
        <Katex expr="w_1 x_1 + w_2 x_2 + \cdots = \mathbf{w} \cdot \mathbf{x}" /> of its inputs — that&rsquo;s a dot
        product between the weight vector and the input vector. Cosine similarity (word embeddings, recommender
        systems) is this same dot product normalized by the vectors&rsquo; lengths.
      </ConceptCallout>

      <PlaygroundShell
        title="Vectors: Addition, Scaling & the Dot Product"
        description="Drag a or b, scale b by k, and watch the sum and the dot-product projection (gold) update live."
        equation={`\\mathbf{a}\\cdot\\mathbf{b} = (${a.x.toFixed(1)})(${b.x.toFixed(1)}) + (${a.y.toFixed(1)})(${b.y.toFixed(1)}) = ${dot.toFixed(2)}`}
        onReset={reset}
        onRandomize={() => {
          const r = () => Math.round((Math.random() * 8 - 4) * 2) / 2;
          setA({ x: r() || 1, y: r() });
          setBRaw({ x: r() || 1, y: r() });
          setK(Math.round((Math.random() * 1.5 + 0.5) * 10) / 10);
        }}
        presets={[
          {
            label: "Orthogonal vectors",
            apply: () => {
              setA({ x: 3, y: 1 });
              setBRaw({ x: -1, y: 3 });
              setK(1);
            },
          },
          {
            label: "Parallel vectors",
            apply: () => {
              setA({ x: 2, y: 1 });
              setBRaw({ x: 2, y: 1 });
              setK(2);
            },
          },
          {
            label: "Opposite directions",
            apply: () => {
              setA({ x: 2, y: 2 });
              setBRaw({ x: 2, y: 2 });
              setK(-1);
            },
          },
        ]}
        controls={
          <>
            <Slider label="a.x" value={a.x} min={-5} max={5} step={0.5} onChange={(x) => setA({ ...a, x })} />
            <Slider label="a.y" value={a.y} min={-5} max={5} step={0.5} onChange={(y) => setA({ ...a, y })} />
            <Slider
              label="b.x (before scaling)"
              value={bRaw.x}
              min={-5}
              max={5}
              step={0.5}
              onChange={(x) => setBRaw({ ...bRaw, x })}
            />
            <Slider
              label="b.y (before scaling)"
              value={bRaw.y}
              min={-5}
              max={5}
              step={0.5}
              onChange={(y) => setBRaw({ ...bRaw, y })}
            />
            <Slider label="scalar k" value={k} min={-2} max={2} step={0.1} onChange={setK} format={(v) => v.toFixed(1)} />
            <div className="space-y-1 border-t border-slate-200 pt-3 text-[12px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <p>
                <Katex expr="\mathbf{a} + \mathbf{b}" /> = ({sum.x.toFixed(1)}, {sum.y.toFixed(1)})
              </p>
              <p>
                <Katex expr="\mathbf{a} \cdot \mathbf{b}" /> = {dot.toFixed(2)}
                {Math.abs(dot) < 0.05 && " (orthogonal)"}
              </p>
            </div>
          </>
        }
      >
        <VectorCanvas
          vectors={[
            { id: "a", x: a.x, y: a.y, color: "#4f46e5", label: "a" },
            { id: "b", x: b.x, y: b.y, color: "#059669", label: "b" },
          ]}
          onDragVector={(id, x, y) => {
            if (id === "a") setA({ x, y });
            else if (k !== 0) setBRaw({ x: x / k, y: y / k });
          }}
          showSum
          showProjectionOnto="a"
        />
      </PlaygroundShell>
    </div>
  );
}
