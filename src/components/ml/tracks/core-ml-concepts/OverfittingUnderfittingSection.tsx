"use client";

import { useMemo, useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { OVERFIT_DATA_POINTS, OVERFIT_DOMAIN, trueCubic } from "./overfitData";
import { evalPolynomial, fitPolynomial, formatPolynomialLatex, polynomialMSE } from "./polyfit";

const PLOT_RANGE: [number, number] = [-5, 6];
const TRUE_CURVE_STEPS = 60;

export default function OverfittingUnderfittingSection() {
  const [degree, setDegree] = useState(3);

  const coeffs = useMemo(() => fitPolynomial(OVERFIT_DATA_POINTS, degree), [degree]);
  const trainLoss = useMemo(() => polynomialMSE(OVERFIT_DATA_POINTS, coeffs), [coeffs]);

  const fitLabel =
    degree <= 1
      ? "Underfitting — too simple to capture the curve (high bias)."
      : degree >= 7
        ? "Overfitting — flexible enough to chase individual noisy points (high variance)."
        : "A reasonable fit — tracks the underlying trend without chasing noise.";

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          A model&rsquo;s complexity has to match the pattern in the data. A degree-<Katex expr="d" /> polynomial{" "}
          <Katex expr="\hat{y} = \beta_0 + \beta_1 x + \cdots + \beta_d x^d" /> fit by least squares can always reduce
          <em> training</em> loss further by raising <Katex expr="d" /> — with enough free coefficients, it can
          curve through almost any set of points. That doesn&rsquo;t mean the extra flexibility helps.
        </p>
        <p>
          <strong>Underfitting</strong> (low <Katex expr="d" />) means the model is too rigid to represent the true
          pattern — high error on both training data and new data (<em>high bias</em>).{" "}
          <strong>Overfitting</strong> (high <Katex expr="d" />) means the model is flexible enough to fit the noise
          in this specific training set — very low training error, but it wiggles wildly between points and
          generalizes poorly to new data (<em>high variance</em>). The dashed gray curve below is the true function
          the noisy data was generated from — compare it to the fitted curve at each degree.
        </p>
      </div>

      <ConceptCallout>
        This bias-variance tradeoff is the reason ML practitioners hold out a separate validation/test set instead of
        judging a model by training loss alone: a neural network (Chapter 8) with too many layers/neurons for its
        dataset overfits exactly like a degree-9 polynomial here, and the fix — more data, regularization, or a
        smaller model — is the same idea in both cases.
      </ConceptCallout>

      <PlaygroundShell
        title="Polynomial Degree vs. Fit"
        description="A fixed, noisy 16-point dataset (sampled from a true cubic). Slide the degree and watch training loss fall while the curve swings from too-rigid to too-wiggly."
        equation={formatPolynomialLatex(coeffs)}
        onReset={() => setDegree(3)}
        onRandomize={() => setDegree(1 + Math.floor(Math.random() * 9))}
        presets={[
          { label: "Underfit (degree 1)", apply: () => setDegree(1) },
          { label: "Good fit (degree 3)", apply: () => setDegree(3) },
          { label: "Overfit (degree 9)", apply: () => setDegree(9) },
        ]}
        controls={
          <>
            <Slider label="polynomial degree" value={degree} min={1} max={9} step={1} onChange={setDegree} format={(v) => String(v)} />
            <div className="space-y-1.5 rounded-md border border-slate-200 p-2.5 text-[12px] dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Training loss (MSE)</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{trainLoss.toFixed(4)}</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400">{fitLabel}</p>
            </div>
          </>
        }
      >
        <FunctionPlot
          fn={(x) => evalPolynomial(coeffs, x)}
          domain={OVERFIT_DOMAIN}
          range={PLOT_RANGE}
          overlays={({ xScale, yScale }) => {
            const [d0, d1] = OVERFIT_DOMAIN;
            const truePoints = Array.from({ length: TRUE_CURVE_STEPS + 1 }, (_, i) => {
              const x = d0 + ((d1 - d0) * i) / TRUE_CURVE_STEPS;
              return `${xScale(x)},${yScale(trueCubic(x))}`;
            }).join(" ");
            return (
              <>
                <polyline points={truePoints} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 4" />
                {OVERFIT_DATA_POINTS.map((p, i) => (
                  <circle key={i} cx={xScale(p.x)} cy={yScale(p.y)} r={4} fill="#0ea5e9" stroke="white" strokeWidth={1} />
                ))}
              </>
            );
          }}
        />
      </PlaygroundShell>
    </div>
  );
}
