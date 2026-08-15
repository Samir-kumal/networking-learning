"use client";

import { useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { LOSS_DEMO_VALUES, meanAbsoluteError, meanSquaredError } from "./regressionData";

type Metric = "mse" | "mae";

const PARAM_DOMAIN: [number, number] = [-2, 24];
const DEMO_POINTS = LOSS_DEMO_VALUES.map((y) => ({ x: 0, y }));

const sortedValues = [...LOSS_DEMO_VALUES].sort((a, b) => a - b);
const MEDIAN = sortedValues[Math.floor(sortedValues.length / 2)];
const MEAN = LOSS_DEMO_VALUES.reduce((sum, v) => sum + v, 0) / LOSS_DEMO_VALUES.length;

const TOGGLE_ACTIVE = "bg-indigo-600 text-white";
const TOGGLE_INACTIVE =
  "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

export default function LossFunctionsSection() {
  const [c, setC] = useState(10);
  const [metric, setMetric] = useState<Metric>("mse");

  const lossAt = (value: number) =>
    metric === "mse" ? meanSquaredError(DEMO_POINTS, 0, value) : meanAbsoluteError(DEMO_POINTS, 0, value);
  const currentLoss = lossAt(c);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          A <strong>loss function</strong> turns a model&rsquo;s errors into a single number to minimize. The two
          workhorses of regression are:
        </p>
        <p>
          <strong>Mean squared error</strong>: <Katex expr="\text{MSE} = \dfrac{1}{n}\sum_{i=1}^n (\hat{y}_i - y_i)^2" />{" "}
          — squaring makes every error positive and punishes large errors disproportionately, since doubling an
          error quadruples its contribution.
        </p>
        <p>
          <strong>Mean absolute error</strong>: <Katex expr="\text{MAE} = \dfrac{1}{n}\sum_{i=1}^n |\hat{y}_i - y_i|" />{" "}
          — every error contributes in direct proportion to its size, so one huge outlier can&rsquo;t dominate the
          total the way it does under MSE.
        </p>
      </div>

      <ConceptCallout>
        Chapter 6&rsquo;s gradient descent playground minimizes MSE because it&rsquo;s smooth everywhere (differentiable),
        which makes its gradient well-defined at every point — MAE has a sharp kink at zero error where the gradient
        doesn&rsquo;t exist. In practice, MSE is the default regression loss (and is exactly `mseLoss` in this lab&rsquo;s
        neural-network engine); MAE (or a blend, like Huber loss) is chosen when the data has outliers you don&rsquo;t
        want to dominate training.
      </ConceptCallout>

      <PlaygroundShell
        title="Loss as a Function of the Prediction"
        description={`For the fixed values {${LOSS_DEMO_VALUES.join(", ")}} and a constant prediction ŷ = c, watch how the loss curve's shape — and its minimum — changes with the metric.`}
        equation={`\\text{${metric.toUpperCase()}}(c=${c.toFixed(1)}) = ${currentLoss.toFixed(2)}`}
        onReset={() => {
          setC(10);
          setMetric("mse");
        }}
        onRandomize={() => setC(Math.round((Math.random() * (PARAM_DOMAIN[1] - PARAM_DOMAIN[0]) + PARAM_DOMAIN[0]) * 10) / 10)}
        presets={[
          { label: "MSE-optimal (mean)", apply: () => { setMetric("mse"); setC(Math.round(MEAN * 10) / 10); } },
          { label: "MAE-optimal (median)", apply: () => { setMetric("mae"); setC(MEDIAN); } },
          { label: "Chase the outlier", apply: () => setC(20) },
        ]}
        controls={
          <>
            <div className="flex gap-1.5">
              <button onClick={() => setMetric("mse")} className={`flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition ${metric === "mse" ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}>
                MSE
              </button>
              <button onClick={() => setMetric("mae")} className={`flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition ${metric === "mae" ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}`}>
                MAE
              </button>
            </div>
            <Slider label="prediction (c)" value={c} min={PARAM_DOMAIN[0]} max={PARAM_DOMAIN[1]} step={0.1} onChange={setC} format={(v) => v.toFixed(1)} />
            <div className="space-y-1 rounded-md border border-slate-200 p-2.5 text-[12px] dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">mean</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{MEAN.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">median</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{MEDIAN.toFixed(2)}</span>
              </div>
            </div>
          </>
        }
      >
        <FunctionPlot
          fn={lossAt}
          domain={PARAM_DOMAIN}
          overlays={({ xScale, yScale, innerHeight }) => (
            <>
              {LOSS_DEMO_VALUES.map((v, i) => (
                <line key={i} x1={xScale(v)} x2={xScale(v)} y1={0} y2={innerHeight} className="stroke-slate-300 dark:stroke-slate-600" strokeDasharray="2 3" strokeWidth={1} />
              ))}
              <line x1={xScale(c)} x2={xScale(c)} y1={0} y2={yScale(currentLoss)} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" />
              <circle cx={xScale(c)} cy={yScale(currentLoss)} r={5} fill="#f59e0b" stroke="white" strokeWidth={1.5} />
            </>
          )}
        />
      </PlaygroundShell>
    </div>
  );
}
