"use client";

import { useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";

const SAMPLE_POINTS = [3, 4, 4, 6, 8];
const SAMPLE_MEAN = SAMPLE_POINTS.reduce((sum, x) => sum + x, 0) / SAMPLE_POINTS.length;
const SAMPLE_STD = Math.sqrt(
  SAMPLE_POINTS.reduce((sum, x) => sum + (x - SAMPLE_MEAN) ** 2, 0) / SAMPLE_POINTS.length,
);

function normalPdf(x: number, mu: number, sigma: number): number {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
}

export default function MaximumLikelihoodSection() {
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);

  const logLikelihood = SAMPLE_POINTS.reduce((sum, x) => sum + Math.log(normalPdf(x, mu, sigma)), 0);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          <strong>Maximum likelihood estimation</strong> (MLE) picks the model parameters that make the data you
          actually observed as probable as possible. For sample points{" "}
          <Katex expr="x_1, \dots, x_n" /> assumed to come from a normal distribution with unknown{" "}
          <Katex expr="\mu" /> and <Katex expr="\sigma" />, the <strong>likelihood</strong> is the product of each
          point&rsquo;s density: <Katex expr="L(\mu,\sigma) = \prod_i p(x_i;\mu,\sigma)" />.
        </p>
        <p>
          Multiplying many probabilities together underflows to <Katex expr="0" /> in floating-point arithmetic
          almost immediately — five points each with density around <Katex expr="0.1" /> already multiply out to{" "}
          <Katex expr="10^{-5}" />, and real datasets have thousands of points. So in practice everyone works with
          the <strong>log-likelihood</strong> instead: <Katex expr="\ln L(\mu,\sigma) = \sum_i \ln p(x_i;\mu,\sigma)" />
          . Because <Katex expr="\ln" /> is strictly increasing, whatever <Katex expr="(\mu,\sigma)" /> maximizes{" "}
          <Katex expr="\ln L" /> also maximizes <Katex expr="L" /> — nothing about <em>where</em> the maximum sits
          is lost, only the numerical stability is gained.
        </p>
        <p>
          Slide <Katex expr="\mu" /> and <Katex expr="\sigma" /> below to fit the curve to the five points on the
          axis, and watch the log-likelihood. You don&rsquo;t need calculus to find the best fit by hand here — but
          calculus gives a clean closed-form answer for the normal distribution specifically:{" "}
          <Katex expr="\hat{\mu} = \bar{x}" /> (the sample mean) and{" "}
          <Katex expr="\hat{\sigma} = \sqrt{\tfrac{1}{n}\sum_i (x_i-\bar x)^2}" /> (the sample standard deviation,
          dividing by <Katex expr="n" /> rather than <Katex expr="n-1" /> — the MLE estimator is slightly biased,
          which is why statisticians usually report the <Katex expr="n-1" /> version instead, but the MLE result
          itself is exactly this).
        </p>
      </div>

      <ConceptCallout>
        MLE isn&rsquo;t just a probability-class exercise — it&rsquo;s the reason the loss functions in Chapter 6
        look the way they do. Assume each prediction&rsquo;s error is normally distributed noise, and maximizing
        the likelihood of the data turns out to be <em>identical</em> to minimizing mean-squared error. Assume a
        Bernoulli outcome (like a binary label) instead, and maximizing likelihood becomes minimizing binary
        cross-entropy loss (Chapter 7). Every &ldquo;loss function&rdquo; you&rsquo;ll train a model with in this
        lab is secretly a maximum-likelihood argument in disguise.
      </ConceptCallout>

      <PlaygroundShell
        title="Fit a Normal by Maximum Likelihood"
        description="Drag μ and σ to fit the curve to the 5 sample points. The log-likelihood peaks right at the sample mean and sample standard deviation."
        equation={`\\ln L(\\mu, \\sigma) = \\sum_i \\ln p(x_i;\\mu,\\sigma) = ${logLikelihood.toFixed(3)}`}
        onReset={() => {
          setMu(0);
          setSigma(1);
        }}
        onRandomize={() => {
          setMu(Math.round((Math.random() * 10 - 1) * 10) / 10);
          setSigma(Math.round((Math.random() * 3.5 + 0.4) * 10) / 10);
        }}
        presets={[
          {
            label: "Best fit (MLE)",
            apply: () => {
              setMu(5);
              setSigma(1.8);
            },
          },
          {
            label: "Too narrow",
            apply: () => {
              setMu(5);
              setSigma(0.5);
            },
          },
          {
            label: "Too wide",
            apply: () => {
              setMu(5);
              setSigma(4);
            },
          },
          {
            label: "Off-center",
            apply: () => {
              setMu(1);
              setSigma(1.8);
            },
          },
        ]}
        controls={
          <>
            <Slider label="μ" value={mu} min={-2} max={12} step={0.1} onChange={setMu} format={(v) => v.toFixed(1)} />
            <Slider label="σ" value={sigma} min={0.3} max={5} step={0.1} onChange={setSigma} format={(v) => v.toFixed(1)} />
            <div className="space-y-1 text-[12px] text-slate-500 dark:text-slate-400">
              <p>
                Sample points: <span className="font-mono">{SAMPLE_POINTS.join(", ")}</span>
              </p>
              <p>
                Closed-form MLE: <Katex expr="\hat\mu" /> = <span className="font-mono">{SAMPLE_MEAN.toFixed(2)}</span>,{" "}
                <Katex expr="\hat\sigma" /> = <span className="font-mono">{SAMPLE_STD.toFixed(3)}</span>
              </p>
              <p>
                log-likelihood: <span className="font-mono">{logLikelihood.toFixed(3)}</span>
              </p>
            </div>
          </>
        }
      >
        <FunctionPlot
          fn={(x) => normalPdf(x, mu, sigma)}
          domain={[-2, 12]}
          overlays={({ xScale, yScale, innerHeight }) =>
            SAMPLE_POINTS.map((x, i) => (
              <g key={i}>
                <line
                  x1={xScale(x)}
                  x2={xScale(x)}
                  y1={innerHeight}
                  y2={yScale(normalPdf(x, mu, sigma))}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.7}
                />
                <circle cx={xScale(x)} cy={innerHeight} r={4} fill="#f59e0b" />
              </g>
            ))
          }
        />
      </PlaygroundShell>
    </div>
  );
}
