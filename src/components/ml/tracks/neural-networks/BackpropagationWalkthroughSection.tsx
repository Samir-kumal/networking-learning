"use client";

import { useMemo, useState } from "react";
import { ConceptCallout, Katex, PlaygroundShell } from "@/components/ml/primitives";
import { Network } from "@/lib/ml/nn/network";
import { sigmoid } from "@/lib/ml/nn/activations";
import { bceLoss } from "@/lib/ml/nn/losses";

// A FIXED, hand-checkable 2-2-1 network (weight/bias values in the style of the widely
// used "Matt Mazur" backprop worked example) — chosen once, hardcoded, never randomized,
// so every number this walkthrough shows is reproducible and independently checkable.
// Every displayed value below still comes from calling the real
// Network.forward()/backward() on these weights — nothing here is hand-computed.
const HIDDEN_WEIGHTS: [number, number][] = [
  [0.15, 0.2],
  [0.25, 0.3],
];
const HIDDEN_BIASES = [0.35, 0.35];
const OUTPUT_WEIGHTS: [number, number] = [0.4, 0.45];
const OUTPUT_BIAS = 0.6;

interface SamplePreset {
  label: string;
  input: [number, number];
  target: [number];
}

// Two contrasting, fixed (input, target) pairs run through the SAME fixed weights above:
// Sample A's prediction lands far from its target (large loss, large gradients), Sample
// B's prediction lands close to its target (small loss, small gradients) — same network,
// two very different backward passes.
const SAMPLES: SamplePreset[] = [
  { label: "Sample A — far from target (high loss)", input: [0.05, 0.1], target: [0.01] },
  { label: "Sample B — near target (low loss)", input: [2, 2], target: [1] },
];

function buildFixedNetwork(): Network {
  const net = new Network([2, 2, 1], [sigmoid, sigmoid]);
  net.weights[0][0] = [...HIDDEN_WEIGHTS[0]];
  net.weights[0][1] = [...HIDDEN_WEIGHTS[1]];
  net.biases[0] = [...HIDDEN_BIASES];
  net.weights[1][0] = [...OUTPUT_WEIGHTS];
  net.biases[1] = [OUTPUT_BIAS];
  return net;
}

function fmt(value: number): string {
  return value.toFixed(4);
}

const STEP_LABELS = [
  "1. Forward — hidden layer",
  "2. Forward — output & loss",
  "3. Output-layer delta",
  "4. Output-layer gradients",
  "5. Hidden-layer delta",
  "6. Hidden-layer gradients",
];

export default function BackpropagationWalkthroughSection() {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const network = useMemo(() => buildFixedNetwork(), []);
  const sample = SAMPLES[sampleIndex];

  // forward()/backward() are pure reads — only Network.applyGradients (never called
  // here) mutates weights/biases, so re-running these on sample change is safe.
  const forward = useMemo(() => network.forward(sample.input), [network, sample]);
  const backward = useMemo(() => network.backward(sample.input, sample.target, bceLoss), [network, sample]);

  const inputX = forward.as[0];
  const hiddenZ = forward.zs[0];
  const hiddenA = forward.as[1];
  const outputZ = forward.zs[1][0];
  const outputA = backward.output[0];
  const loss = backward.loss;

  // Network.backward sets gradBiases[l] = delta for layer l by construction (dLoss/dbias
  // IS the delta at that neuron) — so these are the real backpropagated deltas, not a
  // separately hand-computed value.
  const outputDelta = backward.gradBiases[1][0];
  const outputGradW = backward.gradWeights[1][0];
  const outputGradB = backward.gradBiases[1][0];
  const hiddenDelta = backward.gradBiases[0];
  const hiddenGradW = backward.gradWeights[0];
  const hiddenGradB = backward.gradBiases[0];

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          <strong>Backpropagation</strong> is the chain rule, applied layer by layer, to find how much each weight
          and bias contributed to the loss. Every layer&rsquo;s contribution is summarized by a single vector, its{" "}
          <strong>delta</strong> <Katex expr="\delta^{(l)}" />: how much the loss would change per unit change in
          that layer&rsquo;s pre-activation <Katex expr="z^{(l)}" />. Once you have a layer&rsquo;s delta, that
          layer&rsquo;s gradients are one multiplication away — and the delta needed for the layer <em>before</em>{" "}
          it is another multiplication away. That&rsquo;s the whole algorithm: compute the output delta once, then
          walk backward through the network reusing it.
        </p>
        <p>
          Below is a fixed, tiny 2-2-1 network — 2 inputs, one hidden layer of 2 sigmoid neurons, 1 sigmoid output
          — with hardcoded weights so every number is reproducible. Step through the real{" "}
          <code>Network.forward()</code> and <code>Network.backward()</code> output, one stage of the chain rule at
          a time, formula and live number side by side.
        </p>
      </div>

      <ConceptCallout>
        This is exactly what <code>network.trainBatch(...)</code> in <code>train-a-network</code> does hundreds of
        times per second when you press Train there — for every sample in the batch, forward pass, then this same
        backward walk, averaged and applied as one weight update. Here it&rsquo;s slowed down to one sample and one
        stage at a time so every intermediate number is visible.
      </ConceptCallout>

      <PlaygroundShell
        title="Backpropagation, Step by Step"
        description="A fixed 2-2-1 network. Step through the real forward/backward pass; switch samples to see how the numbers change with the loss."
        equation={`\\mathcal{L}_{\\text{BCE}} = ${fmt(loss)}, \\quad \\hat{y} = ${fmt(outputA)}, \\quad y = ${sample.target[0]}`}
        onReset={() => {
          setSampleIndex(0);
          setStepIndex(0);
        }}
        presets={SAMPLES.map((s, i) => ({
          label: s.label,
          apply: () => {
            setSampleIndex(i);
            setStepIndex(0);
          },
        }))}
        controls={
          <>
            <div className="space-y-1.5 text-[12px]">
              <span className="font-medium text-slate-600 dark:text-slate-300">fixed network</span>
              <p className="font-mono text-slate-500 dark:text-slate-400">[2, 2, 1] with [sigmoid, sigmoid]</p>
              <p className="text-slate-500 dark:text-slate-400">
                input <Katex expr={`x = (${sample.input[0]}, ${sample.input[1]})`} />, target{" "}
                <Katex expr={`y = ${sample.target[0]}`} />
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <button
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  disabled={stepIndex === 0}
                  className="rounded-md border border-slate-200 px-2.5 py-1 font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Previous
                </button>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {stepIndex + 1} / {STEP_LABELS.length}
                </span>
                <button
                  onClick={() => setStepIndex((i) => Math.min(STEP_LABELS.length - 1, i + 1))}
                  disabled={stepIndex === STEP_LABELS.length - 1}
                  className="rounded-md border border-slate-200 px-2.5 py-1 font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
              <ol className="space-y-1 text-[11px]">
                {STEP_LABELS.map((label, i) => (
                  <li
                    key={label}
                    className={`rounded px-1.5 py-1 ${
                      i === stepIndex
                        ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {label}
                  </li>
                ))}
              </ol>
            </div>
          </>
        }
      >
        <div className="space-y-4 text-[13px] text-slate-700 dark:text-slate-200">
          {stepIndex === 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Forward pass — hidden layer</h4>
              <p>Each hidden neuron computes a weighted sum of the input, then squashes it with sigmoid:</p>
              <Katex block expr="z_i^{(1)} = \sum_j w_{ij}^{(1)} x_j + b_i^{(1)}, \qquad a_i^{(1)} = \sigma\!\left(z_i^{(1)}\right)" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-md border border-slate-200 p-2 font-mono text-[12px] dark:border-slate-600">
                    <p>
                      z<sub>{i + 1}</sub><sup>(1)</sup> = {HIDDEN_WEIGHTS[i][0]}·{sample.input[0]} + {HIDDEN_WEIGHTS[i][1]}·
                      {sample.input[1]} + {HIDDEN_BIASES[i]} = <strong>{fmt(hiddenZ[i])}</strong>
                    </p>
                    <p>
                      a<sub>{i + 1}</sub><sup>(1)</sup> = σ({fmt(hiddenZ[i])}) = <strong>{fmt(hiddenA[i])}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stepIndex === 1 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Forward pass — output & loss</h4>
              <p>The output neuron combines both hidden activations, then the loss compares it to the target:</p>
              <Katex block expr="z^{(2)} = w_1^{(2)}a_1^{(1)} + w_2^{(2)}a_2^{(1)} + b^{(2)}, \qquad \hat{y} = \sigma\!\left(z^{(2)}\right)" />
              <Katex block expr="\mathcal{L}_{\text{BCE}} = -\big[y\ln \hat{y} + (1-y)\ln(1-\hat{y})\big]" />
              <div className="rounded-md border border-slate-200 p-2 font-mono text-[12px] dark:border-slate-600">
                <p>
                  z<sup>(2)</sup> = {OUTPUT_WEIGHTS[0]}·{fmt(hiddenA[0])} + {OUTPUT_WEIGHTS[1]}·{fmt(hiddenA[1])} +{" "}
                  {OUTPUT_BIAS} = <strong>{fmt(outputZ)}</strong>
                </p>
                <p>
                  ŷ = σ({fmt(outputZ)}) = <strong>{fmt(outputA)}</strong>
                </p>
                <p>
                  loss = -[{sample.target[0]}·ln({fmt(outputA)}) + {1 - sample.target[0]}·ln({fmt(1 - outputA)})] ={" "}
                  <strong>{fmt(loss)}</strong>
                </p>
              </div>
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Output-layer delta</h4>
              <p>
                The output delta is how sensitive the loss is to the output neuron&rsquo;s pre-activation{" "}
                <Katex expr="z^{(2)}" />: the loss gradient with respect to the activation, times the
                activation&rsquo;s own local derivative.
              </p>
              <Katex block expr="\delta^{(2)} = \frac{\partial \mathcal{L}}{\partial \hat{y}} \cdot \sigma'\!\left(z^{(2)}\right)" />
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                For sigmoid + binary cross-entropy specifically, those two factors always cancel to a clean
                identity: <Katex expr="\delta^{(2)} = \hat{y} - y" />.
              </p>
              <div className="rounded-md border border-slate-200 p-2 font-mono text-[12px] dark:border-slate-600">
                δ<sup>(2)</sup> = ŷ - y = {fmt(outputA)} - {sample.target[0]} = <strong>{fmt(outputDelta)}</strong>
              </div>
            </div>
          )}

          {stepIndex === 3 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Output-layer gradients</h4>
              <p>Every output weight&rsquo;s gradient is the output delta times the hidden activation feeding it; the bias gradient is the delta itself:</p>
              <Katex block expr="\frac{\partial \mathcal{L}}{\partial w_i^{(2)}} = \delta^{(2)} \cdot a_i^{(1)}, \qquad \frac{\partial \mathcal{L}}{\partial b^{(2)}} = \delta^{(2)}" />
              <div className="space-y-1 rounded-md border border-slate-200 p-2 font-mono text-[12px] dark:border-slate-600">
                <p>
                  ∂L/∂w<sub>1</sub><sup>(2)</sup> = {fmt(outputDelta)} · {fmt(hiddenA[0])} = <strong>{fmt(outputGradW[0])}</strong>
                </p>
                <p>
                  ∂L/∂w<sub>2</sub><sup>(2)</sup> = {fmt(outputDelta)} · {fmt(hiddenA[1])} = <strong>{fmt(outputGradW[1])}</strong>
                </p>
                <p>
                  ∂L/∂b<sup>(2)</sup> = <strong>{fmt(outputGradB)}</strong>
                </p>
              </div>
            </div>
          )}

          {stepIndex === 4 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Hidden-layer delta (backpropagated)</h4>
              <p>
                Each hidden neuron&rsquo;s delta reuses the output delta: pull it back through the output weight
                that neuron feeds into, then multiply by that hidden neuron&rsquo;s own local sigmoid derivative.
                This is the &ldquo;back&rdquo; in backpropagation — information flows from the output delta toward
                the input.
              </p>
              <Katex block expr="\delta_i^{(1)} = \left(w_i^{(2)} \cdot \delta^{(2)}\right) \cdot \sigma'\!\left(z_i^{(1)}\right)" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-md border border-slate-200 p-2 font-mono text-[12px] dark:border-slate-600">
                    δ<sub>{i + 1}</sub><sup>(1)</sup> = ({OUTPUT_WEIGHTS[i]} · {fmt(outputDelta)}) · σ&rsquo;({fmt(hiddenZ[i])}) ={" "}
                    <strong>{fmt(hiddenDelta[i])}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stepIndex === 5 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Hidden-layer gradients</h4>
              <p>Same rule as the output layer, now applied at the hidden layer using its own delta and the original input:</p>
              <Katex block expr="\frac{\partial \mathcal{L}}{\partial w_{ij}^{(1)}} = \delta_i^{(1)} \cdot x_j, \qquad \frac{\partial \mathcal{L}}{\partial b_i^{(1)}} = \delta_i^{(1)}" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-md border border-slate-200 p-2 font-mono text-[12px] dark:border-slate-600">
                    <p>
                      ∂L/∂w<sub>{i + 1}1</sub><sup>(1)</sup> = {fmt(hiddenDelta[i])} · {inputX[0]} = <strong>{fmt(hiddenGradW[i][0])}</strong>
                    </p>
                    <p>
                      ∂L/∂w<sub>{i + 1}2</sub><sup>(1)</sup> = {fmt(hiddenDelta[i])} · {inputX[1]} = <strong>{fmt(hiddenGradW[i][1])}</strong>
                    </p>
                    <p>
                      ∂L/∂b<sub>{i + 1}</sub><sup>(1)</sup> = <strong>{fmt(hiddenGradB[i])}</strong>
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                These six gradients (2 output weights + 1 output bias + 4 hidden weights + 2 hidden biases) are
                exactly what <code>Network.applyGradients</code> would subtract (scaled by the learning rate) from
                this network&rsquo;s weights and biases on one SGD step.
              </p>
            </div>
          )}
        </div>
      </PlaygroundShell>
    </div>
  );
}
