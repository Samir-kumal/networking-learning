"use client";

import { useState } from "react";
import { ConceptCallout, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { BarChart } from "./BarChart";

const DIE_VALUES = [1, 2, 3, 4];

export default function ExpectationVarianceBayesSection() {
  const [weights, setWeights] = useState<number[]>([1, 1, 1, 1]);
  const [prior, setPrior] = useState(0.01);
  const [sensitivity, setSensitivity] = useState(0.95);
  const [falsePositiveRate, setFalsePositiveRate] = useState(0.05);

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const probs = weights.map((w) => w / totalWeight);
  const mean = DIE_VALUES.reduce((sum, v, i) => sum + v * probs[i], 0);
  const meanOfSquares = DIE_VALUES.reduce((sum, v, i) => sum + v * v * probs[i], 0);
  const variance = Math.max(meanOfSquares - mean * mean, 0);
  const stddev = Math.sqrt(variance);

  // Law of total probability: P(+) = P(+|D)P(D) + P(+|¬D)P(¬D).
  const pPositive = sensitivity * prior + falsePositiveRate * (1 - prior);
  const posterior = pPositive > 0 ? (sensitivity * prior) / pPositive : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          For a discrete random variable, the <strong>expectation</strong> (mean){" "}
          <Katex expr="E[X] = \sum_i x_i \, p(x_i)" /> is the probability-weighted average of every outcome — not
          the plain average, but each outcome pulled toward it in proportion to how likely it is.
        </p>
        <p>
          The <strong>variance</strong> <Katex expr="\text{Var}(X) = E[(X - E[X])^2]" /> measures how spread out{" "}
          <Katex expr="X" /> is around its mean. Expanding the square gives a shortcut that&rsquo;s almost always
          used in practice: <Katex expr="E[(X-\mu)^2] = E[X^2 - 2\mu X + \mu^2] = E[X^2] - 2\mu E[X] + \mu^2" />.
          Since <Katex expr="E[X] = \mu" />, that middle term is <Katex expr="-2\mu^2" />, leaving{" "}
          <Katex expr="\text{Var}(X) = E[X^2] - E[X]^2" /> — &ldquo;the mean of the squares minus the square of the
          mean.&rdquo;
        </p>
        <p>
          <strong>Bayes&rsquo; theorem</strong>{" "}
          <Katex expr="P(A\mid B) = \dfrac{P(B\mid A)P(A)}{P(B)}" /> flips a conditional probability around: it lets
          you go from &ldquo;how likely is the evidence, given the cause&rdquo; to &ldquo;how likely is the cause,
          given the evidence.&rdquo; The denominator expands via the{" "}
          <strong>law of total probability</strong>:{" "}
          <Katex expr="P(B) = P(B\mid A)P(A) + P(B\mid \lnot A)P(\lnot A)" /> — every way <Katex expr="B" /> can
          happen, whether <Katex expr="A" /> is true or false.
        </p>
      </div>

      <ConceptCallout>
        <Katex expr="E[X]" /> is the loss function&rsquo;s target: minimizing mean-squared error (Chapter 6) is
        minimizing an <em>expectation</em> of squared residuals over the training set. Bayes&rsquo; theorem is the
        mathematical backbone of a Naive Bayes classifier and of Bayesian model updating in general — and the
        base-rate intuition in the calculator below (a positive test on a rare condition is usually still a false
        positive) is exactly why accuracy alone is a misleading metric for imbalanced classification problems.
      </ConceptCallout>

      <PlaygroundShell
        title="Expectation & Variance of a Weighted Die"
        description="Adjust each face's relative weight — they're normalized into probabilities that sum to 1 — and watch E[X] and Var(X) update live."
        equation={`E[X]=${mean.toFixed(2)},\\quad \\text{Var}(X)=${variance.toFixed(2)},\\quad \\text{SD}(X)=${stddev.toFixed(2)}`}
        onReset={() => setWeights([1, 1, 1, 1])}
        onRandomize={() => setWeights(DIE_VALUES.map(() => Math.round((Math.random() * 4.5 + 0.5) * 10) / 10))}
        presets={[
          { label: "Fair die", apply: () => setWeights([1, 1, 1, 1]) },
          { label: "Loaded toward 4", apply: () => setWeights([0.5, 0.5, 1, 4]) },
          { label: "Loaded toward 1", apply: () => setWeights([4, 1, 0.5, 0.5]) },
          { label: "Nearly certain (low variance)", apply: () => setWeights([0.05, 0.05, 0.05, 5]) },
        ]}
        controls={
          <>
            {DIE_VALUES.map((v, i) => (
              <Slider
                key={v}
                label={`weight for X=${v}`}
                value={weights[i]}
                min={0.05}
                max={5}
                step={0.05}
                onChange={(next) => setWeights((prev) => prev.map((w, idx) => (idx === i ? next : w)))}
                format={(val) => val.toFixed(2)}
              />
            ))}
            <div className="space-y-1 text-[12px] text-slate-500 dark:text-slate-400">
              {DIE_VALUES.map((v, i) => (
                <p key={v}>
                  P(X={v}) = <span className="font-mono">{probs[i].toFixed(3)}</span>
                </p>
              ))}
            </div>
          </>
        }
      >
        <BarChart
          bars={DIE_VALUES.map((v, i) => ({ label: `X=${v}`, value: probs[i] }))}
          maxValue={1}
          valueFormat={(v) => v.toFixed(2)}
        />
      </PlaygroundShell>

      <PlaygroundShell
        title="Bayes' Theorem: Medical Test Calculator"
        description="A positive result doesn't mean what most people assume. Tune the disease prevalence, test sensitivity, and false-positive rate to see why."
        equation={`P(D\\mid{+}) = \\dfrac{P({+}\\mid D)P(D)}{P({+}\\mid D)P(D) + P({+}\\mid\\lnot D)P(\\lnot D)} = ${posterior.toFixed(3)}`}
        onReset={() => {
          setPrior(0.01);
          setSensitivity(0.95);
          setFalsePositiveRate(0.05);
        }}
        onRandomize={() => {
          setPrior(Math.round((Math.random() * 0.4 + 0.005) * 1000) / 1000);
          setSensitivity(Math.round((Math.random() * 0.4 + 0.6) * 100) / 100);
          setFalsePositiveRate(Math.round(Math.random() * 0.25 * 100) / 100);
        }}
        presets={[
          {
            label: "Rare disease, good test",
            apply: () => {
              setPrior(0.01);
              setSensitivity(0.99);
              setFalsePositiveRate(0.05);
            },
          },
          {
            label: "Common disease, good test",
            apply: () => {
              setPrior(0.3);
              setSensitivity(0.99);
              setFalsePositiveRate(0.05);
            },
          },
          {
            label: "Perfect test",
            apply: () => {
              setPrior(0.01);
              setSensitivity(1);
              setFalsePositiveRate(0);
            },
          },
        ]}
        controls={
          <>
            <Slider
              label="P(D) — prior prevalence"
              value={prior}
              min={0.001}
              max={0.5}
              step={0.001}
              onChange={setPrior}
              format={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <Slider
              label="P(+|D) — sensitivity"
              value={sensitivity}
              min={0.5}
              max={1}
              step={0.01}
              onChange={setSensitivity}
              format={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Slider
              label="P(+|¬D) — false-positive rate"
              value={falsePositiveRate}
              min={0}
              max={0.3}
              step={0.01}
              onChange={setFalsePositiveRate}
              format={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <div className="space-y-1 text-[12px] text-slate-500 dark:text-slate-400">
              <p>
                P(+) = <span className="font-mono">{pPositive.toFixed(4)}</span>
              </p>
              <p>
                P(D|+) = <span className="font-mono">{(posterior * 100).toFixed(2)}%</span>
              </p>
            </div>
          </>
        }
      >
        <BarChart
          bars={[
            { label: "Prior P(D)", value: prior, color: "#94a3b8" },
            { label: "Posterior P(D|+)", value: posterior, color: "#4f46e5" },
          ]}
          maxValue={Math.max(prior, posterior, 0.05)}
          valueFormat={(v) => `${(v * 100).toFixed(1)}%`}
        />
      </PlaygroundShell>
    </div>
  );
}
