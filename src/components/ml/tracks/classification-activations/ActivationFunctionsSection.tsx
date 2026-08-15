"use client";

import { useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";
import { relu, sigmoid, softmax, tanhActivation, type Activation } from "@/lib/ml/nn/activations";
import { SoftmaxBars } from "./SoftmaxBars";

const ACTIVATIONS: Record<string, Activation> = { sigmoid, tanh: tanhActivation, relu };

const ACTIVATION_LATEX: Record<string, string> = {
  sigmoid: "\\sigma(z) = \\dfrac{1}{1+e^{-z}}",
  tanh: "\\tanh(z) = \\dfrac{e^{z}-e^{-z}}{e^{z}+e^{-z}}",
  relu: "\\text{ReLU}(z) = \\max(0, z)",
};

const DOMAIN: [number, number] = [-6, 6];

export default function ActivationFunctionsSection() {
  const [activeName, setActiveName] = useState<"sigmoid" | "tanh" | "relu">("sigmoid");
  const [probeZ, setProbeZ] = useState(0);
  const active = ACTIVATIONS[activeName];

  const [z1, setZ1] = useState(1);
  const [z2, setZ2] = useState(1);
  const [z3, setZ3] = useState(1);
  const probs = softmax([z1, z2, z3]);
  const probSum = probs.reduce((sum, p) => sum + p, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          Every neuron in a neural network first computes a weighted sum of its inputs — a plain{" "}
          <em>linear</em> function — and then feeds that sum through an <strong>activation function</strong>. Without
          that step, stacking any number of linear layers would still collapse into a single linear function; depth
          would buy the network nothing. The activation is what lets a network bend, curve, and separate data that a
          straight line cannot.
        </p>
        <p>
          <Katex expr="\sigma(z)" /> (<strong>sigmoid</strong>) squashes any real number into <Katex expr="(0,1)" />,
          which reads naturally as a probability. <Katex expr="\tanh(z)" /> does the same but squashes into{" "}
          <Katex expr="(-1,1)" /> and is zero-centered, which often makes hidden layers easier to train.{" "}
          <strong>ReLU</strong>, <Katex expr="\max(0,z)" />, is the simplest of all: it passes positive inputs
          through unchanged and zeroes out negative ones — cheap to compute, and its constant gradient of 1 for{" "}
          <Katex expr="z>0" /> avoids the vanishing-gradient problem that squashing functions can cause in deep
          networks.
        </p>
        <p>
          The plots below use the exact same <Katex expr="\text{fn}" /> and <Katex expr="\text{derivative}" /> pulled
          from <code>src/lib/ml/nn/activations.ts</code> — the same functions the network&rsquo;s forward and
          backward passes call — so there is no risk of the derivative shown here disagreeing with the real
          backprop math.
        </p>
      </div>

      <ConceptCallout>
        The <code>Network</code> class you&rsquo;ll use in Chapter 8 calls <Katex expr="\text{activation.fn}" /> on
        every hidden pre-activation during its forward pass, and <Katex expr="\text{activation.derivative}" /> on the
        same pre-activation while backpropagating error — exactly the two curves plotted here. ReLU and tanh are the
        default hidden-layer choices in the perceptron-to-MLP walkthrough.
      </ConceptCallout>

      <PlaygroundShell
        title="Activation Functions & Their Derivatives"
        description="Pick a function and drag the probe point z to read off its value and slope at that point."
        equation={`${ACTIVATION_LATEX[activeName]} \\quad\\quad f(${probeZ.toFixed(1)}) = ${active.fn(probeZ).toFixed(3)}, \\quad f'(${probeZ.toFixed(1)}) = ${active.derivative(probeZ).toFixed(3)}`}
        onReset={() => {
          setActiveName("sigmoid");
          setProbeZ(0);
        }}
        onRandomize={() => setProbeZ(Math.round((Math.random() * 12 - 6) * 10) / 10)}
        presets={[
          { label: "Sigmoid", apply: () => setActiveName("sigmoid") },
          { label: "Tanh", apply: () => setActiveName("tanh") },
          { label: "ReLU", apply: () => setActiveName("relu") },
        ]}
        controls={
          <>
            <div className="space-y-1.5 text-[12px]">
              <span className="font-medium text-slate-600 dark:text-slate-300">active function</span>
              <p className="font-mono text-slate-500 dark:text-slate-400">{activeName}</p>
            </div>
            <Slider label="probe point z" value={probeZ} min={-6} max={6} step={0.1} onChange={setProbeZ} format={(v) => v.toFixed(1)} />
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              f(z) &mdash; the activation
            </p>
            <FunctionPlot
              fn={active.fn}
              domain={DOMAIN}
              overlays={({ xScale, yScale, innerHeight }) => (
                <>
                  <line x1={xScale(probeZ)} x2={xScale(probeZ)} y1={0} y2={innerHeight} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
                  <circle cx={xScale(probeZ)} cy={yScale(active.fn(probeZ))} r={5} fill="#f59e0b" />
                </>
              )}
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              f&prime;(z) &mdash; the derivative
            </p>
            <FunctionPlot
              fn={active.derivative}
              domain={DOMAIN}
              overlays={({ xScale, yScale, innerHeight }) => (
                <>
                  <line x1={xScale(probeZ)} x2={xScale(probeZ)} y1={0} y2={innerHeight} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
                  <circle cx={xScale(probeZ)} cy={yScale(active.derivative(probeZ))} r={5} fill="#f59e0b" />
                </>
              )}
            />
          </div>
        </div>
      </PlaygroundShell>

      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          <strong>Softmax</strong> is different from the three above: it doesn&rsquo;t act on a single number, it
          acts on an entire vector of logits at once, coupling every output to every other one so the results always
          form a valid probability distribution &mdash; each entry positive, and the whole vector summing to exactly
          1. It&rsquo;s the standard choice for a multi-class output layer.
        </p>
      </div>

      <PlaygroundShell
        title="Softmax: 3 Logits → 3 Probabilities"
        description="Drag the raw logits and watch softmax turn them into probabilities that always sum to 1."
        equation={`\\text{softmax}(z)_i = \\dfrac{e^{z_i}}{\\sum_j e^{z_j}} \\quad\\quad \\sum_i p_i = ${probSum.toFixed(4)}`}
        onReset={() => {
          setZ1(1);
          setZ2(1);
          setZ3(1);
        }}
        onRandomize={() => {
          setZ1(Math.round((Math.random() * 10 - 5) * 10) / 10);
          setZ2(Math.round((Math.random() * 10 - 5) * 10) / 10);
          setZ3(Math.round((Math.random() * 10 - 5) * 10) / 10);
        }}
        presets={[
          { label: "Uniform logits", apply: () => { setZ1(0); setZ2(0); setZ3(0); } },
          { label: "Confident about z1", apply: () => { setZ1(5); setZ2(0); setZ3(0); } },
        ]}
        controls={
          <>
            <Slider label="z1" value={z1} min={-5} max={5} step={0.1} onChange={setZ1} format={(v) => v.toFixed(1)} />
            <Slider label="z2" value={z2} min={-5} max={5} step={0.1} onChange={setZ2} format={(v) => v.toFixed(1)} />
            <Slider label="z3" value={z3} min={-5} max={5} step={0.1} onChange={setZ3} format={(v) => v.toFixed(1)} />
          </>
        }
      >
        <div className="flex flex-col items-center gap-2">
          <SoftmaxBars probs={probs} labels={["p(z1)", "p(z2)", "p(z3)"]} />
          <p className="font-mono text-[12px] text-slate-500 dark:text-slate-400">
            sum = {probSum.toFixed(4)}
          </p>
        </div>
      </PlaygroundShell>
    </div>
  );
}
