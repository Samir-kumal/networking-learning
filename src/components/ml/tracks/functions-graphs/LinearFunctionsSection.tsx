"use client";

import { useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";

export default function LinearFunctionsSection() {
  const [m, setM] = useState(1);
  const [b, setB] = useState(0);
  const fn = (x: number) => m * x + b;

  const runStart = 0;
  const runEnd = 2;
  const rise = fn(runEnd) - fn(runStart);
  const run = runEnd - runStart;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          A <strong>linear function</strong> has the form <Katex expr="y = mx + b" />. Its graph is a straight line:{" "}
          <Katex expr="m" /> is the <strong>slope</strong> — how much <Katex expr="y" /> changes for every 1-unit
          increase in <Katex expr="x" /> — and <Katex expr="b" /> is the <strong>y-intercept</strong>, the value of{" "}
          <Katex expr="y" /> when <Katex expr="x = 0" />.
        </p>
        <p>
          Slope is a ratio: <Katex expr="m = \dfrac{\text{rise}}{\text{run}} = \dfrac{\Delta y}{\Delta x}" />. Pick
          any two points on the line, and the ratio of their vertical distance (rise) to horizontal distance (run)
          is always the same number — that constant ratio <em>is</em> <Katex expr="m" />.
        </p>
      </div>

      <ConceptCallout>
        Linear regression (Chapter 6) fits a line <Katex expr="\hat{y} = mx + b" /> to data — <Katex expr="m" /> and{" "}
        <Katex expr="b" /> become the two parameters a model &ldquo;learns.&rdquo; Every neuron in a neural network
        (Chapter 8) computes a linear function of its inputs before applying a non-linearity.
      </ConceptCallout>

      <PlaygroundShell
        title="Slope & Intercept"
        description="Drag m and b and watch the line — and the slope triangle — redraw live."
        equation={`y = ${m.toFixed(1)}x ${b >= 0 ? "+" : "-"} ${Math.abs(b).toFixed(1)}`}
        onReset={() => {
          setM(1);
          setB(0);
        }}
        onRandomize={() => {
          setM(Math.round((Math.random() * 10 - 5) * 10) / 10);
          setB(Math.round((Math.random() * 10 - 5) * 10) / 10);
        }}
        presets={[
          { label: "Positive slope", apply: () => { setM(2); setB(1); } },
          { label: "Negative slope", apply: () => { setM(-1.5); setB(3); } },
          { label: "Flat line", apply: () => { setM(0); setB(2); } },
          { label: "Steep line", apply: () => { setM(5); setB(-2); } },
        ]}
        controls={
          <>
            <Slider label="slope (m)" value={m} min={-5} max={5} step={0.1} onChange={setM} format={(v) => v.toFixed(1)} />
            <Slider label="y-intercept (b)" value={b} min={-5} max={5} step={0.1} onChange={setB} format={(v) => v.toFixed(1)} />
          </>
        }
      >
        <FunctionPlot
          fn={fn}
          domain={[-6, 6]}
          overlays={({ xScale, yScale }) => (
            <>
              {/* y-intercept marker */}
              <circle cx={xScale(0)} cy={yScale(b)} r={5} fill="#f59e0b" />
              {/* slope triangle from x=0 to x=2 */}
              <line x1={xScale(runStart)} y1={yScale(fn(runStart))} x2={xScale(runEnd)} y2={yScale(fn(runStart))} stroke="#059669" strokeWidth={1.5} strokeDasharray="4 3" />
              <line x1={xScale(runEnd)} y1={yScale(fn(runStart))} x2={xScale(runEnd)} y2={yScale(fn(runEnd))} stroke="#059669" strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={(xScale(runStart) + xScale(runEnd)) / 2} y={yScale(fn(runStart)) + 14} textAnchor="middle" className="fill-emerald-600 text-[10px] dark:fill-emerald-400">
                run = {run}
              </text>
              <text x={xScale(runEnd) + 6} y={(yScale(fn(runStart)) + yScale(fn(runEnd))) / 2} className="fill-emerald-600 text-[10px] dark:fill-emerald-400">
                rise = {rise.toFixed(1)}
              </text>
            </>
          )}
        />
      </PlaygroundShell>
    </div>
  );
}
