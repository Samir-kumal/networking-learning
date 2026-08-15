import type { Matrix } from "@/lib/ml/nn/linalg";

export interface NetworkDiagramProps {
  /** e.g. [2, 4, 1] — input size, each hidden layer size, output size. */
  layerSizes: number[];
  /** `network.weights` directly — read live so the diagram always matches trained parameters. */
  weights: Matrix[];
  className?: string;
}

const WIDTH = 420;
const HEIGHT = 240;
const NODE_RADIUS = 9;

/**
 * Reads a Network's layer sizes and weight matrices directly and draws neurons as
 * columns of circles with edges between them. Edge thickness encodes |weight|, edge
 * color hue encodes weight sign (indigo = positive, amber = negative).
 */
export function NetworkDiagram({ layerSizes, weights, className }: NetworkDiagramProps) {
  const layerX = layerSizes.map((_, layerIndex) =>
    layerSizes.length === 1 ? WIDTH / 2 : 36 + (layerIndex * (WIDTH - 72)) / (layerSizes.length - 1),
  );
  const positions = layerSizes.map((size, layerIndex) =>
    Array.from({ length: size }, (_, neuronIndex) => ({
      x: layerX[layerIndex],
      y: HEIGHT / 2 + (neuronIndex - (size - 1) / 2) * Math.min(34, (HEIGHT - 32) / size),
    })),
  );

  let maxAbsWeight = 1e-6;
  for (const layer of weights) for (const row of layer) for (const w of row) maxAbsWeight = Math.max(maxAbsWeight, Math.abs(w));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={`h-auto w-full max-w-lg ${className ?? ""}`}
      role="img"
      aria-label="Network diagram: neurons as circles, weights as colored edges"
    >
      {weights.map((layerWeights, layerIndex) =>
        layerWeights.map((neuronWeights, outIndex) =>
          neuronWeights.map((w, inIndex) => {
            const from = positions[layerIndex][inIndex];
            const to = positions[layerIndex + 1][outIndex];
            const intensity = Math.min(1, Math.abs(w) / maxAbsWeight);
            const alpha = 0.15 + intensity * 0.75;
            const stroke = w >= 0 ? `rgba(79,70,229,${alpha})` : `rgba(217,119,6,${alpha})`;
            return (
              <line
                key={`${layerIndex}-${outIndex}-${inIndex}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={stroke}
                strokeWidth={0.5 + intensity * 3.5}
              />
            );
          }),
        ),
      )}
      {positions.map((layer, layerIndex) =>
        layer.map((pos, neuronIndex) => (
          <circle
            key={`${layerIndex}-${neuronIndex}`}
            cx={pos.x}
            cy={pos.y}
            r={NODE_RADIUS}
            className="fill-white stroke-slate-400 dark:fill-slate-800 dark:stroke-slate-500"
            strokeWidth={1.5}
          />
        )),
      )}
    </svg>
  );
}
