"use client";

import { useMemo, useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { riemannRectangles } from "./riemannUtils";

// f(t) = 2t on [0, 5]. Antiderivative F(t) = t^2 (choosing the constant of
// integration C = 0 so F(0) = 0, matching the accumulated-area function
// A(x) = ∫[0,x] f(t) dt, which is always 0 at x = 0).
const DOMAIN: [number, number] = [0, 5];
const f = (t: number) => 2 * t;
const F = (t: number) => t * t;

export default function FundamentalTheoremSection() {
  const [x0, setX0] = useState(2);

  const accumulatedArea = useMemo(() => F(x0) - F(0), [x0]);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          The <strong>Fundamental Theorem of Calculus</strong> is the bridge between derivatives and integrals — the
          two halves of calculus turn out to be inverse operations. Define the &ldquo;area-so-far&rdquo; function{" "}
          <Katex expr="A(x) = \int_a^x f(t)\,dt" />: the running total of the area under <Katex expr="f" /> from a
          fixed start <Katex expr="a" /> up to a moving point <Katex expr="x" />. The theorem states:
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <Katex expr="\dfrac{d}{dx}\left[\int_a^x f(t)\,dt\right] = f(x)" block />
        </div>
        <p>
          In words: <em>differentiating the accumulated-area function gives back the original function.</em>{" "}
          Equivalently, if <Katex expr="F" /> is any antiderivative of <Katex expr="f" /> (meaning{" "}
          <Katex expr="F'(x) = f(x)" />), then <Katex expr="\int_a^b f(x)\,dx = F(b) - F(a)" />. That&rsquo;s why
          the earlier Riemann-sum section always converged to a number you could also get by plugging into an
          antiderivative — the theorem guarantees both routes agree.
        </p>
      </div>

      <ConceptCallout>
        This is the theoretical reason gradient descent (Chapter 6) and backpropagation (Chapter 8) work with
        derivatives at all: a model&rsquo;s loss is often defined as an accumulated quantity (e.g. total error over
        a dataset, or area under a density curve), and the FTC guarantees that quantity&rsquo;s <em>rate of
        change</em> — the gradient you actually compute and descend — is well-defined and recoverable from the
        original function.
      </ConceptCallout>

      <PlaygroundShell
        title="From Area to Antiderivative: f(t) = 2t, F(t) = t²"
        description="Drag x₀. The shaded area under f from 0 to x₀ (left) always equals F(x₀), the marked point on F (right)."
        equation={`\\int_0^{${x0.toFixed(2)}} 2t\\,dt = F(${x0.toFixed(2)}) = ${accumulatedArea.toFixed(3)}`}
        onReset={() => setX0(2)}
        onRandomize={() => setX0(Math.round(Math.random() * 50) / 10)}
        presets={[
          { label: "x₀ = 1", apply: () => setX0(1) },
          { label: "x₀ = 3", apply: () => setX0(3) },
          { label: "x₀ = 5 (full range)", apply: () => setX0(5) },
        ]}
        controls={
          <>
            <Slider label="x₀" value={x0} min={0} max={5} step={0.1} onChange={setX0} format={(v) => v.toFixed(1)} />
            <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Shaded area (left plot)</span>
                <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                  {accumulatedArea.toFixed(3)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">F(x₀) (right plot)</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {F(x0).toFixed(3)}
                </span>
              </div>
            </div>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
              f(t) = 2t — shaded area = accumulated integral
            </p>
            <FunctionPlot
              fn={f}
              domain={DOMAIN}
              range={[0, 11]}
              overlays={(scales) => (
                <>
                  {x0 > 0 && riemannRectangles(f, 0, x0, 60, scales, { fillOpacity: 0.3, stroke: "none" })}
                  <line
                    x1={scales.xScale(x0)}
                    x2={scales.xScale(x0)}
                    y1={0}
                    y2={scales.innerHeight}
                    stroke="#059669"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                </>
              )}
            />
          </div>
          <div>
            <p className="mb-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
              F(t) = t² — marked point at (x₀, F(x₀))
            </p>
            <FunctionPlot
              fn={F}
              domain={DOMAIN}
              range={[0, 27]}
              overlays={({ xScale, yScale, innerHeight }) => (
                <>
                  <line
                    x1={xScale(x0)}
                    x2={xScale(x0)}
                    y1={yScale(F(x0))}
                    y2={innerHeight}
                    stroke="#059669"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={0}
                    x2={xScale(x0)}
                    y1={yScale(F(x0))}
                    y2={yScale(F(x0))}
                    stroke="#059669"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  <circle cx={xScale(x0)} cy={yScale(F(x0))} r={5} fill="#f59e0b" />
                </>
              )}
            />
          </div>
        </div>
      </PlaygroundShell>
    </div>
  );
}
