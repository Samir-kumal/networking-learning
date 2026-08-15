"use client";

import { useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";

type Family = "polynomial" | "exponential" | "logarithm";

export default function PolynomialsExponentialsLogarithmsSection() {
  const [family, setFamily] = useState<Family>("polynomial");
  const [a, setA] = useState(1);
  const [n, setN] = useState(2);
  const [base, setBase] = useState(2);

  const config = {
    polynomial: {
      fn: (x: number) => a * Math.pow(x, n),
      domain: [-4, 4] as [number, number],
      latex: `f(x) = ${a}x^{${n}}`,
    },
    exponential: {
      fn: (x: number) => a * Math.pow(base, x),
      domain: [-4, 4] as [number, number],
      latex: `f(x) = ${a} \\cdot ${base}^{x}`,
    },
    logarithm: {
      fn: (x: number) => (x <= 0 ? NaN : Math.log(x) / Math.log(base)),
      domain: [-1, 10] as [number, number],
      latex: `f(x) = \\log_{${base}}(x)`,
    },
  }[family];

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          Three function families show up constantly in ML. A <strong>polynomial</strong>{" "}
          <Katex expr="f(x) = a x^n" /> grows (or shrinks) at a rate set by its degree <Katex expr="n" />. An{" "}
          <strong>exponential</strong> <Katex expr="f(x) = a \cdot b^x" /> grows by a fixed{" "}
          <em>percentage</em> for every step in <Katex expr="x" />, which is why it eventually outgrows every
          polynomial, no matter how large <Katex expr="n" /> is. A <strong>logarithm</strong>{" "}
          <Katex expr="f(x) = \log_b(x)" /> is the exponential&rsquo;s inverse — it answers &ldquo;what power of{" "}
          <Katex expr="b" /> gives me <Katex expr="x" />?&rdquo; — and is only defined for{" "}
          <Katex expr="x > 0" />.
        </p>
      </div>

      <ConceptCallout>
        Sigmoid and softmax (Chapter 7) are built from <Katex expr="e^x" />. Cross-entropy loss (Chapter 6) is built
        from <Katex expr="\log" />. Polynomial features (Chapter 6&rsquo;s overfitting demo) let a linear model fit
        curves. Recognizing these three shapes on sight will make every later chapter&rsquo;s formulas readable.
      </ConceptCallout>

      <PlaygroundShell
        title="Polynomial vs. Exponential vs. Logarithm"
        description="Switch families and drag the parameters to see how each one bends the curve."
        equation={config.latex}
        onReset={() => {
          setFamily("polynomial");
          setA(1);
          setN(2);
          setBase(2);
        }}
        onRandomize={() => {
          setA(Math.round((Math.random() * 4 - 2) * 10) / 10 || 1);
          setN(Math.floor(Math.random() * 4) + 1);
          setBase(Math.round((Math.random() * 2.5 + 1.2) * 10) / 10);
        }}
        presets={[
          { label: "Polynomial", apply: () => setFamily("polynomial") },
          { label: "Exponential", apply: () => setFamily("exponential") },
          { label: "Logarithm", apply: () => setFamily("logarithm") },
        ]}
        controls={
          <>
            {family === "polynomial" && (
              <>
                <Slider label="coefficient (a)" value={a} min={-3} max={3} step={0.1} onChange={setA} format={(v) => v.toFixed(1)} />
                <Slider label="degree (n)" value={n} min={1} max={5} step={1} onChange={setN} />
              </>
            )}
            {family === "exponential" && (
              <>
                <Slider label="coefficient (a)" value={a} min={-3} max={3} step={0.1} onChange={setA} format={(v) => v.toFixed(1)} />
                <Slider label="base (b)" value={base} min={1.1} max={4} step={0.1} onChange={setBase} format={(v) => v.toFixed(1)} />
              </>
            )}
            {family === "logarithm" && (
              <Slider label="base (b)" value={base} min={1.1} max={10} step={0.1} onChange={setBase} format={(v) => v.toFixed(1)} />
            )}
          </>
        }
      >
        <FunctionPlot fn={config.fn} domain={config.domain} />
      </PlaygroundShell>
    </div>
  );
}
