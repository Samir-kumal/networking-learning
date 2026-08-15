"use client";

import { useState } from "react";
import { ConceptCallout, Katex, PlaygroundShell, Slider, Surface3D } from "@/components/ml/primitives";

const surfaceFn = (x: number, y: number) => x * x + y * y;
const DOMAIN: [number, number] = [-3, 3];

export default function GradientSteepestAscentSection() {
  const [point, setPoint] = useState<[number, number]>([2, 1]);

  const [px, py] = point;
  const gx = 2 * px;
  const gy = 2 * py;
  const magnitude = Math.hypot(gx, gy);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          Stack the two partial derivatives from the last section into a single vector and you get the{" "}
          <strong>gradient</strong>:
        </p>
        <p className="text-center">
          <Katex expr="\nabla f = \left(\dfrac{\partial f}{\partial x},\ \dfrac{\partial f}{\partial y}\right)" block />
        </p>
        <p>
          The gradient is more than bookkeeping — it has a precise geometric meaning. At any point,{" "}
          <Katex expr="\nabla f" /> points in the direction you should step to increase{" "}
          <Katex expr="f" /> as fast as possible: the direction of <strong>steepest ascent</strong>. Its length{" "}
          <Katex expr="\lVert \nabla f \rVert = \sqrt{(\partial f/\partial x)^2 + (\partial f/\partial y)^2}" /> tells
          you how steep that fastest direction actually is — a long arrow means the surface rises sharply, a
          short arrow means it&rsquo;s nearly flat.
        </p>
        <p>
          For <Katex expr="f(x,y) = x^2+y^2" />, the gradient is <Katex expr="\nabla f = (2x, 2y) = 2(x,y)" /> —
          exactly twice the position vector itself. Drag the point around the bowl-shaped surface below and watch
          the red arrow always point straight away from the center: for this particular function, steepest ascent is
          always directly outward from the minimum at the origin.
        </p>
      </div>

      <ConceptCallout>
        Gradient descent (Chapter 6) takes the exact vector you&rsquo;re visualizing, <Katex expr="\nabla f" />, and
        steps in the <em>opposite</em> direction, <Katex expr="-\nabla f" />, because it wants to go downhill
        (minimize loss) rather than uphill. The direction and magnitude of that arrow directly set which way and how
        far every parameter in a model moves at each training step — this is the single most important idea in
        how neural networks learn.
      </ConceptCallout>

      <PlaygroundShell
        title="The gradient vector"
        description="Drag the point (or the sliders) and watch the red arrow — the gradient — track the direction of steepest ascent."
        equation={`\\nabla f = (${gx.toFixed(2)},\\ ${gy.toFixed(2)}) \\qquad \\lVert \\nabla f \\rVert = ${magnitude.toFixed(
          2,
        )}`}
        onReset={() => setPoint([2, 1])}
        onRandomize={() =>
          setPoint([
            Math.round((Math.random() * 6 - 3) * 10) / 10,
            Math.round((Math.random() * 6 - 3) * 10) / 10,
          ])
        }
        presets={[
          { label: "Near the minimum", apply: () => setPoint([0.3, 0.3]) },
          { label: "Far from the minimum", apply: () => setPoint([2.5, 2.5]) },
          { label: "Along one axis", apply: () => setPoint([2.5, 0]) },
        ]}
        controls={
          <>
            <Slider label="x" value={px} min={DOMAIN[0]} max={DOMAIN[1]} step={0.1} onChange={(v) => setPoint([v, py])} format={(v) => v.toFixed(1)} />
            <Slider label="y" value={py} min={DOMAIN[0]} max={DOMAIN[1]} step={0.1} onChange={(v) => setPoint([px, v])} format={(v) => v.toFixed(1)} />
            <div className="space-y-1 rounded-md bg-slate-50 p-2.5 text-[12px] dark:bg-slate-900/40">
              <p className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>&nabla;f&nbsp;<sub>x</sub></span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{gx.toFixed(3)}</span>
              </p>
              <p className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>&nabla;f&nbsp;<sub>y</sub></span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{gy.toFixed(3)}</span>
              </p>
              <p className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>&#8741;&nabla;f&#8741;</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{magnitude.toFixed(3)}</span>
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
          showGradient
          heightScale={0.35}
        />
      </PlaygroundShell>
    </div>
  );
}
