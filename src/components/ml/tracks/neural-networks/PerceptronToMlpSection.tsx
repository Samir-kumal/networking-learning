"use client";

import { useMemo, useState } from "react";
import { ConceptCallout, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { Network } from "@/lib/ml/nn/network";
import { sigmoid } from "@/lib/ml/nn/activations";
import { xorDataset } from "@/lib/ml/nn/datasets";
import { DecisionBoundaryCanvas, type DecisionPoint } from "./DecisionBoundaryCanvas";

type DatasetKey = "clusters" | "xor";

// Two hardcoded clusters that ARE linearly separable — a diagonal line through the
// origin (x1 + x2 = 0) puts every point on the correct side.
const CLUSTERS_POINTS: DecisionPoint[] = [
  { x: -1, y: -1, label: 0 },
  { x: -1.2, y: -0.6, label: 0 },
  { x: -0.6, y: -1.2, label: 0 },
  { x: -1, y: -0.4, label: 0 },
  { x: 1, y: 1, label: 1 },
  { x: 1.2, y: 0.6, label: 1 },
  { x: 0.6, y: 1.2, label: 1 },
  { x: 1, y: 0.4, label: 1 },
];

// The canonical XOR points (also used by Chapter 7's why-nonlinearity-matters and by
// this chapter's train-a-network) — reused here, not redefined, from nn/datasets.ts.
const XOR_POINTS: DecisionPoint[] = xorDataset().map((s) => ({
  x: s.input[0],
  y: s.input[1],
  label: s.target[0] as 0 | 1,
}));

const DATASETS: Record<DatasetKey, { points: DecisionPoint[]; domain: [number, number]; label: string }> = {
  clusters: { points: CLUSTERS_POINTS, domain: [-1.6, 1.6], label: "Linearly separable clusters" },
  xor: { points: XOR_POINTS, domain: [-0.6, 1.6], label: "XOR" },
};

export default function PerceptronToMlpSection() {
  const [dataset, setDataset] = useState<DatasetKey>("clusters");
  const [w1, setW1] = useState(1);
  const [w2, setW2] = useState(1);
  const [b, setB] = useState(0);

  // A perceptron is exactly a Network with one layer and one output neuron — built from
  // the same engine class the rest of this chapter trains, never reimplemented by hand.
  const network = useMemo(() => new Network([2, 1], [sigmoid]), []);
  network.weights[0][0][0] = w1;
  network.weights[0][0][1] = w2;
  network.biases[0][0] = b;

  const points = DATASETS[dataset].points;
  const predictions = points.map((p) => {
    const prob = network.predict([p.x, p.y])[0];
    const predictedLabel = prob >= 0.5 ? 1 : 0;
    return { ...p, prob, correct: predictedLabel === p.label };
  });
  const correctCount = predictions.filter((p) => p.correct).length;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          A <strong>perceptron</strong> is the smallest unit a neural network is built from: one artificial neuron.
          Given inputs <Katex expr="x_1, x_2, \dots" />, it computes a <strong>weighted sum</strong>{" "}
          <Katex expr="z = w_1x_1 + w_2x_2 + b" /> — each weight <Katex expr="w_i" /> says how much that input
          matters and in which direction, and the bias <Katex expr="b" /> shifts the whole sum — then squashes{" "}
          <Katex expr="z" /> through an <strong>activation function</strong> to produce the output:{" "}
          <Katex expr="\hat{y} = \sigma(z) = \sigma(w_1x_1 + w_2x_2 + b)" />. With the sigmoid activation, the
          output lands in <Katex expr="(0, 1)" /> and can be read as &ldquo;probability the input belongs to class
          1.&rdquo;
        </p>
        <p>
          Geometrically, the set of points where <Katex expr="z = 0" /> — where the perceptron is exactly 50/50 — is
          a straight line (in 2D) or a flat plane (in higher dimensions). Everything on one side gets pushed toward
          class 1, everything on the other toward class 0. That means a single perceptron can only ever draw a{" "}
          <strong>straight decision boundary</strong>, no matter how its weights are tuned.
        </p>
        <p>
          That is exactly why a perceptron cannot solve XOR (Chapter 7&rsquo;s{" "}
          <em>why-nonlinearity-matters</em> found the same result from the activation-function side): XOR&rsquo;s
          positive points sit on opposite corners from its negative points, so no single straight line separates
          them. The fix is to stop using one neuron and <strong>stack several into a layer</strong>, then stack
          layers on top of each other with a non-linear activation between them — a{" "}
          <strong>multilayer perceptron (MLP)</strong>. Each hidden neuron draws its own straight line in the input
          space; combining many of those lines through further layers lets the network bend and combine regions into
          shapes far more complex than any single line — enough to represent XOR, circles, spirals, and beyond.
          That&rsquo;s exactly what the next section&rsquo;s trainable network does.
        </p>
      </div>

      <ConceptCallout>
        Every dense layer inside <code>train-a-network</code> and <code>backpropagation-walkthrough</code> (later in
        this chapter) is a bank of these perceptrons run side by side. Logistic regression (Chapter 7) is literally
        one perceptron with a sigmoid output — the &ldquo;stacking&rdquo; idea here is the entire reason a neural
        network can do more than logistic regression can.
      </ConceptCallout>

      <PlaygroundShell
        title="Single-Neuron Classifier"
        description="Tune w1, w2, b and watch the decision boundary move. Switch datasets to see where a single straight line succeeds — and where it can't."
        equation={`\\hat{y} = \\sigma(${w1.toFixed(1)}x_1 ${w2 >= 0 ? "+" : "-"} ${Math.abs(w2).toFixed(1)}x_2 ${b >= 0 ? "+" : "-"} ${Math.abs(b).toFixed(1)})`}
        onReset={() => {
          setW1(1);
          setW2(1);
          setB(0);
        }}
        onRandomize={() => {
          setW1(Math.round((Math.random() * 6 - 3) * 10) / 10);
          setW2(Math.round((Math.random() * 6 - 3) * 10) / 10);
          setB(Math.round((Math.random() * 6 - 3) * 10) / 10);
        }}
        presets={[
          {
            label: "Separable clusters (succeeds)",
            apply: () => {
              setDataset("clusters");
              setW1(1);
              setW2(1);
              setB(0);
            },
          },
          {
            label: "XOR best attempt (fails)",
            apply: () => {
              setDataset("xor");
              setW1(1);
              setW2(1);
              setB(-0.5);
            },
          },
        ]}
        controls={
          <>
            <div className="flex gap-1.5">
              {(Object.keys(DATASETS) as DatasetKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setDataset(key)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${
                    dataset === key
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {DATASETS[key].label}
                </button>
              ))}
            </div>
            <Slider label="weight (w1)" value={w1} min={-3} max={3} step={0.1} onChange={setW1} format={(v) => v.toFixed(1)} />
            <Slider label="weight (w2)" value={w2} min={-3} max={3} step={0.1} onChange={setW2} format={(v) => v.toFixed(1)} />
            <Slider label="bias (b)" value={b} min={-3} max={3} step={0.1} onChange={setB} format={(v) => v.toFixed(1)} />
            <div className="rounded-md border border-slate-200 p-2 text-[12px] dark:border-slate-600">
              <span className="font-medium text-slate-600 dark:text-slate-300">accuracy: </span>
              <span
                className={`font-mono ${correctCount === points.length ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}
              >
                {correctCount} / {points.length}
              </span>
              {dataset === "xor" && correctCount === points.length && (
                <p className="mt-1 text-rose-600 dark:text-rose-400">
                  (Shouldn&rsquo;t be possible — recheck: XOR has no linearly separable solution.)
                </p>
              )}
            </div>
          </>
        }
      >
        <DecisionBoundaryCanvas
          predict={(x, y) => network.predict([x, y])[0]}
          points={points}
          domain={DATASETS[dataset].domain}
        />
      </PlaygroundShell>
    </div>
  );
}
