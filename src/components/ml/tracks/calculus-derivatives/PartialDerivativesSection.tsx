"use client";

import { useState } from "react";
import { ConceptCallout, Katex, PlaygroundShell, Slider, Surface3D } from "@/components/ml/primitives";

const surfaceFn = (x: number, y: number) => x * x + y * y;
const DOMAIN: [number, number] = [-3, 3];

type Slice = "x" | "y" | null;

export default function PartialDerivativesSection() {
  const [point, setPoint] = useState<[number, number]>([1, 1]);
  const [slice, setSlice] = useState<Slice>("x");

  const [px, py] = point;
  const dfdx = 2 * px;
  const dfdy = 2 * py;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          A function of one variable has one derivative. A function of two variables, like{" "}
          <Katex expr="f(x,y) = x^2 + y^2" />, has a whole surface of possible directions to move in — so
          instead of one number, it has a <strong>partial derivative</strong> for each input variable.
        </p>
        <p>
          The <strong>partial derivative with respect to x</strong>, written <Katex expr="\partial f / \partial x" />
          , freezes <Katex expr="y" /> at a constant value and asks the exact same one-variable question from the
          last two sections: as <Katex expr="x" /> changes by a tiny amount, how much does{" "}
          <Katex expr="f" /> change?
        </p>
        <p className="text-center">
          <Katex
            expr="\frac{\partial f}{\partial x}\Big|_{(x_0,y_0)} = \lim_{h \to 0} \frac{f(x_0+h,\ y_0) - f(x_0,\ y_0)}{h}"
            block
          />
        </p>
        <p>
          <Katex expr="\partial f / \partial y" /> is defined the same way with the roles reversed: freeze{" "}
          <Katex expr="x" /> and vary <Katex expr="y" />. Geometrically, slicing the 3D surface with a vertical plane
          at a fixed <Katex expr="y" /> leaves a 1D curve in <Katex expr="x" /> — the <strong>x-slice</strong>{" "}
          below — and the partial derivative <Katex expr="\partial f/\partial x" /> is just the ordinary slope
          of that curve. For <Katex expr="f(x,y) = x^2+y^2" />, both partials work out to{" "}
          <Katex expr="\partial f/\partial x = 2x" /> and <Katex expr="\partial f/\partial y = 2y" /> — notice
          neither one depends on the variable being held fixed, because that variable&rsquo;s square is a constant
          added on top and disappears when you differentiate.
        </p>
      </div>

      <ConceptCallout>
        Every weight in a neural network gets its own partial derivative during backpropagation (Chapter 8):{" "}
        <Katex expr="\partial \text{Loss}/\partial w_i" /> measures how the loss changes if you nudge just that one
        weight while holding every other weight fixed — exactly like <Katex expr="\partial f/\partial x" />{" "}
        here holds <Katex expr="y" /> fixed. A network with a million weights needs a million such partial
        derivatives, one per parameter, computed together as the gradient (next section).
      </ConceptCallout>

      <PlaygroundShell
        title="Slicing the surface"
        description="Drag the point (or the sliders) and toggle a slice to see the partial derivative as an ordinary 1D slope."
        equation={`\\frac{\\partial f}{\\partial x} = 2x = ${dfdx.toFixed(2)} \\qquad \\frac{\\partial f}{\\partial y} = 2y = ${dfdy.toFixed(
          2,
        )}`}
        onReset={() => {
          setPoint([1, 1]);
          setSlice("x");
        }}
        onRandomize={() => {
          setPoint([
            Math.round((Math.random() * 6 - 3) * 10) / 10,
            Math.round((Math.random() * 6 - 3) * 10) / 10,
          ]);
        }}
        presets={[
          { label: "Steep in x, flat in y", apply: () => { setPoint([2, 0]); setSlice("x"); } },
          { label: "Steep in y, flat in x", apply: () => { setPoint([0, 2]); setSlice("y"); } },
          { label: "Equal partials", apply: () => { setPoint([2, 2]); setSlice(null); } },
        ]}
        controls={
          <>
            <Slider label="x" value={px} min={DOMAIN[0]} max={DOMAIN[1]} step={0.1} onChange={(v) => setPoint([v, py])} format={(v) => v.toFixed(1)} />
            <Slider label="y" value={py} min={DOMAIN[0]} max={DOMAIN[1]} step={0.1} onChange={(v) => setPoint([px, v])} format={(v) => v.toFixed(1)} />
            <div className="space-y-1.5">
              <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">slice</span>
              <div className="flex gap-1.5">
                {(["x", "y", null] as Slice[]).map((s) => (
                  <button
                    key={String(s)}
                    onClick={() => setSlice(s)}
                    className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
                      slice === s
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {s === null ? "none" : `${s}-slice`}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1 rounded-md bg-slate-50 p-2.5 text-[12px] dark:bg-slate-900/40">
              <p className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>&part;f/&part;x</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{dfdx.toFixed(3)}</span>
              </p>
              <p className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>&part;f/&part;y</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{dfdy.toFixed(3)}</span>
              </p>
            </div>
          </>
        }
      >
        <Surface3D
          fn={surfaceFn}
          domain={DOMAIN}
          point={point}
          onDragPoint={(x, y) =>
            setPoint([Math.min(DOMAIN[1], Math.max(DOMAIN[0], x)), Math.min(DOMAIN[1], Math.max(DOMAIN[0], y))])
          }
          slice={slice}
          heightScale={0.35}
        />
      </PlaygroundShell>
    </div>
  );
}
