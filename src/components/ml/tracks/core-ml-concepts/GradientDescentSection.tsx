"use client";

import { useEffect, useRef, useState } from "react";
import { ConceptCallout, Katex, PlaygroundShell, Slider, Surface3D } from "@/components/ml/primitives";
import { LossCurveMini } from "./LossCurveMini";

const DOMAIN: [number, number] = [-2, 2];
const START_POINT: [number, number] = [1.4, 1.1];
const MAX_STEPS = 400;
const DIVERGE_THRESHOLD = 20;

/** Anisotropic bowl L(x,y) = x² + 3y² — steeper along y (Hessian eigenvalues 2 and 6), so a single
 * learning rate can be well-behaved on x while overshooting on y. */
function loss(x: number, y: number): number {
  return x * x + 3 * y * y;
}

type Status = "idle" | "running" | "converged" | "diverged";

export default function GradientDescentSection() {
  const [point, setPoint] = useState<[number, number]>(START_POINT);
  const [lr, setLr] = useState(0.15);
  const [running, setRunning] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [history, setHistory] = useState<number[]>([]);
  const pointRef = useRef<[number, number]>(START_POINT);
  const rafRef = useRef<number | null>(null);

  const resetTo = (next: [number, number] = START_POINT, nextLr?: number) => {
    setRunning(false);
    pointRef.current = next;
    setPoint(next);
    setIteration(0);
    setStatus("idle");
    setHistory([]);
    if (nextLr !== undefined) setLr(nextLr);
  };

  // Steps (x, y) via gradient descent each animation frame: ∂L/∂x = 2x, ∂L/∂y = 6y.
  // Cleaned up on unmount / when `running` turns off.
  useEffect(() => {
    if (!running) return;
    let stepCount = 0;

    const step = () => {
      stepCount += 1;
      const [x, y] = pointRef.current;
      const gx = 2 * x;
      const gy = 6 * y;
      const nx = x - lr * gx;
      const ny = y - lr * gy;
      const finite = Number.isFinite(nx) && Number.isFinite(ny);
      const diverged = !finite || Math.abs(nx) > DIVERGE_THRESHOLD || Math.abs(ny) > DIVERGE_THRESHOLD;
      const next: [number, number] = finite ? [nx, ny] : pointRef.current;

      pointRef.current = next;
      setPoint(next);
      setIteration((it) => it + 1);
      setHistory((h) => [...h, loss(next[0], next[1])].slice(-200));

      if (diverged) {
        setStatus("diverged");
        setRunning(false);
        return;
      }
      if (Math.abs(gx) < 1e-5 && Math.abs(gy) < 1e-5) {
        setStatus("converged");
        setRunning(false);
        return;
      }
      if (stepCount >= MAX_STEPS) {
        setRunning(false);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    setStatus("running");
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [running, lr]);

  const currentLoss = loss(point[0], point[1]);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          On a 2-parameter loss surface <Katex expr="L(x, y)" />, gradient descent takes a step{" "}
          <Katex expr="(x, y) \leftarrow (x, y) - \eta \nabla L(x, y)" /> — moving opposite the gradient, which always
          points in the direction of steepest increase. Repeating this rolls a marker downhill toward a minimum, like
          a ball settling into a bowl.
        </p>
        <p>
          Real loss surfaces are rarely a perfect circular bowl — they&rsquo;re usually steeper in some directions
          than others. This surface, <Katex expr="L(x,y) = x^2 + 3y^2" />, is three times steeper along{" "}
          <Katex expr="y" /> than along <Katex expr="x" />. A learning rate large enough to move efficiently along{" "}
          <Katex expr="x" /> can be too large for <Katex expr="y" /> — causing the marker to overshoot the valley
          floor and oscillate, or even diverge.
        </p>
      </div>

      <ConceptCallout>
        This is exactly why a fixed global learning rate is a compromise: the linear-regression loss surface
        (Chapter 6.1) and every layer&rsquo;s loss surface in a neural network (Chapter 8) are similarly
        ill-conditioned — steep in some parameter directions, shallow in others. Adaptive optimizers like Adam and
        RMSProp (used in most real ML training, though not implemented in this from-scratch lab) exist specifically
        to give each parameter its own effective step size instead of sharing one.
      </ConceptCallout>

      <PlaygroundShell
        title="Descending a Loss Surface"
        description="Drag the orbit view to look around; the ball steps downhill via gradient descent each frame."
        equation={`L(x,y) = x^2 + 3y^2, \\quad \\eta = ${lr.toFixed(2)}, \\quad L = ${currentLoss.toFixed(3)}`}
        onReset={() => resetTo(START_POINT, 0.15)}
        onRandomize={() => {
          const x = Math.round((Math.random() * 2.6 - 1.3) * 100) / 100;
          const y = Math.round((Math.random() * 2.6 - 1.3) * 100) / 100;
          resetTo([x, y]);
        }}
        presets={[
          { label: "Low learning rate", apply: () => resetTo(START_POINT, 0.05) },
          { label: "Good learning rate", apply: () => resetTo(START_POINT, 0.15) },
          { label: "High learning rate (overshoots)", apply: () => resetTo(START_POINT, 0.35) },
        ]}
        controls={
          <>
            <Slider label="learning rate (η)" value={lr} min={0.01} max={0.42} step={0.01} onChange={(v) => setLr(v)} format={(v) => v.toFixed(2)} />
            <button
              onClick={() => setRunning((r) => !r)}
              className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-indigo-500"
            >
              {running ? "Pause" : "Run Gradient Descent"}
            </button>
            <div className="space-y-1 rounded-md border border-slate-200 p-2.5 text-[12px] dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Iteration</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{iteration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Loss</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{currentLoss.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span
                  className={`font-mono ${status === "diverged" ? "text-rose-600 dark:text-rose-400" : status === "converged" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}
                >
                  {status}
                </span>
              </div>
            </div>
            <LossCurveMini history={history} />
          </>
        }
      >
        <Surface3D fn={loss} domain={DOMAIN} point={point} showGradient slice="y" heightScale={0.3} />
      </PlaygroundShell>
    </div>
  );
}
