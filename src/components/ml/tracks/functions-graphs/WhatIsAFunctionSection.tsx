"use client";

import { useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";

type FnKey = "square" | "sqrt" | "reciprocal";

const FUNCTIONS: Record<
  FnKey,
  { label: string; latex: string; fn: (x: number) => number; domain: [number, number]; domainNote: string }
> = {
  square: {
    label: "x²",
    latex: "f(x) = x^2",
    fn: (x) => x * x,
    domain: [-6, 6],
    domainNote: "all real numbers",
  },
  sqrt: {
    label: "√x",
    latex: "f(x) = \\sqrt{x}",
    fn: (x) => (x < 0 ? NaN : Math.sqrt(x)),
    domain: [-2, 10],
    domainNote: "x ≥ 0 — negative inputs have no real output",
  },
  reciprocal: {
    label: "1/x",
    latex: "f(x) = \\dfrac{1}{x}",
    fn: (x) => (x === 0 ? NaN : 1 / x),
    domain: [-6, 6],
    domainNote: "x ≠ 0 — division by zero is undefined",
  },
};

export default function WhatIsAFunctionSection() {
  const [key, setKey] = useState<FnKey>("square");
  const [x, setX] = useState(2);
  const def = FUNCTIONS[key];
  const y = def.fn(x);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          A <strong>function</strong> is a rule that takes an <strong>input</strong> and produces exactly one{" "}
          <strong>output</strong>. We write <Katex expr="y = f(x)" />, read &ldquo;y equals f of x&rdquo;: feed the
          function a number <Katex expr="x" />, and it hands back a single number <Katex expr="y" />.
        </p>
        <p>
          The set of every input a function is allowed to accept is its <strong>domain</strong>. The set of every
          output it can produce is its <strong>range</strong>. A function can be defined by only part of the number
          line — <Katex expr="\sqrt{x}" /> refuses negative inputs, and <Katex expr="1/x" /> refuses zero, because
          neither has a well-defined real output there.
        </p>
        <p>
          The one non-negotiable rule: <strong>each input maps to exactly one output</strong>. A relation that sends
          a single input to two different outputs (like &ldquo;the square roots of x&rdquo;, which gives both{" "}
          <Katex expr="+2" /> and <Katex expr="-2" /> for <Katex expr="x=4" />) is not a function — that&rsquo;s why
          we define <Katex expr="\sqrt{x}" /> to mean only the non-negative root.
        </p>
      </div>

      <ConceptCallout>
        Every model you&rsquo;ll build in this course — a line, a loss curve, a neural network — is a function: it
        takes an input (a feature vector, a set of weights) and produces exactly one output (a prediction, a loss
        value). Domain and range questions show up constantly, e.g. probabilities must live in{" "}
        <Katex expr="[0, 1]" />, which is exactly a range restriction.
      </ConceptCallout>

      <PlaygroundShell
        title="Function Machine"
        description="Pick a function, drag the input, and watch the output — including where it becomes undefined."
        equation={`${def.latex},\\quad f(${x.toFixed(2)}) = ${Number.isNaN(y) ? "\\text{undefined}" : y.toFixed(2)}`}
        onReset={() => {
          setKey("square");
          setX(2);
        }}
        onRandomize={() => {
          const keys: FnKey[] = ["square", "sqrt", "reciprocal"];
          const nextKey = keys[Math.floor(Math.random() * keys.length)];
          setKey(nextKey);
          setX(Math.round((Math.random() * (FUNCTIONS[nextKey].domain[1] - FUNCTIONS[nextKey].domain[0]) + FUNCTIONS[nextKey].domain[0]) * 10) / 10);
        }}
        presets={[
          { label: "x²", apply: () => setKey("square") },
          { label: "√x", apply: () => setKey("sqrt") },
          { label: "1/x", apply: () => setKey("reciprocal") },
        ]}
        controls={
          <>
            <Slider label="input x" value={x} min={def.domain[0]} max={def.domain[1]} step={0.1} onChange={setX} format={(v) => v.toFixed(1)} />
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              Domain: <span className="font-mono">{def.domainNote}</span>
            </p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              f({x.toFixed(1)}) = <span className="font-mono">{Number.isNaN(y) ? "undefined" : y.toFixed(3)}</span>
            </p>
          </>
        }
      >
        <FunctionPlot
          fn={def.fn}
          domain={def.domain}
          overlays={({ xScale, yScale, innerHeight }) =>
            !Number.isNaN(y) && (
              <>
                <line x1={xScale(x)} x2={xScale(x)} y1={0} y2={innerHeight} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
                <circle cx={xScale(x)} cy={yScale(y)} r={5} fill="#f59e0b" />
              </>
            )
          }
        />
      </PlaygroundShell>
    </div>
  );
}
