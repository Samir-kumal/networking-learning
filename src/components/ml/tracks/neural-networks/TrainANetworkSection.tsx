"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConceptCallout, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { Network } from "@/lib/ml/nn/network";
import { relu, sigmoid, tanhActivation, type Activation } from "@/lib/ml/nn/activations";
import { bceLoss } from "@/lib/ml/nn/losses";
import { generateDataset, type ToyDataset } from "@/lib/ml/nn/datasets";
import { DecisionBoundaryCanvas, type DecisionPoint } from "./DecisionBoundaryCanvas";
import { LossCurve } from "./LossCurve";
import { NetworkDiagram } from "./NetworkDiagram";

type HiddenActivationKey = "tanh" | "relu";
const HIDDEN_ACTIVATIONS: Record<HiddenActivationKey, Activation> = { tanh: tanhActivation, relu };
const HIDDEN_ACTIVATION_LATEX: Record<HiddenActivationKey, string> = { tanh: "\\tanh", relu: "\\text{ReLU}" };

interface Architecture {
  dataset: ToyDataset;
  hiddenLayers: number;
  neuronsPerLayer: number;
  activationKey: HiddenActivationKey;
}

const DATASET_LABEL: Record<ToyDataset, string> = { xor: "XOR", circles: "Circles", spiral: "Spiral" };
const DATASET_DOMAIN: Record<ToyDataset, [number, number]> = {
  xor: [-0.5, 1.5],
  circles: [-1.3, 1.3],
  spiral: [-1.3, 1.3],
};

// Named presets set both the dataset AND an architecture known to actually solve it:
// - xor / circles are easy: one small hidden layer ([2, 4, 1] with tanh) converges in a
//   few hundred training steps.
// - spiral's two interleaved arms need more capacity AND depth ([2, 8, 8, 1] with relu)
//   plus several thousand steps to fully unwind — press Train and let it run.
const PRESETS: Record<ToyDataset, Architecture> = {
  xor: { dataset: "xor", hiddenLayers: 1, neuronsPerLayer: 4, activationKey: "tanh" },
  circles: { dataset: "circles", hiddenLayers: 1, neuronsPerLayer: 4, activationKey: "tanh" },
  spiral: { dataset: "spiral", hiddenLayers: 2, neuronsPerLayer: 8, activationKey: "relu" },
};

const DEFAULT_LEARNING_RATE = 0.5;
const MAX_LOSS_POINTS = 200;
const STEPS_PER_FRAME = 5;

const TOGGLE_BUTTON_CLASS = (active: boolean) =>
  `flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${
    active
      ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
  }`;

function buildNetwork(arch: Architecture): Network {
  const hiddenSizes = Array.from({ length: arch.hiddenLayers }, () => arch.neuronsPerLayer);
  const layerSizes = [2, ...hiddenSizes, 1];
  const activations: Activation[] = [...hiddenSizes.map(() => HIDDEN_ACTIVATIONS[arch.activationKey]), sigmoid];
  return new Network(layerSizes, activations);
}

export default function TrainANetworkSection() {
  const [arch, setArch] = useState<Architecture>(PRESETS.xor);
  const [learningRate, setLearningRate] = useState(DEFAULT_LEARNING_RATE);
  const [isTraining, setIsTraining] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);

  const networkRef = useRef<Network>(buildNetwork(arch));
  const rafRef = useRef<number | null>(null);

  const dataset = useMemo(() => generateDataset(arch.dataset, { n: 160, seed: 3 }), [arch.dataset]);
  const points: DecisionPoint[] = useMemo(
    () => dataset.map((s) => ({ x: s.input[0], y: s.input[1], label: s.target[0] as 0 | 1 })),
    [dataset],
  );

  const rebuild = useCallback((nextArch: Architecture) => {
    setIsTraining(false);
    networkRef.current = buildNetwork(nextArch);
    setStepCount(0);
    setLossHistory([]);
  }, []);

  // Rebuilding must happen whenever the constructed shape changes, but not on every
  // `arch` object identity change (learningRate lives outside `arch` already).
  useEffect(() => {
    rebuild(arch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arch.dataset, arch.hiddenLayers, arch.neuronsPerLayer, arch.activationKey]);

  useEffect(() => {
    if (!isTraining) return;
    let cancelled = false;
    const frame = () => {
      if (cancelled) return;
      let lastLoss = 0;
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        lastLoss = networkRef.current.trainBatch(dataset, bceLoss, learningRate);
      }
      setStepCount((s) => s + STEPS_PER_FRAME);
      setLossHistory((history) => [...history, lastLoss].slice(-MAX_LOSS_POINTS));
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isTraining, dataset, learningRate]);

  // Depends on stepCount so every training frame (and every architecture rebuild)
  // produces a fresh closure, which is what tells the canvas/diagram to redraw.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const predict = useCallback((x: number, y: number) => networkRef.current.predict([x, y])[0], [stepCount, arch]);

  let currentLoss = lossHistory[lossHistory.length - 1];
  if (currentLoss === undefined) {
    let total = 0;
    for (const sample of dataset) total += bceLoss.loss(networkRef.current.predict(sample.input), sample.target);
    currentLoss = total / dataset.length;
  }

  const accuracy = points.filter((p) => (predict(p.x, p.y) >= 0.5 ? 1 : 0) === p.label).length / points.length;
  const hiddenSizes = Array.from({ length: arch.hiddenLayers }, () => arch.neuronsPerLayer);
  const layerSizes = [2, ...hiddenSizes, 1];

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          This is the flagship playground of the chapter: a real multilayer network, built and trained entirely in
          your browser with the exact same <code>Network</code> class used throughout this track — the one already
          proven correct by a finite-difference gradient check. Choose a dataset, choose an architecture, press{" "}
          <strong>Train</strong>, and watch stochastic gradient descent adjust every weight, batch by batch, from
          the loss gradients <code>Network.backward</code> computes.
        </p>
        <p>
          Four views update live from the same trained parameters: a <strong>decision-boundary heatmap</strong>{" "}
          (the network&rsquo;s predicted probability across the whole input plane — indigo means &ldquo;confidently
          class 1,&rdquo; amber means &ldquo;confidently class 0&rdquo;), a <strong>loss curve</strong> (mean
          binary cross-entropy per training step — it should trend downward), and a{" "}
          <strong>network diagram</strong> reading <code>network.weights</code> directly, where edge thickness is{" "}
          <Katex expr="|w|" /> and edge color encodes the weight&rsquo;s sign.
        </p>
        <p>
          The <strong>architecture</strong> controls (hidden layers, neurons per layer, activation) set the
          network&rsquo;s <em>capacity</em> — how complex a boundary it can represent at all. The{" "}
          <strong>learning rate</strong> controls how big a step SGD takes down the loss gradient each batch: too
          small and training crawls; too large and the loss oscillates or diverges instead of settling. XOR and
          circles are simple enough for a single small hidden layer; spiral&rsquo;s two interleaved arms need more
          neurons, more depth, and more training steps before the boundary untangles them.
        </p>
      </div>

      <ConceptCallout>
        This exact setup — pick an architecture, minimize a loss with gradient descent, watch a decision boundary
        emerge — is literally how real image classifiers, spam filters, and recommendation models are trained,
        just at far larger scale (millions of parameters instead of dozens, GPUs instead of a browser tab). The
        next section, <code>backpropagation-walkthrough</code>, opens up exactly one training step from a network
        like this one and shows every gradient number by hand.
      </ConceptCallout>

      <PlaygroundShell
        title="Train a Network"
        description="Pick a dataset and architecture, then press Train — the boundary, loss curve, and weight diagram all update live from the real engine."
        equation={`\\hat{y} = \\sigma\\big(W^{(L)}a^{(L-1)} + b^{(L)}\\big), \\quad a^{(l)} = ${HIDDEN_ACTIVATION_LATEX[arch.activationKey]}\\big(W^{(l)}a^{(l-1)} + b^{(l)}\\big), \\quad L_{\\text{BCE}} \\approx ${currentLoss.toFixed(4)}`}
        onReset={() => rebuild(arch)}
        onRandomize={() => {
          const hiddenLayers = 1 + Math.round(Math.random());
          const neuronsPerLayer = 2 + Math.round(Math.random() * 6);
          const activationKey: HiddenActivationKey = Math.random() < 0.5 ? "tanh" : "relu";
          setArch((a) => ({ ...a, hiddenLayers, neuronsPerLayer, activationKey }));
        }}
        presets={(Object.keys(PRESETS) as ToyDataset[]).map((key) => ({
          label: DATASET_LABEL[key],
          apply: () => setArch(PRESETS[key]),
        }))}
        controls={
          <>
            <div className="space-y-1.5">
              <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">dataset</span>
              <div className="flex gap-1.5">
                {(Object.keys(DATASET_LABEL) as ToyDataset[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setArch((a) => ({ ...a, dataset: key }))}
                    className={TOGGLE_BUTTON_CLASS(arch.dataset === key)}
                  >
                    {DATASET_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">hidden activation</span>
              <div className="flex gap-1.5">
                {(["tanh", "relu"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setArch((a) => ({ ...a, activationKey: key }))}
                    className={TOGGLE_BUTTON_CLASS(arch.activationKey === key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
            <Slider
              label="hidden layers"
              value={arch.hiddenLayers}
              min={1}
              max={2}
              step={1}
              onChange={(v) => setArch((a) => ({ ...a, hiddenLayers: v }))}
              format={(v) => String(v)}
            />
            <Slider
              label="neurons / layer"
              value={arch.neuronsPerLayer}
              min={2}
              max={8}
              step={1}
              onChange={(v) => setArch((a) => ({ ...a, neuronsPerLayer: v }))}
              format={(v) => String(v)}
            />
            <Slider
              label="learning rate"
              value={learningRate}
              min={0.01}
              max={2}
              step={0.01}
              onChange={setLearningRate}
              format={(v) => v.toFixed(2)}
            />
            <button
              onClick={() => setIsTraining((t) => !t)}
              className="w-full rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-[12px] font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
            >
              {isTraining ? "Pause" : "Train"}
            </button>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-md border border-slate-200 p-2 dark:border-slate-600">
                <span className="block text-slate-500 dark:text-slate-400">step</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{stepCount}</span>
              </div>
              <div className="rounded-md border border-slate-200 p-2 dark:border-slate-600">
                <span className="block text-slate-500 dark:text-slate-400">accuracy</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{(accuracy * 100).toFixed(0)}%</span>
              </div>
            </div>
          </>
        }
      >
        <div className="space-y-4">
          <DecisionBoundaryCanvas predict={predict} points={points} domain={DATASET_DOMAIN[arch.dataset]} resolution={40} />
          <LossCurve history={lossHistory} />
          <NetworkDiagram layerSizes={layerSizes} weights={networkRef.current.weights} />
        </div>
      </PlaygroundShell>
    </div>
  );
}
