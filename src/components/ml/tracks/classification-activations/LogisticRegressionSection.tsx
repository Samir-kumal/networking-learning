"use client";

import { useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { sigmoid } from "@/lib/ml/nn/activations";
import { fitLogistic, safeDivisor, type LabeledPoint2D } from "./logisticFit";

/** Two hardcoded, visually separable clusters — fixed so the boundary the user tunes is meaningful. */
const POINTS: LabeledPoint2D[] = [
  { x1: 1, x2: 1, label: 0 },
  { x1: 1.5, x2: 2.5, label: 0 },
  { x1: 2, x2: 1, label: 0 },
  { x1: 1, x2: 3, label: 0 },
  { x1: 5, x2: 5, label: 1 },
  { x1: 4.5, x2: 3.5, label: 1 },
  { x1: 5.5, x2: 4.5, label: 1 },
  { x1: 4, x2: 5.5, label: 1 },
];

const PLOT_DOMAIN: [number, number] = [0, 6.5];

export default function LogisticRegressionSection() {
  const [w1, setW1] = useState(1);
  const [w2, setW2] = useState(1);
  const [b, setB] = useState(-6);

  const w2Safe = safeDivisor(w2);
  const boundaryFn = (x1: number) => -(w1 * x1 + b) / w2Safe;

  const predictions = POINTS.map((p) => {
    const prob = sigmoid.fn(w1 * p.x1 + w2 * p.x2 + b);
    const predictedLabel = prob >= 0.5 ? 1 : 0;
    return { ...p, prob, predictedLabel, correct: predictedLabel === p.label };
  });
  const correctCount = predictions.filter((p) => p.correct).length;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          <strong>Logistic regression</strong> turns a linear combination of features into a probability by feeding
          it through sigmoid: <Katex expr="P(y=1 \mid x) = \sigma(w_1x_1 + w_2x_2 + b)" />. Because sigmoid is
          monotonic and crosses exactly <Katex expr="0.5" /> at <Katex expr="z=0" />, the model predicts class 1
          whenever <Katex expr="w_1x_1+w_2x_2+b > 0" /> and class 0 whenever it&rsquo;s negative.
        </p>
        <p>
          The <strong>decision boundary</strong> is the line where the model is exactly on the fence:{" "}
          <Katex expr="w_1x_1+w_2x_2+b = 0" />, which rearranges to{" "}
          <Katex expr="x_2 = -\dfrac{w_1x_1+b}{w_2}" />. Every point on one side gets classified 1, every point on
          the other side gets classified 0 &mdash; it&rsquo;s always a straight line, because the model itself is
          linear before the sigmoid squashes it.
        </p>
      </div>

      <ConceptCallout>
        Section 3 (&ldquo;Why Non-Linearity Matters&rdquo;) reuses this exact <Katex expr="\sigma(w_1x_1+w_2x_2+b)" />{" "}
        model on the XOR dataset to show a case where <em>no</em> choice of <Katex expr="w_1, w_2, b" /> works — the
        straight-line boundary you&rsquo;re tuning here is fundamentally limited to linearly separable data, which is
        exactly why real classifiers stack non-linear layers on top of it (Chapter 8).
      </ConceptCallout>

      <PlaygroundShell
        title="2D Decision Boundary"
        description="Tune w1, w2, and b so the line correctly separates the two clusters."
        equation={`P(y=1\\mid x) = \\sigma(${w1.toFixed(1)}x_1 ${w2 >= 0 ? "+" : "-"} ${Math.abs(w2).toFixed(1)}x_2 ${b >= 0 ? "+" : "-"} ${Math.abs(b).toFixed(1)})`}
        onReset={() => {
          setW1(1);
          setW2(1);
          setB(-6);
        }}
        onRandomize={() => {
          setW1(Math.round((Math.random() * 10 - 5) * 10) / 10);
          setW2(Math.round((Math.random() * 10 - 5) * 10) / 10);
          setB(Math.round((Math.random() * 30 - 15) * 10) / 10);
        }}
        presets={[
          { label: "Perfect fit", apply: () => { setW1(1); setW2(1); setB(-6); } },
          { label: "Wrong orientation", apply: () => { setW1(1); setW2(-1); setB(0); } },
          { label: "Steep & confident", apply: () => { setW1(5); setW2(5); setB(-30); } },
          {
            label: "Fit with gradient descent",
            apply: () => {
              const fitted = fitLogistic(POINTS, { w1, w2, b });
              setW1(Math.round(fitted.w1 * 100) / 100);
              setW2(Math.round(fitted.w2 * 100) / 100);
              setB(Math.round(fitted.b * 100) / 100);
            },
          },
        ]}
        controls={
          <>
            <Slider label="weight (w1)" value={w1} min={-5} max={5} step={0.1} onChange={setW1} format={(v) => v.toFixed(1)} />
            <Slider label="weight (w2)" value={w2} min={-5} max={5} step={0.1} onChange={setW2} format={(v) => v.toFixed(1)} />
            <Slider label="bias (b)" value={b} min={-40} max={10} step={0.5} onChange={setB} format={(v) => v.toFixed(1)} />
            <div className="rounded-md border border-slate-200 p-2 text-[12px] dark:border-slate-600">
              <span className="font-medium text-slate-600 dark:text-slate-300">accuracy: </span>
              <span className={`font-mono ${correctCount === POINTS.length ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                {correctCount} / {POINTS.length}
              </span>
            </div>
          </>
        }
      >
        <FunctionPlot
          fn={boundaryFn}
          domain={PLOT_DOMAIN}
          range={PLOT_DOMAIN}
          overlays={({ xScale, yScale }) => (
            <>
              {predictions.map((p, i) => (
                <circle
                  key={i}
                  cx={xScale(p.x1)}
                  cy={yScale(p.x2)}
                  r={6}
                  fill={p.label === 1 ? "#4f46e5" : "#dc2626"}
                  stroke={p.correct ? "none" : "#f59e0b"}
                  strokeWidth={2.5}
                />
              ))}
            </>
          )}
        />
      </PlaygroundShell>
    </div>
  );
}
