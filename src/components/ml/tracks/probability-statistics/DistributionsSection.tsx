"use client";

import { useEffect, useRef, useState } from "react";
import { ConceptCallout, FunctionPlot, Katex, PlaygroundShell, Slider } from "@/components/ml/primitives";

type Family = "uniform" | "normal" | "bernoulli";

const SAMPLE_BATCH = 30;
const REVEAL_INTERVAL_MS = 35;

/** Box–Muller transform: two independent U(0,1) draws -> one standard-normal draw. */
function sampleStandardNormal(): number {
  const u1 = Math.max(Math.random(), 1e-12); // guard against ln(0)
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export default function DistributionsSection() {
  const [family, setFamily] = useState<Family>("normal");
  const [a, setA] = useState(-2);
  const [b, setB] = useState(2);
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);
  const [p, setP] = useState(0.5);
  const [samples, setSamples] = useState<number[]>([]);

  const pendingRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  // Cancel any in-flight sampling animation on unmount so it never leaks.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const lo = Math.min(a, b);
  const hi = Math.max(a, b);

  function stopSampling() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingRef.current = [];
  }

  function drawSamples() {
    stopSampling();
    const batch: number[] = [];
    for (let i = 0; i < SAMPLE_BATCH; i++) {
      if (family === "uniform") batch.push(lo + Math.random() * (hi - lo));
      else if (family === "normal") batch.push(mu + sigma * sampleStandardNormal());
      else batch.push(Math.random() < p ? 1 : 0);
    }
    pendingRef.current = batch;
    let lastTick = performance.now();
    const step = (now: number) => {
      if (now - lastTick >= REVEAL_INTERVAL_MS && pendingRef.current.length > 0) {
        lastTick = now;
        const next = pendingRef.current.shift();
        if (next !== undefined) setSamples((prev) => [...prev, next]);
      }
      rafRef.current = pendingRef.current.length > 0 ? requestAnimationFrame(step) : null;
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function switchFamily(next: Family) {
    stopSampling();
    setSamples([]);
    setFamily(next);
  }

  function resetAll() {
    stopSampling();
    setFamily("normal");
    setA(-2);
    setB(2);
    setMu(0);
    setSigma(1);
    setP(0.5);
    setSamples([]);
  }

  const config = {
    uniform: {
      fn: (x: number) => (x >= lo && x <= hi ? 1 / (hi - lo) : 0),
      domain: [-8, 8] as [number, number],
      range: undefined as [number, number] | undefined,
      latex: `p(x) = \\dfrac{1}{${(hi - lo).toFixed(2)}} \\text{ for } x \\in [${lo.toFixed(1)}, ${hi.toFixed(1)}]`,
    },
    normal: {
      fn: (x: number) =>
        (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)),
      domain: [-10, 10] as [number, number],
      range: undefined as [number, number] | undefined,
      latex: `p(x) = \\dfrac{1}{${sigma.toFixed(2)}\\sqrt{2\\pi}}\\, e^{-\\frac{(x-${mu.toFixed(2)})^2}{2 \\cdot ${sigma.toFixed(2)}^2}}`,
    },
    bernoulli: {
      fn: () => NaN,
      domain: [-0.5, 1.5] as [number, number],
      range: [0, 1] as [number, number] | undefined,
      latex: `P(X{=}1) = ${p.toFixed(2)}, \\quad P(X{=}0) = ${(1 - p).toFixed(2)}`,
    },
  }[family];

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p>
          A <strong>probability distribution</strong> describes how likely every possible outcome of a random
          variable is. For a <strong>continuous</strong> variable it&rsquo;s a <strong>probability density
          function</strong> (PDF) <Katex expr="p(x)" />: the total area under the curve is always{" "}
          <Katex expr="1" />, and probability is read off as <em>area</em> over a range, not a single point&rsquo;s
          height. For a <strong>discrete</strong> variable it&rsquo;s a <strong>probability mass function</strong>{" "}
          (PMF): the bar heights themselves are probabilities, and they sum to <Katex expr="1" />.
        </p>
        <p>
          The <strong>uniform</strong> distribution <Katex expr="\text{Unif}(a,b)" /> is flat: every value in{" "}
          <Katex expr="[a,b]" /> is equally likely, so its density is the constant <Katex expr="p(x) = \frac{1}{b-a}" />{" "}
          on that interval and <Katex expr="0" /> outside it — the area of that rectangle is{" "}
          <Katex expr="\frac{1}{b-a} \times (b-a) = 1" />, as it must be.
        </p>
        <p>
          The <strong>normal</strong> (Gaussian) distribution <Katex expr="\mathcal{N}(\mu,\sigma^2)" /> is the
          familiar bell curve, <Katex expr="p(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-(x-\mu)^2/(2\sigma^2)}" />:{" "}
          <Katex expr="\mu" /> shifts the peak, <Katex expr="\sigma" /> controls the spread (a small{" "}
          <Katex expr="\sigma" /> is tall and narrow, a large one is short and wide).
        </p>
        <p>
          The <strong>Bernoulli</strong> distribution <Katex expr="\text{Bern}(p)" /> is the simplest discrete case:
          a single coin flip that lands &ldquo;success&rdquo; (<Katex expr="X{=}1" />) with probability{" "}
          <Katex expr="p" /> and &ldquo;failure&rdquo; (<Katex expr="X{=}0" />) with probability{" "}
          <Katex expr="1-p" />. It has no curve — just two bars.
        </p>
      </div>

      <ConceptCallout>
        The from-scratch neural network in Chapter 8 initializes every starting weight by drawing from a{" "}
        <strong>uniform</strong> distribution scaled by <Katex expr="\sqrt{2/\text{fan-in}}" /> — literally the
        distribution you&rsquo;re reshaping above. <strong>Bernoulli</strong> draws model any yes/no event in ML,
        most famously dropout regularization, which randomly zeroes each neuron by flipping an independent{" "}
        <Katex expr="\text{Bern}(p)" /> coin on every training step. And real-world measurement noise is almost
        always modeled as <strong>normal</strong>, which is exactly why the bell curve reappears in this
        chapter&rsquo;s maximum-likelihood section and underlies the mean-squared-error loss you&rsquo;ll meet in
        Chapter 6.
      </ConceptCallout>

      <PlaygroundShell
        title="Distribution Explorer"
        description="Switch families, drag the parameters, and draw random samples to see the shape and the randomness it produces."
        equation={config.latex}
        onReset={resetAll}
        onRandomize={() => {
          stopSampling();
          setSamples([]);
          if (family === "uniform") {
            const start = Math.round((Math.random() * 10 - 5) * 10) / 10;
            const width = Math.round((Math.random() * 4 + 1) * 10) / 10;
            setA(start);
            setB(start + width);
          } else if (family === "normal") {
            setMu(Math.round((Math.random() * 8 - 4) * 10) / 10);
            setSigma(Math.round((Math.random() * 2.1 + 0.4) * 10) / 10);
          } else {
            setP(Math.round(Math.random() * 100) / 100);
          }
        }}
        presets={[
          { label: "Uniform", apply: () => switchFamily("uniform") },
          { label: "Normal", apply: () => switchFamily("normal") },
          { label: "Bernoulli", apply: () => switchFamily("bernoulli") },
        ]}
        controls={
          <>
            {family === "uniform" && (
              <>
                <Slider label="a (lower bound)" value={a} min={-6} max={5} step={0.5} onChange={setA} format={(v) => v.toFixed(1)} />
                <Slider label="b (upper bound)" value={b} min={-5} max={6} step={0.5} onChange={setB} format={(v) => v.toFixed(1)} />
              </>
            )}
            {family === "normal" && (
              <>
                <Slider label="μ (mean)" value={mu} min={-4} max={4} step={0.1} onChange={setMu} format={(v) => v.toFixed(1)} />
                <Slider label="σ (std dev)" value={sigma} min={0.3} max={2.5} step={0.1} onChange={setSigma} format={(v) => v.toFixed(1)} />
              </>
            )}
            {family === "bernoulli" && (
              <Slider label="p (success probability)" value={p} min={0} max={1} step={0.01} onChange={setP} format={(v) => v.toFixed(2)} />
            )}
            <button
              onClick={drawSamples}
              className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-indigo-500"
            >
              Draw {SAMPLE_BATCH} Samples
            </button>
            <button
              onClick={() => {
                stopSampling();
                setSamples([]);
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Clear Samples
            </button>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              Drawn so far: <span className="font-mono">{samples.length}</span>
            </p>
          </>
        }
      >
        <FunctionPlot
          fn={config.fn}
          domain={config.domain}
          range={config.range}
          overlays={({ xScale, yScale, innerHeight, innerWidth }) => (
            <>
              {family === "bernoulli" &&
                [
                  { x: 0, height: 1 - p },
                  { x: 1, height: p },
                ].map(({ x, height }) => {
                  const barWidth = Math.min(70, innerWidth / 4);
                  return (
                    <rect
                      key={x}
                      x={xScale(x) - barWidth / 2}
                      y={yScale(height)}
                      width={barWidth}
                      height={innerHeight - yScale(height)}
                      fill="#4f46e5"
                      opacity={0.85}
                      rx={2}
                    />
                  );
                })}
              {family === "uniform" && (
                <>
                  <line x1={xScale(lo)} x2={xScale(lo)} y1={0} y2={innerHeight} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
                  <line x1={xScale(hi)} x2={xScale(hi)} y1={0} y2={innerHeight} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
                </>
              )}
              {samples.map((s, i) => (
                <line
                  key={i}
                  x1={xScale(s)}
                  x2={xScale(s)}
                  y1={innerHeight}
                  y2={innerHeight - 8}
                  stroke="#059669"
                  strokeWidth={1.5}
                  opacity={0.65}
                />
              ))}
            </>
          )}
        />
      </PlaygroundShell>
    </div>
  );
}
