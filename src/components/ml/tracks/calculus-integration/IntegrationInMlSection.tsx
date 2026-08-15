"use client";

import { useMemo, useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { riemannRectangles, rightRiemannSum } from "./riemannUtils";

// Standard normal probability density: p(x) = (1/sqrt(2*pi)) * exp(-x^2/2).
// Its exact integral over all reals is 1; on [-4, 4] it is already ~0.999937
// (the tails beyond +-4 hold about 0.0000633 of the total mass), so the finite
// domain below is visually and numerically indistinguishable from "all reals."
const DOMAIN: [number, number] = [-4, 4];
const SQRT_2PI = Math.sqrt(2 * Math.PI);
const p = (x: number) => Math.exp(-(x * x) / 2) / SQRT_2PI;
const RESOLUTION = 200;

export default function IntegrationInMlSection() {
  const [lo, setLo] = useState(-1);
  const [hi, setHi] = useState(1);

  const [shadeLo, shadeHi] = lo <= hi ? [lo, hi] : [hi, lo];
  const probability = useMemo(
    () => (shadeHi > shadeLo ? rightRiemannSum(p, shadeLo, shadeHi, RESOLUTION) : 0),
    [shadeLo, shadeHi],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          A <strong>probability density function</strong> (PDF) <Katex expr="p(x)" /> describes a continuous random
          variable: the <em>area</em> under <Katex expr="p" /> between two points is the probability the variable
          falls in that range, <Katex expr="P(a \le X \le b) = \int_a^b p(x)\,dx" />. Because &ldquo;X takes some
          value&rdquo; is a certainty, the total area under any valid density must be exactly 1:
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <Katex expr="\int_{-\infty}^{\infty} p(x)\,dx = 1" block />
        </div>
        <p>
          Integration also defines the <strong>expected value</strong> — the probability-weighted average of{" "}
          <Katex expr="X" />: <Katex expr="E[X] = \int_{-\infty}^{\infty} x \cdot p(x)\,dx" />. It&rsquo;s the
          continuous version of a weighted sum: instead of summing (value × probability) over a finite list of
          outcomes, you integrate (value × density) over a continuum of them.
        </p>
      </div>

      <ConceptCallout>
        Cross-entropy loss (Chapter 6), the softmax output of a classifier (Chapter 7), and Bayesian inference
        (Chapter 5) all rest on quantities defined by integrals over probability densities — and the loss functions
        that neural networks minimize are themselves expected values, <Katex expr="E[\text{loss}]" />, computed by
        integrating (or, in practice, by averaging over a finite training sample — a Riemann-sum-like
        approximation).
      </ConceptCallout>

      <PlaygroundShell
        title="Area Under a Density = Probability"
        description="Drag lo/hi to shade a region under the standard normal density p(x). The shaded area approximates P(lo ≤ X ≤ hi), using a 200-rectangle right Riemann sum."
        equation={`P(${shadeLo.toFixed(2)} \\le X \\le ${shadeHi.toFixed(2)}) \\approx ${probability.toFixed(4)}`}
        onReset={() => {
          setLo(-1);
          setHi(1);
        }}
        onRandomize={() => {
          const a = Math.round((Math.random() * 8 - 4) * 10) / 10;
          const b = Math.round((Math.random() * 8 - 4) * 10) / 10;
          setLo(Math.min(a, b));
          setHi(Math.max(a, b));
        }}
        presets={[
          { label: "Within 1σ [-1, 1] ≈ 68%", apply: () => { setLo(-1); setHi(1); } },
          { label: "Within 2σ [-2, 2] ≈ 95%", apply: () => { setLo(-2); setHi(2); } },
          { label: "Right half [0, 4] ≈ 50%", apply: () => { setLo(0); setHi(4); } },
        ]}
        controls={
          <>
            <Slider label="lo" value={lo} min={-4} max={4} step={0.1} onChange={setLo} format={(v) => v.toFixed(1)} />
            <Slider label="hi" value={hi} min={-4} max={4} step={0.1} onChange={setHi} format={(v) => v.toFixed(1)} />
            <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">P(lo ≤ X ≤ hi)</span>
                <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                  {probability.toFixed(4)}
                </span>
              </div>
            </div>
          </>
        }
      >
        <FunctionPlot
          fn={p}
          domain={DOMAIN}
          range={[0, 0.45]}
          overlays={(scales) =>
            shadeHi > shadeLo &&
            riemannRectangles(p, shadeLo, shadeHi, RESOLUTION, scales, { fillOpacity: 0.4, stroke: "none" })
          }
        />
      </PlaygroundShell>
    </div>
  );
}
