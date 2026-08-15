"use client";

import { useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";

const f = (x: number) => x * x;
const fPrime = (x: number) => 2 * x;
const DOMAIN: [number, number] = [-5, 5];

export default function SlopeAndRateOfChangeSection() {
  const [x0, setX0] = useState(1);
  const [dx, setDx] = useState(1);

  const x1 = x0 + dx;
  const y0 = f(x0);
  const y1 = f(x1);
  const secantSlope = (y1 - y0) / dx;
  const tangentSlope = fPrime(x0);
  const gap = Math.abs(secantSlope - tangentSlope);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          The <strong>derivative</strong> of a function at a point measures how fast the function is changing right
          there — its instantaneous rate of change. We build up to that idea from something more concrete: the slope
          of a <strong>secant line</strong>, the straight line connecting two points on the curve.
        </p>
        <p>
          Pick a starting point <Katex expr="x_0" /> and a step size <Katex expr="\Delta x" />. The secant line
          through <Katex expr="(x_0,\ f(x_0))" /> and <Katex expr="(x_0+\Delta x,\ f(x_0+\Delta x))" /> has slope{" "}
          <Katex expr="\dfrac{f(x_0+\Delta x) - f(x_0)}{\Delta x}" /> — the same &ldquo;rise over run&rdquo; idea from
          linear functions (Chapter 1), just applied to two points on a curve instead of a straight line.
        </p>
        <p>
          The <strong>tangent line</strong> at <Katex expr="x_0" /> is what the secant line becomes as{" "}
          <Katex expr="\Delta x" /> shrinks toward zero: the second point slides back along the curve to meet the
          first, and the secant&rsquo;s slope converges to one specific number, the derivative
        </p>
        <p className="text-center">
          <Katex expr="f'(x_0) = \lim_{\Delta x \to 0} \dfrac{f(x_0+\Delta x) - f(x_0)}{\Delta x}" block />
        </p>
        <p>
          For <Katex expr="f(x) = x^2" />, this limit works out to <Katex expr="f'(x) = 2x" /> at every point — you
          don&rsquo;t have to take the limit by hand each time once you know the rule (that&rsquo;s the subject of
          the next section). Drag <Katex expr="\Delta x" /> down toward its smallest value below and watch the solid
          secant line rotate to lie almost exactly on top of the dashed true tangent line.
        </p>
      </div>

      <ConceptCallout>
        Gradient descent (Chapter 6) and backpropagation (Chapter 8) both work by computing exactly this kind of
        derivative — how much a model&rsquo;s loss changes for a tiny nudge in one parameter — and then stepping the
        parameter in the direction that makes the loss go down. Every single training step is, underneath, a slope
        computation like the one converging below: in practice it&rsquo;s worked out analytically (via rules, next
        section) rather than by shrinking Δx, but the geometric meaning is identical.
      </ConceptCallout>

      <PlaygroundShell
        title="Secant → Tangent"
        description="Shrink Δx and watch the secant line's slope converge to the analytic derivative f'(x₀) = 2x₀."
        equation={`\\frac{f(x_0+\\Delta x) - f(x_0)}{\\Delta x} = ${secantSlope.toFixed(
          3,
        )} \\qquad f'(x_0) = ${tangentSlope.toFixed(3)}`}
        onReset={() => {
          setX0(1);
          setDx(1);
        }}
        onRandomize={() => {
          setX0(Math.round((Math.random() * 4 - 2) * 10) / 10);
          setDx(Math.round((Math.random() * 2.95 + 0.05) * 100) / 100);
        }}
        presets={[
          { label: "Near-tangent (Δx = 0.05)", apply: () => setDx(0.05) },
          { label: "Coarse secant (Δx = 3)", apply: () => setDx(3) },
          { label: "At the vertex (x₀ = 0)", apply: () => setX0(0) },
        ]}
        controls={
          <>
            <Slider label="x₀" value={x0} min={-2} max={2} step={0.1} onChange={setX0} format={(v) => v.toFixed(1)} />
            <Slider label="Δx" value={dx} min={0.05} max={3} step={0.05} onChange={setDx} format={(v) => v.toFixed(2)} />
            <div className="space-y-1 rounded-md bg-slate-50 p-2.5 text-[12px] dark:bg-slate-900/40">
              <p className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>secant slope</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{secantSlope.toFixed(3)}</span>
              </p>
              <p className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>true f&apos;(x₀)</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{tangentSlope.toFixed(3)}</span>
              </p>
              <p className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>gap</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{gap.toFixed(3)}</span>
              </p>
            </div>
          </>
        }
      >
        <FunctionPlot
          fn={f}
          domain={DOMAIN}
          overlays={({ xScale, yScale }) => (
            <>
              {/* dashed true tangent line at x0, drawn across the full visible domain */}
              <line
                x1={xScale(DOMAIN[0])}
                y1={yScale(y0 + tangentSlope * (DOMAIN[0] - x0))}
                x2={xScale(DOMAIN[1])}
                y2={yScale(y0 + tangentSlope * (DOMAIN[1] - x0))}
                stroke="#dc2626"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
              {/* solid secant line through the two sample points */}
              <line x1={xScale(x0)} y1={yScale(y0)} x2={xScale(x1)} y2={yScale(y1)} stroke="#059669" strokeWidth={2} />
              <circle cx={xScale(x0)} cy={yScale(y0)} r={5} fill="#4f46e5" />
              <circle cx={xScale(x1)} cy={yScale(y1)} r={5} fill="#059669" />
            </>
          )}
        />
      </PlaygroundShell>
    </div>
  );
}
