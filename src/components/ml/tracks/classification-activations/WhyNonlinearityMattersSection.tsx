"use client";

import { useEffect, useRef, useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { sigmoid, tanhActivation } from "@/lib/ml/nn/activations";
import { bceLoss } from "@/lib/ml/nn/losses";
import { Network } from "@/lib/ml/nn/network";
import { xorDataset } from "@/lib/ml/nn/datasets";
import { fitLogistic, safeDivisor } from "./logisticFit";

const XOR_SAMPLES = xorDataset();
const XOR_POINTS = XOR_SAMPLES.map((s) => ({ x1: s.input[0], x2: s.input[1], label: s.target[0] }));
const PLOT_DOMAIN: [number, number] = [-0.5, 1.5];
const STEPS_PER_FRAME = 15;
const MAX_EPOCHS = 6000;
const LEARNING_RATE = 0.5;

export default function WhyNonlinearityMattersSection() {
  // --- Linear (logistic regression) model: cannot separate XOR ---
  const [w1, setW1] = useState(1.5);
  const [w2, setW2] = useState(-1.5);
  const [b, setB] = useState(0.2);
  const w2Safe = safeDivisor(w2);
  const linearBoundaryFn = (x1: number) => -(w1 * x1 + b) / w2Safe;
  const linearPredictions = XOR_POINTS.map((p) => {
    const prob = sigmoid.fn(w1 * p.x1 + w2 * p.x2 + b);
    const predictedLabel = prob >= 0.5 ? 1 : 0;
    return { ...p, prob, predictedLabel, correct: predictedLabel === p.label };
  });
  const linearCorrect = linearPredictions.filter((p) => p.correct).length;

  // --- Tiny neural network: hidden layer + non-linearity, can separate XOR ---
  const [hiddenSize, setHiddenSize] = useState(4);
  const networkRef = useRef<Network | null>(null);
  if (networkRef.current === null) {
    networkRef.current = new Network([2, hiddenSize, 1], [tanhActivation, sigmoid]);
  }
  const network = networkRef.current;
  const [isTraining, setIsTraining] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [loss, setLoss] = useState<number | null>(null);

  useEffect(() => {
    if (!isTraining) return;
    let raf: number;
    const step = () => {
      let lastLoss = 0;
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        lastLoss = networkRef.current!.trainBatch(XOR_SAMPLES, bceLoss, LEARNING_RATE);
      }
      setEpoch((e) => {
        const next = e + STEPS_PER_FRAME;
        if (next >= MAX_EPOCHS) setIsTraining(false);
        return next;
      });
      setLoss(lastLoss);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isTraining]);

  function reinitNetwork(size: number) {
    setIsTraining(false);
    networkRef.current = new Network([2, size, 1], [tanhActivation, sigmoid]);
    setHiddenSize(size);
    setEpoch(0);
    setLoss(null);
  }

  const networkPredictions = XOR_POINTS.map((p) => {
    const prob = network.predict([p.x1, p.x2])[0];
    const predictedLabel = prob >= 0.5 ? 1 : 0;
    return { ...p, prob, predictedLabel, correct: predictedLabel === p.label };
  });
  const networkCorrect = networkPredictions.filter((p) => p.correct).length;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          <strong>XOR</strong> is the classic example of data that is <em>not linearly separable</em>:{" "}
          <Katex expr="(0,0) \to 0" />, <Katex expr="(0,1) \to 1" />, <Katex expr="(1,0) \to 1" />,{" "}
          <Katex expr="(1,1) \to 0" />. The two positive points sit on opposite corners from the two negative
          points, so no single straight line can put all the 1s on one side and all the 0s on the other &mdash; try
          every slope and intercept below and one point always ends up misclassified.
        </p>
        <p>
          A single sigmoid neuron, no matter how its weights are tuned, computes a linear boundary. But stack a{" "}
          <strong>hidden layer</strong> with a non-linear activation (like <Katex expr="\tanh" />) in front of it,
          and the network can bend space itself before drawing the final line &mdash; that bend is exactly what
          separates XOR&rsquo;s points.
        </p>
      </div>

      <ConceptCallout>
        This is the entire reason multilayer networks exist. A network with only linear layers, however deep,
        collapses to a single linear function (matrix multiplication composes into one matrix). The{" "}
        <Katex expr="\tanh" /> hidden layer here is the same non-linearity idea used throughout Chapter 8&rsquo;s{" "}
        <code>train-a-network</code> and <code>backpropagation-walkthrough</code> sections, which train this same{" "}
        <code>Network</code> class on harder, non-linearly-separable datasets like spirals and circles.
      </ConceptCallout>

      <PlaygroundShell
        title="Linear Model on XOR (fails)"
        description="Tune w1, w2, b — no setting correctly classifies all 4 points, because XOR isn't linearly separable."
        equation={`P(y=1\\mid x) = \\sigma(${w1.toFixed(1)}x_1 ${w2 >= 0 ? "+" : "-"} ${Math.abs(w2).toFixed(1)}x_2 ${b >= 0 ? "+" : "-"} ${Math.abs(b).toFixed(1)})`}
        onReset={() => {
          setW1(1.5);
          setW2(-1.5);
          setB(0.2);
        }}
        onRandomize={() => {
          setW1(Math.round((Math.random() * 6 - 3) * 10) / 10);
          setW2(Math.round((Math.random() * 6 - 3) * 10) / 10);
          setB(Math.round((Math.random() * 6 - 3) * 10) / 10);
        }}
        presets={[
          { label: "Diagonal attempt", apply: () => { setW1(2); setW2(2); setB(-1); } },
          { label: "Anti-diagonal attempt", apply: () => { setW1(2); setW2(-2); setB(0); } },
          {
            label: "Auto-fit (converges to chance)",
            apply: () => {
              const fitted = fitLogistic(XOR_POINTS, { w1, w2, b });
              setW1(Math.round(fitted.w1 * 100) / 100);
              setW2(Math.round(fitted.w2 * 100) / 100);
              setB(Math.round(fitted.b * 100) / 100);
            },
          },
        ]}
        controls={
          <>
            <Slider label="weight (w1)" value={w1} min={-3} max={3} step={0.1} onChange={setW1} format={(v) => v.toFixed(1)} />
            <Slider label="weight (w2)" value={w2} min={-3} max={3} step={0.1} onChange={setW2} format={(v) => v.toFixed(1)} />
            <Slider label="bias (b)" value={b} min={-3} max={3} step={0.1} onChange={setB} format={(v) => v.toFixed(1)} />
            <div className="rounded-md border border-slate-200 p-2 text-[12px] dark:border-slate-600">
              <span className="font-medium text-slate-600 dark:text-slate-300">accuracy: </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">{linearCorrect} / 4</span>
            </div>
          </>
        }
      >
        <div className="space-y-3">
          <FunctionPlot
            fn={linearBoundaryFn}
            domain={PLOT_DOMAIN}
            range={PLOT_DOMAIN}
            overlays={({ xScale, yScale }) =>
              linearPredictions.map((p, i) => (
                <circle
                  key={i}
                  cx={xScale(p.x1)}
                  cy={yScale(p.x2)}
                  r={7}
                  fill={p.label === 1 ? "#4f46e5" : "#dc2626"}
                  stroke={p.correct ? "none" : "#f59e0b"}
                  strokeWidth={3}
                />
              ))
            }
          />
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="py-1 pr-2 font-medium">input</th>
                <th className="py-1 pr-2 font-medium">target</th>
                <th className="py-1 pr-2 font-medium">P(y=1)</th>
                <th className="py-1 font-medium">result</th>
              </tr>
            </thead>
            <tbody>
              {linearPredictions.map((p, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="py-1 pr-2 font-mono">({p.x1}, {p.x2})</td>
                  <td className="py-1 pr-2 font-mono">{p.label}</td>
                  <td className="py-1 pr-2 font-mono">{p.prob.toFixed(3)}</td>
                  <td className={`py-1 font-medium ${p.correct ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {p.correct ? "correct" : "wrong"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PlaygroundShell>

      <PlaygroundShell
        title="Tiny Neural Network on XOR (succeeds)"
        description="Train a 2-hidden-layer network with a non-linear activation — it learns to separate all 4 points."
        equation={loss !== null ? `L_{\\text{BCE}} \\approx ${loss.toFixed(4)} \\quad (\\text{epoch } ${epoch})` : undefined}
        onReset={() => reinitNetwork(hiddenSize)}
        presets={[
          { label: "1 hidden neuron (still fails)", apply: () => reinitNetwork(1) },
          { label: "4 hidden neurons (succeeds)", apply: () => reinitNetwork(4) },
        ]}
        controls={
          <>
            <div className="space-y-1.5 text-[12px]">
              <span className="font-medium text-slate-600 dark:text-slate-300">architecture</span>
              <p className="font-mono text-slate-500 dark:text-slate-400">[2, {hiddenSize}, 1] with [tanh, sigmoid]</p>
            </div>
            <button
              onClick={() => setIsTraining((t) => !t)}
              className="w-full rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-[12px] font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
            >
              {isTraining ? "Stop training" : "Train"}
            </button>
            <div className="rounded-md border border-slate-200 p-2 text-[12px] dark:border-slate-600">
              <span className="font-medium text-slate-600 dark:text-slate-300">accuracy: </span>
              <span className={`font-mono ${networkCorrect === 4 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                {networkCorrect} / 4
              </span>
            </div>
          </>
        }
      >
        <div className="space-y-3">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="py-1 pr-2 font-medium">input</th>
                <th className="py-1 pr-2 font-medium">target</th>
                <th className="py-1 pr-2 font-medium">predicted</th>
                <th className="py-1 font-medium">result</th>
              </tr>
            </thead>
            <tbody>
              {networkPredictions.map((p, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="py-1 pr-2 font-mono">({p.x1}, {p.x2})</td>
                  <td className="py-1 pr-2 font-mono">{p.label}</td>
                  <td className="py-1 pr-2 font-mono">{p.prob.toFixed(3)}</td>
                  <td className={`py-1 font-medium ${p.correct ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {p.correct ? "correct" : "wrong"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            Click &ldquo;Train&rdquo; and watch accuracy climb to 4/4 as epochs increase (capped at {MAX_EPOCHS}{" "}
            epochs). With only 1 hidden neuron the network is still equivalent to a linear boundary and gets stuck,
            same as the model above.
          </p>
        </div>
      </PlaygroundShell>
    </div>
  );
}
