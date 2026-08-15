"use client";

import { useMemo, useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { riemannRectangles, rightRiemannSum } from "./riemannUtils";

// f(x) = x^2 + 1 on [0, 4]. Antiderivative: F(x) = x^3/3 + x.
// Exact integral = F(4) - F(0) = (64/3 + 4) - 0 = 64/3 + 12/3 = 76/3 ≈ 25.3333.
const A = 0;
const B = 4;
const fn = (x: number) => x * x + 1;
const EXACT_INTEGRAL = 76 / 3; // = 25.333...

export default function AreaUnderCurveSection() {
  const [n, setN] = useState(10);

  const riemannSum = useMemo(() => rightRiemannSum(fn, A, B, n), [n]);
  const error = riemannSum - EXACT_INTEGRAL;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          The <strong>area under a curve</strong> between two points is what a <strong>definite integral</strong>{" "}
          <Katex expr="\int_a^b f(x)\,dx" /> computes. Before calculus gives an exact answer, you can{" "}
          <em>approximate</em> that area by slicing the region into <Katex expr="n" /> thin vertical rectangles and
          adding up their areas — this is a <strong>Riemann sum</strong>.
        </p>
        <p>
          This playground uses the <strong>right Riemann sum</strong>: split <Katex expr="[a,b]" /> into{" "}
          <Katex expr="n" /> equal subintervals of width <Katex expr="\Delta x = \dfrac{b-a}{n}" />, and for each
          one, use the function&rsquo;s value at the subinterval&rsquo;s <em>right</em> endpoint as the
          rectangle&rsquo;s height: <Katex expr="\text{sum} = \Delta x \sum_{i=1}^{n} f(a + i\Delta x)" />. As{" "}
          <Katex expr="n \to \infty" />, each rectangle gets thinner and hugs the curve more tightly, so the sum
          converges to the true area.
        </p>
      </div>

      <ConceptCallout>
        Definite integrals compute exact continuous quantities — total probability under a density curve, expected
        value, area under an ROC curve. When no closed-form antiderivative exists (common with real ML loss
        landscapes and probability densities), software falls back to exactly this technique: slice the domain into
        many rectangles (or smarter shapes) and sum. Numerical integration is a Riemann sum at scale.
      </ConceptCallout>

      <PlaygroundShell
        title="Riemann Sum: f(x) = x² + 1 on [0, 4]"
        description="Drag n to change the rectangle count. This is a RIGHT Riemann sum — each rectangle's height is f at its right edge."
        equation={`\\Delta x \\sum_{i=1}^{${n}} f(i\\Delta x) \\approx ${riemannSum.toFixed(3)}, \\quad \\Delta x = \\dfrac{4}{${n}}`}
        onReset={() => setN(10)}
        onRandomize={() => setN(Math.floor(Math.random() * 99) + 2)}
        presets={[
          { label: "Very coarse (n=2)", apply: () => setN(2) },
          { label: "Coarse (n=4)", apply: () => setN(4) },
          { label: "Medium (n=20)", apply: () => setN(20) },
          { label: "Fine (n=100)", apply: () => setN(100) },
        ]}
        controls={
          <>
            <Slider label="rectangles (n)" value={n} min={2} max={100} step={1} onChange={setN} />
            <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Riemann sum</span>
                <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                  {riemannSum.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Exact integral</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {EXACT_INTEGRAL.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Error</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {error >= 0 ? "+" : ""}
                  {error.toFixed(4)}
                </span>
              </div>
            </div>
          </>
        }
      >
        <FunctionPlot
          fn={fn}
          domain={[A, B]}
          range={[0, fn(B) * 1.1]}
          overlays={(scales) => riemannRectangles(fn, A, B, n, scales)}
        />
      </PlaygroundShell>
    </div>
  );
}
