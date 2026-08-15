"use client";

import { useEffect, useRef, useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { LossCurveMini } from "./LossCurveMini";
import { DEFAULT_REGRESSION_POINTS, meanSquaredError, mseGradient, type DataPoint } from "./regressionData";

const DOMAIN: [number, number] = [-1, 10];
const MAX_GD_STEPS = 3000;

interface LineParams {
  m: number;
  b: number;
}

const START_PARAMS: LineParams = { m: 0.3, b: 0 };

interface DragState {
  handle: "left" | "right";
  lastClientY: number;
}

export default function LinearRegressionSection() {
  const [points, setPoints] = useState<DataPoint[]>(DEFAULT_REGRESSION_POINTS);
  const [params, setParams] = useState<LineParams>(START_PARAMS);
  const [lr, setLr] = useState(0.01);
  const [running, setRunning] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const currentLoss = meanSquaredError(points, params.m, params.b);

  const resetAll = (nextPoints: DataPoint[] = DEFAULT_REGRESSION_POINTS, nextParams: LineParams = START_PARAMS) => {
    setRunning(false);
    setPoints(nextPoints);
    setParams(nextParams);
    setIteration(0);
    setLossHistory([]);
  };

  // Animated gradient descent: steps m, b toward the MSE minimum each frame, using the
  // analytic gradient (∂MSE/∂m, ∂MSE/∂b) — verified against ∂MSE/∂m = (2/n)Σ(mxᵢ+b−yᵢ)xᵢ,
  // ∂MSE/∂b = (2/n)Σ(mxᵢ+b−yᵢ). Cleaned up on unmount / when `running` turns off.
  useEffect(() => {
    if (!running) return;
    let stepCount = 0;

    const step = () => {
      stepCount += 1;
      setParams((prev) => {
        const { gradM, gradB } = mseGradient(points, prev.m, prev.b);
        const next = { m: prev.m - lr * gradM, b: prev.b - lr * gradB };
        setLossHistory((hist) => [...hist, meanSquaredError(points, next.m, next.b)].slice(-200));
        const converged = Math.abs(gradM) < 1e-4 && Math.abs(gradB) < 1e-4;
        if (converged || stepCount >= MAX_GD_STEPS) setRunning(false);
        return next;
      });
      setIteration((it) => it + 1);
      if (stepCount < MAX_GD_STEPS) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [running, lr, points]);

  const yValues = points.map((p) => p.y);
  const yMin = Math.min(...yValues, params.m * DOMAIN[0] + params.b, params.m * DOMAIN[1] + params.b);
  const yMax = Math.max(...yValues, params.m * DOMAIN[0] + params.b, params.m * DOMAIN[1] + params.b);
  const yPad = Math.max((yMax - yMin) * 0.2, 2);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          <strong>Linear regression</strong> fits a line <Katex expr="\hat{y} = mx + b" /> to a set of data points by
          choosing <Katex expr="m" /> and <Katex expr="b" /> to minimize the total prediction error. The most common
          way to measure that error is the <strong>mean squared error</strong>:{" "}
          <Katex expr="\text{MSE} = \dfrac{1}{n}\sum_{i=1}^n (mx_i + b - y_i)^2" />.
        </p>
        <p>
          Instead of guessing <Katex expr="m" /> and <Katex expr="b" /> by hand, <strong>gradient descent</strong>{" "}
          nudges them downhill: it repeatedly computes the gradient of the loss with respect to each parameter and
          takes a small step in the opposite direction, <Katex expr="m \leftarrow m - \eta \frac{\partial \text{MSE}}{\partial m}" />
          {" "}and <Katex expr="b \leftarrow b - \eta \frac{\partial \text{MSE}}{\partial b}" />, where{" "}
          <Katex expr="\eta" /> is the learning rate.
        </p>
      </div>

      <ConceptCallout>
        This is the entire supervised-learning loop in miniature: a parameterized model, a loss function measuring
        how wrong it is, and gradient descent adjusting the parameters to reduce that loss. Every model in the rest
        of this lab — logistic regression (Chapter 7), and every layer of a neural network (Chapter 8) — is this same
        loop applied to a more expressive function.
      </ConceptCallout>

      <PlaygroundShell
        title="Fit a Line to Data"
        description="Click the plot to add a point, drag the amber handles to reshape the line by hand, or let gradient descent find the fit for you."
        equation={`\\hat{y} = ${params.m.toFixed(2)}x ${params.b >= 0 ? "+" : "-"} ${Math.abs(params.b).toFixed(2)}, \\quad \\text{MSE} = ${currentLoss.toFixed(3)}`}
        onReset={() => resetAll()}
        onRandomize={() => {
          const m = Math.round((Math.random() * 6 - 1) * 10) / 10;
          const b = Math.round((Math.random() * 10 - 2) * 10) / 10;
          resetAll(points, { m, b });
        }}
        presets={[
          { label: "Near-optimal start", apply: () => resetAll(points, { m: 2, b: 3 }) },
          { label: "Way-off start", apply: () => resetAll(points, { m: -3, b: 20 }) },
        ]}
        controls={
          <>
            <Slider
              label="slope (m)"
              value={params.m}
              min={-5}
              max={6}
              step={0.05}
              onChange={(m) => setParams((prev) => ({ ...prev, m }))}
              format={(v) => v.toFixed(2)}
              disabled={running}
            />
            <Slider
              label="intercept (b)"
              value={params.b}
              min={-10}
              max={25}
              step={0.1}
              onChange={(b) => setParams((prev) => ({ ...prev, b }))}
              format={(v) => v.toFixed(2)}
              disabled={running}
            />
            <Slider
              label="learning rate (η)"
              value={lr}
              min={0.001}
              max={0.03}
              step={0.001}
              onChange={setLr}
              format={(v) => v.toFixed(3)}
            />
            <button
              onClick={() => setRunning((r) => !r)}
              className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-indigo-500"
            >
              {running ? "Stop" : "Run Gradient Descent"}
            </button>
            <div className="space-y-1 rounded-md border border-slate-200 p-2.5 text-[12px] dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Iteration</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{iteration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">MSE</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{currentLoss.toFixed(3)}</span>
              </div>
            </div>
            <LossCurveMini history={lossHistory} />
          </>
        }
      >
        <FunctionPlot
          fn={(x) => params.m * x + params.b}
          domain={DOMAIN}
          range={[yMin - yPad, yMax + yPad]}
          overlays={({ xScale, yScale, innerWidth, innerHeight }) => {
            const leftY = params.m * DOMAIN[0] + params.b;
            const rightY = params.m * DOMAIN[1] + params.b;

            const dragHandle = (handle: "left" | "right", clientY: number) => {
              const deltaPixels = clientY - (dragRef.current?.lastClientY ?? clientY);
              const unitPixels = yScale(1) - yScale(0);
              const deltaValue = deltaPixels / unitPixels;
              if (dragRef.current) dragRef.current.lastClientY = clientY;
              setParams((prev) => {
                const xMin = DOMAIN[0];
                const xMax = DOMAIN[1];
                const prevLeftY = prev.m * xMin + prev.b;
                const prevRightY = prev.m * xMax + prev.b;
                if (handle === "left") {
                  const newLeftY = prevLeftY + deltaValue;
                  const newM = (prevRightY - newLeftY) / (xMax - xMin);
                  return { m: newM, b: newLeftY - newM * xMin };
                }
                const newRightY = prevRightY + deltaValue;
                const newM = (newRightY - prevLeftY) / (xMax - xMin);
                return { m: newM, b: prevLeftY - newM * xMin };
              });
            };

            return (
              <>
                <rect
                  x={0}
                  y={0}
                  width={innerWidth}
                  height={innerHeight}
                  fill="transparent"
                  style={{ cursor: running ? "default" : "crosshair" }}
                  onClick={(event) => {
                    if (running) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = xScale.invert(event.clientX - rect.left);
                    const y = yScale.invert(event.clientY - rect.top);
                    setPoints((prev) => [...prev, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }]);
                  }}
                />
                {points.map((p, i) => (
                  <circle key={i} cx={xScale(p.x)} cy={yScale(p.y)} r={4} fill="#0ea5e9" stroke="white" strokeWidth={1} />
                ))}
                {(["left", "right"] as const).map((handle) => (
                  <circle
                    key={handle}
                    cx={xScale(DOMAIN[handle === "left" ? 0 : 1])}
                    cy={yScale(handle === "left" ? leftY : rightY)}
                    r={6}
                    fill="#f59e0b"
                    stroke="white"
                    strokeWidth={1.5}
                    style={{ cursor: running ? "default" : "ns-resize" }}
                    onPointerDown={(event) => {
                      if (running) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      dragRef.current = { handle, lastClientY: event.clientY };
                    }}
                    onPointerMove={(event) => {
                      if (running || dragRef.current?.handle !== handle) return;
                      dragHandle(handle, event.clientY);
                    }}
                    onPointerUp={(event) => {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                      dragRef.current = null;
                    }}
                  />
                ))}
              </>
            );
          }}
        />
      </PlaygroundShell>
    </div>
  );
}
