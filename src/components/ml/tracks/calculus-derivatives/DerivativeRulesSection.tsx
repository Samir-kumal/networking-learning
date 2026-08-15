"use client";

import { useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";

type Rule = "power" | "product" | "chain";

const RULES: Record<
  Rule,
  {
    label: string;
    generalLatex: string;
    exampleLatex: string;
    derivativeLatex: string;
    fn: (x: number) => number;
    fPrime: (x: number) => number;
    domain: [number, number];
    steps: string[];
  }
> = {
  power: {
    label: "Power rule",
    generalLatex: "\\frac{d}{dx}[x^n] = n x^{n-1}",
    exampleLatex: "f(x) = x^3",
    derivativeLatex: "f'(x) = 3x^2",
    fn: (x) => x ** 3,
    fPrime: (x) => 3 * x ** 2,
    domain: [-2.5, 2.5],
    steps: [
      "Start with f(x) = x^3. The power rule says d/dx[x^n] = n \u00b7 x^(n-1).",
      "Here n = 3, so bring the exponent down as a multiplying coefficient: f'(x) = 3 \u00b7 x^(3-1).",
      "Simplify the exponent: f'(x) = 3x^2.",
      "Check the formula at x = 2: f'(2) = 3 \u00b7 (2)^2 = 3 \u00b7 4 = 12.",
    ],
  },
  product: {
    label: "Product rule",
    generalLatex: "\\frac{d}{dx}[u(x)v(x)] = u'(x)v(x) + u(x)v'(x)",
    exampleLatex: "f(x) = x^2(x+1)",
    derivativeLatex: "f'(x) = 2x(x+1) + x^2 = 3x^2 + 2x",
    fn: (x) => x ** 2 * (x + 1),
    fPrime: (x) => 3 * x ** 2 + 2 * x,
    domain: [-2, 2],
    steps: [
      "Identify the two factors: u(x) = x^2 and v(x) = (x+1), so f(x) = u(x)\u00b7v(x).",
      "Differentiate each factor on its own (power rule): u'(x) = 2x and v'(x) = 1.",
      "Apply the product rule d/dx[uv] = u'v + uv': f'(x) = 2x\u00b7(x+1) + x^2\u00b71.",
      "Expand: 2x(x+1) = 2x^2 + 2x, so f'(x) = 2x^2 + 2x + x^2 = 3x^2 + 2x.",
      "Sanity check: expanding f(x) first gives x^2(x+1) = x^3 + x^2, whose power-rule derivative is 3x^2 + 2x \u2014 matches.",
    ],
  },
  chain: {
    label: "Chain rule",
    generalLatex: "\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)",
    exampleLatex: "f(x) = (2x+1)^3",
    derivativeLatex: "f'(x) = 6(2x+1)^2",
    fn: (x) => (2 * x + 1) ** 3,
    fPrime: (x) => 6 * (2 * x + 1) ** 2,
    domain: [-2, 1],
    steps: [
      "Identify the outer function f(u) = u^3 and the inner function u = g(x) = 2x+1, so f(x) = g(x)^3.",
      "Differentiate the outer function with respect to u, leaving u un-substituted: d/du[u^3] = 3u^2.",
      "Differentiate the inner function with respect to x: g'(x) = 2.",
      "Chain rule: multiply the outer derivative (with u substituted back in) by the inner derivative: f'(x) = 3(2x+1)^2 \u00b7 2.",
      "Simplify: f'(x) = 6(2x+1)^2. Check at x = 0: f'(0) = 6\u00b7(1)^2 = 6.",
    ],
  },
};

export default function DerivativeRulesSection() {
  const [rule, setRule] = useState<Rule>("power");
  const [step, setStep] = useState(0);
  const [x, setX] = useState(1);

  const config = RULES[rule];
  const clampedX = Math.min(config.domain[1], Math.max(config.domain[0], x));
  const slope = config.fPrime(clampedX);
  const y = config.fn(clampedX);

  const selectRule = (next: Rule) => {
    setRule(next);
    setStep(0);
    setX(Math.min(RULES[next].domain[1], Math.max(RULES[next].domain[0], 1)));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          Nobody re-derives a derivative from the limit definition every time — instead, a small set of{" "}
          <strong>rules</strong> let you differentiate complicated expressions by breaking them into pieces you
          already know how to handle. Three rules cover almost everything you&rsquo;ll see in this course:
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-2.5 text-center dark:border-slate-700">
            <p className="mb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Power rule</p>
            <Katex expr={RULES.power.generalLatex} />
          </div>
          <div className="rounded-md border border-slate-200 p-2.5 text-center dark:border-slate-700">
            <p className="mb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Product rule</p>
            <Katex expr={RULES.product.generalLatex} />
          </div>
          <div className="rounded-md border border-slate-200 p-2.5 text-center dark:border-slate-700">
            <p className="mb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Chain rule</p>
            <Katex expr={RULES.chain.generalLatex} />
          </div>
        </div>
        <p>
          The <strong>chain rule</strong> is the one to burn into memory: it differentiates a{" "}
          <em>function of a function</em> — outer function applied to an inner function — by multiplying
          the outer derivative by the inner derivative. Select a rule below to walk through a fully worked example,
          one step at a time.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(RULES) as Rule[]).map((key) => (
          <button
            key={key}
            onClick={() => selectRule(key)}
            className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition ${
              rule === key
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {RULES[key].label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-2 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
          Worked example: <Katex expr={config.exampleLatex} />
        </p>
        <ol className="space-y-2">
          {config.steps.slice(0, step + 1).map((text, i) => (
            <li
              key={i}
              className="flex gap-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                {i + 1}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Previous
          </button>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Step {step + 1} of {config.steps.length}
          </span>
          <button
            onClick={() => setStep((s) => Math.min(config.steps.length - 1, s + 1))}
            disabled={step === config.steps.length - 1}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      </div>

      <ConceptCallout>
        The chain rule you just walked through for (2x+1)^3 is the entire mathematical basis of{" "}
        <strong>backpropagation</strong> (Chapter 8). A neural network is a composition of functions, one per layer
        — an outer function applied to an inner function applied to an inner function, and so on. Finding how
        the loss changes with respect to an early-layer weight means multiplying local derivatives together across
        every layer in between, exactly like multiplying the outer derivative by the inner derivative above, just
        repeated many more times.
      </ConceptCallout>

      <PlaygroundShell
        title={`${config.label}: tangent line`}
        description="Drag x to see the tangent slope, computed from the rule's derivative formula, track the curve."
        equation={`${config.derivativeLatex} \\quad\\Rightarrow\\quad f'(${clampedX.toFixed(2)}) = ${slope.toFixed(3)}`}
        onReset={() => {
          setX(Math.min(config.domain[1], Math.max(config.domain[0], 1)));
        }}
        onRandomize={() => {
          const [lo, hi] = config.domain;
          setX(Math.round((lo + Math.random() * (hi - lo)) * 100) / 100);
        }}
        presets={[
          { label: "Left edge", apply: () => setX(config.domain[0]) },
          { label: "Midpoint", apply: () => setX((config.domain[0] + config.domain[1]) / 2) },
          { label: "Right edge", apply: () => setX(config.domain[1]) },
        ]}
        controls={
          <Slider
            label="x"
            value={clampedX}
            min={config.domain[0]}
            max={config.domain[1]}
            step={0.05}
            onChange={setX}
            format={(v) => v.toFixed(2)}
          />
        }
      >
        <FunctionPlot
          fn={config.fn}
          domain={config.domain}
          overlays={({ xScale, yScale }) => (
            <>
              <line
                x1={xScale(config.domain[0])}
                y1={yScale(y + slope * (config.domain[0] - clampedX))}
                x2={xScale(config.domain[1])}
                y2={yScale(y + slope * (config.domain[1] - clampedX))}
                stroke="#dc2626"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
              <circle cx={xScale(clampedX)} cy={yScale(y)} r={5} fill="#4f46e5" />
            </>
          )}
        />
      </PlaygroundShell>
    </div>
  );
}
